const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const Message = require('../models/message.model');
const { Role } = require('../models/role.model');
const { SecurityLogger, SECURITY_EVENTS, RISK_LEVELS } = require('../utils/securityLogger.util');

// @desc   Delete a user
// @route  DELETE /api/admin/users/:userId
// @access Admin-only
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent deletion of the current admin user
    if (userId === req.user.sub) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Enhanced security logging for user deletion
    const currentUser = await User.findById(req.user.sub);
    SecurityLogger.logAdminAction(
      SECURITY_EVENTS.ADMIN_USER_DELETED,
      req.user.sub,
      currentUser?.username || 'Unknown',
      userId,
      user.username,
      'deleted user account',
      req,
      { deletedUserEmail: user.email, deletedUserRole: user.role }
    );

    res.status(200).json({
      message: `User '${user.username}' has been deleted successfully.`,
    });

  } catch (error) {
    logger.error('Server error while deleting user:', { 
      error: error.message, 
      userId: req.params.userId,
      adminId: req.user.sub 
    });
    res.status(500).json({ message: 'Server error while deleting user.' });
  }
};

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

    const currentUser = await User.findById(req.user.sub);
    
    // Enhanced security logging for status changes
    const action = status === 'deactivated' ? 'deactivated' : 'reactivated';
    const eventType = status === 'deactivated' ? SECURITY_EVENTS.ACCOUNT_DEACTIVATED : SECURITY_EVENTS.ACCOUNT_REACTIVATED;
    
    SecurityLogger.logAdminAction(
      eventType,
      req.user.sub,
      currentUser?.username || 'Unknown',
      userId,
      user.username,
      `${action} user account`,
      req,
      { 
        previousStatus: user.status,
        newStatus: status,
        targetUserEmail: user.email
      }
    );

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

      const currentUser = await User.findById(req.user.sub);
      
      // Enhanced security logging for password reset
      SecurityLogger.logAdminAction(
        SECURITY_EVENTS.ADMIN_PASSWORD_RESET,
        req.user.sub,
        currentUser?.username || 'Unknown',
        userId,
        user.username,
        'reset password and disabled 2FA',
        req,
        {
          targetUserEmail: user.email,
          twoFactorWasEnabled: user.isTwoFactorEnabled,
          statusChangedTo: 'pending'
        }
      );

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
        const securityOnly = req.query.securityOnly === 'true'; // Filter for security events only

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
        
        // 3. Build query filter - only show security events if requested
        let filter = {};
        if (securityOnly) {
            filter = {
                $or: [
                    { 'meta.type': 'SECURITY_EVENT' },
                    { message: { $regex: /login|authentication|password|2fa|admin|security|unauthorized|deactivated/i } }
                ]
            };
        }
        
        // 4. Use the sanitized and capped values in the database query.
        const logs = await logCollection.find(filter, options).toArray();

        res.status(200).json(logs);
    } catch (error) {
        logger.error('Failed to fetch system logs', { error: error.message });
        res.status(500).json({ message: 'Server error while fetching logs.' });
    }
};

exports.clearSystemLogs = async (req, res) => {
    try {
        const logCollection = mongoose.connection.db.collection('logs');
        const result = await logCollection.deleteMany({});
        
        const currentUser = await User.findById(req.user.sub);
        
        // Enhanced security logging for clearing system logs
        SecurityLogger.logAdminAction(
            SECURITY_EVENTS.ADMIN_LOGS_CLEARED,
            req.user.sub,
            currentUser?.username || 'Unknown',
            null,
            'System',
            `cleared all system logs (${result.deletedCount} entries)`,
            req,
            { 
                deletedCount: result.deletedCount,
                action: 'CLEAR_SYSTEM_LOGS'
            }
        );

        logger.warn(`Admin cleared all system logs`, { 
            adminId: req.user.sub,
            adminUsername: currentUser?.username || 'Unknown',
            deletedCount: result.deletedCount,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT'
        });

        res.status(200).json({ 
            message: `Successfully cleared ${result.deletedCount} log entries.`,
            deletedCount: result.deletedCount 
        });
    } catch (error) {
        logger.error('Failed to clear system logs', { error: error.message });
        res.status(500).json({ message: 'Server error while clearing logs.' });
    }
};

exports.broadcastMessage = async (req, res) => {
  try {
    const { content, fileUrl } = req.body;
    // THE FIX IS HERE: Use req.user.sub instead of req.user.id
    const adminUserId = req.user.sub; 

    if (!content && !fileUrl) {
      return res.status(400).json({ message: 'Broadcast content or file URL must be provided.' });
    }

    const broadcast = new Message({
      sender: adminUserId, // Now this will have the correct ID
      content: Buffer.from(content || '', 'utf-8'), // Handle empty content for file-only messages
      fileUrl: fileUrl || null, // Store file URL if present
      isBroadcast: true,
    });
    await broadcast.save();

    req.io.emit('broadcastMessage', {
      content: broadcast.content.toString('utf-8'), // Send content back as a string
      fileUrl: broadcast.fileUrl, // Include file URL
      sender: adminUserId, // Also fixed here for consistency
      timestamp: broadcast.createdAt,
    });

    // Enhanced security logging for broadcast messages
    const currentUser = await User.findById(req.user.sub);
    SecurityLogger.logAdminAction(
      SECURITY_EVENTS.ADMIN_BROADCAST_SENT,
      req.user.sub,
      currentUser?.username || 'Unknown',
      null,
      'All Users',
      `sent broadcast message to all users`,
      req,
      { 
        messageLength: (content || '').length,
        messagePreview: (content || '').substring(0, 100) + ((content || '').length > 100 ? '...' : ''),
        hasFile: !!fileUrl
      }
    );

    res.status(200).json({ message: 'Broadcast sent successfully.' });
  } catch (error) {
    logger.error('Failed to send broadcast message', { error: error.message });
    res.status(500).json({ message: 'Server error during broadcast.' });
  }
};

// @desc   Get all roles
// @route  GET /api/admin/roles
// @access Admin-only
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.status(200).json(roles);
  } catch (error) {
    logger.error('Failed to fetch roles', { error: error.message });
    res.status(500).json({ message: 'Server error while fetching roles.' });
  }
};

// @desc   Create a new role
// @route  POST /api/admin/roles
// @access Admin-only
exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Role name is required.' });
    }

    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({ message: 'Role with this name already exists.' });
    }

    const role = new Role({
      name,
      permissions: permissions || []
    });

    await role.save();

    const currentUser = await User.findById(req.user.sub);
    
    // Enhanced security logging for role creation
    SecurityLogger.logAdminAction(
        SECURITY_EVENTS.ADMIN_ROLE_CREATED,
        req.user.sub,
        currentUser?.username || 'Unknown',
        null,
        'System',
        `created new role '${role.name}' with permissions: [${(permissions || []).join(', ')}]`,
        req,
        { 
            roleId: role._id,
            roleName: role.name,
            permissions: permissions || [],
            action: 'CREATE_ROLE'
        }
    );

    logger.warn(`Admin created new role`, { 
      roleId: role._id, 
      roleName: role.name,
      permissions: permissions || [],
      adminId: req.user.sub,
      adminUsername: currentUser?.username || 'Unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: 'ROLE_CREATED'
    });

    res.status(201).json({
      message: 'Role created successfully.',
      role
    });

  } catch (error) {
    logger.error('Failed to create role', { error: error.message });
    res.status(500).json({ message: 'Server error while creating role.' });
  }
};

// @desc   Update a role
// @route  PUT /api/admin/roles/:roleId
// @access Admin-only
exports.updateRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const roleId = req.params.roleId;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    if (name) {
      const existingRole = await Role.findOne({ name, _id: { $ne: roleId } });
      if (existingRole) {
        return res.status(400).json({ message: 'Role with this name already exists.' });
      }
      role.name = name;
    }

    if (permissions !== undefined) {
      role.permissions = permissions;
    }

    await role.save();

    const currentUser = await User.findById(req.user.sub);
    
    // Enhanced security logging for role update
    SecurityLogger.logAdminAction(
        SECURITY_EVENTS.ADMIN_ROLE_UPDATED,
        req.user.sub,
        currentUser?.username || 'Unknown',
        null,
        'System',
        `updated role '${role.name}' with permissions: [${role.permissions.join(', ')}]`,
        req,
        { 
            roleId: role._id,
            roleName: role.name,
            permissions: role.permissions,
            action: 'UPDATE_ROLE'
        }
    );

    logger.warn(`Admin updated role`, { 
      roleId: role._id, 
      roleName: role.name,
      permissions: role.permissions,
      adminId: req.user.sub,
      adminUsername: currentUser?.username || 'Unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: 'ROLE_UPDATED'
    });

    res.status(200).json({
      message: 'Role updated successfully.',
      role
    });

  } catch (error) {
    logger.error('Failed to update role', { error: error.message });
    res.status(500).json({ message: 'Server error while updating role.' });
  }
};

// @desc   Delete a role
// @route  DELETE /api/admin/roles/:roleId
// @access Admin-only
exports.deleteRole = async (req, res) => {
  try {
    const roleId = req.params.roleId;

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    // Check if any users are assigned to this role
    const usersWithRole = await User.findOne({ role: roleId });
    if (usersWithRole) {
      return res.status(400).json({ 
        message: 'Cannot delete role. There are users assigned to this role. Please reassign them first.' 
      });
    }

    await Role.findByIdAndDelete(roleId);

    const currentUser = await User.findById(req.user.sub);
    
    // Enhanced security logging for role deletion
    SecurityLogger.logAdminAction(
        SECURITY_EVENTS.ADMIN_ROLE_DELETED,
        req.user.sub,
        currentUser?.username || 'Unknown',
        null,
        'System',
        `deleted role '${role.name}' with permissions: [${role.permissions.join(', ')}]`,
        req,
        { 
            roleId,
            roleName: role.name,
            permissions: role.permissions,
            action: 'DELETE_ROLE'
        }
    );

    logger.warn(`Admin deleted role`, { 
      roleId, 
      roleName: role.name,
      permissions: role.permissions,
      adminId: req.user.sub,
      adminUsername: currentUser?.username || 'Unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: 'ROLE_DELETED'
    });

    res.status(200).json({
      message: `Role '${role.name}' has been deleted successfully.`,
    });

  } catch (error) {
    logger.error('Failed to delete role', { error: error.message });
    res.status(500).json({ message: 'Server error while deleting role.' });
  }
};

// @desc   Update user role
// @route  PUT /api/admin/users/:userId/role
// @access Admin-only
exports.updateUserRole = async (req, res) => {
  try {
    const { roleId } = req.body;
    const userId = req.params.userId;

    if (!roleId) {
      return res.status(400).json({ message: 'Role ID is required.' });
    }

    // Verify the role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ message: 'Role not found.' });
    }

    // Get the user with current role before updating
    const userBeforeUpdate = await User.findById(userId).populate('role');
    if (!userBeforeUpdate) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update the user
    const user = await User.findByIdAndUpdate(
      userId, 
      { role: roleId }, 
      { new: true }
    ).populate('role');

    const currentUser = await User.findById(req.user.sub);
    
    // Enhanced security logging for role changes
    SecurityLogger.logAdminAction(
      SECURITY_EVENTS.ADMIN_ROLE_CHANGED,
      req.user.sub,
      currentUser?.username || 'Unknown',
      userId,
      user.username,
      `changed user role from '${userBeforeUpdate.role.name}' to '${role.name}'`,
      req,
      { 
        targetUserEmail: user.email,
        previousRoleId: userBeforeUpdate.role._id,
        previousRoleName: userBeforeUpdate.role.name,
        newRoleId: roleId,
        newRoleName: role.name
      }
    );

    logger.warn(`Admin updated user role`, { 
      targetUserId: userId, 
      targetUsername: user.username,
      targetEmail: user.email,
      previousRoleId: userBeforeUpdate.role._id,
      previousRoleName: userBeforeUpdate.role.name,
      newRoleId: roleId,
      newRoleName: role.name,
      adminId: req.user.sub,
      adminUsername: currentUser?.username || 'Unknown',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: 'USER_ROLE_CHANGED'
    });

    res.status(200).json({
      message: `User '${user.username}' role updated to '${role.name}' successfully.`,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });

  } catch (error) {
    logger.error('Server error while updating user role:', { 
      error: error.message, 
      userId: req.params.userId,
      adminId: req.user.sub 
    });
    res.status(500).json({ message: 'Server error while updating user role.' });
  }
};

// Test endpoint to verify security logging
exports.testSecurityLog = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.sub);
    
    console.log('Test security log endpoint called by:', currentUser?.username);
    
    // Test logging a security event
    SecurityLogger.logAdminAction(
      SECURITY_EVENTS.ADMIN_ROLE_CREATED,
      req.user.sub,
      currentUser?.username || 'Unknown',
      null,
      'Test',
      'performed test security logging',
      req,
      { 
        testEvent: true,
        timestamp: new Date().toISOString()
      }
    );

    res.status(200).json({ message: 'Test security log created successfully' });
  } catch (error) {
    console.error('Error in test security log:', error);
    res.status(500).json({ message: 'Error creating test security log' });
  }
};