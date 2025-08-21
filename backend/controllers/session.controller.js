const Session = require('../models/session.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { parseUserAgent, getSessionDescription } = require('../utils/session.utils');

/**
 * Get all active sessions for the current user
 */
exports.getUserSessions = async (req, res) => {
  try {
    const userId = req.user.sub; // Use 'sub' instead of 'userId'
    const currentRefreshToken = req.cookies.refreshToken;

    logger.info(`Getting sessions for user`, {
      userId,
      hasRefreshToken: !!currentRefreshToken,
      type: 'DEBUG'
    });

    // Get all active sessions for the user
    const sessions = await Session.find({ 
      userId, 
      isActive: true 
    }).sort({ lastActivity: -1 });

    logger.info(`Found ${sessions.length} sessions in database`, {
      userId,
      sessionCount: sessions.length,
      type: 'DEBUG'
    });

    // If user has no sessions but has a refresh token, create one for current session
    if (sessions.length === 0 && currentRefreshToken) {
      logger.info(`Creating session for existing authenticated user`, {
        userId,
        type: 'SESSION_CREATION'
      });
      
      try {
        const { parseUserAgent } = require('../utils/session.utils');
        const deviceInfo = parseUserAgent(req.get('User-Agent'));
        
        const newSession = new Session({
          userId,
          refreshToken: currentRefreshToken,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          deviceInfo,
          location: {
            country: 'Unknown',
            city: 'Unknown',
            region: 'Unknown'
          },
          lastActivity: new Date()
        });

        await newSession.save();
        sessions.push(newSession);
        
        logger.info(`Created new session for authenticated user`, {
          userId,
          sessionId: newSession._id,
          type: 'SECURITY_EVENT'
        });
      } catch (createError) {
        logger.error('Error creating session for authenticated user', {
          error: createError.message,
          userId,
          type: 'ERROR'
        });
      }
    }

    // Format sessions for the frontend
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      deviceInfo: session.deviceInfo,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
      isCurrent: session.refreshToken === currentRefreshToken,
      description: getSessionDescription(session)
    }));

    logger.info(`Retrieved ${sessions.length} active sessions for user`, {
      userId,
      sessionCount: sessions.length,
      type: 'SECURITY_EVENT'
    });

    res.status(200).json({
      message: 'Sessions retrieved successfully',
      sessions: formattedSessions
    });

  } catch (error) {
    logger.error('Error retrieving user sessions', {
      error: error.message,
      userId: req.user?.sub,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to retrieve sessions' });
  }
};

/**
 * Terminate a specific session
 */
exports.terminateSession = async (req, res) => {
  try {
    const userId = req.user.sub; // Use 'sub' instead of 'userId'
    const sessionId = req.params.sessionId;
    const currentRefreshToken = req.cookies.refreshToken;

    // Find the session to terminate
    const session = await Session.findOne({
      _id: sessionId,
      userId,
      isActive: true
    });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    // Prevent terminating the current session
    if (session.refreshToken === currentRefreshToken) {
      return res.status(400).json({ 
        message: 'Cannot terminate your current session. Use logout instead.' 
      });
    }

    // Deactivate the session
    session.isActive = false;
    session.lastActivity = new Date();
    await session.save();

    // Also invalidate the refresh token on the user model if it matches
    const user = await User.findById(userId);
    if (user && user.refreshToken === session.refreshToken) {
      user.refreshToken = null;
      await user.save();
    }

    logger.warn(`Session terminated by user`, {
      userId,
      terminatedSessionId: sessionId,
      terminatedSessionDevice: getSessionDescription(session),
      terminatedSessionIp: session.ipAddress,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT'
    });

    res.status(200).json({ 
      message: 'Session terminated successfully'
    });

  } catch (error) {
    logger.error('Error terminating session', {
      error: error.message,
      userId: req.user?.sub,
      sessionId: req.params?.sessionId,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to terminate session' });
  }
};

/**
 * Terminate all other sessions (except current)
 */
exports.terminateAllOtherSessions = async (req, res) => {
  try {
    const userId = req.user.sub; // Use 'sub' instead of 'userId'
    const currentRefreshToken = req.cookies.refreshToken;

    // Get count of sessions before termination
    const sessionsBeforeCount = await Session.countDocuments({
      userId,
      isActive: true,
      refreshToken: { $ne: currentRefreshToken }
    });

    // Deactivate all other sessions
    const result = await Session.updateMany(
      { 
        userId, 
        isActive: true,
        refreshToken: { $ne: currentRefreshToken }
      },
      { 
        isActive: false, 
        lastActivity: new Date() 
      }
    );

    // Clear refresh token from user model if it doesn't match current session
    const user = await User.findById(userId);
    if (user && user.refreshToken !== currentRefreshToken) {
      user.refreshToken = currentRefreshToken;
      await user.save();
    }

    logger.warn(`All other sessions terminated by user`, {
      userId,
      terminatedSessionsCount: result.modifiedCount,
      sessionsBeforeCount,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT'
    });

    res.status(200).json({ 
      message: `${result.modifiedCount} sessions terminated successfully`
    });

  } catch (error) {
    logger.error('Error terminating all other sessions', {
      error: error.message,
      userId: req.user?.sub,
      type: 'ERROR'
    });
    res.status(500).json({ message: 'Failed to terminate sessions' });
  }
};
