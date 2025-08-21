// backend/routes/message.routes.js
const express = require('express');
const router = express.Router();
// Add all message controller functions
const { 
  getConversationHistory, 
  getBroadcasts, 
  markAsDelivered, 
  markAsRead, 
  getUnreadCounts, 
  getUnreadBroadcastCount 
} = require('../controllers/message.controller');
const auth = require('../middleware/auth.middleware');

// Get unread counts
router.get('/unread-counts', auth, getUnreadCounts);

// Get unread broadcast count
router.get('/unread-broadcasts', auth, getUnreadBroadcastCount);

// Get broadcast messages
router.get('/broadcasts', auth, getBroadcasts);

// Mark message as delivered
router.put('/:messageId/delivered', auth, markAsDelivered);

// Mark message as read
router.put('/:messageId/read', auth, markAsRead);

// Define the protected route to get message history (must be last to avoid conflicts)
router.get('/:otherUserId', auth, getConversationHistory);

module.exports = router;