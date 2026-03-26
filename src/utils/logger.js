const pino = require('pino');
const config = require('../config');

/**
 * Logger structuré (Pino). Niveau : LOG_LEVEL ou debug hors production.
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (config.nodeEnv === 'production' ? 'info' : 'debug'),
  base: {
    service: 'mokengeli-backend',
  },
  // Evite de journaliser les secrets transmis via en-têtes (tokens, clés API).
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.x-api-key',
      'req.body.token',
      'req.body.authorization',
      'req.body.apiKey',
    ],
    remove: true,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
