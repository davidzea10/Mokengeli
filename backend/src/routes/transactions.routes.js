const express = require('express');
const transactionsController = require('../controllers/transactions.controller');

const router = express.Router();

router.post('/evaluate', transactionsController.evaluate);

module.exports = router;
