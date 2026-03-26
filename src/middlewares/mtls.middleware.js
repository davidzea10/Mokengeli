/**
 * Secours : si la couche TLS laisse passer une connexion sans client cert valide,
 * on refuse avant d’atteindre le reste de l’API.
 */
function requireClientCert(req, res, next) {
  const socket = req.socket;
  if (!socket || typeof socket.authorized !== 'boolean') {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Connexion TLS invalide',
        code: 'MTLS_REQUIRED',
      },
    });
  }

  if (!socket.authorized) {
    return res.status(403).json({
      success: false,
      error: {
        message: 'Certificat client requis ou non reconnu par la CA',
        code: 'MTLS_REQUIRED',
      },
    });
  }

  return next();
}

module.exports = {
  requireClientCert,
};
