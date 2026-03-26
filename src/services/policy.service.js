/**
 * Combine les scores et applique policy_config (stub).
 */
function applyPolicy(scores) {
  const combined =
    (scores.score_m1_transaction +
      scores.score_m2_session +
      scores.score_m3_behavior) /
    3;

  return {
    score_combined: Number(combined.toFixed(4)),
    decision: combined < 0.5 ? 'allow' : 'challenge',
    reason_codes: ['STUB_NO_POLICY'],
  };
}

module.exports = {
  applyPolicy,
};
