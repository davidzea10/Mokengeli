const express = require('express');
const sessionsController = require('../controllers/sessions.controller');
const { validateBody } = require('../middlewares/validate.middleware');
const { sessionUpsertSchema } = require('../validators/session.validator');

const router = express.Router();

router.post(
  '/',
  validateBody(sessionUpsertSchema),
  sessionsController.createOrUpdate
);

module.exports = router;
