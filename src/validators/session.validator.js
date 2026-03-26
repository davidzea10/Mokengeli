const { z } = require('zod');

/**
 * POST /api/v1/sessions — création / mise à jour de session (stub).
 */
const sessionUpsertSchema = z
  .object({
    client_id: z.string().min(1).optional(),
    id_client: z.string().min(1).optional(),
    canal: z.string().optional(),
  })
  .passthrough();

module.exports = {
  sessionUpsertSchema,
};
