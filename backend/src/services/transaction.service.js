const featureService = require('./feature.service');
const scoringService = require('./scoring.service');
const policyService = require('./policy.service');
const transactionPersistence = require('./transactionPersistence.service');
const transactionView = require('../views/transaction.view');

function throwPersistError(p) {
  const err = new Error(
    p.message ||
      (typeof p.error === 'string' ? p.error : 'Erreur de persistance')
  );
  err.statusCode = p.statusCode;
  err.code = typeof p.error === 'string' ? p.error : 'PERSISTENCE_ERROR';
  throw err;
}

/**
 * Orchestration : features → scoring M1/M2/M3 → politique (stub) → persistance optionnelle.
 * @param {object} payload Corps de requête (transaction_event partiel)
 */
async function evaluateTransaction(payload) {
  const features = await featureService.buildFeatureVector(payload);
  const scores = await scoringService.runModels(features);
  const decision = policyService.applyPolicy(scores);

  const persistence = await transactionPersistence.persistEvaluate(payload, {
    scores,
    decision,
  });

  if (persistence.error && persistence.statusCode) {
    throwPersistError(persistence);
  }

  return transactionView.toEvaluateResponse({
    features,
    scores,
    decision,
    persistence,
  });
}

module.exports = {
  evaluateTransaction,
};
