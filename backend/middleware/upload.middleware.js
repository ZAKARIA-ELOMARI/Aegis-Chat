const multer = require('multer');

// 1. Define the storage strategy (which you already have)
const storage = multer.memoryStorage();

// 2. Define the whitelist of allowed MIME types for security
const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    // Add other supported types here
];

// 3. Create the file filter function
const fileFilter = (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true); // Accept the file
    } else {
        // Reject the file with a specific error for the error handler
        cb(new Error('Invalid file type. Only specific formats are allowed.'), false);
    }
};

// 4. Configure and export the complete multer instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5 MB file size limit
    },
    fileFilter: fileFilter
});

module.exports = upload;