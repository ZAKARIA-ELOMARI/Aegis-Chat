const express = require('express');
const router = express.Router();

// Import all necessary functions and middleware
const { register, login, setInitialPassword } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware'); 


// The '/register' route is now protected by a CHAIN of middleware.
// A request must pass 'auth' first, then 'isAdmin', before reaching the 'register' controller.
router.post('/register', authLimiter, auth, isAdmin, register);

// Apply the limiter specifically to password-handling routes
router.post('/login', authLimiter, login);
router.post('/set-initial-password', authLimiter, setInitialPassword);

module.exports = router;