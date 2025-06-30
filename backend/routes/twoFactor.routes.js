const express = require('express');
const router = express.Router();
const { generateSecret, verifyAndEnable } = require('../controllers/twoFactor.controller');
const auth = require('../middleware/auth.middleware');

// All 2FA routes require a user to be logged in
router.use(auth);

router.post('/generate', generateSecret);
router.post('/verify', verifyAndEnable);

module.exports = router;