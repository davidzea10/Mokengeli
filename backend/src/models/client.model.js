const { getSupabase } = require('../config/supabase');

async function findByExternalRef(ref) {
  const db = getSupabase();
  if (!db) return null;
  // const { data, error } = await db.from('clients').select('*').eq('reference_client', ref).single();
  return null;
}

module.exports = {
  findByExternalRef,
};
