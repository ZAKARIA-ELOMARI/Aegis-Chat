const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadAndScanFile } = require('../controllers/file.controller');
const auth = require('../middleware/auth.middleware');

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Define the upload route with a chain of middleware
// 1. 'auth' checks for a valid JWT
// 2. 'upload.single('file')' processes the file upload into memory
// 3. 'uploadAndScanFile' runs our controller logic
router.post('/upload', auth, upload.single('file'), uploadAndScanFile);

module.exports = router;