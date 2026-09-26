/**
 * Détection anonymisation réseau (Tor / VPN / proxy / datacenter)
 * à partir de l’IP client + signaux déjà présents dans le corps.
 *
 * - Tor : DNS DNSEL Tor Project (fiable, sans clé)
 * - VPN / proxy / hosting : ip-api.com (gratuit, rate-limité)
 * Résultats mis en cache mémoire pour éviter le spam API.
 */

const torCache = new Map(); // ip -> { value, expires }
const ipMetaCache = new Map();
const TOR_TTL_MS = 6 * 60 * 60 * 1000;
const IP_META_TTL_MS = 30 * 60 * 1000;

function cacheGet(map, key) {
  const hit = map.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    map.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(map, key, value, ttl) {
  map.set(key, { value, expires: Date.now() + ttl });
}

export function extractClientIp(req) {
  const xf = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (xf.length) return xf[0];
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  const cf = req.headers['cf-connecting-ip'];
  if (cf) return String(cf).trim();
  return (
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    ''
  )
    .toString()
    .replace(/^::ffff:/, '');
}

function isPrivateOrLocal(ip) {
  if (!ip) return true;
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true;
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  return false;
}

function reverseIpv4(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  if (!parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) return null;
  return parts.reverse().join('.');
}

/**
 * Vérifie si l’IP est un nœud de sortie Tor (DNSEL).
 * @see https://www.torproject.org/projects/tordnsel.html.en
 */
export async function isTorExitIp(ip) {
  if (!ip || isPrivateOrLocal(ip)) return false;
  const cached = cacheGet(torCache, ip);
  if (cached != null) return cached;

  const rev = reverseIpv4(ip);
  if (!rev) {
    cacheSet(torCache, ip, false, TOR_TTL_MS);
    return false;
  }

  const host = `${rev}.dnsel.torproject.org`;
  try {
    const { lookup } = await import('node:dns/promises');
    const addrs = await lookup(host, { all: true });
    const isTor = Array.isArray(addrs) && addrs.some((a) => a.address === '127.0.0.2');
    cacheSet(torCache, ip, isTor, TOR_TTL_MS);
    return isTor;
  } catch {
    // NXDOMAIN = pas Tor
    cacheSet(torCache, ip, false, TOR_TTL_MS);
    return false;
  }
}

/**
 * Métadonnées IP (proxy / hosting) via ip-api.com.
 */
export async function lookupIpMeta(ip) {
  if (!ip || isPrivateOrLocal(ip)) {
    return { proxy: false, hosting: false, mobile: false };
  }
  const cached = cacheGet(ipMetaCache, ip);
  if (cached) return cached;

  try {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,mobile,query`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const json = await res.json();
    const meta = {
      proxy: Boolean(json?.proxy),
      hosting: Boolean(json?.hosting),
      mobile: Boolean(json?.mobile),
    };
    cacheSet(ipMetaCache, ip, meta, IP_META_TTL_MS);
    return meta;
  } catch {
    const empty = { proxy: false, hosting: false, mobile: false };
    cacheSet(ipMetaCache, ip, empty, 60_000);
    return empty;
  }
}

function asBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

/**
 * Fusionne signaux corps HTTP + détection IP serveur.
 * @returns {{ tor: boolean, vpn: boolean, proxy: boolean, ip_datacenter: boolean, client_ip: string }}
 */
export async function resolveAnonymizationSignals(req, te = {}, features = {}) {
  const anon = te.anonymization_detection || {};
  const net = te.network_intelligence || {};

  const fromBody = {
    tor:
      asBool(anon.tor_detecte) ||
      asBool(anon.tor_detected) ||
      asBool(features.tor_detecte),
    vpn:
      asBool(anon.vpn_detecte) ||
      asBool(anon.vpn_detected) ||
      asBool(features.vpn_detecte),
    proxy:
      asBool(anon.proxy_detecte) ||
      asBool(anon.proxy_detected) ||
      asBool(features.proxy_detecte),
    ip_datacenter:
      asBool(net.ip_datacenter) || asBool(features.ip_datacenter),
  };

  const client_ip = extractClientIp(req);

  let tor = fromBody.tor;
  let vpn = fromBody.vpn;
  let proxy = fromBody.proxy;
  let ip_datacenter = fromBody.ip_datacenter;

  if (!isPrivateOrLocal(client_ip)) {
    const [isTor, meta] = await Promise.all([
      isTorExitIp(client_ip),
      lookupIpMeta(client_ip),
    ]);
    if (isTor) tor = true;
    if (meta.proxy) {
      proxy = true;
      vpn = true; // proxy résidentiel / VPN commercial souvent marqué proxy
    }
    if (meta.hosting) {
      ip_datacenter = true;
      // Hosting sans mobile → souvent VPN / VPS / sortie anonymisée
      if (!meta.mobile) vpn = true;
    }
  }

  return { tor, vpn, proxy, ip_datacenter, client_ip };
}

/**
 * Injecte les signaux détectés dans features + transaction_event (mutation légère).
 */
export function applyAnonymizationToFeatures(features, te, signals) {
  const f = { ...features };
  f.tor_detecte = signals.tor ? 1 : f.tor_detecte ?? 0;
  f.vpn_detecte = signals.vpn ? 1 : f.vpn_detecte ?? 0;
  f.proxy_detecte = signals.proxy ? 1 : f.proxy_detecte ?? 0;
  f.ip_datacenter = signals.ip_datacenter ? 1 : f.ip_datacenter ?? 0;

  const outTe = te && typeof te === 'object' ? { ...te } : {};
  outTe.anonymization_detection = {
    ...(outTe.anonymization_detection || {}),
    tor_detecte: signals.tor,
    vpn_detecte: signals.vpn,
    proxy_detecte: signals.proxy,
  };
  outTe.network_intelligence = {
    ...(outTe.network_intelligence || {}),
    ip_datacenter: signals.ip_datacenter,
  };
  return { features: f, te: outTe };
}
