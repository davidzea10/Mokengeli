const { sendError } = require('../utils/response');

/**
 * Factory : valide req.body avec un schéma Zod.
 * @param {import('zod').ZodSchema} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 'Validation échouée', 422, 'VALIDATION_ERROR');
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = {
  validateBody,
};
