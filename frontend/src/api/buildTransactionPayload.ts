import type { ApiTransactionDocument } from './transactionPayloadEnglish';

export interface ClientFormLike {
  montant: string;
  type_transaction: string;
  beneficiaire: string;
  canal: string;
  heure: number;
  beneficiaire_nouveau: boolean;
  changement_appareil: boolean;
  ip_pays_inhabituel: boolean;
}

/**
 * Builds an API transaction document (English JSON keys) from the client form.
 * See docs/transaction_schema.json (English field names).
 */
export function buildTransactionFromClientForm(
  form: ClientFormLike,
  profileId: string,
  transactionNumber: string
): ApiTransactionDocument {
  const now = new Date();
  const amount = parseFloat(form.montant) || 0;

  return {
    transaction_event: {
      metadata: {
        transaction_date: now.toISOString(),
        transaction_number: transactionNumber,
        client_id: profileId,
        amount,
        currency: 'FC',
        hour: form.heure,
        weekday: now.getDay(),
        transaction_type: form.type_transaction,
        channel: form.canal,
      },
      network_intelligence: {
        ip_reputation_score: 0.85,
        ip_datacenter: false,
        unusual_country_ip: form.ip_pays_inhabituel,
        ip_blacklisted: false,
      },
      anonymization_detection: {
        tor_detected: false,
        vpn_detected: false,
        proxy_detected: false,
      },
      behavioral_biometrics_ueba: {
        session_duration_min: 15,
        session_screens_count: 3,
        otp_delay_s: 45,
        failed_logins_24h: 0,
        typing_speed: 50,
        mouse_entropy: 0.65,
        requests_per_minute: 4,
      },
      engineered_features_profiling: {
        velocity_24h: amount,
        amount_median_ratio_30d: 1,
        new_beneficiary: form.beneficiaire_nouveau,
        habit_distance_km: 5,
        device_change: form.changement_appareil,
      },
      relational_graph_features: {
        client_degree: 3,
        fraudulent_neighbors_count: 0,
        network_score: 0.85,
      },
      security_integrity: {
        transaction_signature_valid: true,
        certificate_valid: true,
        client_api_trust_score: 0.92,
      },
    },
    target_labels: {
      fraud_target: false,
      abnormal_session_target: false,
      atypical_behavior_target: false,
    },
  };
}
