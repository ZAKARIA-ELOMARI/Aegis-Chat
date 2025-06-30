const express = require('express');
const router = express.Router();
const { askAIChatbot } = require('../controllers/ai.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Define the protected route for the AI chatbot
router.post('/chat', apiLimiter, auth, askAIChatbot);

module.exports = router;