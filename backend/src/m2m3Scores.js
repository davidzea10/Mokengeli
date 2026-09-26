/**
 * M2 (session) et M3 (comportement) — simulation démo.
 * Score aléatoire uniforme entre 1 % et 30 % (0.01 … 0.30) à chaque évaluation.
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
 * Politique combinée : moyenne M1/M2/M3, seuil 0.5 → challenge.
 */
export function combineScores(m1Proba, m2, m3) {
  const s1 = clamp01(m1Proba);
  const s2 = clamp01(m2?.score);
  const s3 = clamp01(m3?.score);
  const combined = clamp01((s1 + s2 + s3) / 3);
  const decision = combined >= 0.5 ? 'challenge' : 'allow';
  const reason_codes = [
    ...(m1Proba >= 0.5 ? ['m1_fraude'] : []),
    ...((m2?.reasons || []).slice(0, 3)),
    ...((m3?.reasons || []).slice(0, 3)),
  ];
  return { score_combined: combined, decision, reason_codes };
}
