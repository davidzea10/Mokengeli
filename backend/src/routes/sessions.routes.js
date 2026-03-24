const express = require('express');
const sessionsController = require('../controllers/sessions.controller');

const router = express.Router();

router.post('/', sessionsController.createOrUpdate);

module.exports = router;
