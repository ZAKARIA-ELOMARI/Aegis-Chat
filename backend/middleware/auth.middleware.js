const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlocklist = require('../models/tokenBlocklist.model');

const auth = async (req, res, next) => {
    console.log("--- Auth Middleware: START ---");
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log("Auth Middleware: Token decoded successfully.", decoded);

            const isBlocked = await TokenBlocklist.findOne({ jti: decoded.jti });
            if (isBlocked) {
                console.log("Auth Middleware: Token is blocklisted.");
                return res.status(401).json({ message: 'Not authorized, token is invalid (logged out).' });
            }

            // The critical assignment
            req.user = decoded;
            console.log("Auth Middleware: req.user object is set:", req.user);

            if (!req.user) {
                 console.log("Auth Middleware: req.user is somehow null or undefined after setting.");
                 return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
            }

            console.log("--- Auth Middleware: END (calling next()) ---");
            next();
        } catch (error) {
            console.error("Auth Middleware: Error during token verification:", error);
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    } else {
        console.log("Auth Middleware: No Bearer token found.");
        return res.status(401).json({ message: 'Not authorized, no token provided.' });
    }
};

module.exports = auth;