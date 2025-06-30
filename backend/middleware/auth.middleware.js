const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlocklist = require('../models/tokenBlocklist.model');

// This middleware function is our "gatekeeper"
const auth = (req, res, next) => {
  // 1. Get token from the request header
  const token = req.header('Authorization');

  // 2. Check if token doesn't exist
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied.' });
  }

  // The token from the header will look like "Bearer <token>". We just want the token part.
  const tokenValue = token.split(' ')[1];

  // 3. Verify the token
  try {
    // jwt.verify will decode the token. If it's not valid, it will throw an error.
    const decoded = jwt.verify(tokenValue, process.env.JWT_SECRET);

    // If the token is valid, the 'decoded' variable will contain our payload ({ user: { id, role } })
    // We attach this payload to the request object, so our routes can access it
    req.user = decoded.user;

    // Call next() to pass control to the next function in the chain (our controller)
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid.' });
  }
};

exports.protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // --- CHANGE START ---
            // Check if the token has been blocklisted
            const isBlocked = await TokenBlocklist.findOne({ jti: decoded.jti });
            if (isBlocked) {
                return res.status(401).json({ message: 'Not authorized, token is invalid.' });
            }
            // --- CHANGE END ---

            req.user = await User.findById(decoded.sub).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'The user belonging to this token does no longer exist.' });
            }
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token.' });
    }
};

module.exports = auth;