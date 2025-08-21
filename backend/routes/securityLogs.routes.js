const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
// After: Add the curly braces to destructure the import
const { checkPermission } = require('../middleware/permission.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Import security logs controller functions
const {
  getSecurityLogs,
  getSecurityStats,
  clearSecurityLogs
} = require('../controllers/securityLogs.controller');

// --- Security Logs Routes (Admin Only) ---

// Get security logs with filtering and pagination
router.get('/security-logs', 
  auth, 
  checkPermission('VIEW_SECURITY_LOGS'), 
  apiLimiter, 
  getSecurityLogs
);

// Get security statistics for dashboard
router.get('/security-stats', 
  auth, 
  checkPermission('VIEW_SECURITY_LOGS'), 
  apiLimiter, 
  getSecurityStats
);

// Clear all security logs
router.delete('/security-logs', 
  auth, 
  checkPermission('VIEW_SECURITY_LOGS'), 
  apiLimiter, 
  clearSecurityLogs
);

module.exports = router;
