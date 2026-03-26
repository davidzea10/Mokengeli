const sessionService = require('../services/session.service');
const { sendSuccess } = require('../utils/response');

async function createOrUpdate(req, res, next) {
  try {
    const result = await sessionService.upsertSession(req.body);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrUpdate,
};
