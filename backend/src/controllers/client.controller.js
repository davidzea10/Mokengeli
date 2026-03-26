const clientService = require('../services/client.service');
const { sendSuccess, sendError } = require('../utils/response');

async function postLogin(req, res, next) {
  try {
    const result = await clientService.loginWithCredentials({
      name: req.body.name,
      password: req.body.password,
    });
    if (result.unavailable) {
      const err = new Error(
        'Base de données indisponible : configurer Supabase dans .env'
      );
      err.statusCode = 503;
      err.code = 'SERVICE_UNAVAILABLE';
      throw err;
    }
    if (result.error) {
      const err = new Error(result.error);
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }
    if (result.unauthorized) {
      return sendError(
        res,
        'Identifiants incorrects',
        401,
        'INVALID_CREDENTIALS'
      );
    }
    if (result.passwordNotSet) {
      return sendError(
        res,
        'Mot de passe non configuré pour ce compte. Définissez la colonne password_hash (bcrypt) sur la ligne client dans la base.',
        403,
        'PASSWORD_NOT_CONFIGURED'
      );
    }
    return sendSuccess(res, {
      ...result.data,
      next_step: 'GET /api/v1/me?reference_client=' + encodeURIComponent(result.data.reference_client),
    });
  } catch (e) {
    next(e);
  }
}

async function postLogout(req, res, next) {
  try {
    return sendSuccess(res, {
      logged_out: true,
      profile_id: req.body.profile_id,
    });
  } catch (e) {
    next(e);
  }
}

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
  postLogin,
  postLogout,
  getMe,
};
