/**
 * Réponses JSON homogènes pour l'API.
 */
function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
  });
}

function sendError(res, message, statusCode = 400, code = 'BAD_REQUEST') {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
    },
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
