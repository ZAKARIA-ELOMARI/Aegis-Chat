const express = require('express');
const router = express.Router();
const { updateUserStatus, resetUserPassword , getSystemLogs } = require('../controllers/admin.controller');
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');

// Route to handle PUT requests for updating user status
router.put('/users/:userId/status', auth, isAdmin, updateUserStatus);

// Route to handle POST requests for resetting a password
router.post('/users/:userId/reset-password', auth, isAdmin, resetUserPassword);

router.get('/logs', auth, isAdmin, getSystemLogs);

module.exports = router;