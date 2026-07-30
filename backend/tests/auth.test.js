import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';

describe('Auth flow', () => {
  describe('POST /api/auth/send-otp', () => {
    it('rejects an invalid phone number', async () => {
      const res = await request(app).post('/api/auth/send-otp').send({ phoneNumber: '123' });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('creates a new incomplete user and reports isNewUser: true', async () => {
      const res = await request(app).post('/api/auth/send-otp').send({ phoneNumber: '9876543210' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isNewUser).toBe(true);

      const user = await User.findOne({ phoneNumber: '+919876543210' });
      expect(user).not.toBeNull();
      expect(user.otpCode).toBe('123456');
    });

    it('rejects a banned phone number', async () => {
      await User.create({
        phoneNumber: '+919876543211',
        isBanned: true,
        banReason: 'Testing ban path',
      });

      const res = await request(app).post('/api/auth/send-otp').send({ phoneNumber: '9876543211' });
      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Testing ban path');
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('returns a token on a correct mock OTP for an existing OTP request', async () => {
      await request(app).post('/api/auth/send-otp').send({ phoneNumber: '9876543212' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '9876543212', otp: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();

      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.role).toBe('user');
    });

    it('rejects an incorrect OTP', async () => {
      await request(app).post('/api/auth/send-otp').send({ phoneNumber: '9876543213' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '9876543213', otp: '000000' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('404s for a phone number that never requested an OTP', async () => {
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({ phoneNumber: '9999999999', otp: '123456' });

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('issues a fresh token pair for a valid refresh token', async () => {
      const user = await User.create({ phoneNumber: '+919876543214', firstName: 'Refresh', isProfileComplete: true });
      const refreshToken = jwt.sign({ id: user._id.toString() }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
    });

    it('rejects a refresh token for a banned user', async () => {
      const user = await User.create({ phoneNumber: '+919876543215', isBanned: true });
      const refreshToken = jwt.sign({ id: user._id.toString() }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
      expect(res.status).toBe(401);
    });

    it('rejects a missing refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(401);
    });

    it('rejects a garbage refresh token instead of throwing (regression: missing jwt import)', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/invalid or expired/i);
    });
  });

  describe('GET /api/auth/me', () => {
    it('rejects a request with no token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the current user for a valid token', async () => {
      const user = await User.create({ phoneNumber: '+919876543216', firstName: 'Me', isProfileComplete: true });
      const token = jwt.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.user.phoneNumber).toBe('+919876543216');
    });

    it('immediately rejects a banned user even with a still-valid token', async () => {
      const user = await User.create({ phoneNumber: '+919876543217', isBanned: true });
      const token = jwt.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });
  });
});
