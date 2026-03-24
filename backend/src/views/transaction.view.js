/**
 * Présentation « vue » API — masque les données internes si besoin.
 */
function toEvaluateResponse({ features, scores, decision }) {
  return {
    scoring: {
      ...scores,
      ...decision,
    },
    features_preview: features?.transaction_event ? 'présent' : 'vide',
  };
}

module.exports = {
  toEvaluateResponse,
};
