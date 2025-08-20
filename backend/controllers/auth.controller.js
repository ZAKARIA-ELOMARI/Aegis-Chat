const User = require('../models/user.model');
const { Role } = require('../models/role.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const logger = require('../config/logger');
const crypto = require('crypto');
const zxcvbn = require('zxcvbn');
const TokenBlocklist = require('../models/tokenBlocklist.model');
const { createAccessToken, createRefreshToken } = require('../utils/jwt.utils');
const { sendEmail } = require('../utils/email.util');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { username, email, roleId } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'Please provide a name and an email.' });
    }
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Invalid request." });
    }

    let assignedRole;
    
    // If roleId is provided (admin creating user), use it; otherwise use default Employee role
    if (roleId) {
      assignedRole = await Role.findById(roleId);
      if (!assignedRole) {
        return res.status(400).json({ message: "Invalid role selected." });
      }
    } else {
      assignedRole = await Role.findOne({ name: 'Employee' });
      if (!assignedRole) {
        logger.error("Default 'Employee' role not found in the database.");
        return res.status(500).json({ message: "Server configuration error: Default role not found."});
      }
    }

    const tempPassword = crypto.randomBytes(8).toString('hex');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: assignedRole._id,
      status: 'pending'
    });
    if (user) {
      res.status(201).json({
        message: 'User registered successfully.',
        user: { 
          id: user._id, 
          username: user.username, 
          email: user.email,
          role: assignedRole.name 
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

// Login a user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            logger.warn(`Failed login attempt - user not found`, { 
                email, 
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        if (!(await bcrypt.compare(password, user.passwordHash))) {
            logger.warn(`Failed login attempt - invalid password`, { 
                email, 
                userId: user._id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // Handle different user statuses
        if (user.status === 'pending') {
            const tempToken = jwt.sign({ sub: user.id, scope: 'SET_INITIAL_PASSWORD' }, process.env.JWT_SECRET, { expiresIn: '15m' });
            logger.info(`User login - initial password setup required`, { 
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            return res.status(200).json({ message: "Login successful. Please set your initial password.", initialPasswordSetupRequired: true, tempToken });
        }
        if (user.status === 'deactivated') {
            logger.warn(`Login attempt on deactivated account`, { 
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
             return res.status(403).json({ message: `Account is deactivated.`});
        }

        // Handle 2FA for active users
        if (user.isTwoFactorEnabled) {
            const tempToken = jwt.sign({ sub: user.id, scope: '2FA_LOGIN' }, process.env.JWT_SECRET, { expiresIn: '10m' });
            logger.info(`User login - 2FA required`, { 
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            return res.status(200).json({ message: "Please provide your 2FA token.", twoFactorRequired: true, tempToken });
        }

        // If active and no 2FA, issue final tokens
        const accessToken = await createAccessToken(user);
        const refreshToken = createRefreshToken(user);
        user.refreshToken = refreshToken;

        // Check for new device login
        const currentIp = req.ip;
        const currentUserAgent = req.get('User-Agent');
        const isNewDevice = !user.lastLoginInfo || 
                           user.lastLoginInfo.ip !== currentIp || 
                           user.lastLoginInfo.userAgent !== currentUserAgent;

        if (isNewDevice && user.lastLoginInfo) {
            logger.warn(`Login from new device detected`, { 
                userId: user._id,
                email: user.email,
                newIp: currentIp,
                newUserAgent: currentUserAgent,
                previousIp: user.lastLoginInfo.ip,
                previousUserAgent: user.lastLoginInfo.userAgent,
                previousLogin: user.lastLoginInfo.timestamp,
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
        }

        // Update last login info
        user.lastLoginInfo = {
            ip: currentIp,
            userAgent: currentUserAgent,
            timestamp: new Date()
        };

        await user.save();

        logger.info(`Successful login`, { 
            userId: user._id,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            isNewDevice,
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT'
        });

        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
        res.status(200).json({ message: 'Login successful.', accessToken });

    } catch (error) {
        logger.error('Login error', { error: error.message });
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// Set Initial Password
exports.setInitialPassword = async (req, res) => {
  try {
    const userId = req.user.sub;
    const { newPassword } = req.body;
    if (req.user.scope !== 'SET_INITIAL_PASSWORD') {
        return res.status(403).json({ message: 'Forbidden: Invalid token scope.'});
    }
    
    // Validate password strength
    const strength = zxcvbn(newPassword);
    if (strength.score < 3) { // Score is 0-4
      return res.status(400).json({ 
        message: 'Password is too weak.', 
        suggestions: strength.feedback.suggestions 
      });
    }
    
    const user = await User.findById(userId);
    if (!user || user.status !== 'pending') {
      return res.status(400).json({ message: 'This account is not pending activation or does not exist.' });
    }
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.status = 'active';
    await user.save();

    logger.warn(`Initial password set successfully`, { 
      userId: userId,
      username: user.username,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: 'INITIAL_PASSWORD_SET',
      details: 'User account activated with new password'
    });
    
    return res.status(200).json({ message: 'Password has been updated successfully.' });
  } catch (error) {
    logger.error('Server error during initial password set:', { error: error.message, userId: req.user?.sub });
    res.status(500).json({ message: 'Server error during password update.' });
  }
};

// Verify 2FA during login
exports.verifyLogin2FA = async (req, res) => {
    try {
        const userId = req.user.sub;
        const { token } = req.body;
        if (req.user.scope !== '2FA_LOGIN') {
            return res.status(403).json({ message: 'Forbidden: Invalid token scope for 2FA login.'});
        }
        if (!token) {
            return res.status(400).json({ message: '2FA token is required.' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(401).json({ message: 'Invalid user.' });
        }
        const verified = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 1 });
        if (verified) {
            const accessToken = await createAccessToken(user);
            const refreshToken = createRefreshToken(user);
            user.refreshToken = refreshToken;

            // Check for new device login in 2FA
            const currentIp = req.ip;
            const currentUserAgent = req.get('User-Agent');
            const isNewDevice = !user.lastLoginInfo || 
                               user.lastLoginInfo.ip !== currentIp || 
                               user.lastLoginInfo.userAgent !== currentUserAgent;

            if (isNewDevice && user.lastLoginInfo) {
                logger.warn(`2FA login from new device detected`, { 
                    userId: user._id,
                    email: user.email,
                    newIp: currentIp,
                    newUserAgent: currentUserAgent,
                    previousIp: user.lastLoginInfo.ip,
                    previousUserAgent: user.lastLoginInfo.userAgent,
                    previousLogin: user.lastLoginInfo.timestamp,
                    timestamp: new Date().toISOString(),
                    type: 'SECURITY_EVENT'
                });
            }

            // Update last login info
            user.lastLoginInfo = {
                ip: currentIp,
                userAgent: currentUserAgent,
                timestamp: new Date()
            };

            await user.save();
            
            logger.info(`Successful 2FA login verification`, { 
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                isNewDevice,
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            
            res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
            res.status(200).json({ message: 'Login successful.', accessToken });
        } else {
            logger.warn(`Failed 2FA login verification`, { 
                userId: user._id,
                email: user.email,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            res.status(401).json({ message: "Invalid 2FA token." });
        }
    } catch (error) {
        logger.error('2FA login verification error', { error: error.message });
        res.status(500).json({ message: 'Server error during 2FA login verification.' });
    }
};

// Logout
exports.logout = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.decode(token);
        const blocklistedToken = new TokenBlocklist({ jti: decoded.jti, expiresAt: new Date(decoded.exp * 1000) });
        await blocklistedToken.save();

        // Find user for logging
        const user = await User.findById(decoded.sub);
        
        logger.info(`User logout`, { 
            userId: decoded.sub,
            email: user?.email || 'Unknown',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT'
        });

        res.status(200).json({ message: "You have been successfully logged out." });
    } catch (error) {
        logger.error('Error during logout:', { error: error.message });
        res.status(500).json({ message: "Error logging out."});
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
      // Log suspicious password reset attempt for non-existent user
      logger.warn(`Password reset attempted for non-existent email`, {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        type: 'SECURITY_EVENT'
      });

      // Note: We send a success response even if the user doesn't exist
      // to prevent user enumeration attacks.
      return res.status(200).json({ message: 'If a user with that email exists, a password reset link has been sent.' });
    }

    // Generate the reset token using the method we added to the user model
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false }); // Save the user with the new token fields

    logger.info(`Password reset requested`, {
      userId: user._id,
      email: user.email,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT'
    });

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
        const { newPassword } = req.body;
        
        // Validate password strength
        const strength = zxcvbn(newPassword);
        if (strength.score < 3) { // Score is 0-4
          return res.status(400).json({ 
            message: 'Password is too weak.', 
            suggestions: strength.feedback.suggestions 
          });
        }
        
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
            logger.warn(`Invalid password reset token used`, {
                token: req.params.token,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString(),
                type: 'SECURITY_EVENT'
            });
            return res.status(400).json({ message: 'Token is invalid or has expired.' });
        }

        // Set the new password
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(newPassword, salt);
        user.status = 'active'; // Ensure the user is active

        // Clear the reset token fields
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;

        await user.save();

        logger.info(`Password successfully reset via email link`, {
            userId: user._id,
            email: user.email,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            timestamp: new Date().toISOString(),
            type: 'SECURITY_EVENT'
        });

        // Optionally, log the user in and send a new JWT token
        res.status(200).json({ message: 'Password has been successfully reset.' });

    } catch (error) {
        logger.error('Error in resetPassword:', { error: error.message });
        res.status(500).json({ message: 'An error occurred while resetting your password.' });
    }
};

// At the end of auth.controller.js

exports.refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not found.' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.sub);

        if (!user || user.refreshToken !== refreshToken) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }

        const newAccessToken = await createAccessToken(user);
        res.json({ accessToken: newAccessToken });

    } catch (error) {
        return res.status(403).json({ message: 'Invalid refresh token.' });
    }
};