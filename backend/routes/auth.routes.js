const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

// --- Import all necessary controller functions ---
const {
  register,
  login,
  logout, // Import the logout function
  setInitialPassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  verifyLogin2FA
} = require('../controllers/auth.controller');

const {
  loginRules,
  setInitialPasswordRules,
  handleValidationErrors
} = require('../middleware/validators.middleware');


// --- Define All Authentication Routes ---

router.post('/login', authLimiter, loginRules(), handleValidationErrors, login);

// ** THIS IS THE NEWLY ADDED ROUTE **
router.post('/logout', auth, logout);

router.post('/set-initial-password', auth, setInitialPasswordRules(), handleValidationErrors, setInitialPassword);

router.post('/refresh-token', refreshToken);

// 2FA Login Verification Route
router.post('/2fa/verify-login', auth, verifyLogin2FA);

// Password Reset Routes
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', authLimiter, setInitialPasswordRules(), handleValidationErrors, resetPassword);

module.exports = router;