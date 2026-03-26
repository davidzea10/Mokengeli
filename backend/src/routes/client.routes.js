const express = require('express');

const clientController = require('../controllers/client.controller');
const notificationController = require('../controllers/notification.controller');
const { validateQuery, validateBody } = require('../middlewares/validate.middleware');
const {
  meQuerySchema,
  clientLoginBodySchema,
  clientLogoutBodySchema,
  notificationsListQuerySchema,
  notificationsUnreadQuerySchema,
  notificationsReferenceBodySchema,
} = require('../validators/client.validator');

const router = express.Router();

/** Connexion démo — puis GET /me?reference_client= */
router.post(
  '/client/login',
  validateBody(clientLoginBodySchema),
  clientController.postLogin
);
router.post(
  '/client/logout',
  validateBody(clientLogoutBodySchema),
  clientController.postLogout
);

/** Étape 4.2 — contexte client + comptes + soldes (démo : ?reference_client=) */
router.get('/me', validateQuery(meQuerySchema), clientController.getMe);

/** Centre de notifications (messagerie métier) */
router.get(
  '/me/notifications',
  validateQuery(notificationsListQuerySchema),
  notificationController.getList
);
router.get(
  '/me/notifications/unread-count',
  validateQuery(notificationsUnreadQuerySchema),
  notificationController.getUnreadCount
);
router.post(
  '/me/notifications/read-all',
  validateBody(notificationsReferenceBodySchema),
  notificationController.postReadAll
);
router.patch(
  '/me/notifications/:id/read',
  validateBody(notificationsReferenceBodySchema),
  notificationController.patchOneRead
);

module.exports = router;
