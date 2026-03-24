/**
 * Construction du vecteur de features (Strategie / transaction_schema).
 * Stub : renvoie le payload encapsulé — à remplacer par agrégats Supabase + enrichissement.
 */
async function buildFeatureVector(payload) {
  return {
    source: 'stub',
    transaction_event: payload?.transaction_event || payload || {},
  };
}

module.exports = {
  buildFeatureVector,
};
