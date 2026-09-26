/**
 * Politique de décision Mokengeli (score combiné = moyenne M1/M2/M3).
 * Échelle 0–100 % :
 * - 0–39  → allow (transaction autorisée)
 * - 40–69 → challenge (OTP envoyé au client)
 * - 70–100 → block (transaction bloquée)
 */

export type PolicyDecision = 'allow' | 'challenge' | 'block';

export const DECISION_THRESHOLD_OTP = 40;
export const DECISION_THRESHOLD_BLOCK = 70;

/** Convertit un score 0–1 ou 0–100 en pourcentage 0–100. */
export function toCombinedPercent(raw: number | null | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 0;
  const pct = raw <= 1 ? raw * 100 : raw;
  return Math.min(100, Math.max(0, pct));
}

export function decisionFromCombinedScore(raw: number | null | undefined): PolicyDecision {
  const pct = toCombinedPercent(raw);
  if (pct >= DECISION_THRESHOLD_BLOCK) return 'block';
  if (pct >= DECISION_THRESHOLD_OTP) return 'challenge';
  return 'allow';
}

export function decisionLabelFr(decision: string | null | undefined): string {
  switch (String(decision || '').toLowerCase()) {
    case 'allow':
      return 'Autorisée';
    case 'challenge':
      return 'OTP requis';
    case 'block':
    case 'deny':
      return 'Bloquée';
    default:
      return '—';
  }
}

export function decisionBadgeClasses(decision: string | null | undefined): string {
  switch (String(decision || '').toLowerCase()) {
    case 'allow':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'challenge':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    case 'block':
    case 'deny':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

/**
 * Fraude / alerte pour le tableau de bord :
 * block/deny, challenge (OTP), ou score combiné ≥ 70 %.
 */
export function isFraudTransaction(tx: {
  target_labels?: { cible_fraude?: boolean };
  _api?: { decision?: string | null; riskPercent?: number };
}): boolean {
  if (tx.target_labels?.cible_fraude) return true;
  const d = String(tx._api?.decision || '').toLowerCase();
  if (d === 'block' || d === 'deny' || d === 'challenge') return true;
  const risk = tx._api?.riskPercent;
  if (typeof risk === 'number' && risk >= DECISION_THRESHOLD_BLOCK) return true;
  return false;
}
