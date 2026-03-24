const { sendSuccess } = require('../utils/response');

function getHealth(req, res) {
  sendSuccess(res, {
    status: 'ok',
    service: 'mokengeli-backend',
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  getHealth,
};
