const express = require('express');
const healthController = require('../controllers/health.controller');

const router = express.Router();

router.get('/', healthController.getHealth);
router.get('/supabase', healthController.getSupabasePing);

module.exports = router;
