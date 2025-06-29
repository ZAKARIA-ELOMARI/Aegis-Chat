const express = require('express');
const router = express.Router();

// Import all necessary functions and middleware
const { register, login } = require('../controllers/auth.controller');
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware'); // <-- 1. Import isAdmin

// The '/register' route is now protected by a CHAIN of middleware.
// A request must pass 'auth' first, then 'isAdmin', before reaching the 'register' controller.
router.post('/register', auth, isAdmin, register); // <-- 2. Apply both middleware

// The '/login' route remains public
router.post('/login', login);

module.exports = router;