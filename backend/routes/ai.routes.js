const express = require('express');
const router = express.Router();
const { askAIChatbot } = require('../controllers/ai.controller');
const auth = require('../middleware/auth.middleware');

// Define the protected route for the AI chatbot
router.post('/chat', auth, askAIChatbot);

module.exports = router;