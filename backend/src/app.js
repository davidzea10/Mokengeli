const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const healthController = require('./controllers/health.controller');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

const corsOptions = {
  credentials: true,
  origin:
    config.corsOrigins.length > 0
      ? config.corsOrigins
      : true,
};

app.use(cors(corsOptions));

app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    customLogLevel: function (res, err) {
      if (res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  })
);

app.use(express.json({ limit: '1mb' }));

/** Santé (sans préfixe) — pratique pour healthchecks Render / Docker */
app.get('/health', healthController.getHealth);
app.get('/health/supabase', healthController.getSupabasePing);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
