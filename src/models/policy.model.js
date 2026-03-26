const { getSupabase } = require('../config/supabase');

async function getActivePolicy() {
  const db = getSupabase();
  if (!db) return null;
  return null;
}

module.exports = {
  getActivePolicy,
};
