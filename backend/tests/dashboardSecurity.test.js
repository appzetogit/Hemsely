import request from 'supertest';
import app from '../app.js';
import Admin from '../models/Admin.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('DELETE /api/admin/dashboard/reset-matches (superadmin-only regression)', () => {
  it('rejects a regular admin from wiping all matches/likes', async () => {
    const admin = await Admin.create({
      username: 'regularadmin',
      email: 'regularadmin@hemsely.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });
    const adminToken = generateToken(admin._id, 'admin');

    const userA = await User.create({ phoneNumber: '+919876500010', firstName: 'A', isProfileComplete: true });
    const userB = await User.create({ phoneNumber: '+919876500011', firstName: 'B', isProfileComplete: true });
    await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userA._id, status: 'accepted' });

    const res = await request(app)
      .delete('/api/admin/dashboard/reset-matches')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
    expect(await Match.countDocuments({})).toBe(1);
  });

  it('allows a superadmin to reset all matches/likes', async () => {
    const superadmin = await Admin.create({
      username: 'superadmin1',
      email: 'superadmin1@hemsely.com',
      password: 'password123',
      role: 'superadmin',
      isActive: true,
    });
    const token = generateToken(superadmin._id, 'superadmin');

    const userA = await User.create({ phoneNumber: '+919876500012', firstName: 'A', isProfileComplete: true });
    const userB = await User.create({ phoneNumber: '+919876500013', firstName: 'B', isProfileComplete: true });
    await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userA._id, status: 'accepted' });

    const rejected = await request(app)
      .delete('/api/admin/dashboard/reset-matches')
      .set('Authorization', `Bearer ${token}`);
    expect(rejected.status).toBe(400);
    expect(await Match.countDocuments({})).toBe(1);

    const res = await request(app)
      .delete('/api/admin/dashboard/reset-matches')
      .set('Authorization', `Bearer ${token}`)
      .send({ confirm: 'RESET MATCHES' });

    expect(res.status).toBe(200);
    expect(await Match.countDocuments({})).toBe(0);
  });
});
