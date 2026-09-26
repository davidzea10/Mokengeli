/**
 * M2 (session) et M3 (comportement) — simulation démo.
 * Score aléatoire uniforme entre 1 % et 30 % (0.01 … 0.30) à chaque évaluation.
 *
 * Décision (moyenne M1/M2/M3, échelle 0–1) :
 * - 0.00–0.39 → allow
 * - 0.40–0.69 → challenge (OTP)
 * - 0.70–1.00 → block
 */

function clamp01(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Aléatoire inclusif [min, max], arrondi à 4 décimales. */
function randomBetween(min, max) {
  const v = min + Math.random() * (max - min);
  return Math.round(v * 10000) / 10000;
}

const SIM_MIN = 0.01; // 1 %
const SIM_MAX = 0.3; // 30 %

const THRESHOLD_OTP = 0.4; // 40 %
const THRESHOLD_BLOCK = 0.7; // 70 %

/**
 * M2 — score session simulé (1 %–30 %).
 * @param {Record<string, number>} [_f] features (ignorées en mode simulation)
 */
export function scoreM2Session(_f) {
  const score = randomBetween(SIM_MIN, SIM_MAX);
  return {
    score,
    model: 'm2-simulation-session-0.2',
    reasons: ['m2_simulation'],
  };
}

/**
 * M3 — score comportement simulé (1 %–30 %).
 * @param {Record<string, number>} [_f] features (ignorées en mode simulation)
 */
export function scoreM3Behavior(_f) {
  const score = randomBetween(SIM_MIN, SIM_MAX);
  return {
    score,
    model: 'm3-simulation-comportement-0.2',
    reasons: ['m3_simulation'],
  };
}

/**
 * Politique combinée : moyenne M1/M2/M3 → allow / challenge (OTP) / block.
 */
export function combineScores(m1Proba, m2, m3) {
  const s1 = clamp01(m1Proba);
  const s2 = clamp01(m2?.score);
  const s3 = clamp01(m3?.score);
  const combined = clamp01((s1 + s2 + s3) / 3);

  let decision = 'allow';
  if (combined >= THRESHOLD_BLOCK) decision = 'block';
  else if (combined >= THRESHOLD_OTP) decision = 'challenge';

  const reason_codes = [
    ...(s1 >= THRESHOLD_BLOCK ? ['m1_fraude'] : []),
    ...(decision === 'challenge' ? ['otp_required'] : []),
    ...(decision === 'block' ? ['score_combine_block'] : []),
    ...((m2?.reasons || []).slice(0, 2)),
    ...((m3?.reasons || []).slice(0, 2)),
  ];

  return { score_combined: combined, decision, reason_codes };
}

export { THRESHOLD_OTP, THRESHOLD_BLOCK };
