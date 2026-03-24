require('dotenv').config();

const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');

app.listen(config.port, () => {
  logger.info(`MOKENGELI API — écoute sur le port ${config.port} (${config.nodeEnv})`);
});
