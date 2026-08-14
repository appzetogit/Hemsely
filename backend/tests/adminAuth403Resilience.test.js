import request from 'supertest';
import app from '../app.js';
import Admin from '../models/Admin.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('Admin Auth 403 Resilience & Lockout Handling', () => {
  it('case-insensitively matches username during admin login', async () => {
    const admin = await Admin.create({
      username: 'TestAdminUser',
      email: 'testadminuser@hemsely.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });

    const res = await request(app).post('/api/admin/login').send({
      email: 'testadminuser', // matching lowercased username
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it('returns a lock duration message when account is locked', async () => {
    const admin = await Admin.create({
      username: 'lockedadmin',
      email: 'lockedadmin@hemsely.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
      loginAttempts: 10,
      lockUntil: new Date(Date.now() + 15 * 60 * 1000), // locked for 15 mins
    });

    const res = await request(app).post('/api/admin/login').send({
      email: 'lockedadmin@hemsely.com',
      password: 'password123',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Account locked due to multiple failed login attempts/i);
    expect(res.body.message).toMatch(/15 minute\(s\)/i);
  });
});
