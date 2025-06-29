const express = require('express');
const router = express.Router();
const { getConversationHistory } = require('../controllers/message.controller');
const auth = require('../middleware/auth.middleware');

// Define the protected route to get message history
router.get('/:otherUserId', auth, getConversationHistory);

module.exports = router;