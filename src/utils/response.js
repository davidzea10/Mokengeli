/**
 * Réponses JSON homogènes pour l'API (préfixe /api/v1).
 * Toutes les réponses suivent { success, data? } ou { success, error }.
 */

function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

/**
 * @param {import('express').Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 * @param {string} [code='BAD_REQUEST']
 * @param {unknown} [details] — ex. détails Zod (fieldErrors) en 422
 */
function sendError(res, message, statusCode = 400, code = 'BAD_REQUEST', details) {
  const payload = {
    success: false,
    error: {
      message,
      code,
    },
  };
  if (details !== undefined) {
    payload.error.details = details;
  }
  return res.status(statusCode).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
