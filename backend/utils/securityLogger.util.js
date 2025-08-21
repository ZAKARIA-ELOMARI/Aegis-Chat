const logger = require('../config/logger');
const SecurityLog = require('../models/securityLog.model');
const { getRealIP, getLocationFromIP, formatLocation } = require('./geolocation.util');

/**
 * Security event types for consistent logging
 */
const SECURITY_EVENTS = {
  // Authentication Events
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_BLOCKED: 'LOGIN_BLOCKED',
  LOGOUT: 'LOGOUT',
  
  // Account Management
  ACCOUNT_CREATED: 'ACCOUNT_CREATED',
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  ACCOUNT_REACTIVATED: 'ACCOUNT_REACTIVATED',
  PASSWORD_RESET: 'PASSWORD_RESET',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  
  // Two-Factor Authentication
  TWO_FA_ENABLED: 'TWO_FA_ENABLED',
  TWO_FA_DISABLED: 'TWO_FA_DISABLED',
  TWO_FA_FAILED: 'TWO_FA_FAILED',
  
  // Session Management
  SESSION_CREATED: 'SESSION_CREATED',
  SESSION_TERMINATED: 'SESSION_TERMINATED',
  SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT',
  
  // Administrative Actions
  ADMIN_USER_CREATED: 'ADMIN_USER_CREATED',
  ADMIN_USER_DELETED: 'ADMIN_USER_DELETED',
  ADMIN_PASSWORD_RESET: 'ADMIN_PASSWORD_RESET',
  ADMIN_ROLE_CHANGED: 'ADMIN_ROLE_CHANGED',
  ADMIN_ROLE_CREATED: 'ADMIN_ROLE_CREATED',
  ADMIN_ROLE_UPDATED: 'ADMIN_ROLE_UPDATED',
  ADMIN_ROLE_DELETED: 'ADMIN_ROLE_DELETED',
  ADMIN_LOGS_CLEARED: 'ADMIN_LOGS_CLEARED',
  ADMIN_BROADCAST_SENT: 'ADMIN_BROADCAST_SENT',
  
  // Suspicious Activities
  MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
  SUSPICIOUS_LOGIN_PATTERN: 'SUSPICIOUS_LOGIN_PATTERN',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
  SUSPICIOUS_FILE_UPLOAD: 'SUSPICIOUS_FILE_UPLOAD',
  
  // System Events
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE'
};

/**
 * Risk levels for security events
 */
const RISK_LEVELS = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
};

/**
 * Enhanced security logger with structured logging and real-time notifications
 */
class SecurityLogger {
  /**
   * Log a security event with consistent structure
   * @param {string} eventType - Type of security event
   * @param {string} riskLevel - Risk level of the event
   * @param {string} message - Human readable message
   * @param {object} details - Additional event details
   * @param {object} req - Express request object (optional)
   */
  static logSecurityEvent(eventType, riskLevel, message, details = {}, req = null) {
    console.log(`SecurityLogger.logSecurityEvent called:`, {
      eventType,
      riskLevel,
      message: message.substring(0, 100) + '...',
      hasRequest: !!req
    });

    const securityEvent = {
      eventType,
      riskLevel,
      message,
      timestamp: new Date().toISOString(),
      ...details,
      type: 'SECURITY_EVENT'
    };

    // Add request context if available
    if (req) {
      securityEvent.requestContext = {
        ip: getRealIP(req),
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        userId: req.user?.sub || null,
        username: req.user?.username || null,
        req: req // Keep reference for later use in saveToDatabase
      };
    }

    // Only log and emit security-critical events
    const criticalEvents = [
      // Authentication failures and successes from new devices
      SECURITY_EVENTS.LOGIN_FAILED,
      SECURITY_EVENTS.LOGIN_BLOCKED,
      SECURITY_EVENTS.LOGIN_SUCCESS, // Only if from new device/location
      SECURITY_EVENTS.LOGOUT,
      
      // Admin actions
      SECURITY_EVENTS.ADMIN_USER_CREATED,
      SECURITY_EVENTS.ADMIN_USER_DELETED,
      SECURITY_EVENTS.ADMIN_PASSWORD_RESET,
      SECURITY_EVENTS.ADMIN_ROLE_CHANGED,
      SECURITY_EVENTS.ADMIN_ROLE_CREATED,
      SECURITY_EVENTS.ADMIN_ROLE_UPDATED,
      SECURITY_EVENTS.ADMIN_ROLE_DELETED,
      SECURITY_EVENTS.ADMIN_LOGS_CLEARED,
      SECURITY_EVENTS.ADMIN_BROADCAST_SENT,
      
      // Two-factor authentication
      SECURITY_EVENTS.TWO_FA_ENABLED,
      SECURITY_EVENTS.TWO_FA_DISABLED,
      SECURITY_EVENTS.TWO_FA_FAILED,
      
      // Suspicious activities
      SECURITY_EVENTS.MULTIPLE_FAILED_LOGINS,
      SECURITY_EVENTS.SUSPICIOUS_LOGIN_PATTERN,
      SECURITY_EVENTS.RATE_LIMIT_EXCEEDED,
      SECURITY_EVENTS.UNAUTHORIZED_ACCESS_ATTEMPT,
      SECURITY_EVENTS.SUSPICIOUS_FILE_UPLOAD,
      
      // Account management
      SECURITY_EVENTS.ACCOUNT_CREATED,
      SECURITY_EVENTS.ACCOUNT_DELETED,
      SECURITY_EVENTS.ACCOUNT_DEACTIVATED,
      SECURITY_EVENTS.PASSWORD_RESET,
      SECURITY_EVENTS.PASSWORD_CHANGED
    ];

    // Only process critical security events
    if (!criticalEvents.includes(eventType)) {
      console.log(`Event type ${eventType} not in critical events list, skipping database save`);
      return; // Skip non-critical events
    }

    console.log(`Processing critical security event: ${eventType}`);

    // Log at appropriate level based on risk
    switch (riskLevel) {
      case RISK_LEVELS.CRITICAL:
      case RISK_LEVELS.HIGH:
        logger.error(message, securityEvent);
        break;
      case RISK_LEVELS.MEDIUM:
        logger.warn(message, securityEvent);
        break;
      case RISK_LEVELS.LOW:
      default:
        logger.info(message, securityEvent);
        break;
    }

    // Save to database
    this.saveToDatabase(securityEvent);

    // Emit real-time security event to admin clients
    this.emitSecurityEvent(securityEvent);
  }

  /**
   * Save security event to database
   * @param {object} securityEvent - The security event to save
   */
  static async saveToDatabase(securityEvent) {
    try {
      console.log('Attempting to save security event to database:', {
        eventType: securityEvent.eventType,
        riskLevel: securityEvent.riskLevel,
        message: securityEvent.message.substring(0, 100) + '...'
      });

      let ipAddress = securityEvent.requestContext?.ip || 'Unknown';
      let location = 'Unknown';

      // Get real IP address and location
      if (securityEvent.requestContext?.req) {
        ipAddress = getRealIP(securityEvent.requestContext.req);
        
        try {
          const locationData = await getLocationFromIP(ipAddress);
          location = formatLocation(locationData);
        } catch (error) {
          console.log('Failed to get location for IP:', ipAddress, error.message);
          location = 'Location unavailable';
        }
      } else if (ipAddress && ipAddress !== 'Unknown') {
        try {
          const locationData = await getLocationFromIP(ipAddress);
          location = formatLocation(locationData);
        } catch (error) {
          console.log('Failed to get location for IP:', ipAddress, error.message);
          location = 'Location unavailable';
        }
      }

      const logEntry = new SecurityLog({
        eventType: securityEvent.eventType,
        riskLevel: securityEvent.riskLevel,
        message: securityEvent.message,
        timestamp: new Date(securityEvent.timestamp),
        userId: securityEvent.requestContext?.userId || securityEvent.userId || null,
        username: securityEvent.requestContext?.username || securityEvent.username || null,
        email: securityEvent.email || null,
        ipAddress: ipAddress,
        userAgent: securityEvent.requestContext?.userAgent || null,
        location: location,
        requestContext: securityEvent.requestContext || null,
        additionalDetails: {
          ...securityEvent,
          requestContext: undefined, // Avoid duplication
          eventType: undefined,
          riskLevel: undefined,
          message: undefined,
          timestamp: undefined
        },
        success: securityEvent.success || null,
        adminUserId: securityEvent.adminUserId || null,
        adminUsername: securityEvent.adminUsername || null,
        targetUserId: securityEvent.targetUserId || null,
        targetUsername: securityEvent.targetUsername || null,
        action: securityEvent.action || null
      });

      const savedLog = await logEntry.save();
      console.log('Security event saved successfully to database with ID:', savedLog._id);
    } catch (error) {
      console.error('Failed to save security log to database:', {
        error: error.message,
        eventType: securityEvent.eventType,
        validationErrors: error.errors
      });
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Emit security event to connected admin clients via Socket.IO
   * @param {object} securityEvent - The security event to emit
   */
  static emitSecurityEvent(securityEvent) {
    try {
      // Get io instance (will be set by server.js)
      if (global.io) {
        // Format event for frontend
        const formattedEvent = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(securityEvent.timestamp),
          eventType: securityEvent.eventType,
          severity: securityEvent.riskLevel.toLowerCase(),
          userId: securityEvent.requestContext?.userId || securityEvent.userId || null,
          userAgent: securityEvent.requestContext?.userAgent || null,
          ipAddress: securityEvent.requestContext?.ip || null,
          location: securityEvent.location || null,
          details: securityEvent.message,
          context: {
            ...securityEvent,
            requestContext: undefined // Remove to avoid duplication
          }
        };

        // Emit to admin users only
        global.io.emit('securityEvent', formattedEvent);
        console.log('Security event emitted:', formattedEvent.eventType);
      }
    } catch (error) {
      console.error('Failed to emit security event:', error);
    }
  }

  /**
   * Log authentication events
   */
  static logAuth(eventType, userId, email, success, req, additionalDetails = {}) {
    const riskLevel = success ? RISK_LEVELS.LOW : RISK_LEVELS.MEDIUM;
    const message = success 
      ? `Authentication successful for ${email}` 
      : `Authentication failed for ${email}`;
    
    this.logSecurityEvent(eventType, riskLevel, message, {
      userId,
      email,
      success,
      ...additionalDetails
    }, req);
  }

  /**
   * Log administrative actions
   */
  static logAdminAction(eventType, adminUserId, adminUsername, targetUserId, targetUsername, action, req, additionalDetails = {}) {
    console.log(`SecurityLogger.logAdminAction called:`, {
      eventType,
      adminUsername,
      targetUsername,
      action
    });

    this.logSecurityEvent(eventType, RISK_LEVELS.HIGH, 
      `Admin '${adminUsername}' ${action} for user '${targetUsername}'`, {
        adminUserId,
        adminUsername,
        targetUserId,
        targetUsername,
        action,
        ...additionalDetails
      }, req);
  }

  /**
   * Log suspicious activities
   */
  static logSuspiciousActivity(eventType, message, req, additionalDetails = {}) {
    this.logSecurityEvent(eventType, RISK_LEVELS.HIGH, message, additionalDetails, req);
  }

  /**
   * Log critical security incidents
   */
  static logCriticalIncident(eventType, message, req, additionalDetails = {}) {
    this.logSecurityEvent(eventType, RISK_LEVELS.CRITICAL, message, additionalDetails, req);
  }
}

module.exports = {
  SecurityLogger,
  SECURITY_EVENTS,
  RISK_LEVELS
};
