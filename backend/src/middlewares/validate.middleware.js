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

/**
 * Valide req.query avec un schéma Zod (GET avec paramètres d’URL).
 * @param {import('zod').ZodSchema} schema
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return sendError(
        res,
        'Validation des paramètres de requête échouée',
        422,
        'VALIDATION_ERROR',
        {
          fieldErrors: flat.fieldErrors,
          formErrors: flat.formErrors,
        }
      );
    }
    req.query = parsed.data;
    next();
  };
}

module.exports = {
  validateBody,
  validateQuery,
};
