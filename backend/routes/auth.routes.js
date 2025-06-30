const express = require('express');
const router = express.Router();
const { register, login, setInitialPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// Import our new validation rules
const {
  registerRules,
  loginRules,
  setInitialPasswordRules,
  handleValidationErrors,
} = require('../middleware/validators.middleware');


// Apply validation rules as a chain of middleware
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

module.exports = router;