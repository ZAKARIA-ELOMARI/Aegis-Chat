const express = require('express');
const router = express.Router();
const { getAllUsers , setPublicKey } = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware'); // <-- Import our gatekeeper

// Define the protected route
// We place the 'auth' middleware right before the 'getAllUsers' controller.
// The request will be processed by auth() FIRST. If it calls next(), THEN getAllUsers() will run.
router.get('/', auth, getAllUsers);

module.exports = router;
router.post('/key', auth, setPublicKey);
