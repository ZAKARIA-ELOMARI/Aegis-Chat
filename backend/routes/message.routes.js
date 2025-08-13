// backend/routes/message.routes.js
const express = require('express');
const router = express.Router();
// Add getBroadcasts to the import
const { getConversationHistory, getBroadcasts } = require('../controllers/message.controller');
const auth = require('../middleware/auth.middleware');

// ADD THIS NEW ROUTE
router.get('/broadcasts', auth, getBroadcasts);

// Define the protected route to get message history
router.get('/:otherUserId', auth, getConversationHistory);

module.exports = router;