const cloudinary = require('../config/cloudinary.config');
const streamifier = require('streamifier');
const { scanFileForViruses } = require('../services/malwareScanner.service');

// @desc   Upload a file, scan it for viruses, and return the result
// @route  POST /api/files/upload
// @access Private
exports.uploadAndScanFile = async (req, res) => {
  // req.file is made available by multer. It contains the uploaded file info.
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  // Function to upload file buffer to Cloudinary
  const uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: 'auto' }, // Automatically detect file type
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(fileBuffer).pipe(uploadStream);
    });
  };

  try {
    // 1. Upload the file to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer);
    const fileUrl = uploadResult.secure_url;

    // 2. Scan the uploaded file using its URL
    const scanResult = await scanFileForViruses(fileUrl);

    // 3. Check the scan result
    if (scanResult.CleanResult === true) {
      // If clean, return success with the file URL
      res.status(200).json({
        message: 'File uploaded and scanned successfully. No threats found.',
        isSafe: true,
        url: fileUrl,
      });
    } else {
      // If infected, delete the file from Cloudinary immediately
      await cloudinary.uploader.destroy(uploadResult.public_id);
      res.status(400).json({
        message: 'Threat detected! File has been rejected and deleted.',
        isSafe: false,
        details: scanResult.FoundViruses,
      });
    }
  } catch (error) {
    console.error('File upload pipeline failed:', error);
    res.status(500).json({ message: 'An error occurred during the file upload process.' });
  }
};