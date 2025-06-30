const request = require('supertest');
const express = require('express');
const twoFactorRoutes = require('../routes/twoFactor.routes');
const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');

// --- Mock the qrcode library ---
// We don't need to generate a real QR code image in our tests.
jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockImplementation((url, callback) => {
    callback(null, 'data:image/png;base64,mocked_qr_code_image');
  }),
}));

// --- Test Setup ---
process.env.JWT_SECRET = 'your-super-secret-test-key';

const app = express();
app.use(express.json());

// Apply the real router
app.use('/api/2fa', twoFactorRoutes);

// --- Test Suite ---
describe('2FA API', () => {
  let user, authToken;

  beforeEach(async () => {
    // Reset and create a fresh user and token for each test
    await User.deleteMany({});
    user = await User.create({
      username: '2fa-user',
      passwordHash: 'hash',
      status: 'active',
    });
    authToken = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET);
  });

  describe('POST /api/2fa/generate', () => {
    it('should generate a new 2FA secret and QR code for the user', async () => {
      const res = await request(app)
        .post('/api/2fa/generate')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('secret');
      expect(res.body).toHaveProperty('qrCodeUrl');
      expect(res.body.qrCodeUrl).toContain('mocked_qr_code_image');

      // Check that the secret was saved to the user document in the DB
      const updatedUser = await User.findById(user.id);
      expect(updatedUser.twoFactorSecret).toBe(res.body.secret);
    });
  });

  describe('POST /api/2fa/verify', () => {
    it('should enable 2FA for the user with a valid token', async () => {
      // Step 1: Generate a secret for the user first
      const secret = speakeasy.generateSecret();
      await User.findByIdAndUpdate(user.id, { twoFactorSecret: secret.base32 });

      // Step 2: Generate a valid TOTP token from the secret
      const validToken = speakeasy.totp({
        secret: secret.base32,
        encoding: 'base32',
      });

      // Step 3: Send the token to the verify endpoint
      const res = await request(app)
        .post('/api/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: validToken });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Two-factor authentication has been enabled successfully.');

      // Verify that 2FA is enabled in the database
      const updatedUser = await User.findById(user.id);
      expect(updatedUser.isTwoFactorEnabled).toBe(true);
    });

    it('should return 400 for an invalid token', async () => {
      // Step 1: Generate a secret for the user
      const secret = speakeasy.generateSecret();
      await User.findByIdAndUpdate(user.id, { twoFactorSecret: secret.base32 });

      // Step 2: Send an invalid token
      const res = await request(app)
        .post('/api/2fa/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ token: '000000' }); // An incorrect token

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('Invalid 2FA token.');

      const updatedUser = await User.findById(user.id);
      expect(updatedUser.isTwoFactorEnabled).toBe(false);
    });
  });
});