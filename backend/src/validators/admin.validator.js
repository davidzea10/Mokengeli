const { z } = require('zod');

/**
 * GET /api/v1/admin/transactions — filtres pagination (analyste).
 */
const listTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  client_id: z.string().uuid().optional(),
  decision: z.enum(['allow', 'challenge', 'deny']).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

module.exports = {
  listTransactionsQuerySchema,
};
