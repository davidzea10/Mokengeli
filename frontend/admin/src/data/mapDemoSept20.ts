import type { Transaction, TransactionRoute } from '../types';
import { decisionFromCombinedScore } from '../utils/decisionPolicy';

const CITIES = [
  { city: 'Kinshasa', lat: -4.3276, lng: 15.3136 },
  { city: 'Lubumbashi', lat: -11.6642, lng: 27.4794 },
  { city: 'Goma', lat: -1.6741, lng: 29.2238 },
  { city: 'Kisangani', lat: 0.5167, lng: 25.1917 },
  { city: 'Matadi', lat: -5.8386, lng: 13.4631 },
  { city: 'Mbuji-Mayi', lat: -6.15, lng: 23.6 },
  { city: 'Kananga', lat: -5.896, lng: 22.416 },
  { city: 'Bukavu', lat: -2.5, lng: 28.86 },
  { city: 'Kolwezi', lat: -10.7167, lng: 25.4667 },
  { city: 'Mbandaka', lat: 0.0478, lng: 18.2558 },
] as const;

const ABROAD = [
  { city: 'Kigali', lat: -1.9536, lng: 30.0606, countryCode: 'RW' },
  { city: 'Brazzaville', lat: -4.2634, lng: 15.2832, countryCode: 'CG' },
] as const;

function route(i: number, fraud: boolean): TransactionRoute {
  const a = CITIES[i % CITIES.length];
  const b = CITIES[(i + 3) % CITIES.length];
  const sender = { lat: a.lat, lng: a.lng, label: 'Émetteur', city: a.city, countryCode: 'CD' };
  if (fraud) {
    const d = ABROAD[i % ABROAD.length];
    return {
      sender,
      receiver: {
        lat: d.lat,
        lng: d.lng,
        label: 'Bénéficiaire',
        city: d.city,
        countryCode: d.countryCode,
      },
    };
  }
  return {
    sender,
    receiver: { lat: b.lat, lng: b.lng, label: 'Bénéficiaire', city: b.city, countryCode: 'CD' },
  };
}

/** Variations déterministes (pas de Math.random) pour features M2/M3. */
function jitter(i: number, base: number, spread: number, digits = 2): number {
  const t = ((i * 17 + 31) % 100) / 100;
  const v = base + t * spread;
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

/**
 * 10 flux démo datés du 20 septembre 2026 :
 * - 2 frauduleux (score combiné ≥ 70 % → block, tracés en rouge)
 * - 8 normaux (allow)
 */
export const MAP_DEMO_SEPT_20_2026: Transaction[] = Array.from({ length: 10 }, (_, i) => {
  const fraud = i === 0 || i === 1;
  const r = route(i, fraud);
  const hour = 8 + i;
  const montant = fraud ? 850_000 + i * 40_000 : 25_000 + i * 12_500;
  /** Fraudes : scores élevés pour passer le seuil block (70 %). */
  const m1 = fraud ? 0.88 + i * 0.04 : 0.02 + (i % 4) * 0.01;
  const m2 = fraud ? 0.74 + i * 0.05 : 0.08 + (i % 5) * 0.03;
  const m3 = fraud ? 0.7 + i * 0.04 : 0.05 + ((i + 2) % 6) * 0.025;
  const combined = (m1 + m2 + m3) / 3;
  const decision = decisionFromCombinedScore(combined);
  const riskPercent = Math.round(combined * 100);

  return {
    transaction_event: {
      metadata: {
        date_transaction: `2026-09-20T${String(hour).padStart(2, '0')}:${String(10 + i * 3).padStart(2, '0')}:00Z`,
        numero_transaction: `TXN-2026-09-20-${String(i + 1).padStart(2, '0')}`,
        id_client: fraud ? `CLT-FRAUD-${i + 1}` : `CLT-OK-${i + 1}`,
        montant,
        devise: 'FC',
        heure: hour,
        jour_semaine: 7,
        type_transaction: 'virement',
        canal: i % 2 === 0 ? 'app' : 'web',
        latitude_debit: r.sender.lat,
        longitude_debit: r.sender.lng,
        latitude_credit: r.receiver.lat,
        longitude_credit: r.receiver.lng,
        route: r,
        parties: {
          expediteur: {
            nom: fraud ? `Client risque ${i + 1}` : `Client ${i + 1}`,
            compte_ou_numero: `RW-CDH-DEMO-${100 + i}`,
            mode: 'banque',
          },
          destinataire: {
            nom: r.receiver.city,
            compte_ou_numero: fraud ? `EXT-${r.receiver.countryCode}` : `RW-CDH-DST-${200 + i}`,
            mode: 'banque',
          },
        },
      },
      network_intelligence: {
        score_reputation_ip: fraud ? jitter(i, 0.12, 0.28, 3) : jitter(i, 0.62, 0.28, 3),
        ip_datacenter: fraud && i === 0,
        ip_pays_inhabituel: fraud,
        ip_sur_liste_noire: fraud && i === 0,
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: fraud || i % 7 === 0,
        proxy_detecte: fraud && i === 1,
      },
      behavioral_biometrics_ueba: {
        duree_session_min: fraud ? jitter(i, 2.5, 6, 1) : jitter(i, 9, 18, 1),
        nb_ecrans_session: fraud ? 1 + (i % 3) : 3 + (i % 5),
        delai_otp_s: fraud ? 45 + i * 28 : 14 + i * 5,
        nb_echecs_login_24h: fraud ? 2 + (i % 3) : i % 3,
        vitesse_frappe: fraud ? jitter(i, 72, 40, 1) : jitter(i, 32, 38, 1),
        entropie_souris: fraud ? jitter(i, 0.1, 0.22, 3) : jitter(i, 0.48, 0.35, 3),
        nombre_requetes_par_minute: fraud ? jitter(i, 8, 10, 1) : jitter(i, 1.5, 4.5, 1),
      },
      engineered_features_profiling: {
        vitesse_24h: fraud ? jitter(i, 1200, 3200, 1) : jitter(i, 90, 850, 1),
        ratio_montant_median_30j: fraud ? jitter(i, 2.4, 2.2, 2) : jitter(i, 0.7, 0.85, 2),
        beneficiaire_nouveau: fraud || i % 5 === 0,
        distance_km_habitude: fraud ? jitter(i, 120, 700, 1) : jitter(i, 4, 55, 1),
        changement_appareil: fraud || i % 6 === 0,
      },
      relational_graph_features: {
        degre_client: 2 + ((i * 3) % 8),
        nb_voisins_frauduleux: fraud ? 1 + (i % 3) : i % 8 === 0 ? 1 : 0,
        score_reseau: fraud ? jitter(i, 0.48, 0.35, 3) : jitter(i, 0.06, 0.22, 3),
      },
      security_integrity: {
        signature_transaction_valide: !fraud || i === 1,
        certificat_valide: true,
        score_confiance_client_api: fraud ? jitter(i, 0.22, 0.35, 3) : jitter(i, 0.68, 0.25, 3),
      },
    },
    target_labels: {
      cible_fraude: decision === 'block',
      cible_session_anormale: decision !== 'allow',
      cible_comportement_atypique: decision === 'block',
    },
    _api: {
      id: `demo-map-2026-09-20-${i + 1}`,
      riskPercent,
      scoreTransaction: Math.round(m1 * 1000) / 10,
      scoreSession: Math.round(m2 * 1000) / 10,
      scoreComportement: Math.round(m3 * 1000) / 10,
      decision,
    },
  };
});
