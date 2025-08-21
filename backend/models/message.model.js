const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // This creates a link to the User model
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Not required for broadcast messages
  },
  content: {
    type: Buffer, // Changed from String to Buffer
    required: true,
  },
  conversationId: {
    type: String,
    required: false,
    index: true, // Indexing this field makes fetching conversations much faster
  },
  isBroadcast: {
    type: Boolean,
    default: false,
  },
  // Read receipt tracking
  deliveredAt: {
    type: Date,
    default: null,
  },
  readAt: {
    type: Date,
    default: null,
  },
  // For broadcast messages, track who has read them
  readBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    readAt: {
      type: Date,
      default: Date.now,
    }
  }],
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;