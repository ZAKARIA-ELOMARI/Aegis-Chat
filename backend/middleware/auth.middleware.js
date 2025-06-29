const jwt = require('jsonwebtoken');

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

module.exports = auth;