const Message = require('../models/message.model');
const logger = require('../config/logger');
const mongoose = require('mongoose');

// @desc   Get conversation history with another user
// @route  GET /api/messages/:otherUserId
// @access Private
exports.getConversationHistory = async (req, res) => {
  try {
    const currentUserId = req.user.sub;
    const otherUserId = req.params.otherUserId;

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ message: 'Invalid user ID format.' });
    }

    // Generate the consistent conversation ID
    const conversationId = [currentUserId, otherUserId].sort().join('_');

    // Find all messages for that conversation, sorted by creation time
    const messagesFromDb = await Message.find({ conversationId }).sort('createdAt').lean();

    // Convert buffer content to string for each message
    const messages = messagesFromDb.map(msg => ({
      ...msg,
      content: msg.content.toString('utf-8')
    }));

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

// @desc   Get all broadcast messages
// @route  GET /api/messages/broadcasts
// @access Private
exports.getBroadcasts = async (req, res) => {
  try {
    const broadcasts = await Message.find({ isBroadcast: true })
      .sort({ createdAt: -1 }) // Newest first
      .populate('sender', 'username') // Get sender's username
      .lean();

    const formattedBroadcasts = broadcasts.map(msg => ({
      ...msg,
      content: msg.content.toString('utf-8')
    }));

    res.json(formattedBroadcasts);
  } catch (err) {
    logger.error('Error retrieving broadcast messages:', { error: err.message });
    res.status(500).send('Server Error');
  }
};

// @desc   Mark a message as delivered
// @route  PUT /api/messages/:messageId/delivered
// @access Private
exports.markAsDelivered = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const currentUserId = req.user.sub;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only the recipient can mark as delivered
    if (message.recipient.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Unauthorized.' });
    }

    // Mark as delivered if not already
    if (!message.deliveredAt) {
      message.deliveredAt = new Date();
      await message.save();
    }

    res.json({ success: true, deliveredAt: message.deliveredAt });
  } catch (err) {
    logger.error('Error marking message as delivered:', { error: err.message, messageId: req.params.messageId });
    res.status(500).send('Server Error');
  }
};

// @desc   Mark a message as read
// @route  PUT /api/messages/:messageId/read
// @access Private
exports.markAsRead = async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const currentUserId = req.user.sub;

    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID format.' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Handle broadcast messages differently
    if (message.isBroadcast) {
      // Check if user already marked this broadcast as read
      const alreadyRead = message.readBy.some(entry => entry.userId.toString() === currentUserId);
      
      if (!alreadyRead) {
        message.readBy.push({
          userId: currentUserId,
          readAt: new Date()
        });
        await message.save();
      }
    } else {
      // For regular messages, only the recipient can mark as read
      if (message.recipient.toString() !== currentUserId) {
        return res.status(403).json({ message: 'Unauthorized.' });
      }

      // Mark as read if not already
      if (!message.readAt) {
        message.readAt = new Date();
        message.deliveredAt = message.deliveredAt || new Date(); // Auto-mark as delivered too
        await message.save();
      }
    }

    res.json({ success: true, readAt: message.readAt });
  } catch (err) {
    logger.error('Error marking message as read:', { error: err.message, messageId: req.params.messageId });
    res.status(500).send('Server Error');
  }
};

// @desc   Get unread message count per user
// @route  GET /api/messages/unread-counts
// @access Private
exports.getUnreadCounts = async (req, res) => {
  try {
    const currentUserId = req.user.sub;

    // Get unread message counts grouped by sender
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          recipient: new mongoose.Types.ObjectId(currentUserId),
          isBroadcast: false,
          readAt: null
        }
      },
      {
        $group: {
          _id: '$sender',
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert to object format
    const counts = {};
    unreadCounts.forEach(item => {
      counts[item._id.toString()] = item.count;
    });

    res.json(counts);
  } catch (err) {
    logger.error('Error getting unread counts:', { error: err.message });
    res.status(500).send('Server Error');
  }
};

// @desc   Get unread broadcast count
// @route  GET /api/messages/unread-broadcasts
// @access Private
exports.getUnreadBroadcastCount = async (req, res) => {
  try {
    const currentUserId = req.user.sub;

    // Count broadcasts that this user hasn't read
    const unreadCount = await Message.countDocuments({
      isBroadcast: true,
      'readBy.userId': { $ne: new mongoose.Types.ObjectId(currentUserId) }
    });

    res.json({ count: unreadCount });
  } catch (err) {
    logger.error('Error getting unread broadcast count:', { error: err.message });
    res.status(500).send('Server Error');
  }
};