const { sendError } = require('../utils/response');

/**
 * Valide req.body avec un schéma Zod.
 * @param {import('zod').ZodSchema} schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return sendError(
        res,
        'Validation du corps de requête échouée',
        422,
        'VALIDATION_ERROR',
        {
          fieldErrors: flat.fieldErrors,
          formErrors: flat.formErrors,
        }
      );
    }
    req.body = parsed.data;
    next();
  };
}

module.exports = {
  validateBody,
};
