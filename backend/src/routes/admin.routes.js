const express = require('express');
const adminController = require('../controllers/admin.controller');

const router = express.Router();

router.get('/transactions', adminController.listTransactions);

module.exports = router;
