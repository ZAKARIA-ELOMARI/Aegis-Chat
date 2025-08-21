const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: [
      // Authentication Events
      'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGIN_BLOCKED', 'LOGOUT',
      
      // Account Management
      'ACCOUNT_CREATED', 'ACCOUNT_DELETED', 'ACCOUNT_DEACTIVATED', 
      'ACCOUNT_REACTIVATED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
      
      // Two-Factor Authentication
      'TWO_FA_ENABLED', 'TWO_FA_DISABLED', 'TWO_FA_FAILED',
      
      // Session Management
      'SESSION_CREATED', 'SESSION_TERMINATED', 'SESSION_HIJACK_ATTEMPT',
      
      // Administrative Actions
      'ADMIN_USER_CREATED', 'ADMIN_USER_DELETED', 'ADMIN_PASSWORD_RESET',
      'ADMIN_ROLE_CHANGED', 'ADMIN_ROLE_CREATED', 'ADMIN_ROLE_UPDATED', 
      'ADMIN_ROLE_DELETED', 'ADMIN_LOGS_CLEARED', 'ADMIN_BROADCAST_SENT',
      
      // Suspicious Activities
      'MULTIPLE_FAILED_LOGINS', 'SUSPICIOUS_LOGIN_PATTERN', 
      'RATE_LIMIT_EXCEEDED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 
      'SUSPICIOUS_FILE_UPLOAD',
      
      // System Events
      'SYSTEM_ERROR', 'DATABASE_ERROR', 'CONFIGURATION_CHANGE'
    ]
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  },
  message: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  userId: {
    type: String,
    default: null
  },
  username: {
    type: String,
    default: null
  },
  email: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  requestContext: {
    ip: String,
    userAgent: String,
    path: String,
    method: String,
    userId: String,
    username: String
  },
  additionalDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  success: {
    type: Boolean,
    default: null
  },
  // For admin actions
  adminUserId: String,
  adminUsername: String,
  targetUserId: String,
  targetUsername: String,
  action: String
}, {
  timestamps: true,
  collection: 'securitylogs'
});

// Indexes for better query performance
securityLogSchema.index({ timestamp: -1 });
securityLogSchema.index({ eventType: 1 });
securityLogSchema.index({ riskLevel: 1 });
securityLogSchema.index({ userId: 1 });
securityLogSchema.index({ ipAddress: 1 });

// TTL index to automatically delete old logs after 1 year (optional)
securityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
