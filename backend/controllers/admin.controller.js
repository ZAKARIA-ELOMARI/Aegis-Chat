const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const Message = require('../models/message.model')

// @desc   Update a user's status (deactivate/reactivate)
// @route  PUT /api/admin/users/:userId/status
// @access Admin-only
exports.updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const userId = req.params.userId;

    if (!status || !['active', 'deactivated'].includes(status)) {
      return res.status(400).json({ message: "Invalid status provided. Must be 'active' or 'deactivated'." });
    }

    const user = await User.findByIdAndUpdate(userId, { status }, { new: true }).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: `User status updated successfully to '${status}'.`,
      user: user
    });

  } catch (error) {
    logger.error('Server error while updating user status:', { error: error.message, userId: req.params.userId, requestedStatus: req.body.status });
    res.status(500).json({ message: 'Server error while updating user status.' });
  }
};


// @desc   Reset a user's password
// @route  POST /api/admin/users/:userId/reset-password
// @access Admin-only
exports.resetUserPassword = async (req, res) => {
    try {
      const userId = req.params.userId;
      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ message: 'User not found.' });
      }

      const tempPassword = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(tempPassword, salt);
      user.status = 'pending'; 

      // --- THE SECURITY FIX IS HERE ---
      user.isTwoFactorEnabled = false;
      user.twoFactorSecret = null;
      // --- END FIX ---

      await user.save();

      res.status(200).json({
        message: `Password for user '${user.username}' has been reset and their 2FA has been disabled. Please provide them with the new temporary password to complete the process.`,
        username: user.username,
        tempPassword: tempPassword
      });

    } catch (error) {
      logger.error('Server error while resetting user password:', { error: error.message, userId: req.params.userId });
      res.status(500).json({ message: 'Server error while resetting password.' });
    }
  };


exports.getSystemLogs = async (req, res) => {
    try {
        // 1. Sanitize and validate pagination parameters from user input.
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;

        // 2. Ensure values are positive and cap the limit to prevent abuse.
        const pageNumber = Math.max(1, page);
        const limitNumber = Math.max(1, Math.min(limit, 100)); // Cap limit at 100
        const skip = (pageNumber - 1) * limitNumber;

        const options = {
            sort: { timestamp: -1 }, // Show newest logs first
            skip: skip,
            limit: limitNumber
        };
        
        const logCollection = mongoose.connection.db.collection('logs');
        
        // 3. Use the sanitized and capped values in the database query.
        const logs = await logCollection.find({}, options).toArray();

        res.status(200).json(logs);
    } catch (error) {
        logger.error('Failed to fetch system logs', { error: error.message });
        res.status(500).json({ message: 'Server error while fetching logs.' });
    }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { content } = req.body;
    // THE FIX IS HERE: Use req.user.sub instead of req.user.id
    const adminUserId = req.user.sub; 

    if (!content) {
      return res.status(400).json({ message: 'Broadcast content cannot be empty.' });
    }

    const broadcast = new Message({
      sender: adminUserId, // Now this will have the correct ID
      content: Buffer.from(content, 'utf-8'), // Also ensure content is a Buffer
      isBroadcast: true,
    });
    await broadcast.save();

    req.io.emit('broadcastMessage', {
      content: broadcast.content.toString('utf-8'), // Send content back as a string
      sender: adminUserId, // Also fixed here for consistency
      timestamp: broadcast.createdAt,
    });

    res.status(200).json({ message: 'Broadcast sent successfully.' });
  } catch (error) {
    logger.error('Failed to send broadcast message', { error: error.message });
    res.status(500).json({ message: 'Server error during broadcast.' });
  }
};