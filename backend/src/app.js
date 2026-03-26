const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./utils/logger');
const routes = require('./routes');
const healthController = require('./controllers/health.controller');
const { requireClientCert } = require('./middlewares/mtls.middleware');
const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

/**
 * @param {'public' | 'mtls'} mode — public : HTTPS sans cert client ; mtls : mTLS obligatoire
 */
function buildApp(mode) {
  const app = express();
  app.locals.serverMode = mode;

  app.set('trust proxy', 1);

  if (mode === 'mtls') {
    app.use(requireClientCert);
  }

  const corsOptions = {
    credentials: true,
    origin:
      config.corsOrigins.length > 0
        ? config.corsOrigins
        : true,
  };

  app.use(cors(corsOptions));

  const tlsSubjectProps =
    mode === 'mtls'
      ? function (req) {
          try {
            const socket = req.socket;
            if (!socket || typeof socket.getPeerCertificate !== 'function') {
              return {};
            }
            const peer = socket.getPeerCertificate(true);
            if (!peer || !peer.subject) {
              return {};
            }
            const subj = peer.subject;
            return {
              tlsClientSubject:
                typeof subj === 'object' && subj !== null
                  ? { ...subj }
                  : String(subj),
            };
          } catch {
            return {};
          }
        }
      : function () {
          return {};
        };

  app.use(
    pinoHttp({
      logger,
      autoLogging: true,
      customLogLevel: function (res, err) {
        if (res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customProps: tlsSubjectProps,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', healthController.getHealth);
  app.get('/health/supabase', healthController.getSupabasePing);

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { buildApp };
