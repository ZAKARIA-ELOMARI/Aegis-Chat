const Session = require('../models/session.model');
const logger = require('../config/logger');

/**
 * Middleware to update session activity on authenticated requests
 */
const updateSessionActivity = async (req, res, next) => {
  // Only update activity for authenticated requests with a refresh token
  if (req.user && req.cookies.refreshToken) {
    try {
      const refreshToken = req.cookies.refreshToken;
      
      // Update the lastActivity timestamp for the current session
      await Session.updateOne(
        { 
          refreshToken, 
          userId: req.user.sub, // Use 'sub' instead of 'userId'
          isActive: true 
        },
        { 
          lastActivity: new Date() 
        }
      );
    } catch (error) {
      // Log the error but don't fail the request
      logger.error('Error updating session activity', {
        error: error.message,
        userId: req.user?.sub,
        type: 'SESSION_UPDATE_ERROR'
      });
    }
  }
  
  next();
};

module.exports = updateSessionActivity;
