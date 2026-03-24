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
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
