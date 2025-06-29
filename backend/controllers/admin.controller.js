const User = require('../models/user.model');
const bcrypt = require('bcryptjs');

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
    console.error(error);
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
      await user.save();
  
      res.status(200).json({
        message: 'User password has been reset successfully.',
        username: user.username,
        tempPassword: tempPassword
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error while resetting password.' });
    }
  };