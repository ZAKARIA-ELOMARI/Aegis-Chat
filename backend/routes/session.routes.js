const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

// Import session controller functions
const {
  getUserSessions,
  terminateSession,
  terminateAllOtherSessions
} = require('../controllers/session.controller');

// --- Session Management Routes ---

// Get all active sessions for the current user
router.get('/', auth, apiLimiter, getUserSessions);

// Terminate a specific session
router.delete('/:sessionId', auth, apiLimiter, terminateSession);

// Terminate all other sessions (except current)
router.delete('/all/others', auth, apiLimiter, terminateAllOtherSessions);

module.exports = router;
