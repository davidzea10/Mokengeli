const express = require('express');
const transactionsController = require('../controllers/transactions.controller');
const { validateBody } = require('../middlewares/validate.middleware');
const { evaluateBodySchema } = require('../validators/transaction.validator');
// TODO prod : réintroduire apiLimiter + requireAuth(['simulation']) si AUTH_REQUIRED=true

const router = express.Router();

router.post(
  '/evaluate',
  validateBody(evaluateBodySchema),
  transactionsController.evaluate
);

module.exports = router;
