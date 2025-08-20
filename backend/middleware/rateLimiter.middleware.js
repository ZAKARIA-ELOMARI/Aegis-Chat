const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

// Limiter for authentication routes (login, password resets, etc.)
// More strict: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  handler: (req, res, next, options) => {
    // Log the rate limit violation
    logger.warn(`Authentication rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      rateLimitType: 'AUTH_LIMIT_EXCEEDED'
    });
    
    // Send the standard rate limit response
    res.status(options.statusCode).json({ message: options.message });
  },
});

// Limiter for more general API usage (e.g., file uploads, AI chat)
// Less strict: 100 requests per 15 minutes
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    handler: (req, res, next, options) => {
      // Log the rate limit violation
      logger.warn(`API rate limit exceeded`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
        type: 'SECURITY_EVENT',
        rateLimitType: 'API_LIMIT_EXCEEDED'
      });
      
      // Send the standard rate limit response
      res.status(options.statusCode).json({ message: options.message });
    },
});

// Gentle limiter for logout operations
// Very light: 20 requests per minute to prevent malicious logout loops
const logoutLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 logout requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many logout attempts from this IP, please try again in a minute',
  handler: (req, res, next, options) => {
    // Log the rate limit violation
    logger.warn(`Logout rate limit exceeded`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      rateLimitType: 'LOGOUT_LIMIT_EXCEEDED'
    });
    
    // Send the standard rate limit response
    res.status(options.statusCode).json({ message: options.message });
  },
});

module.exports = {
  authLimiter,
  apiLimiter,
  logoutLimiter,
};