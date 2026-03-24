const config = require('../config');

function format(level, msg, meta) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  if (meta !== undefined) return `${line} ${JSON.stringify(meta)}`;
  return line;
}

module.exports = {
  info: (msg, meta) => {
    // eslint-disable-next-line no-console
    console.log(format('INFO', msg, meta));
  },
  warn: (msg, meta) => {
    console.warn(format('WARN', msg, meta));
  },
  error: (msg, meta) => {
    console.error(format('ERROR', msg, meta));
  },
  debug: (msg, meta) => {
    if (config.nodeEnv === 'development') {
      // eslint-disable-next-line no-console
      console.debug(format('DEBUG', msg, meta));
    }
  },
};
