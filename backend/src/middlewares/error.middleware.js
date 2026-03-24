const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

function notFoundHandler(req, res) {
  sendError(
    res,
    `Route introuvable : ${req.method} ${req.originalUrl}`,
    404,
    'NOT_FOUND'
  );
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  logger.error(
    {
      err: err.message,
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
    },
    'Erreur non gérée'
  );

  const status = err.statusCode || err.status || 500;
  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message || 'Erreur interne du serveur';

  sendError(res, message, status, err.code || 'INTERNAL_ERROR');
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
