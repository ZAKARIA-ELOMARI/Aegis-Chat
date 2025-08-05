const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Role } = require('../models/role.model'); // Import Role model

exports.createAccessToken = async (user) => { // Make the function async
    const userRole = await Role.findById(user.role); // Fetch the role details
    const payload = {
        sub: user._id,
        username: user.username,
        role: userRole ? userRole.name : 'Employee', // Use role name, fallback to 'Employee'
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        jti: crypto.randomBytes(16).toString('hex'),
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
};

exports.createRefreshToken = (user) => {
    const payload = {
        sub: user._id,
        jti: crypto.randomBytes(16).toString('hex'),
    };
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

exports.decodeToken = (token) => {
    return jwt.decode(token);
};