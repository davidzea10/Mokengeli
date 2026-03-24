/**
 * Création / mise à jour session — stub.
 */
async function upsertSession(body) {
  return {
    source: 'stub',
    message: 'Session enregistrée (à brancher sur models/session + Supabase)',
    received: body,
  };
}

module.exports = {
  upsertSession,
};
