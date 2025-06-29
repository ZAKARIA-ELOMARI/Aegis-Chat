const Message = require('../models/message.model');

// @desc   Get conversation history with another user
// @route  GET /api/messages/:otherUserId
// @access Private
exports.getConversationHistory = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    // Generate the consistent conversation ID
    const conversationId = [currentUserId, otherUserId].sort().join('_');

    // Find all messages for that conversation, sorted by creation time
    const messages = await Message.find({ conversationId }).sort('createdAt');

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};