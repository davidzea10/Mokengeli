const { z } = require('zod');

/**
 * POST /api/v1/sessions — étape 4.4
 * Nouvelle session : `reference_client` (métier) ou `client_id` (UUID).
 * Mise à jour : `session_id` + champs optionnels `canal`, `adresse_ip`.
 */
const sessionUpsertSchema = z
  .object({
    reference_client: z.string().min(1).optional(),
    /** Alias historique — même rôle que reference_client */
    id_client: z.string().min(1).optional(),
    client_id: z.string().uuid().optional(),
    session_id: z.string().uuid().optional(),
    canal: z.string().optional(),
    adresse_ip: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.session_id) {
      return;
    }
    const ref = data.reference_client || data.id_client;
    if (!ref && !data.client_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Pour créer une session : fournir reference_client (ou id_client) ou client_id (UUID)',
        path: ['reference_client'],
      });
    }
  });

module.exports = {
  sessionUpsertSchema,
};
