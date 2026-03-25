const express = require('express');

const clientController = require('../controllers/client.controller');
const { validateQuery } = require('../middlewares/validate.middleware');
const { meQuerySchema } = require('../validators/client.validator');

const router = express.Router();

/** Étape 4.2 — contexte client + comptes + soldes (démo : ?reference_client=) */
router.get('/me', validateQuery(meQuerySchema), clientController.getMe);

module.exports = router;
