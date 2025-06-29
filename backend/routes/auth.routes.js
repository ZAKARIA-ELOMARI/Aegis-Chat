const express = require('express');
const router = express.Router();

// Import both controller functions
const { register, login } = require('../controllers/auth.controller');

// Register route
router.post('/register', register);

// Login route <-- ADD THIS LINE
router.post('/login', login);

module.exports = router;