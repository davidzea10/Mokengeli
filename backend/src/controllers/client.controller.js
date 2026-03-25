const clientService = require('../services/client.service');
const { sendSuccess } = require('../utils/response');

async function getMe(req, res, next) {
  try {
    const { reference_client: referenceClient } = req.query;
    const result = await clientService.getContextByReference(referenceClient);
    if (result.unavailable) {
      const err = new Error(
        'Base de données indisponible : configurer Supabase dans .env'
      );
      err.statusCode = 503;
      err.code = 'SERVICE_UNAVAILABLE';
      throw err;
    }
    if (result.notFound) {
      const err = new Error(`Client introuvable : ${referenceClient}`);
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }
    return sendSuccess(res, result.data);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  getMe,
};
