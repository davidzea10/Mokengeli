import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaults = JSON.parse(readFileSync(join(__dirname, 'm1TransactionDefaults.json'), 'utf8'));

/** Nombre ou 0 si absent / invalide (pas de coordonnées factices pour le vecteur M1). */
function numOrZero(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function num(v, fallback) {
  if (v == null || v === '') return fallback;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function boolFloat(v, fallback = 0) {
  if (v === true || v === 1 || v === 1.0) return 1.0;
  if (v === false || v === 0 || v === 0.0) return 0.0;
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * Fusionne les défauts (0) avec le POST + transaction_event (FR).
 * `clientRow` : ligne `clients` (optionnelle) — champs non utilisés par le modèle sont ignorés ;
 * l’absence de donnée reste à 0 pour le vecteur numérique (aligné avec l’entraînement).
 */
export function buildM1TransactionFeatures(body, meta, te, clientRow) {
  const o = { ...defaults };
  void clientRow;

  o.montant = num(meta.montant, o.montant);
  o.heure = num(meta.heure, o.heure);
  o.jour_semaine = num(meta.jour_semaine, o.jour_semaine);

  o.latitude_debit = numOrZero(meta.latitude_debit ?? body.latitude_debit);
  o.longitude_debit = numOrZero(meta.longitude_debit ?? body.longitude_debit);
  o.latitude_credit = numOrZero(meta.latitude_credit ?? body.latitude_credit);
  o.longitude_credit = numOrZero(meta.longitude_credit ?? body.longitude_credit);

  if (te && typeof te === 'object') {
    const beh = te.behavioral_biometrics_ueba;
    if (beh && typeof beh === 'object') {
      o.duree_session_min = num(beh.duree_session_min, o.duree_session_min);
      o.nb_ecrans_session = num(beh.nb_ecrans_session, o.nb_ecrans_session);
      o.delai_otp_s = num(beh.delai_otp_s, o.delai_otp_s);
      o.nb_echecs_login_24h = num(beh.nb_echecs_login_24h, o.nb_echecs_login_24h);
      o.vitesse_frappe = num(beh.vitesse_frappe, o.vitesse_frappe);
      o.entropie_souris = num(beh.entropie_souris, o.entropie_souris);
      o.nombre_requetes_par_minute = num(beh.nombre_requetes_par_minute, o.nombre_requetes_par_minute);
      if (beh.score_probabilite_automatisation != null) {
        o.score_probabilite_automatisation = num(beh.score_probabilite_automatisation, o.score_probabilite_automatisation);
      }
    }

    const anon = te.anonymization_detection;
    if (anon && typeof anon === 'object') {
      o.tor_detecte = boolFloat(anon.tor_detecte, o.tor_detecte);
      o.vpn_detecte = boolFloat(anon.vpn_detecte, o.vpn_detecte);
      o.proxy_detecte = boolFloat(anon.proxy_detecte, o.proxy_detecte);
      if (anon.score_anonimisation_reseau != null) {
        o.score_anonimisation_reseau = num(anon.score_anonimisation_reseau, o.score_anonimisation_reseau);
      }
    }

    const net = te.network_intelligence;
    if (net && typeof net === 'object') {
      o.score_reputation_ip = num(net.score_reputation_ip, o.score_reputation_ip);
      o.ip_datacenter = boolFloat(net.ip_datacenter, o.ip_datacenter);
      o.ip_pays_inhabituel = boolFloat(net.ip_pays_inhabituel, o.ip_pays_inhabituel);
      o.ip_sur_liste_noire = boolFloat(net.ip_sur_liste_noire, o.ip_sur_liste_noire);
      if (net.numero_asn != null) o.numero_asn = num(net.numero_asn, o.numero_asn);
    }

    const rel = te.relational_graph_features;
    if (rel && typeof rel === 'object') {
      o.degre_client = num(rel.degre_client, o.degre_client);
      o.nb_voisins_frauduleux = num(rel.nb_voisins_frauduleux, o.nb_voisins_frauduleux);
      o.score_reseau = num(rel.score_reseau, o.score_reseau);
    }

    const eng = te.engineered_features_profiling;
    if (eng && typeof eng === 'object') {
      const v24 = eng.vitesse_24h;
      if (v24 != null && Number.isFinite(num(v24, NaN))) {
        o.vitesse_24h = num(v24, o.vitesse_24h);
      } else {
        o.vitesse_24h = 0;
      }
      o.ratio_montant_median_30j = num(eng.ratio_montant_median_30j, o.ratio_montant_median_30j);
      o.beneficiaire_nouveau = boolFloat(eng.beneficiaire_nouveau, o.beneficiaire_nouveau);
      o.distance_km_habitude = num(eng.distance_km_habitude, o.distance_km_habitude);
      o.changement_appareil = boolFloat(eng.changement_appareil, o.changement_appareil);
    }

    const sec = te.security_integrity;
    if (sec && typeof sec === 'object') {
      o.signature_transaction_valide = boolFloat(sec.signature_transaction_valide, o.signature_transaction_valide);
      o.certificat_valide = boolFloat(sec.certificat_valide, o.certificat_valide);
      o.score_confiance_client_api = num(sec.score_confiance_client_api, o.score_confiance_client_api);
      if (sec.signature_requete_valide != null) {
        o.signature_requete_valide = boolFloat(sec.signature_requete_valide, o.signature_requete_valide);
      }
      if (sec.integrite_payload_requete != null) {
        o.integrite_payload_requete = boolFloat(sec.integrite_payload_requete, o.integrite_payload_requete);
      }
      if (sec.certificat_revoque != null) {
        o.certificat_revoque = boolFloat(sec.certificat_revoque, o.certificat_revoque);
      }
    }
  }

  return o;
}

/**
 * Appelle predict_m1.py (joblib). Si Python ou le modèle est absent, proba de secours.
 */
export function runM1PythonPredict(featureDict) {
  const scriptPath = join(__dirname, '../../ml/Transaction/predict_m1.py');
  const py = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
  const payload = JSON.stringify(featureDict);

  const res = spawnSync(py, [scriptPath], {
    input: payload,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60000,
    windowsHide: true,
  });

  if (res.error) {
    console.warn('[m1]', res.error.message);
    return fallbackM1();
  }
  if (res.status !== 0) {
    console.warn('[m1] python exit', res.status, res.stderr?.slice?.(0, 500));
    return fallbackM1();
  }
  const errOut = res.stderr && String(res.stderr).trim();
  if (errOut) {
    console.warn('[m1] python stderr:', errOut.slice(0, 500));
  }
  try {
    const out = JSON.parse(String(res.stdout || '').trim());
    if (out.ok && typeof out.proba_fraude === 'number' && Number.isFinite(out.proba_fraude)) {
      return {
        proba_fraude: Math.min(1, Math.max(0, out.proba_fraude)),
        fallback: false,
        model: out.model ?? 'm1',
        label: out.label,
      };
    }
    if (typeof out.proba_fraude === 'number' && Number.isFinite(out.proba_fraude)) {
      return {
        proba_fraude: Math.min(1, Math.max(0, out.proba_fraude)),
        fallback: Boolean(out.fallback),
        model: out.model ?? 'm1',
      };
    }
  } catch (e) {
    console.warn('[m1] parse stdout', e);
  }
  return fallbackM1();
}

function fallbackM1() {
  return {
    proba_fraude: 0,
    fallback: true,
    model: 'fallback',
  };
}
