const express = require('express');
const sessionsController = require('../controllers/sessions.controller');
const { validateBody } = require('../middlewares/validate.middleware');
const { sessionUpsertSchema } = require('../validators/session.validator');
const { requireAuth } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post(
  '/',
  apiLimiter,
  requireAuth(['simulation']),
  validateBody(sessionUpsertSchema),
  sessionsController.createOrUpdate
);

module.exports = router;
