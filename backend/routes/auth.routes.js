const express = require('express');
const router = express.Router();
// Import the new controllers
const { register, login, setInitialPassword, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const {
  registerRules,
  loginRules,
  setInitialPasswordRules,
  handleValidationErrors,
} = require('../middleware/validators.middleware');


router.post('/login',
  authLimiter,
  loginRules(),
  handleValidationErrors,
  login
);

router.post('/set-initial-password',
  authLimiter,
  setInitialPasswordRules(),
  handleValidationErrors,
  setInitialPassword
);

router.post('/register',
  authLimiter,
  auth,
  isAdmin,
  registerRules(),
  handleValidationErrors,
  register
);

// Add the new routes for password reset
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, resetPassword);

module.exports = router;