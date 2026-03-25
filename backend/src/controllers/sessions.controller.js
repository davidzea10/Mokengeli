const sessionService = require('../services/session.service');
const { sendSuccess, sendError } = require('../utils/response');

async function createOrUpdate(req, res, next) {
  try {
    const result = await sessionService.upsertSession(req.body);
    if (result.unavailable) {
      const err = new Error(
        'Base de données indisponible : configurer Supabase dans .env'
      );
      err.statusCode = 503;
      err.code = 'SERVICE_UNAVAILABLE';
      throw err;
    }
    if (result.clientNotFound) {
      return sendError(
        res,
        `Client introuvable : ${result.ref}`,
        404,
        'CLIENT_NOT_FOUND'
      );
    }
    if (result.sessionNotFound) {
      return sendError(res, 'Session introuvable', 404, 'SESSION_NOT_FOUND');
    }
    if (result.error) {
      const err = new Error(result.error);
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }

    const statusCode = result.created ? 201 : 200;
    return sendSuccess(
      res,
      {
        session: result.session,
        operation: result.created ? 'created' : 'updated',
      },
      statusCode
    );
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrUpdate,
};
