const { getSupabase } = require('../config/supabase');

async function findById(id) {
  const db = getSupabase();
  if (!db) return null;
  return null;
}

module.exports = {
  findById,
};
