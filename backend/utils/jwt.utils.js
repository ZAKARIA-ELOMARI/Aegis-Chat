const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Import crypto for JTI

exports.createToken = (user) => {
    const payload = {
        sub: user._id,
        username: user.username,
        role: user.role,
        // --- ADD JTI (JWT ID) ---
        jti: crypto.randomBytes(16).toString('hex'), 
    };
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

exports.decodeToken = (token) => {
    return jwt.decode(token);
};