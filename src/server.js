require('dotenv').config();

const fs = require('fs');
const https = require('https');
const path = require('path');

const { buildApp } = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

const certsDir = config.certsDir;
const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');
const caPath = path.join(certsDir, 'ca-chain.crt');

let key;
let cert;
try {
  key = fs.readFileSync(keyPath);
  cert = fs.readFileSync(certPath);
} catch (err) {
  logger.fatal(
    { err: err.message, certsDir, keyPath, certPath },
    'Impossible de charger server.key / server.crt (nécessaires pour HTTPS public)'
  );
  process.exit(1);
}

const publicApp = buildApp('public');
const publicTls = { key, cert };

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

if (config.mtlsEnabled) {
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
    key,
    cert,
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
