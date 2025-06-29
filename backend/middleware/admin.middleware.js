// This middleware checks if the authenticated user is an admin
const isAdmin = (req, res, next) => {
  // We assume the 'auth' middleware has already run and attached the user to the request.
  if (req.user && req.user.role === 'admin') {
    // If the user's role is 'admin', allow the request to proceed
    next();
  } else {
    // If not an admin, send a "Forbidden" error
    res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
};

module.exports = isAdmin;