const featureService = require('./feature.service');
const scoringService = require('./scoring.service');
const policyService = require('./policy.service');
const transactionView = require('../views/transaction.view');

/**
 * Orchestration : features → scoring M1/M2/M3 → politique (stub).
 * @param {object} payload Corps de requête (transaction_event partiel)
 */
async function evaluateTransaction(payload) {
  const features = await featureService.buildFeatureVector(payload);
  const scores = await scoringService.runModels(features);
  const decision = policyService.applyPolicy(scores);

  return transactionView.toEvaluateResponse({
    features,
    scores,
    decision,
  });
}

module.exports = {
  evaluateTransaction,
};
