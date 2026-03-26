const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

let client = null;

/**
 * Client Supabase (service role). Retourne null si les variables ne sont pas définies.
 */
function getSupabase() {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return null;
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

module.exports = { getSupabase };
