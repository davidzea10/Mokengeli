const express = require('express');

const healthRoutes = require('./health.routes');
const transactionsRoutes = require('./transactions.routes');
const sessionsRoutes = require('./sessions.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/sessions', sessionsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
