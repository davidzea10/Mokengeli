/**
 * Authentification JWT ou clé API — à implémenter (étape suivante).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireAuth(req, res, next) {
  next();
}

module.exports = {
  requireAuth,
};
