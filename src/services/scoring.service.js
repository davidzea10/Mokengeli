/**
 * Chargement joblib / inférence — stub avec scores factices.
 */
async function runModels(featureVector) {
  return {
    score_m1_transaction: 0.1,
    score_m2_session: 0.05,
    score_m3_behavior: 0.08,
    model_versions: {
      m1: 'stub-0.1.0',
      m2: 'stub-0.1.0',
      m3: 'stub-0.1.0',
    },
    note: 'Remplacer par chargement ml/exports/*.joblib',
  };
}

module.exports = {
  runModels,
};
