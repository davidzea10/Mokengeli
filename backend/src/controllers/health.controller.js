const config = require('../config');
const { sendSuccess } = require('../utils/response');

function getHealth(req, res) {
  if (req.app.locals.serverMode === 'mtls') {
    return res.status(200).json({
      status: 'secure',
      mtls: true,
    });
  }

  const supabaseConfigured = Boolean(
    config.supabaseUrl && config.supabaseServiceKey
  );
  return sendSuccess(res, {
    status: 'ok',
    service: 'mokengeli-backend',
    environment: config.nodeEnv,
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
    supabase: { configured: supabaseConfigured },
  });
}

/**
 * Vérifie que le projet Supabase répond (endpoint Auth /health), sans aucune table applicative.
 */
async function getSupabasePing(req, res) {
  if (!config.supabaseUrl || !config.supabaseServiceKey) {
    return sendSuccess(res, {
      supabase: {
        configured: false,
        reachable: null,
        note: 'Définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env',
      },
    });
  }

  const base = config.supabaseUrl.replace(/\/$/, '');
  const url = `${base}/auth/v1/health`;

  try {
    const r = await fetch(url, {
      headers: {
        apikey: config.supabaseServiceKey,
        Authorization: `Bearer ${config.supabaseServiceKey}`,
      },
    });
    const text = await r.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return sendSuccess(res, {
      supabase: {
        configured: true,
        reachable: r.ok,
        status: r.status,
        authHealth: body,
      },
    });
  } catch (err) {
    return sendSuccess(res, {
      supabase: {
        configured: true,
        reachable: false,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

module.exports = {
  getHealth,
  getSupabasePing,
};
