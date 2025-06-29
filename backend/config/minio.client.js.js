const { S3Client } = require('@aws-sdk/client-s3');

// Configure the S3 client to connect to our local MinIO server
const minioClient = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  region: 'us-east-1', // This is required, but can be any valid region for MinIO
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY,
    secretAccessKey: process.env.MINIO_SECRET_KEY,
  },
  forcePathStyle: true, // MUST be true for MinIO
});

module.exports = minioClient;