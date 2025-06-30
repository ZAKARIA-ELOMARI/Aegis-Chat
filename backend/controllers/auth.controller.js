const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- Import the new library
const speakeasy = require('speakeasy'); // <-- ADD this import
const logger = require('../config/logger');

// @desc   Register a new user (employee)
// @route  POST /api/auth/register
// @access Private (to be restricted to Admins later)
exports.register = async (req, res) => {
  try {
    // Get username from the request body
    const { username } = req.body;

    // 1. Check if username is provided
    if (!username) {
      return res.status(400).json({ message: 'Please provide a username.' });
    }

    // 2. Check if user already exists
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: 'User with that username already exists.' });
    }

    // 3. Generate a secure temporary password
    // For this example, a simple random string. In production, consider a stronger generator.
    const tempPassword = Math.random().toString(36).slice(-8);

    // 4. Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 5. Create the new user object using our model
    const user = await User.create({
      username,
      passwordHash,
      role: 'employee', // All users created via this route are employees
      status: 'pending'   // Status is 'pending' until they log in and change password
    });

    // 6. Respond with success and the new user's info
    if (user) {
      res.status(201).json({
        message: 'User registered successfully. Please provide them with their temporary password.',
        userId: user._id,
        username: user.username,
        tempPassword: tempPassword // Send this back so the admin can give it to the employee
      });
    } else {
      res.status(400).json({ message: 'Invalid user data.' });
    }

  } catch (error) {
    logger.error('Server error during user registration:', { error: error.message, username: req.body.username });
    res.status(500).json({ message: 'Server error during user registration.' });
  }
};


// @desc   Authenticate a user & get token
// @route  POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        if (user.status !== 'active') {
             return res.status(403).json({ message: `Account is not active. Current status: ${user.status}`});
        }

        // Check if 2FA is enabled for the user
        if (user.isTwoFactorEnabled) {
            // If yes, do not send the final token.
            // Send a temporary token indicating a 2FA step is required.
            const tempToken = jwt.sign(
                { userId: user.id, isTwoFactorAuthenticated: false },
                process.env.JWT_SECRET,
                { expiresIn: '10m' } // This token is short-lived
            );
            return res.status(200).json({
                message: "Please provide your 2FA token.",
                twoFactorRequired: true,
                tempToken: tempToken,
            });
        }

        // If 2FA is NOT enabled, log them in directly
        const finalToken = jwt.sign(
            { user: { id: user.id, role: user.role }, isTwoFactorAuthenticated: true },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.status(200).json({
            message: 'Login successful.',
            token: finalToken,
            user: { id: user.id, username: user.username, role: user.role }
        });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// NEW CONTROLLER for verifying the 2FA token after password login
exports.verify2FAToken = async (req, res) => {
    try {
        const { token } = req.body;
        // The JWT for this request is the short-lived one we sent from the /login endpoint
        const tempUserId = req.user.id; // This comes from our standard 'auth' middleware

        const user = await User.findById(tempUserId);
        
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
        });

        if (verified) {
            // Token is valid. Issue the final, fully-authenticated JWT.
            const finalToken = jwt.sign(
                { user: { id: user.id, role: user.role }, isTwoFactorAuthenticated: true },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );
            res.status(200).json({
                message: 'Login successful.',
                token: finalToken,
                user: { id: user.id, username: user.username, role: user.role }
            });
        } else {
            res.status(400).json({ message: "Invalid 2FA token." });
        }
    } catch (error) {
        logger.error('2FA verification error', { error: error.message });
        res.status(500).json({ message: 'Server error during 2FA verification.' });
    }
};

// @desc   Set the initial password for a new user
// @route  POST /api/auth/set-initial-password
// @access Public
exports.setInitialPassword = async (req, res) => {
  try {
    const { username, tempPassword, newPassword } = req.body;

    // 1. Basic validation
    if (!username || !tempPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide username, temporary password, and new password.' });
    }

    // 2. Find the user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if user account is active
    if (user.status === 'deactivated') {
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact an administrator.' });
    }
    if (user.status === 'pending') {
        return res.status(403).json({ message: 'Your account is pending activation. Please set your initial password.' });
    }

    // 4. Verify the temporary password
    const isMatch = await bcrypt.compare(tempPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'The temporary password is incorrect.' });
    }

    // 5. Hash the new password and update the user
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    user.passwordHash = newPasswordHash;
    user.status = 'active'; // Activate the user!
    await user.save();

    res.status(200).json({ message: 'Password has been updated successfully. You can now log in with your new password.' });

  } catch (error) {
    logger.error('Server error during password update:', { error: error.message, username: req.body.username });
    res.status(500).json({ message: 'Server error during password update.' });
  }
};