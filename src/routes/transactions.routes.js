const express = require('express');
const transactionsController = require('../controllers/transactions.controller');
const { validateBody } = require('../middlewares/validate.middleware');
const { evaluateBodySchema } = require('../validators/transaction.validator');
const { requireAuth } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.post(
  '/evaluate',
  apiLimiter,
  requireAuth(['simulation']),
  validateBody(evaluateBodySchema),
  transactionsController.evaluate
);

module.exports = router;
