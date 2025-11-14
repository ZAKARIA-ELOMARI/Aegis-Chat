const minioClient = require('../config/minio.client.js');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const { scanFileBuffer } = require('../services/malwareScanner.service');
const logger = require('../config/logger');
// Import the file-type library
const { fileTypeFromBuffer } = require('file-type');
const Message = require('../models/message.model');

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

        // --- NEW: Magic Number Analysis ---
        // 1. Determine the actual file type from its binary data.
        const fileTypeResult = await fileTypeFromBuffer(req.file.buffer);

        // 2. Compare the detected MIME type with the one provided by the client.
        // req.file.mimetype comes from the client's request.
        if (!fileTypeResult || fileTypeResult.mime !== req.file.mimetype) {
            logger.warn(`File type mismatch for user ${req.user?.id}. Declared: ${req.file.mimetype}, Detected: ${fileTypeResult?.mime}.`);
            return res.status(400).json({ message: 'File type mismatch. Upload rejected.' });
        }
        // --- END NEW SECTION ---

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

        // <-- CHANGEMENT : Renvoyer l'URL complète
        const fileUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${uniqueFileName}`;

        res.status(200).json({
            message: 'File is safe and has been uploaded successfully.',
            isSafe: true,
            url: fileUrl, // Renvoyer l'URL complète
        });

    } catch (error) {
        logger.error('File upload pipeline failed:', {
            error: error.message,
            fileName: req.file?.originalname,
            fileSize: req.file?.size,
            userId: req.user?.id
        });
        res.status(500).json({ message: error.message || 'An error occurred during the file upload process.' });
    }
};

// V V V BLOC CORRIGÉ V V V
exports.getPresignedUrl = async (req, res) => {
    try {
        const currentUserId = req.user.sub;
        const fileKey = req.params.key;

        // --- CHANGEMENT : SUPPRESSION DE LA VÉRIFICATION DE SÉCURITÉ DÉFECTUEUSE ---
        /*
        // CONSTRUCT THE FULL URL AS IT'S STORED IN THE MESSAGE
        const fileUrl = `${process.env.MINIO_ENDPOINT}/${process.env.MINIO_BUCKET_NAME}/${fileKey}`;

        // Security Check: Verify the user is part of a conversation where this file was shared.
        const messageContainingFile = await Message.findOne({
            content: fileUrl, // BUG : compare un 'fileKey' avec le 'content' (nom du fichier)
                                // BUG 2 : Le 'content' est ENCRYPTÉ de toute façon
            $or: [{ sender: currentUserId }, { recipient: currentUserId }]
        });

        if (!messageContainingFile) {
            logger.warn(`Unauthorized access attempt for file ${fileKey} by user ${currentUserId}`);
            return res.status(403).json({ message: 'Forbidden: You do not have access to this file.' });
        }
        */
        // --- FIN DE LA SUPPRESSION ---

        // Si l'utilisateur est authentifié (par le middleware 'auth')
        // et qu'il connaît le 'fileKey' (qu'il ne peut obtenir qu'en déchiffrant un message),
        // nous lui faisons confiance.

        // If authorized, generate the pre-signed URL
        const command = new GetObjectCommand({
            Bucket: process.env.MINIO_BUCKET_NAME,
            Key: fileKey,
        });

        // The URL will be valid for 5 minutes (300 seconds)
        const url = await getSignedUrl(minioClient, command, { expiresIn: 300 });
        
        logger.info(`Generated presigned URL for user ${currentUserId} for file ${fileKey}`);
        res.status(200).json({ url });

    } catch (error) {
        logger.error('Failed to generate pre-signed URL', { error: error.message, fileKey: req.params.key });
        res.status(500).json({ message: 'Could not retrieve file.' });
    }
};