const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');
const { validateQuery } = require('../middlewares/validate.middleware');
const { listTransactionsQuerySchema } = require('../validators/admin.validator');

const router = express.Router();

router.get(
  '/transactions',
  apiLimiter,
  requireAuth(['analyste']),
  validateQuery(listTransactionsQuerySchema),
  adminController.listTransactions
);
router.get('/transactions/:id', adminController.getTransaction);

module.exports = router;
