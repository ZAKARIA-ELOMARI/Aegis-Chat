const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin.routes');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// --- Test Setup ---
// Use the same secret as in your other test file for consistency
process.env.JWT_SECRET = 'your-super-secret-test-key';

// Mock Express App
const app = express();

// Middleware to attach a mock io object to the request
// This is needed for the broadcastMessage controller
const mockIo = (req, res, next) => {
  req.io = {
    emit: jest.fn(), // A mock function to check if it gets called
  };
  next();
};

app.use(express.json());
// We inject our mock 'auth' and 'isAdmin' middleware here for simplicity in this example
// In a larger app, you might use jest.mock() to mock the middleware modules themselves.
app.use((req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded.user;
    } catch (e) {
      // Invalid token
      req.user = null;
    }
  }
  next();
});

// Use the real router
app.use('/api/admin', mockIo, adminRoutes);

// --- Test Suite ---
describe('Admin API', () => {
  let adminToken, employeeToken, testUser;

  beforeEach(async () => {
    // Clean the database before each test
    await User.deleteMany({});

    // Create an admin user and their token
    const admin = await User.create({ username: 'admin', passwordHash: 'hash', role: 'admin', status: 'active' });
    adminToken = jwt.sign({ user: { id: admin.id, role: admin.role } }, process.env.JWT_SECRET);

    // Create a regular employee user and their token
    testUser = await User.create({ username: 'employee', passwordHash: 'hash', role: 'employee', status: 'active' });
    employeeToken = jwt.sign({ user: { id: testUser.id, role: testUser.role } }, process.env.JWT_SECRET);
  });

  describe('PUT /api/admin/users/:userId/status', () => {
    it('should allow an admin to deactivate a user', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'deactivated' });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.status).toBe('deactivated');
    });

    it('should NOT allow a non-admin to update a user status', async () => {
      const res = await request(app)
        .put(`/api/admin/users/${testUser.id}/status`)
        .set('Authorization', `Bearer ${employeeToken}`) // <-- Using employee token
        .send({ status: 'deactivated' });

      expect(res.statusCode).toBe(403); // Forbidden
      expect(res.body.message).toContain('Access denied');
    });

    it('should return 404 if the user to update is not found', async () => {
        const nonExistentId = '605c72a7d438690015a81633'; // A valid but non-existent ObjectId
        const res = await request(app)
          .put(`/api/admin/users/${nonExistentId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'active' });

        expect(res.statusCode).toBe(404);
    });

    it('should return 400 for an invalid status value', async () => {
        const res = await request(app)
          .put(`/api/admin/users/${testUser.id}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'invalid_status' }); // <-- Invalid status

        expect(res.statusCode).toBe(400);
        expect(res.body.message).toContain('Invalid status provided');
    });
  });

  describe('POST /api/admin/users/:userId/reset-password', () => {
    it("should allow an admin to reset a user's password", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${testUser.id}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('tempPassword');

      // Verify the user status was set to 'pending' in the DB
      const updatedUser = await User.findById(testUser.id);
      expect(updatedUser.status).toBe('pending');
    });

    it("should NOT allow a non-admin to reset a user's password", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${testUser.id}/reset-password`)
        .set('Authorization', `Bearer ${employeeToken}`); // <-- Using employee token

      expect(res.statusCode).toBe(403);
    });
  });
});