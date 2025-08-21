const cron = require('node-cron');
const Message = require('../models/message.model');
const minioClient = require('../config/minio.client.js');
const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
const logger = require('../config/logger');

/**
 * Extract the MinIO key (filename) from a full MinIO URL
 * @param {string} fileUrl - The full MinIO URL
 * @returns {string|null} - The MinIO key or null if invalid
 */
const extractMinioKey = (fileUrl) => {
  try {
    const url = new URL(fileUrl);
    const pathSegments = url.pathname.split('/');
    // Remove the bucket name (first segment after /) and return the rest
    return pathSegments.slice(2).join('/');
  } catch (error) {
    logger.error('Failed to extract MinIO key from URL:', { fileUrl, error: error.message });
    return null;
  }
};

/**
 * Delete a single file from MinIO
 * @param {string} fileKey - The MinIO object key
 * @returns {Promise<boolean>} - Success status
 */
const deleteFileFromMinio = async (fileKey) => {
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.MINIO_BUCKET_NAME,
      Key: fileKey,
    });

    await minioClient.send(deleteCommand);
    logger.info('Successfully deleted file from MinIO:', { fileKey });
    return true;
  } catch (error) {
    logger.error('Failed to delete file from MinIO:', { fileKey, error: error.message });
    return false;
  }
};

/**
 * Clean up orphaned files from MinIO
 * This function finds messages that are about to expire (older than 23 hours)
 * and deletes their associated files from MinIO before MongoDB TTL deletes the messages
 */
const cleanupOrphanedFiles = async () => {
  try {
    logger.info('Starting orphaned file cleanup job...');

    // Find messages older than 23 hours that have file URLs
    // We do this slightly before the TTL kicks in to ensure files are deleted first
    const twentyThreeHoursAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);
    
    const messagesWithFiles = await Message.find({
      fileUrl: { $exists: true, $ne: null },
      createdAt: { $lt: twentyThreeHoursAgo }
    }).select('fileUrl createdAt');

    if (messagesWithFiles.length === 0) {
      logger.info('No files to clean up');
      return;
    }

    logger.info(`Found ${messagesWithFiles.length} files to clean up`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const message of messagesWithFiles) {
      const fileKey = extractMinioKey(message.fileUrl);
      
      if (fileKey) {
        const success = await deleteFileFromMinio(fileKey);
        if (success) {
          deletedCount++;
        } else {
          errorCount++;
        }
      } else {
        logger.warn('Could not extract file key from URL:', { 
          messageId: message._id, 
          fileUrl: message.fileUrl 
        });
        errorCount++;
      }
    }

    logger.info('Orphaned file cleanup completed:', {
      totalFiles: messagesWithFiles.length,
      deletedCount,
      errorCount
    });

  } catch (error) {
    logger.error('Orphaned file cleanup job failed:', { error: error.message });
  }
};

/**
 * Initialize the cleanup scheduler
 * Runs daily at 3:00 AM
 */
const initializeCleanupScheduler = () => {
  // Schedule cleanup job to run daily at 3:00 AM
  cron.schedule('0 3 * * *', () => {
    logger.info('Triggered scheduled cleanup job');
    cleanupOrphanedFiles();
  }, {
    timezone: 'UTC'
  });

  logger.info('Ephemeral data cleanup scheduler initialized - runs daily at 3:00 AM UTC');
};

/**
 * Manual cleanup function for testing or immediate cleanup
 */
const runManualCleanup = async () => {
  logger.info('Running manual cleanup...');
  await cleanupOrphanedFiles();
};

module.exports = {
  initializeCleanupScheduler,
  runManualCleanup,
  cleanupOrphanedFiles
};
