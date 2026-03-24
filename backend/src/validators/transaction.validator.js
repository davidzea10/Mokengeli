const { z } = require('zod');

/**
 * Schéma minimal pour POST /transactions/evaluate — à enrichir selon transaction_schema.
 */
const evaluateBodySchema = z.object({}).passthrough();

module.exports = {
  evaluateBodySchema,
};
