const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // <-- Import the new library
const speakeasy = require('speakeasy'); // <-- ADD this import
const logger = require('../config/logger');
const crypto = require('crypto');
const TokenBlocklist = require('../models/tokenBlocklist.model'); 
const { createToken, decodeToken } = require('../utils/jwt.utils');
const sendEmail = require('../utils/email.util');


// @desc   Register a new user (employee)
// @route  POST /api/auth/register
// @access Private (to be restricted to Admins later)
exports.register = async (req, res) => {
  try {
    // Admins will now register users with an email and a name.
    const { username, email } = req.body;

    // 1. Check if email is provided
    if (!email || !username) {
      return res.status(400).json({ message: 'Please provide a name and an email.' });
    }

    // 2. Check if a user with that email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "A user with this email already exists." });
    }

    // 3. Generate a secure temporary password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // 4. Create the new user
    const user = await User.create({
      username, // This is now the full name
      email,
      passwordHash,
      role: 'employee',
      status: 'pending'
    });

    // 5. Respond with success
    if (user) {
      // NOTE: For a production system, you would email this password.
      // For now, we return it so the admin can provide it to the user.
      res.status(201).json({
        message: 'User registered successfully. Please provide them with their temporary password.',
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
        },
        tempPassword: tempPassword
      });
    } else {
      res.status(400).json({ message: 'Invalid user data.' });
    }

  } catch (error) {
    logger.error('Server error during user registration:', { error: error.message, email: req.body.email });
    res.status(500).json({ message: 'Server error during user registration.' });
  }
};


// @desc   Authenticate a user & get token
// @route  POST /api/auth/login
// @access Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email }); // Find by email

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
        const userPayload = {
            id: user.id,
            role: user.role,
            username: user.username,
            email: user.email
        };
        const finalToken = createToken(userPayload); // Use our utility

        res.status(200).json({
            message: 'Login successful.',
            token: finalToken,
            user: userPayload
        });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ message: 'Server error during login.' });
    }
};

exports.logout = async (req, res, next) => {
    try {

        const token = req.headers.authorization.split(' ')[1];
        const decoded = decodeToken(token); // Use a utility to decode the token without verifying (we already know it's valid from the auth middleware)
        
        const blocklistedToken = new TokenBlocklist({
            jti: decoded.jti,
            expiresAt: new Date(decoded.exp * 1000), // `exp` is in seconds, Date needs milliseconds
        });

        await blocklistedToken.save();

        res.status(200).json({ message: "You have been successfully logged out." });

    } catch (error) {
        next(error);
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
    // This flow should now use email, not username.
    const { email, tempPassword, newPassword } = req.body;

    // 1. Basic validation
    if (!email || !tempPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide email, temporary password, and new password.' });
    }

    // 2. Find the user by email
    const user = await User.findOne({ email });

    // 3. If user exists, compare the temporary password
    if (user) {
      const isMatch = await bcrypt.compare(tempPassword, user.passwordHash);
      if (isMatch) {
        // --- SUCCESS CASE ---
        // Block further processing if the account isn't in a pending state
        if (user.status !== 'pending') {
          return res.status(400).json({ message: 'This account is not pending activation.' });
        }

        // 5. Hash the new password and update the user
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.status = 'active'; // Activate the user!
        await user.save();

        return res.status(200).json({ message: 'Password has been updated successfully. You can now log in.' });
      }
    }
    
    // --- FAILURE CASE ---
    // For any failure (user not found OR password mismatch), return the same generic error.
    // To make timing attacks more difficult, we can perform a dummy hash comparison if the user is not found.
    if (!user) {
      await bcrypt.compare('', '$2a$10$abcdefghijklmnopqrstuv');
    }
    
    return res.status(401).json({ message: 'Invalid email or temporary password.' });

  } catch (error) {
    logger.error('Server error during password update:', { error: error.message, email: req.body.email });
    res.status(500).json({ message: 'Server error during password update.' });
  }
};


// @desc   Handle "forgot password" request
// @route  POST /api/auth/forgot-password
// @access Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Note: We send a success response even if the user doesn't exist
      // to prevent user enumeration attacks.
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Generate the reset token using the method we added to the user model
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Save the user with the new token fields

    // Create the reset URL
    // In a real frontend app, this would point to your password reset page
    const resetURL = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password for your Aegis Chat account. Please make a POST request to:\n\n${resetURL}\n\nIf you did not request this, please ignore this email and your password will remain unchanged. This link is valid for 10 minutes.`;

    await sendEmail({
      email: user.email,
      subject: 'Aegis Chat - Password Reset Request',
      message
    });

    res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });

  } catch (error) {
    // If an error occurs, invalidate the tokens and log it
    // but don't reveal to the client that the user might exist.
    logger.error('Error in forgotPassword:', { error: error.message });
    // Invalidate the token on error to prevent a broken state
    if (req.user) {
        req.user.passwordResetToken = undefined;
        req.user.passwordResetExpires = undefined;
        await req.user.save({ validateBeforeSave: false });
    }
    res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
};


// @desc   Handle the actual password reset
// @route  POST /api/auth/reset-password/:token
// @access Public
exports.resetPassword = async (req, res) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        // Find user by the hashed token and ensure the token has not expired
        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Token is invalid or has expired.' });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(req.body.newPassword, salt);
        user.status = 'active'; // Ensure the user is active

        // Clear the reset token fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        // Optionally, log the user in and send a new JWT token
        res.status(200).json({ message: 'Password has been successfully reset.' });

    } catch (error) {
        logger.error('Error in resetPassword:', { error: error.message });
        res.status(500).json({ message: 'An error occurred while resetting your password.' });
    }
};