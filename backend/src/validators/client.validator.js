const { z } = require('zod');

/** GET /api/v1/me — mode démo : identification par référence métier client */
const meQuerySchema = z.object({
  reference_client: z.string().min(1, 'reference_client requis'),
});

/** POST /api/v1/client/login — `name` = identifiant (référence client, e-mail ou téléphone) */
const clientLoginBodySchema = z.object({
  name: z.string().min(1, 'identifiant requis'),
  password: z.string().min(1, 'password requis'),
  client_sent_at: z.string().optional(),
});

/** POST /api/v1/client/logout */
const clientLogoutBodySchema = z.object({
  profile_id: z.string().min(1),
  user_display_name: z.string().optional(),
  client_sent_at: z.string().optional(),
});

/** GET /api/v1/me/notifications */
const notificationsListQuerySchema = z.object({
  reference_client: z.string().min(1, 'reference_client requis'),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

/** GET /api/v1/me/notifications/unread-count */
const notificationsUnreadQuerySchema = z.object({
  reference_client: z.string().min(1, 'reference_client requis'),
});

/** POST/PATCH body — même identification que /me */
const notificationsReferenceBodySchema = z.object({
  reference_client: z.string().min(1, 'reference_client requis'),
});

module.exports = {
  meQuerySchema,
  clientLoginBodySchema,
  clientLogoutBodySchema,
  notificationsListQuerySchema,
  notificationsUnreadQuerySchema,
  notificationsReferenceBodySchema,
};
