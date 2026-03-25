const { z } = require('zod');

/** GET /api/v1/me — mode démo : identification par référence métier client */
const meQuerySchema = z.object({
  reference_client: z.string().min(1, 'reference_client requis'),
});

module.exports = {
  meQuerySchema,
};
