const minioClient = require('../config/minio.client.js');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const { scanFileBuffer } = require('../services/malwareScanner.service');
const logger = require('../config/logger');

// A simple utility function to create a SHA256 hash from a buffer
const getBufferHash = (buffer) => {
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    return hash.digest('hex');
};

exports.uploadAndScanFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {

        // 1. Get the initial hash of the file buffer as soon as we receive it.
        const initialHash = getBufferHash(req.file.buffer);

        // 2. Scan the file buffer first
        const scanResult = await scanFileBuffer(req.file.buffer);

        if (!scanResult.isSafe) {
            return res.status(400).json({
                message: 'Threat detected! File rejected.',
                isSafe: false,
                details: scanResult.viruses,
            });
        }
        
        // 3. Just before uploading, re-calculate the hash to ensure the buffer hasn't been modified.
        const finalHash = getBufferHash(req.file.buffer);

        // 4. Compare the hashes. If they don't match, reject the upload.
        if (initialHash !== finalHash) {
            logger.warn('File integrity check failed. Buffer was modified after malware scan.');
            return res.status(400).json({ message: 'File integrity check failed. Upload rejected.' });
        }

        // If hashes match and scan is clean, proceed to upload to MinIO
        const uniqueFileName = `${crypto.randomBytes(16).toString('hex')}-${req.file.originalname}`;

        const params = {
            Bucket: process.env.MINIO_BUCKET_NAME,
            Key: uniqueFileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
        };

        const command = new PutObjectCommand(params);
        await minioClient.send(command);

        const fileUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${uniqueFileName}`;

        res.status(200).json({
            message: 'File is safe and has been uploaded successfully.',
            isSafe: true,
            url: fileUrl,
        });

    } catch (error) {
        logger.error('File upload pipeline failed:', {
            error: error.message,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            userId: req.user?.id
        });
        res.status(500).json({ message: 'An error occurred during the file upload process.' });
    }
};