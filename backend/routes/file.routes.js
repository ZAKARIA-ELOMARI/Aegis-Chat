const express = require('express');
const router = express.Router();
const { uploadAndScanFile } = require('../controllers/file.controller');
const auth = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter.middleware');

const upload = require('../middleware/upload.middleware'); 


router.post('/upload', apiLimiter, auth, upload.single('file'), uploadAndScanFile);

router.use((error, req, res, next) => {
    if (error instanceof require('multer').MulterError) {
        // A Multer error occurred (e.g., file too large, wrong type).
        return res.status(400).json({ message: `File upload error: ${error.message}` });
    } else if (error) {
        // An error from our custom fileFilter.
        return res.status(400).json({ message: error.message });
    }
    // Pass on to the next error handler if it's not a file upload issue.
    next();
});

module.exports = router;