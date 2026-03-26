const express = require('express');
const adminController = require('../controllers/admin.controller');
const { validateQuery } = require('../middlewares/validate.middleware');
const { listTransactionsQuerySchema } = require('../validators/admin.validator');
// TODO prod : apiLimiter + requireAuth(['analyste']) sur /transactions

const router = express.Router();

router.get(
  '/transactions',
  validateQuery(listTransactionsQuerySchema),
  adminController.listTransactions
);
router.get('/transactions/:id', adminController.getTransaction);

module.exports = router;
