import request from 'supertest';
import app from '../app.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('GET /api/admin/dashboard/stats resilience test', () => {
  it('returns stats successfully even when users have missing or null createdAt fields', async () => {
    const admin = await Admin.create({
      username: 'statsadmin',
      email: 'statsadmin@hemsely.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });
    const token = generateToken(admin._id, 'admin');

    // Create user with valid Date
    await User.create({ phoneNumber: '+919999900001', firstName: 'ValidDateUser', createdAt: new Date() });

    // Create user without createdAt / null createdAt directly via collection to simulate legacy/imported DB documents
    await User.collection.insertOne({ phoneNumber: '+919999900002', firstName: 'NoDateUser', createdAt: null });

    const res = await request(app)
      .get('/api/admin/dashboard/stats?year=invalid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
    expect(res.body.stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(Array.isArray(res.body.growth)).toBe(true);
    expect(Array.isArray(res.body.availableYears)).toBe(true);
  });
});
