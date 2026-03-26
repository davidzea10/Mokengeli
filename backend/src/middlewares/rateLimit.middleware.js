const rateLimit = require('express-rate-limit');

// Rate limit simple et configurable (par défaut assez permissif pour la démo).
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000; // 15 min
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;

const apiLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Trop de requêtes', code: 'RATE_LIMIT' } },
});

module.exports = {
  apiLimiter,
};

