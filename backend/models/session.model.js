const mongoose = require('mongoose');

// Session model to track user login sessions
const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Index for faster queries
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true // Each session has a unique refresh token
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  deviceInfo: {
    browser: String,
    os: String,
    device: String
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: { expireAfterSeconds: 604800 } // Auto-delete after 7 days of inactivity
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
sessionSchema.index({ userId: 1, isActive: 1 });

// Instance method to check if session is current
sessionSchema.methods.isCurrent = function(currentRefreshToken) {
  return this.refreshToken === currentRefreshToken && this.isActive;
};

// Static method to deactivate all sessions for a user
sessionSchema.statics.deactivateAllUserSessions = async function(userId) {
  return this.updateMany(
    { userId, isActive: true },
    { isActive: false, lastActivity: new Date() }
  );
};

// Static method to clean up old inactive sessions
sessionSchema.statics.cleanupOldSessions = async function() {
  const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  return this.deleteMany({
    $or: [
      { isActive: false, updatedAt: { $lt: cutoffDate } },
      { lastActivity: { $lt: cutoffDate } }
    ]
  });
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
