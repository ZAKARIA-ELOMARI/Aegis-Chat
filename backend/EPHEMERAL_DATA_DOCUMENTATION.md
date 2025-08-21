# Ephemeral Data System - Automatic Deletion

This document describes the implementation of an ephemeral data system that automatically deletes messages and associated files after 24 hours to enhance privacy and minimize stored data.

## Overview

The ephemeral data system consists of two main components:

1. **Automatic Message Deletion**: Uses MongoDB TTL (Time-To-Live) indexes to automatically delete message documents after 24 hours
2. **Automatic File Cleanup**: Uses a scheduled cleanup job to delete orphaned files from MinIO before the messages are deleted

## Implementation Details

### 1. Message Model Updates (`models/message.model.js`)

- **Added `fileUrl` field**: Stores the URL of any file associated with the message
- **Added TTL Index**: Automatically deletes messages after 24 hours (86400 seconds)

```javascript
// TTL Index: Automatically delete messages after 24 hours (86400 seconds)
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });
```

### 2. Ephemeral Data Service (`services/ephemeralData.service.js`)

A comprehensive service that handles:

- **File URL extraction** from MinIO URLs
- **MinIO file deletion** using AWS SDK
- **Scheduled cleanup** runs daily at 3:00 AM UTC
- **Manual cleanup** capability for testing
- **Comprehensive logging** for monitoring

#### Key Functions:

- `initializeCleanupScheduler()`: Sets up the daily cron job
- `cleanupOrphanedFiles()`: Finds and deletes files from messages older than 23 hours
- `runManualCleanup()`: Allows manual triggering of cleanup

### 3. Socket Handler Updates (`server.js`)

Updated to handle file URLs properly:

- **Private messages**: Now accept `fileUrl` parameter
- **Message storage**: Stores file URLs in separate field
- **Message forwarding**: Includes file URLs when forwarding messages

### 4. Controller Updates

#### Message Controller (`controllers/message.controller.js`)
- Updated response formatting to include `fileUrl` field
- Ensures both conversation history and broadcast messages include file information

#### Admin Controller (`controllers/admin.controller.js`)
- Updated broadcast message creation to handle file URLs
- Enhanced security logging to track file attachments

### 5. Admin Routes (`routes/admin.routes.js`)

Added manual cleanup endpoint:
- `POST /api/admin/cleanup-ephemeral-data`: Triggers immediate cleanup (Admin only)

## Timing Strategy

The system uses a carefully orchestrated timing strategy:

1. **Messages are deleted by MongoDB TTL**: After exactly 24 hours
2. **Files are deleted by cleanup job**: When messages are 23 hours old
3. **Cleanup runs daily**: At 3:00 AM UTC to catch any files

This ensures files are always deleted before their associated message records, preventing orphaned files.

## Security Features

- **Permission-based access**: Manual cleanup requires `MANAGE_SYSTEM` permission
- **Comprehensive logging**: All cleanup operations are logged
- **Error handling**: Failed deletions are logged but don't stop the process
- **URL validation**: Proper extraction and validation of MinIO file keys

## Dependencies

- `node-cron`: For scheduling the daily cleanup job
- `@aws-sdk/client-s3`: For MinIO/S3 file operations

## Configuration

The system uses existing environment variables:
- `MINIO_ENDPOINT`: MinIO server endpoint
- `MINIO_BUCKET_NAME`: Bucket name for file storage

## Monitoring

Monitor the following log entries:
- Daily cleanup job execution
- File deletion success/failure counts
- Manual cleanup triggers
- TTL index operation (MongoDB logs)

## Testing

### Manual Testing
1. Send messages with file attachments
2. Wait for cleanup job or trigger manual cleanup
3. Verify files are deleted from MinIO
4. Verify messages are deleted by MongoDB TTL

### API Testing
```bash
# Trigger manual cleanup (requires admin authentication)
POST /api/admin/cleanup-ephemeral-data
Authorization: Bearer <admin-jwt-token>
```

## Performance Considerations

- **MongoDB TTL**: Very efficient, handled entirely by database
- **File cleanup**: Runs once daily to minimize impact
- **Batch processing**: Processes all eligible files in one job
- **Error resilience**: Individual file deletion failures don't stop the process

## Future Enhancements

1. **Configurable retention period**: Make the 24-hour period configurable
2. **Selective deletion**: Allow users to opt-out of ephemeral data
3. **Cleanup metrics**: Add detailed statistics tracking
4. **Real-time cleanup**: Delete files immediately when messages are manually deleted
