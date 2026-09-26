/**
 * Détection légère Tor / VPN côté navigateur (avant evaluate).
 * - Tor : API officielle check.torproject.org (fonctionne même si l’app est en localhost)
 * - VPN / proxy : ip-api.com sur l’IP publique du navigateur
 */

export interface BrowserAnonymization {
  tor_detecte: boolean;
  vpn_detecte: boolean;
  proxy_detecte: boolean;
  ip_datacenter: boolean;
}

const EMPTY: BrowserAnonymization = {
  tor_detecte: false,
  vpn_detecte: false,
  proxy_detecte: false,
  ip_datacenter: false,
};

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let t: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<null>((resolve) => {
        t = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

async function detectTor(): Promise<boolean> {
  try {
    const res = await withTimeout(
      fetch('https://check.torproject.org/api/ip', {
        method: 'GET',
        cache: 'no-store',
      }),
      3500,
    );
    if (!res || !res.ok) return false;
    const json = (await res.json()) as { IsTor?: boolean };
    return Boolean(json?.IsTor);
  } catch {
    return false;
  }
}

async function detectVpnProxy(): Promise<{
  vpn: boolean;
  proxy: boolean;
  hosting: boolean;
}> {
  try {
    const res = await withTimeout(
      fetch('https://ip-api.com/json/?fields=status,proxy,hosting,mobile,query', {
        method: 'GET',
        cache: 'no-store',
      }),
      3500,
    );
    if (!res || !res.ok) return { vpn: false, proxy: false, hosting: false };
    const json = (await res.json()) as {
      status?: string;
      proxy?: boolean;
      hosting?: boolean;
      mobile?: boolean;
    };
    if (json.status !== 'success') return { vpn: false, proxy: false, hosting: false };
    const proxy = Boolean(json.proxy);
    const hosting = Boolean(json.hosting);
    const vpn = proxy || (hosting && !json.mobile);
    return { vpn, proxy, hosting };
  } catch {
    return { vpn: false, proxy: false, hosting: false };
  }
}

/** Appeler juste avant l’envoi de la transaction. */
export async function detectBrowserAnonymization(): Promise<BrowserAnonymization> {
  const [tor, net] = await Promise.all([detectTor(), detectVpnProxy()]);
  return {
    tor_detecte: tor,
    vpn_detecte: net.vpn,
    proxy_detecte: net.proxy,
    ip_datacenter: net.hosting,
  };
}

export function emptyAnonymization(): BrowserAnonymization {
  return { ...EMPTY };
}
