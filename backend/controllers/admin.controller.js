const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const mongoose = require('mongoose');
const Message = require('../models/message.model');
const { Role } = require('../models/role.model');

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

    logger.info(`User deleted successfully by admin`, { 
      deletedUserId: userId, 
      deletedUsername: user.username,
      adminId: req.user.sub 
    });

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

    logger.info(`Role created successfully`, { 
      roleId: role._id, 
      roleName: role.name,
      adminId: req.user.sub 
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

    logger.info(`Role updated successfully`, { 
      roleId: role._id, 
      roleName: role.name,
      adminId: req.user.sub 
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

    logger.info(`Role deleted successfully`, { 
      roleId, 
      roleName: role.name,
      adminId: req.user.sub 
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

    // Update the user
    const user = await User.findByIdAndUpdate(
      userId, 
      { role: roleId }, 
      { new: true }
    ).populate('role');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    logger.info(`User role updated successfully`, { 
      userId, 
      username: user.username,
      newRoleId: roleId,
      newRoleName: role.name,
      adminId: req.user.sub 
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