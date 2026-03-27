import type { Transaction } from '../types';

/** Score heuristique (maquettes) lorsque `_api.riskPercent` est absent. */
export function calculateHeuristicRiskScore(tx: Transaction): number {
  let score = 0;
  const event = tx.transaction_event;

  if (event.network_intelligence.ip_sur_liste_noire) score += 10;
  if (event.network_intelligence.ip_datacenter) score += 5;
  if (event.network_intelligence.ip_pays_inhabituel) score += 5;
  if (event.network_intelligence.score_reputation_ip < 0.3) score += 5;

  if (event.anonymization_detection.tor_detecte) score += 10;
  if (event.anonymization_detection.vpn_detecte) score += 8;
  if (event.anonymization_detection.proxy_detecte) score += 7;

  if (event.behavioral_biometrics_ueba.nb_echecs_login_24h > 3) score += 8;
  if (event.behavioral_biometrics_ueba.nombre_requetes_par_minute > 10) score += 6;
  if (event.behavioral_biometrics_ueba.vitesse_frappe < 20) score += 6;

  if (event.engineered_features_profiling.beneficiaire_nouveau) score += 5;
  if (event.engineered_features_profiling.changement_appareil) score += 5;
  if (event.engineered_features_profiling.vitesse_24h > 1000) score += 5;

  if (event.relational_graph_features.nb_voisins_frauduleux > 2) score += 10;

  if (!event.security_integrity.signature_transaction_valide) score += 3;
  if (!event.security_integrity.certificat_valide) score += 2;

  return Math.min(score, 100);
}

/** Score affiché : priorité au score combiné API. */
export function getTransactionRiskPercent(tx: Transaction): number {
  if (tx._api?.riskPercent != null) return tx._api.riskPercent;
  return calculateHeuristicRiskScore(tx);
}
