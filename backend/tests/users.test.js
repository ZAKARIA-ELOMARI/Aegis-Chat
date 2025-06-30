const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/user.routes');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// --- Test Setup ---
process.env.JWT_SECRET = 'your-super-secret-test-key';

// Mock Express App
const app = express();
app.use(express.json());

// Apply the real router
app.use('/api/users', userRoutes);


// --- Test Suite ---
describe('User API', () => {
    let authToken;
    let testUser;

    // Create a user and a token before the tests run
    beforeAll(async () => {
        // Clear the collection to ensure a clean state
        await User.deleteMany({});

        // Create a user to make authenticated requests
        testUser = await User.create({
            username: 'testuser',
            passwordHash: 'somehashedpassword',
            role: 'employee',
            status: 'active'
        });

        // Create a token for this user
        authToken = jwt.sign({ user: { id: testUser.id, role: testUser.role } }, process.env.JWT_SECRET);
    });


    describe('GET /api/users', () => {
        it('should return a list of all users for an authenticated request', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toBe(200);
            // The response should be an array of user objects
            expect(Array.isArray(res.body)).toBe(true);
            // It should not include the password hash
            expect(res.body[0]).not.toHaveProperty('passwordHash');
            // Check if the user we created is in the list
            expect(res.body.some(user => user.username === 'testuser')).toBe(true);
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app).get('/api/users');

            expect(res.statusCode).toBe(401);
            expect(res.body.message).toContain('No token, authorization denied.');
        });
    });


    describe('POST /api/users/key', () => {
        it('should allow an authenticated user to set their public key', async () => {
            const publicKey = '-----BEGIN PGP PUBLIC KEY BLOCK-----...';
            const res = await request(app)
                .post('/api/users/key')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ publicKey });

            expect(res.statusCode).toBe(200);
            expect(res.body.message).toBe('Public key updated successfully.');

            // Verify the key was actually saved in the database
            const updatedUser = await User.findById(testUser.id);
            expect(updatedUser.publicKey).toBe(publicKey);
        });

        it('should return 400 Bad Request if the publicKey is missing', async () => {
            const res = await request(app)
                .post('/api/users/key')
                .set('Authorization', `Bearer ${authToken}`)
                .send({}); // <-- Sending an empty body

            expect(res.statusCode).toBe(400);
            expect(res.body.message).toBe('Public key is required.');
        });

        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app)
                .post('/api/users/key')
                .send({ publicKey: 'some-key' });

            expect(res.statusCode).toBe(401);
        });
    });
});