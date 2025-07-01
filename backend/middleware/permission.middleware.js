const User = require('../models/user.model');
const logger = require('../config/logger');

const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    console.log(`--- Permission Middleware: START (Checking for: ${requiredPermission}) ---`);
    try {
      // Diagnostic log
      console.log("Permission Middleware: req.user object received:", req.user);

      if (!req.user || !req.user.sub) {
        console.error("Permission Middleware: CRITICAL - req.user or req.user.sub is missing.");
        return res.status(500).json({ message: 'Error during permission check due to missing user identity.' });
      }

      const user = await User.findById(req.user.sub).populate('role');
      if (!user || !user.role) {
        return res.status(403).json({ message: 'Forbidden: User role not found.' });
      }

      if (!user.role.permissions.includes(requiredPermission)) {
        logger.warn(`Permission denied for user ${user.id} on permission ${requiredPermission}`);
        return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
      }

      console.log("--- Permission Middleware: END (calling next()) ---");
      next();
    } catch (error) {
      logger.error('Permission check failed:', { error: error.message, userId: req.user?.sub });
      res.status(500).json({ message: 'Error during permission check.' });
    }
  };
};

module.exports = { checkPermission };