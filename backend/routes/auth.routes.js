// backend/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { logoutLimiter } = require('../middleware/rateLimiter.middleware'); // <-- authLimiter n'est plus nécessaire ici

// --- Import all necessary controller functions ---
// <-- CHANGEMENT : Ne gardez que les contrôleurs pour les routes PRIVÉES
const {
  // register, // 'register' est géré par admin.routes
  // login, // SUPPRIMÉ (déplacé vers server.js)
  logout,
  setInitialPassword,
  // forgotPassword, // SUPPRIMÉ (déplacé vers server.js)
  // resetPassword, // SUPPRIMÉ (déplacé vers server.js)
  // refreshToken, // SUPPRIMÉ (déplacé vers server.js)
  verifyLogin2FA
} = require('../controllers/auth.controller');

const {
  // loginRules, // SUPPRIMÉ (déplacé vers server.js)
  setInitialPasswordRules,
  handleValidationErrors
} = require('../middleware/validators.middleware');


// --- Define All Authentication Routes ---

// router.post('/login', ...); // <-- CHANGEMENT : SUPPRIMÉ

// ** THIS IS THE NEWLY ADDED ROUTE **
router.post('/logout', logoutLimiter, auth, logout);

router.post('/set-initial-password', auth, setInitialPasswordRules(), handleValidationErrors, setInitialPassword);

// router.post('/refresh-token', ...); // <-- CHANGEMENT : SUPPRIMÉ

// 2FA Login Verification Route
router.post('/2fa/verify-login', auth, verifyLogin2FA);

// Password Reset Routes
// router.post('/forgot-password', ...); // <-- CHANGEMENT : SUPPRIMÉ
// router.post('/reset-password/:token', ...); // <-- CHANGEMENT : SUPPRIMÉ

module.exports = router;