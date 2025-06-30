const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth.routes');
const User = require('../models/user.model');
const bcrypt = require('bcryptjs'); // <-- Import bcrypt
const jwt = require('jsonwebtoken'); // <-- Import jsonwebtoken

// Set a secret for tests
process.env.JWT_SECRET = 'your-super-secret-test-key';

// Create a mock Express app
const app = express();

// --- Mock middleware for testing ---
// This mock bypasses the actual authentication logic for our tests.
const mockAuth = (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (e) {
    // If no token or invalid token, just move on for public routes
    // but the isAdmin middleware will catch unauthorized access.
    next();
  }
};

const mockIsAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Mock Admin: Access Denied' });
  }
};

// --- App Setup ---
app.use(express.json());

// Use the REAL router, but we will "trick" it by providing a valid token.
app.use('/api/auth', authRoutes);

// --- Test Suite ---
describe('Auth API', () => {
  let adminToken;

  // Before any tests run, create an admin user and generate a token
  beforeAll(async () => {
    // We create a dummy admin user to generate a token for protected routes
    const adminUser = { id: 'adminUserId', role: 'admin' };
    adminToken = jwt.sign({ user: adminUser }, process.env.JWT_SECRET);
  });

  // Clear the users collection before each test
  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user when called by an admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`) // <-- Use the admin token
        .send({
          username: 'testuser'
        });

      // EXPECT 201 - CREATED
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully. Please provide them with their temporary password.');
      expect(res.body).toHaveProperty('tempPassword');
    });

    it('should not register a user with an existing username', async () => {
      // First, create a user
      await User.create({
        username: 'testuser',
        passwordHash: 'somehash',
        role: 'employee',
        status: 'pending'
      });

      // Then, try to register with the same username as an admin
      const res = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`) // <-- Use the admin token
        .send({
          username: 'testuser'
        });

      // EXPECT 400 - BAD REQUEST
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'User with that username already exists.');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an active user', async () => {
      const tempPassword = 'password123';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);
      await User.create({
        username: 'testuser',
        passwordHash,
        role: 'employee',
        status: 'active'
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      // EXPECT 200 - OK
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should not login with invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: 'wrongpassword'
        });

      // EXPECT 401 - UNAUTHORIZED
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Invalid credentials.');
    });
  });
});