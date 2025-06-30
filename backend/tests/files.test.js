const request = require('supertest');
const express = require('express');
const fileRoutes = require('../routes/file.routes');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// --- Mocking External Services ---
// We mock the entire malwareScanner service
jest.mock('../services/malwareScanner.service', () => ({
  scanFileBuffer: jest.fn(),
}));
const { scanFileBuffer } = require('../services/malwareScanner.service');

// We mock the Minio client's send command
jest.mock('../config/minio.client.js', () => ({
  send: jest.fn(),
}));
const minioClient = require('../config/minio.client.js');

// Also mock the logger to prevent it from trying to log during tests
jest.mock('../config/logger.js', () => ({
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
}));


// --- Test Setup ---
process.env.JWT_SECRET = 'your-super-secret-test-key';
process.env.MINIO_ENDPOINT = 'http://minio:9000';
process.env.MINIO_BUCKET_NAME = 'test-bucket';

const app = express();
app.use(express.json());

// Apply the real file router
app.use('/api/files', fileRoutes);

// --- Test Suite ---
describe('File Upload API', () => {
    let authToken;

    beforeAll(async () => {
        // Create a user and token for authenticated requests
        const user = await User.create({
            username: 'fileuploader',
            passwordHash: 'hash',
            role: 'employee',
            status: 'active'
        });
        authToken = jwt.sign({ user: { id: user.id, role: user.role } }, process.env.JWT_SECRET);
    });

    // Reset mocks before each test to ensure they don't leak state
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/files/upload', () => {
        it('should scan and upload a clean file successfully', async () => {
            // Arrange: Mock the scanner to return "safe"
            scanFileBuffer.mockResolvedValue({ isSafe: true });
            // Arrange: Mock the minio client to simulate a successful upload
            minioClient.send.mockResolvedValue({});

            // Act: Perform the request with a dummy file buffer
            const res = await request(app)
                .post('/api/files/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from('this is a safe file'), 'safe.txt');

            // Assert
            expect(res.statusCode).toBe(200);
            expect(res.body.isSafe).toBe(true);
            expect(res.body).toHaveProperty('url');
            expect(res.body.message).toBe('File is safe and has been uploaded successfully.');

            // Assert that our mocks were called
            expect(scanFileBuffer).toHaveBeenCalledTimes(1);
            expect(minioClient.send).toHaveBeenCalledTimes(1);
        });

        it('should reject an infected file and not upload it', async () => {
            // Arrange: Mock the scanner to return "threat detected"
            scanFileBuffer.mockResolvedValue({ isSafe: false, viruses: ['EICAR-Test-File'] });

            // Act
            const res = await request(app)
                .post('/api/files/upload')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('file', Buffer.from('this is a dangerous file'), 'virus.exe');

            // Assert
            expect(res.statusCode).toBe(400);
            expect(res.body.isSafe).toBe(false);
            expect(res.body.message).toBe('Threat detected! File rejected.');
            expect(res.body.details).toEqual(['EICAR-Test-File']);

            // Assert that the file was NOT uploaded to Minio
            expect(minioClient.send).not.toHaveBeenCalled();
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app)
                .post('/api/files/upload')
                .attach('file', Buffer.from('some content'), 'test.txt');

            expect(res.statusCode).toBe(401);
        });

        it('should return 400 Bad Request if no file is attached', async () => {
            const res = await request(app)
                .post('/api/files/upload')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('No file uploaded.');
        });
    });
});