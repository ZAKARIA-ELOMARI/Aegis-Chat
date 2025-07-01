const jwt = require('jsonwebtoken');
const crypto = require('crypto');

exports.createAccessToken = (user) => {
    const payload = {
        sub: user._id,
        username: user.username,
        role: user.role,
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