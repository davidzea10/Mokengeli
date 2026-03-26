const jwt = require('jsonwebtoken');

const config = require('../config');
const { sendError } = require('../utils/response');

function extractAuth(req) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return { kind: 'jwt', token: authHeader.slice('Bearer '.length).trim() };
  }

  const apiKey =
    req.headers['x-api-key'] ||
    req.headers['X-API-KEY'] ||
    req.headers['xApiKey'] ||
    '';

  if (typeof apiKey === 'string' && apiKey.trim().length > 0) {
    return { kind: 'apiKey', apiKey: apiKey.trim() };
  }

  return { kind: null };
}

/**
 * Authentification + contrôle de rôle.
 *
 * Rôle attendus :
 * - `simulation` : front client démo (Simulation banque)
 * - `analyste` : front admin (Back-office analyste)
 *
 * Auth possible :
 * - `Authorization: Bearer <token>` (JWT)
 *   - Supabase Auth : access_token vérifié avec SUPABASE_JWT_SECRET ; rôle dans
 *     `user_metadata.mokengeli_role` ou `app_metadata.mokengeli_role` (`simulation` | `analyste`)
 *   - Sinon : JWT local signé avec JWT_SECRET et claim `role`
 * - `x-api-key: <key>` (clé API, rôles via variables d'env)
 */
function extractRoleFromJwtPayload(decoded) {
  const fromSupabase =
    decoded?.user_metadata?.mokengeli_role ||
    decoded?.app_metadata?.mokengeli_role;
  if (fromSupabase === 'simulation' || fromSupabase === 'analyste') {
    return fromSupabase;
  }
  const legacy = decoded?.role;
  if (legacy === 'simulation' || legacy === 'analyste') {
    return legacy;
  }
  return null;
}

function verifyBearerJwt(token) {
  if (config.supabaseJwtSecret) {
    try {
      return jwt.verify(token, config.supabaseJwtSecret, { algorithms: ['HS256'] });
    } catch {
      /* essai JWT local */
    }
  }
  if (config.jwtSecret) {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  }
  throw new Error('NO_JWT_SECRET');
}

function requireAuth(allowedRoles = []) {
  const whitelist = Array.isArray(allowedRoles) ? allowedRoles : [];

  return (req, res, next) => {
    if (config.authDisabled) {
      return next();
    }

    const extracted = extractAuth(req);
    if (!extracted.kind) {
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }

    try {
      if (extracted.kind === 'jwt') {
        if (!config.supabaseJwtSecret && !config.jwtSecret) {
          return sendError(res, 'Auth JWT non configurée', 500, 'AUTH_MISCONFIG');
        }

        let decoded;
        try {
          decoded = verifyBearerJwt(extracted.token);
        } catch (err) {
          if (err.message === 'NO_JWT_SECRET') {
            return sendError(res, 'Auth JWT non configurée', 500, 'AUTH_MISCONFIG');
          }
          return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
        }

        const role = extractRoleFromJwtPayload(decoded);

        if (!role) {
          return sendError(
            res,
            'Rôle applicatif manquant (définir user_metadata.mokengeli_role ou app_metadata.mokengeli_role, ou claim role pour JWT local)',
            403,
            'FORBIDDEN'
          );
        }

        if (whitelist.length > 0 && !whitelist.includes(role)) {
          return sendError(res, 'Accès interdit pour ce rôle', 403, 'FORBIDDEN');
        }

        req.auth = { role, sub: decoded?.sub };
        return next();
      }

      if (extracted.kind === 'apiKey') {
        const { apiKey } = extracted;

        const role =
          config.apiKeySimulation && apiKey === config.apiKeySimulation
            ? 'simulation'
            : config.apiKeyAnalyst && apiKey === config.apiKeyAnalyst
              ? 'analyste'
              : null;

        if (!role) {
          return sendError(res, 'Clé API invalide', 401, 'UNAUTHORIZED');
        }

        if (whitelist.length > 0 && !whitelist.includes(role)) {
          return sendError(res, 'Accès interdit pour ce rôle', 403, 'FORBIDDEN');
        }

        req.auth = { role, sub: apiKey };
        return next();
      }

      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    } catch (err) {
      // Important : ne jamais renvoyer le token dans les logs/réponses.
      return sendError(res, 'Non authentifié', 401, 'UNAUTHORIZED');
    }
  };
}

module.exports = {
  requireAuth,
};
