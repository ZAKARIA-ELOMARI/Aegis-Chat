const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlocklist = require('../models/tokenBlocklist.model');

const auth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 1. Get token from header
            token = req.headers.authorization.split(' ')[1];

            // 2. Verify the token and get payload
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // 3. Check if the token has been blocklisted
            const isBlocked = await TokenBlocklist.findOne({ jti: decoded.jti });
            if (isBlocked) {
                return res.status(401).json({ message: 'Not authorized, token is invalid (logged out).' });
            }

            // 4. Attach the user payload to the request
            req.user = decoded.user;
            if (!req.user) {
                return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

module.exports = auth;