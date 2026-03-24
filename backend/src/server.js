require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

app.listen(config.port, () => {
  logger.info(
    { port: config.port, env: config.nodeEnv },
    'MOKENGELI API prête — routes /health et /api/v1/*'
  );
});
