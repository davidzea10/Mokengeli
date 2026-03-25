/**
 * Transaction document for API (JSON keys in English).
 * Mirrors docs/transaction_schema.json with English key names.
 */

export interface TransactionMetadataEn {
  transaction_date: string;
  transaction_number: string;
  client_id: string;
  amount: number;
  currency: string;
  hour: number;
  weekday: number;
  transaction_type: string;
  channel: string;
}

export interface NetworkIntelligenceEn {
  ip_reputation_score: number;
  ip_datacenter: boolean;
  unusual_country_ip: boolean;
  ip_blacklisted: boolean;
}

export interface AnonymizationDetectionEn {
  tor_detected: boolean;
  vpn_detected: boolean;
  proxy_detected: boolean;
}

export interface BehavioralBiometricsUebaEn {
  session_duration_min: number;
  session_screens_count: number;
  otp_delay_s: number;
  failed_logins_24h: number;
  typing_speed: number;
  mouse_entropy: number;
  requests_per_minute: number;
}

export interface EngineeredFeaturesProfilingEn {
  velocity_24h: number;
  amount_median_ratio_30d: number;
  new_beneficiary: boolean;
  habit_distance_km: number;
  device_change: boolean;
}

export interface RelationalGraphFeaturesEn {
  client_degree: number;
  fraudulent_neighbors_count: number;
  network_score: number;
}

export interface SecurityIntegrityEn {
  transaction_signature_valid: boolean;
  certificate_valid: boolean;
  client_api_trust_score: number;
}

export interface TransactionEventEn {
  metadata: TransactionMetadataEn;
  network_intelligence: NetworkIntelligenceEn;
  anonymization_detection: AnonymizationDetectionEn;
  behavioral_biometrics_ueba: BehavioralBiometricsUebaEn;
  engineered_features_profiling: EngineeredFeaturesProfilingEn;
  relational_graph_features: RelationalGraphFeaturesEn;
  security_integrity: SecurityIntegrityEn;
}

export interface TargetLabelsEn {
  fraud_target: boolean;
  abnormal_session_target: boolean;
  atypical_behavior_target: boolean;
}

export interface ApiTransactionDocument {
  transaction_event: TransactionEventEn;
  target_labels: TargetLabelsEn;
}
