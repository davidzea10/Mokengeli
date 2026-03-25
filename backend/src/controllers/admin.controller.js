const adminService = require('../services/admin.service');
const { sendSuccess, sendError } = require('../utils/response');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function listTransactions(req, res, next) {
  try {
    const result = await adminService.listTransactions(req.query);
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
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

async function getTransaction(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return sendError(res, 'Identifiant transaction invalide', 400, 'INVALID_ID');
    }
    const result = await adminService.getTransactionById(id);
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
    if (result.notFound) {
      return sendError(res, 'Transaction introuvable', 404, 'TRANSACTION_NOT_FOUND');
    }
    sendSuccess(res, result.data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTransactions,
  getTransaction,
};
