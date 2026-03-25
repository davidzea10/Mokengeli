const beneficiaireService = require('../services/beneficiaire.service');
const { sendSuccess, sendError } = require('../utils/response');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function create(req, res, next) {
  try {
    const result = await beneficiaireService.create(req.body);
    if (result.unavailable) {
      const err = new Error(
        'Base de données indisponible : configurer Supabase dans .env'
      );
      err.statusCode = 503;
      err.code = 'SERVICE_UNAVAILABLE';
      throw err;
    }
    if (result.clientLieNotFound) {
      return sendError(
        res,
        `Client de référence introuvable : ${result.ref}`,
        404,
        'CLIENT_REFERENCE_NOT_FOUND'
      );
    }
    if (result.error) {
      const err = new Error(result.error);
      err.statusCode = 500;
      err.code = 'DATABASE_ERROR';
      throw err;
    }
    return sendSuccess(res, result.data, 201);
  } catch (e) {
    next(e);
  }
}

async function list(req, res, next) {
  try {
    const limit = req.query.limit;
    const result = await beneficiaireService.list(limit);
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
    return sendSuccess(res, { beneficiaires: result.data, limit });
  } catch (e) {
    next(e);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, 'Identifiant bénéficiaire invalide', 400, 'BAD_REQUEST');
    }
    const result = await beneficiaireService.getById(id);
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
    if (!result.data) {
      return sendError(res, 'Bénéficiaire introuvable', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, result.data);
  } catch (e) {
    next(e);
  }
}

module.exports = {
  create,
  list,
  getById,
};
