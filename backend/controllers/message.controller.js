const Message = require('../models/message.model');
const logger = require('../config/logger');
const mongoose = require('mongoose');

// @desc   Get conversation history with another user
// @route  GET /api/messages/:otherUserId
// @access Private
exports.getConversationHistory = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Generate the consistent conversation ID
    const conversationId = [currentUserId, otherUserId].sort().join('_');

    // Find all messages for that conversation, sorted by creation time
    const messages = await Message.find({ conversationId }).sort('createdAt');

    res.json(messages);
  } catch (err) {
    logger.error('Error retrieving conversation history:', { 
      error: err.message, 
      currentUserId: req.user.id, 
      otherUserId: req.params.otherUserId 
    });
    res.status(500).send('Server Error');
  }
};