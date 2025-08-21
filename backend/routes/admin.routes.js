const express = require('express');
const router = express.Router();
const { 
  updateUserStatus, 
  resetUserPassword, 
  getSystemLogs, 
  clearSystemLogs,
  broadcastMessage, 
  deleteUser,
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  updateUserRole,
  testSecurityLog
} = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware'); // Import the auth middleware
const { checkPermission } = require('../middleware/permission.middleware');
const { register } = require('../controllers/auth.controller');
const { runManualCleanup } = require('../services/ephemeralData.service');
const logger = require('../config/logger');

// **THE FIX IS HERE**
// Apply the 'auth' middleware to ALL routes in this file.
// This ensures req.user is set before any permission checks.
router.use(auth);

// --- Admin Routes ---

// Route to handle POST requests for creating a new employee
router.post('/users', checkPermission('CREATE_USER'), register);

// Route to handle DELETE requests for deleting a user
router.delete('/users/:userId', checkPermission('DELETE_USER'), deleteUser);

// Route to handle PUT requests for updating user status
router.put('/users/:userId/status', checkPermission('DEACTIVATE_USER'), updateUserStatus);

// Route to handle PUT requests for updating user role
router.put('/users/:userId/role', checkPermission('CREATE_USER'), updateUserRole);

// Route to handle POST requests for resetting a password
router.post('/users/:userId/reset-password', checkPermission('RESET_USER_PASSWORD'), resetUserPassword);

// Route to get system logs
router.get('/logs', checkPermission('VIEW_SYSTEM_LOGS'), getSystemLogs);

// Route to clear system logs
router.delete('/logs', checkPermission('VIEW_SYSTEM_LOGS'), clearSystemLogs);

// Route to send a broadcast message
router.post('/broadcast', checkPermission('BROADCAST_MESSAGE'), broadcastMessage);

// --- Role Management Routes ---

// Route to get all roles
router.get('/roles', checkPermission('MANAGE_ROLES'), getAllRoles);

// Route to create a new role
router.post('/roles', checkPermission('MANAGE_ROLES'), createRole);

// Route to update a role
router.put('/roles/:roleId', checkPermission('MANAGE_ROLES'), updateRole);

// Route to delete a role
router.delete('/roles/:roleId', checkPermission('MANAGE_ROLES'), deleteRole);

// Test route for security logging
router.post('/test-security-log', checkPermission('MANAGE_ROLES'), testSecurityLog);

// Route to manually trigger ephemeral data cleanup
router.post('/cleanup-ephemeral-data', checkPermission('MANAGE_SYSTEM'), async (req, res) => {
  try {
    logger.info('Manual ephemeral data cleanup triggered by admin', { 
      adminId: req.user.sub,
      timestamp: new Date().toISOString()
    });

    await runManualCleanup();

    res.status(200).json({ 
      message: 'Ephemeral data cleanup completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Manual ephemeral data cleanup failed', { 
      error: error.message,
      adminId: req.user.sub
    });
    
    res.status(500).json({ 
      message: 'Failed to complete ephemeral data cleanup',
      error: error.message
    });
  }
});

module.exports = router;