import type { Transaction, TransactionRoute } from '../types';

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

/**
 * 10 flux démo datés du 20 septembre 2026 :
 * - 2 frauduleux (tracés en rouge)
 * - 2 « focus » normaux (et 6 autres normaux) → 8 normaux au total
 */
export const MAP_DEMO_SEPT_20_2026: Transaction[] = Array.from({ length: 10 }, (_, i) => {
  const fraud = i === 0 || i === 1;
  const r = route(i, fraud);
  const hour = 8 + i;
  const montant = fraud ? 850_000 + i * 40_000 : 25_000 + i * 12_500;
  const m2 = 0.08 + (i % 5) * 0.03;
  const m3 = 0.05 + ((i + 2) % 6) * 0.025;
  const m1 = fraud ? 0.72 + i * 0.05 : 0.02 + (i % 4) * 0.01;
  const combined = (m1 + m2 + m3) / 3;

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
        score_reputation_ip: fraud ? 0.1 : 0.8,
        ip_datacenter: fraud,
        ip_pays_inhabituel: fraud,
        ip_sur_liste_noire: fraud && i === 0,
      },
      anonymization_detection: {
        tor_detecte: false,
        vpn_detecte: fraud,
        proxy_detecte: false,
      },
      behavioral_biometrics_ueba: {
        duree_session_min: 12,
        nb_ecrans_session: 4,
        delai_otp_s: 8,
        nb_echecs_login_24h: fraud ? 3 : 0,
        vitesse_frappe: 4,
        entropie_souris: 0.4,
        nombre_requetes_par_minute: 5,
      },
      engineered_features_profiling: {
        vitesse_24h: fraud ? 12 : 1.2,
        ratio_montant_median_30j: fraud ? 4.5 : 1.1,
        beneficiaire_nouveau: fraud,
        distance_km_habitude: fraud ? 800 : 12,
        changement_appareil: fraud,
      },
      relational_graph_features: {
        degre_client: 3,
        nb_voisins_frauduleux: fraud ? 2 : 0,
        score_reseau: fraud ? 0.7 : 0.1,
      },
      security_integrity: {
        signature_transaction_valide: true,
        certificat_valide: true,
        score_confiance_client_api: fraud ? 0.3 : 0.9,
      },
    },
    target_labels: {
      cible_fraude: fraud,
      cible_session_anormale: fraud,
      cible_comportement_atypique: fraud,
    },
    _api: {
      id: `demo-map-2026-09-20-${i + 1}`,
      riskPercent: Math.round(combined * 100),
      scoreTransaction: Math.round(m1 * 1000) / 10,
      scoreSession: Math.round(m2 * 1000) / 10,
      scoreComportement: Math.round(m3 * 1000) / 10,
      decision: fraud ? 'challenge' : 'allow',
    },
  };
});
