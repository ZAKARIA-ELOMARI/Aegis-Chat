const express = require('express');
const router = express.Router();
const { updateUserStatus, resetUserPassword, getSystemLogs, broadcastMessage } = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware'); // Import the auth middleware
const { checkPermission } = require('../middleware/permission.middleware');
const { register } = require('../controllers/auth.controller');

// **THE FIX IS HERE**
// Apply the 'auth' middleware to ALL routes in this file.
// This ensures req.user is set before any permission checks.
router.use(auth);

// --- Admin Routes ---

// Route to handle POST requests for creating a new employee
router.post('/users', checkPermission('CREATE_USER'), register);

// Route to handle PUT requests for updating user status
router.put('/users/:userId/status', checkPermission('DEACTIVATE_USER'), updateUserStatus);

// Route to handle POST requests for resetting a password
router.post('/users/:userId/reset-password', checkPermission('RESET_USER_PASSWORD'), resetUserPassword);

// Route to get system logs
router.get('/logs', checkPermission('VIEW_SYSTEM_LOGS'), getSystemLogs);

// Route to send a broadcast message
router.post('/broadcast', checkPermission('BROADCAST_MESSAGE'), broadcastMessage);

module.exports = router;