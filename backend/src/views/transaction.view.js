/**
 * Présentation « vue » API — masque les données internes si besoin.
 */
function toEvaluateResponse({ features, scores, decision, persistence }) {
  let persistenceOut = { status: 'skipped', reason: 'UNKNOWN' };
  if (persistence) {
    if (persistence.skipped) {
      persistenceOut = { status: 'skipped', reason: persistence.reason };
    } else if (persistence.persisted) {
      persistenceOut = {
        status: 'persisted',
        transaction_id: persistence.transaction_id,
        numero_transaction: persistence.numero_transaction,
      };
    }
  }

  return {
    scoring: {
      ...scores,
      ...decision,
    },
    features_preview: features?.transaction_event ? 'présent' : 'vide',
    persistence: persistenceOut,
  };
}

module.exports = {
  toEvaluateResponse,
};
