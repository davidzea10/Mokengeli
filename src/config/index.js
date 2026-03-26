const path = require('path');

function parseOrigins(value) {
  if (!value || typeof value !== 'string') return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Racine du dépôt (Mokengeli/) : backend/src/config → ../../../ */
const repoRoot = path.join(__dirname, '..', '..', '..');

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  /** Chemin public (hackathon / Vercel) : HTTPS sans cert client */
  publicPort: parseInt(process.env.PORT, 10) || 3000,
  /** Écouter aussi le chemin mTLS (deuxième listener) */
  mtlsEnabled: process.env.MTLS_ENABLED === 'true',
  /** Port du listener mTLS */
  mtlsPort: parseInt(process.env.MTLS_PORT, 10) || 8443,
  /** Dossier des certificats (défaut : certs/ à la racine du dépôt) */
  certsDir: process.env.CERTS_DIR
    ? path.resolve(process.cwd(), process.env.CERTS_DIR)
    : path.join(repoRoot, 'certs'),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  /** Secret JWT du projet Supabase (Dashboard → Settings → API → JWT Secret) — pour valider les access_token Auth */
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET || '',
  authDisabled: process.env.AUTH_DISABLED === 'true',
  /** JWT signés localement (dev / tests sans Supabase Auth) */
  jwtSecret: process.env.JWT_SECRET || '',
  apiKeySimulation: process.env.API_KEY_SIMULATION || '',
  apiKeyAnalyst: process.env.API_KEY_ANALYST || '',
};
