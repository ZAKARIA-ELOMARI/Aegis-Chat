const logger = require('../config/logger');
const { SecurityLogger, SECURITY_EVENTS, RISK_LEVELS } = require('../utils/securityLogger.util');
const SecurityLog = require('../models/securityLog.model');

/**
 * Get security logs for admin dashboard
 * @route GET /api/admin/security-logs
 * @access Admin only
 */
exports.getSecurityLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      severity, 
      eventType, 
      startDate, 
      endDate,
      search 
    } = req.query;

    // Build query for security events
    const query = {};

    // Add severity filter
    if (severity) {
      query.riskLevel = severity.toUpperCase();
    }

    // Add event type filter
    if (eventType) {
      query.eventType = eventType;
    }

    // Add date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Add search filter
    if (search) {
      query.$or = [
        { message: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { ipAddress: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch security logs from database
    const logs = await SecurityLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalLogs = await SecurityLog.countDocuments(query);
    const totalPages = Math.ceil(totalLogs / parseInt(limit));

    // Format logs for frontend
    const formattedLogs = logs.map(log => ({
      id: log._id.toString(),
      timestamp: log.timestamp,
      eventType: log.eventType,
      severity: log.riskLevel.toLowerCase(),
      userId: log.userId,
      userAgent: log.userAgent,
      ipAddress: log.ipAddress,
      location: log.location,
      details: log.message,
      context: log.additionalDetails || {}
    }));

    // Log the admin access to security logs (but don't include this in security logs display)
    logger.info(`Admin accessed security logs`, {
      adminUserId: req.user.sub,
      adminUsername: req.user.username,
      filters: { severity, eventType, startDate, endDate, search },
      resultsCount: formattedLogs.length,
      type: 'ADMIN_ACCESS'
    });

    res.status(200).json({
      message: 'Security logs retrieved successfully',
      logs: formattedLogs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalLogs: totalLogs,
        logsPerPage: parseInt(limit)
      },
      filters: {
        availableEventTypes: Object.values(SECURITY_EVENTS),
        availableRiskLevels: Object.values(RISK_LEVELS)
      }
    });

  } catch (error) {
    logger.error('Error retrieving security logs', {
      error: error.message,
      adminUserId: req.user?.sub,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to retrieve security logs' });
  }
};

/**
 * Get security statistics for dashboard
 * @route GET /api/admin/security-stats
 * @access Admin only
 */
exports.getSecurityStats = async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    // Calculate date range based on timeframe
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // In a real implementation, query the security logs database
    const timeQuery = { timestamp: { $gte: startDate } };

    // Get total counts by risk level
    const severityStats = await SecurityLog.aggregate([
      { $match: timeQuery },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    // Get counts by event type
    const eventTypeStats = await SecurityLog.aggregate([
      { $match: timeQuery },
      { $group: { _id: '$eventType', count: { $sum: 1 } } }
    ]);

    // Get top source IPs
    const topIPs = await SecurityLog.aggregate([
      { $match: { ...timeQuery, ipAddress: { $ne: null } } },
      { $group: { _id: '$ipAddress', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent critical events
    const criticalEvents = await SecurityLog.find({
      ...timeQuery,
      riskLevel: { $in: ['CRITICAL', 'HIGH'] }
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .select('timestamp eventType message ipAddress')
    .lean();

    // Format severity stats
    const bySeverity = { critical: 0, high: 0, medium: 0, low: 0 };
    severityStats.forEach(stat => {
      if (stat._id) bySeverity[stat._id.toLowerCase()] = stat.count;
    });

    // Format event type stats
    const byEventType = {};
    eventTypeStats.forEach(stat => {
      if (stat._id) byEventType[stat._id] = stat.count;
    });

    const totalEvents = await SecurityLog.countDocuments(timeQuery);

    const stats = {
      timeframe,
      total: totalEvents,
      bySeverity,
      byEventType,
      topSourceIPs: topIPs.map(ip => ({ ip: ip._id, count: ip.count })),
      recentCriticalEvents: criticalEvents.map(event => ({
        timestamp: event.timestamp,
        eventType: event.eventType,
        message: event.message,
        ip: event.ipAddress
      }))
    };

    res.status(200).json({
      message: 'Security statistics retrieved successfully',
      stats
    });

  } catch (error) {
    logger.error('Error retrieving security statistics', {
      error: error.message,
      adminUserId: req.user?.sub,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to retrieve security statistics' });
  }
};

/**
 * Clear all security logs
 * @route DELETE /api/admin/security-logs
 * @access Admin only
 */
exports.clearSecurityLogs = async (req, res) => {
  try {
    const result = await SecurityLog.deleteMany({});
    
    // Log this action as a security event
    const { SecurityLogger, SECURITY_EVENTS } = require('../utils/securityLogger.util');
    const User = require('../models/user.model');
    const currentUser = await User.findById(req.user.sub);
    
    SecurityLogger.logAdminAction(
      SECURITY_EVENTS.ADMIN_LOGS_CLEARED,
      req.user.sub,
      currentUser?.username || 'Unknown',
      null,
      'Security Logs',
      `cleared all security logs (${result.deletedCount} entries)`,
      req,
      { 
        deletedCount: result.deletedCount,
        action: 'CLEAR_SECURITY_LOGS'
      }
    );

    logger.info(`Admin cleared all security logs`, {
      adminUserId: req.user.sub,
      adminUsername: currentUser?.username,
      deletedCount: result.deletedCount,
      type: 'ADMIN_ACCESS'
    });

    res.status(200).json({
      message: `Successfully cleared ${result.deletedCount} security log entries`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    logger.error('Error clearing security logs', {
      error: error.message,
      adminUserId: req.user?.sub,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to clear security logs' });
  }
};

/**
 * Mock function to simulate reading security logs
 * In production, this would query your log database
 */
exports.getMockSecurityLogs = async (query, page, limit) => {
  // This is mock data - in production you'd read from your actual log storage
  const mockLogs = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      eventType: SECURITY_EVENTS.LOGIN_FAILED,
      riskLevel: RISK_LEVELS.MEDIUM,
      message: 'Authentication failed for user@example.com',
      requestContext: {
        ip: '192.168.1.100',
        userAgent: 'Mozilla/5.0...',
        path: '/api/auth/login',
        method: 'POST'
      },
      email: 'user@example.com',
      reason: 'Invalid password'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      eventType: SECURITY_EVENTS.SUSPICIOUS_LOGIN_PATTERN,
      riskLevel: RISK_LEVELS.HIGH,
      message: 'Login from new device detected for user admin@example.com',
      requestContext: {
        ip: '203.0.113.45',
        userAgent: 'Chrome/91.0...',
        path: '/api/auth/login',
        method: 'POST'
      },
      email: 'admin@example.com',
      userId: '60d5ecb74b9f8b2a1c8b4567'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60 * 60 * 1000),
      eventType: SECURITY_EVENTS.ADMIN_PASSWORD_RESET,
      riskLevel: RISK_LEVELS.HIGH,
      message: "Admin 'administrator' reset password and disabled 2FA for user 'employee'",
      requestContext: {
        ip: '192.168.1.10',
        userAgent: 'Mozilla/5.0...',
        path: '/api/admin/users/60d5ecb74b9f8b2a1c8b4568/reset-password',
        method: 'POST'
      },
      adminUserId: '60d5ecb74b9f8b2a1c8b4567',
      adminUsername: 'administrator',
      targetUserId: '60d5ecb74b9f8b2a1c8b4568',
      targetUsername: 'employee'
    }
  ];

  // Apply filters
  let filteredLogs = mockLogs.filter(log => {
    if (query.riskLevel && log.riskLevel !== query.riskLevel) return false;
    if (query.eventType && log.eventType !== query.eventType) return false;
    return true;
  });

  const totalLogs = filteredLogs.length;
  const totalPages = Math.ceil(totalLogs / limit);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  
  filteredLogs = filteredLogs.slice(startIndex, endIndex);

  return {
    logs: filteredLogs,
    totalLogs,
    totalPages
  };
};
