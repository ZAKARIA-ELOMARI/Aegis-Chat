const rateLimit = require('express-rate-limit');

// Limiter for authentication routes (login, password resets, etc.)
// More strict: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
});

// Limiter for more general API usage (e.g., file uploads, AI chat)
// Less strict: 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
});

module.exports = {
  authLimiter,
  apiLimiter,
};