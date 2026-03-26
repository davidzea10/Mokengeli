require('dotenv').config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const { buildApp } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const certsDir = config.certsDir;
const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');
const caPath = path.join(certsDir, 'ca-chain.crt');

function readTlsMaterial() {
  try {
    const key = fs.readFileSync(keyPath);
    const cert = fs.readFileSync(certPath);
    return { key, cert, ok: true };
  } catch (err) {
    return { ok: false, err };
  }
}

const tls = readTlsMaterial();
const allowHttpFallback =
  config.nodeEnv === 'development' ||
  process.env.ALLOW_HTTP_WITHOUT_TLS === 'true';

const publicApp = buildApp('public');

if (tls.ok) {
  const publicTls = { key: tls.key, cert: tls.cert };
  https
    .createServer(publicTls, publicApp)
    .listen(config.publicPort, () => {
      logger.info(
        {
          port: config.publicPort,
          env: config.nodeEnv,
          path: 'public',
          mtls: false,
          certsDir,
        },
        'MOKENGELI API — HTTPS public (sans mTLS) — /health et /api/v1/*'
      );
    });
} else if (allowHttpFallback) {
  logger.warn(
    {
      err: tls.err?.message,
      certsDir,
      keyPath,
      certPath,
    },
    'Certificats TLS absents — démarrage en HTTP (OK pour le dev local). En prod, placez server.key / server.crt dans certs/ ou définissez CERTS_DIR.'
  );
  http.createServer(publicApp).listen(config.publicPort, () => {
    logger.info(
      {
        port: config.publicPort,
        env: config.nodeEnv,
        path: 'public',
        scheme: 'http',
      },
      'MOKENGELI API — HTTP — /health et /api/v1/*'
    );
  });
} else {
  logger.fatal(
    {
      err: tls.err?.message,
      certsDir,
      keyPath,
      certPath,
    },
    'Impossible de charger server.key / server.crt (nécessaires pour HTTPS en production)'
  );
  process.exit(1);
}

if (config.mtlsEnabled) {
  if (!tls.ok) {
    logger.warn(
      { certsDir },
      'MTLS_ENABLED=true ignoré : certificats serveur absents (démarrez avec TLS ou désactivez MTLS_ENABLED)'
    );
  } else {
    let ca;
    try {
      ca = fs.readFileSync(caPath);
    } catch (err) {
      logger.fatal(
        { err: err.message, caPath },
        'MTLS_ENABLED=true mais impossible de charger ca-chain.crt'
      );
      process.exit(1);
    }

    const mtlsApp = buildApp('mtls');
    const mtlsTls = {
      key: tls.key,
      cert: tls.cert,
      ca,
      requestCert: true,
      rejectUnauthorized: true,
    };

    https
      .createServer(mtlsTls, mtlsApp)
      .listen(config.mtlsPort, () => {
        logger.info(
          {
            port: config.mtlsPort,
            env: config.nodeEnv,
            path: 'mtls',
            mtls: true,
            certsDir,
          },
          'MOKENGELI API — HTTPS mTLS (cert client obligatoire) — même routes'
        );
      });
  }
}
