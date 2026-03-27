import type {
  Transaction,
  TransactionEvent,
  TransactionGeoPoint,
  TransactionRoute,
} from '../types';

/** Villes RDC pour trajets intra-pays (démo carte) */
const RDC_CITIES: { city: string; lat: number; lng: number }[] = [
  { city: 'Kinshasa', lat: -4.3276, lng: 15.3136 },
  { city: 'Matadi', lat: -5.8386, lng: 13.4631 },
  { city: 'Lubumbashi', lat: -11.6642, lng: 27.4794 },
  { city: 'Mbuji-Mayi', lat: -6.15, lng: 23.6 },
  { city: 'Kananga', lat: -5.896, lng: 22.416 },
  { city: 'Kisangani', lat: 0.5167, lng: 25.1917 },
  { city: 'Bukavu', lat: -2.5, lng: 28.86 },
  { city: 'Goma', lat: -1.6741, lng: 29.2238 },
  { city: 'Kolwezi', lat: -10.7167, lng: 25.4667 },
  { city: 'Kindu', lat: -2.95, lng: 25.92 },
  { city: 'Mbandaka', lat: 0.0478, lng: 18.2558 },
  { city: 'Bunia', lat: 1.5597, lng: 30.2522 },
  { city: 'Tshikapa', lat: -6.4167, lng: 20.8 },
  { city: 'Gemena', lat: 3.25, lng: 19.7667 },
  { city: 'Kikwit', lat: -5.03, lng: 18.85 },
  { city: 'Boma', lat: -5.85, lng: 13.05 },
  { city: 'Uvira', lat: -3.4, lng: 29.15 },
  { city: 'Likasi', lat: -10.975, lng: 26.7338 },
  { city: 'Isiro', lat: 2.614, lng: 27.618 },
  { city: 'Bandundu', lat: -3.3167, lng: 17.3667 },
];

const FRAUD_ABROAD: TransactionGeoPoint[] = [
  { lat: -1.9536, lng: 30.0606, label: 'Bénéficiaire', city: 'Kigali', countryCode: 'RW' },
  { lat: -4.2634, lng: 15.2832, label: 'Bénéficiaire', city: 'Brazzaville', countryCode: 'CG' },
  { lat: -15.4067, lng: 28.2871, label: 'Bénéficiaire', city: 'Lusaka', countryCode: 'ZM' },
  { lat: -6.7924, lng: 39.2083, label: 'Bénéficiaire', city: 'Dar es Salaam', countryCode: 'TZ' },
  { lat: 0.3476, lng: 32.5825, label: 'Bénéficiaire', city: 'Kampala', countryCode: 'UG' },
];

const TYPES = ['Virement', 'Paiement', 'Achat', 'Retrait'] as const;
const CANAUX = ['Mobile', 'Web', 'Guichet'] as const;
const DEVISES = ['USD', 'CDF', 'EUR'] as const;

function toPoint(
  c: { city: string; lat: number; lng: number },
  label: 'Émetteur' | 'Bénéficiaire'
): TransactionGeoPoint {
  return { ...c, label, countryCode: 'CD' };
}

function routeForIndex(i: number, fraud: boolean): TransactionRoute {
  const n = RDC_CITIES.length;
  let si = (i * 7) % n;
  let ri = (i * 11 + 5) % n;
  if (si === ri) ri = (ri + 1) % n;
  const sender = toPoint(RDC_CITIES[si], 'Émetteur');
  if (fraud && i % 3 !== 0) {
    const dest = FRAUD_ABROAD[i % FRAUD_ABROAD.length];
    return { sender, receiver: { ...dest } };
  }
  return { sender, receiver: toPoint(RDC_CITIES[ri], 'Bénéficiaire') };
}

function buildTransactionEvent(i: number, fraud: boolean): TransactionEvent {
  const route = routeForIndex(i, fraud);
  const day = 1 + (i % 28);
  const hour = 6 + (i % 14);
  const montant = 150 + ((i * 137) % 98_000) + (i % 7) * 13;

  return {
    metadata: {
      date_transaction: `2024-03-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:30:00Z`,
      numero_transaction: `TXN-2024-${String(i + 1).padStart(6, '0')}`,
      id_client: `CLT-${10_000 + i}`,
      montant,
      devise: DEVISES[i % DEVISES.length],
      heure: hour,
      jour_semaine: i % 7,
      type_transaction: TYPES[i % TYPES.length],
      canal: CANAUX[i % CANAUX.length],
      route,
    },
    network_intelligence: fraud
      ? {
          score_reputation_ip: 0.05 + (i % 10) * 0.02,
          ip_datacenter: true,
          ip_pays_inhabituel: true,
          ip_sur_liste_noire: i % 2 === 0,
        }
      : {
          score_reputation_ip: 0.72 + (i % 20) * 0.01,
          ip_datacenter: false,
          ip_pays_inhabituel: false,
          ip_sur_liste_noire: false,
        },
    anonymization_detection: fraud
      ? { tor_detecte: true, vpn_detecte: true, proxy_detecte: i % 2 === 0 }
      : { tor_detecte: false, vpn_detecte: i % 17 === 0, proxy_detecte: false },
    behavioral_biometrics_ueba: fraud
      ? {
          duree_session_min: 2 + (i % 5),
          nb_ecrans_session: 1 + (i % 2),
          delai_otp_s: 90 + (i % 120),
          nb_echecs_login_24h: 3 + (i % 5),
          vitesse_frappe: 90 + (i % 40),
          entropie_souris: 0.1 + (i % 10) * 0.02,
          nombre_requetes_par_minute: 10 + (i % 10),
        }
      : {
          duree_session_min: 8 + (i % 25),
          nb_ecrans_session: 3 + (i % 5),
          delai_otp_s: 25 + (i % 40),
          nb_echecs_login_24h: i % 4,
          vitesse_frappe: 35 + (i % 35),
          entropie_souris: 0.55 + (i % 20) * 0.015,
          nombre_requetes_par_minute: 2 + (i % 6),
        },
    engineered_features_profiling: fraud
      ? {
          vitesse_24h: 2000 + (i % 8000),
          ratio_montant_median_30j: 3 + (i % 5) * 0.4,
          beneficiaire_nouveau: true,
          distance_km_habitude: 100 + (i % 500),
          changement_appareil: true,
        }
      : {
          vitesse_24h: 200 + (i % 2000),
          ratio_montant_median_30j: 0.7 + (i % 15) * 0.05,
          beneficiaire_nouveau: i % 11 === 0,
          distance_km_habitude: 5 + (i % 80),
          changement_appareil: i % 13 === 0,
        },
    relational_graph_features: fraud
      ? {
          degre_client: 5 + (i % 8),
          nb_voisins_frauduleux: 2 + (i % 4),
          score_reseau: 0.15 + (i % 10) * 0.03,
        }
      : {
          degre_client: 2 + (i % 8),
          nb_voisins_frauduleux: i % 9 === 0 ? 1 : 0,
          score_reseau: 0.65 + (i % 25) * 0.01,
        },
    security_integrity: fraud
      ? {
          signature_transaction_valide: i % 4 !== 0,
          certificat_valide: i % 3 !== 0,
          score_confiance_client_api: 0.1 + (i % 8) * 0.04,
        }
      : {
          signature_transaction_valide: true,
          certificat_valide: i % 23 !== 0,
          score_confiance_client_api: 0.82 + (i % 15) * 0.01,
        },
  };
}

function buildOne(i: number, fraud: boolean): Transaction {
  return {
    transaction_event: buildTransactionEvent(i, fraud),
    target_labels: {
      cible_fraude: fraud,
      cible_session_anormale: fraud || i % 11 === 0,
      cible_comportement_atypique: fraud || i % 15 === 0,
    },
  };
}

/** 100 transactions démo : 20 frauduleuses, 80 valides — flux majoritairement intra-RDC. */
export const mockTransactions: Transaction[] = [
  ...Array.from({ length: 20 }, (_, k) => buildOne(k, true)),
  ...Array.from({ length: 80 }, (_, k) => buildOne(20 + k, false)),
];
