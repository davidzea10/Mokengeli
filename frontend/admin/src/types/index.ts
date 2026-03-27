import type { AdminTransactionRow } from '../api/adminApi';

/** Point géographique pour l’origine ou la destination d’un flux de fonds */
export interface TransactionGeoPoint {
  lat: number;
  lng: number;
  /** Rôle affiché sur la carte (émetteur / bénéficiaire) */
  label: string;
  city: string;
  countryCode: string;
}

/** Trajet approximatif entre parties (coordonnées issues du canal / KYC géolocalisé) */
export interface TransactionRoute {
  sender: TransactionGeoPoint;
  receiver: TransactionGeoPoint;
}

/** Expéditeur / destinataire pour affichage tableau (client qui envoie vs bénéficiaire). */
export interface TransactionPartyDisplay {
  nom: string;
  compte_ou_numero: string;
  /** Banque (compte) vs mobile money (numéro). */
  mode: 'banque' | 'mobile' | '—';
}

export interface TransactionParties {
  expediteur: TransactionPartyDisplay;
  destinataire: TransactionPartyDisplay;
}

export interface TransactionMetadata {
  date_transaction: string;
  numero_transaction: string;
  id_client: string;
  montant: number;
  devise: string;
  heure: number;
  jour_semaine: number;
  type_transaction: string;
  canal: string;
  /** Présent si la transaction est géolocalisée pour la traçabilité */
  route?: TransactionRoute;
  /** Présent si données API ou maquette enrichie. */
  parties?: TransactionParties;
}

export interface NetworkIntelligence {
  score_reputation_ip: number;
  ip_datacenter: boolean;
  ip_pays_inhabituel: boolean;
  ip_sur_liste_noire: boolean;
}

export interface AnonymizationDetection {
  tor_detecte: boolean;
  vpn_detecte: boolean;
  proxy_detecte: boolean;
}

export interface BehavioralBiometrics {
  duree_session_min: number;
  nb_ecrans_session: number;
  delai_otp_s: number;
  nb_echecs_login_24h: number;
  vitesse_frappe: number;
  entropie_souris: number;
  nombre_requetes_par_minute: number;
}

export interface EngineeredFeatures {
  vitesse_24h: number;
  ratio_montant_median_30j: number;
  beneficiaire_nouveau: boolean;
  distance_km_habitude: number;
  changement_appareil: boolean;
}

export interface RelationalGraph {
  degre_client: number;
  nb_voisins_frauduleux: number;
  score_reseau: number;
}

export interface SecurityIntegrity {
  signature_transaction_valide: boolean;
  certificat_valide: boolean;
  score_confiance_client_api: number;
}

export interface TransactionEvent {
  metadata: TransactionMetadata;
  network_intelligence: NetworkIntelligence;
  anonymization_detection: AnonymizationDetection;
  behavioral_biometrics_ueba: BehavioralBiometrics;
  engineered_features_profiling: EngineeredFeatures;
  relational_graph_features: RelationalGraph;
  security_integrity: SecurityIntegrity;
}

export interface TargetLabels {
  cible_fraude: boolean;
  cible_session_anormale: boolean;
  cible_comportement_atypique: boolean;
}

export interface Transaction {
  transaction_event: TransactionEvent;
  target_labels: TargetLabels;
  /** Données issues de l’API admin (liste réelle). */
  _api?: {
    id: string;
    riskPercent: number;
    decision: string | null;
    /** Scores modèles 0–100 (null si absents côté API). */
    scoreTransaction?: number | null;
    scoreSession?: number | null;
    scoreComportement?: number | null;
  };
  /** Ligne API brute pour la modale détail (client, bénéficiaire, session, scores). */
  _adminSource?: AdminTransactionRow;
}

export interface DashboardStats {
  totalTransactions: number;
  fraudDetected: number;
  riskScore: number;
  recentAlerts: number;
}

export interface RiskLevel {
  score: number;
  label: 'low' | 'medium' | 'high' | 'critical';
  color: string;
}
