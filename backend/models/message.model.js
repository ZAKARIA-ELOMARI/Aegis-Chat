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
    required: false,
  },
  content: {
    type: Object,
    required: true,
  },
  // We create a consistent ID for any conversation between two users
  conversationId: {
    type: String,
    required: false,
    index: true, // Indexing this field makes fetching conversations much faster
  },
  isBroadcast: { 
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt fields
});

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;