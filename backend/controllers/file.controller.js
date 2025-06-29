const minioClient = require('../config/minio.client.js');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const { scanFileBuffer } = require('../services/malwareScanner.service');

exports.uploadAndScanFile = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded.' });
  }

  try {
    // 1. Scan the file buffer first
    const scanResult = await scanFileBuffer(req.file.buffer);

    if (!scanResult.isSafe) {
      return res.status(400).json({
        message: 'Threat detected! File rejected.',
        isSafe: false,
        details: scanResult.viruses,
      });
    }

    // 2. If clean, proceed to upload to MinIO
    // Generate a unique file name to prevent conflicts
    const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}-${req.file.originalname}`;

    const params = {
      Bucket: process.env.MINIO_BUCKET_NAME,
      Key: uniqueFileName,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(params);
    await minioClient.send(command);
    
    // Construct the URL to access the file
    const fileUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${uniqueFileName}`;

    res.status(200).json({
      message: 'File is safe and has been uploaded successfully.',
      isSafe: true,
      url: fileUrl,
    });

  } catch (error) {
    console.error('File upload pipeline failed:', error);
    res.status(500).json({ message: 'An error occurred during the file upload process.' });
  }
};