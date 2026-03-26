const express = require('express');
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { apiLimiter } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

router.get(
  '/transactions',
  apiLimiter,
  requireAuth(['analyste']),
  adminController.listTransactions
);

module.exports = router;
