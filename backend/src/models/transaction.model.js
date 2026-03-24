const { getSupabase } = require('../config/supabase');

async function insertTransaction(row) {
  const db = getSupabase();
  if (!db) {
    return { skipped: true, reason: 'SUPABASE_NOT_CONFIGURED' };
  }
  return null;
}

module.exports = {
  insertTransaction,
};
