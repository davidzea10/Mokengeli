import type { Transaction } from '../types';

/**
 * @deprecated Conservé pour compatibilité — ne plus utiliser (plus d'heuristique +10/+5/+8 %).
 */
export function calculateHeuristicRiskScore(_tx: Transaction): number {
  return 0;
}

/** Score affiché : uniquement `score_combine` API (`_api.riskPercent`), sinon 0 (pas de maquette). */
export function getTransactionRiskPercent(tx: Transaction): number {
  const r = tx._api?.riskPercent;
  if (r != null && Number.isFinite(r)) return r;
  return 0;
}
