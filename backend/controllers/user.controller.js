const User = require('../models/user.model');
const logger = require('../config/logger');

// @desc   Get all users (for the employee directory)
// @route  GET /api/users
// @access Private
exports.getAllUsers = async (req, res) => {
  try {
    // This will now automatically include the new 'publicKey' field
    const users = await User.find().select('-passwordHash');
    res.json(users);
  } catch (err) {
    logger.error('Error retrieving all users:', { error: err.message, userId: req.user?.id });
    res.status(500).send('Server Error');
  }
};

// at the top, after the other exports.getAllUsers line
exports.setPublicKey = async (req, res) => {
  try {
    const { publicKey } = req.body;
    if (!publicKey) {
      return res.status(400).json({ message: 'Public key is required.' });
    }

    // Find the logged-in user by their ID (from the auth middleware) and update their document
    const user = await User.findByIdAndUpdate(req.user.id, { publicKey }, { new: true });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Public key updated successfully.' });
  } catch (err) {
    logger.error('Error setting public key:', { error: err.message, userId: req.user?.id });
    res.status(500).send('Server Error');
  }
};