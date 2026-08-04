import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Report from '../models/Report.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/tokenUtils.js';

const makeUser = async (overrides = {}) => {
  const user = await User.create({
    phoneNumber: overrides.phoneNumber || `+9198765${Math.floor(10000 + Math.random() * 89999)}`,
    firstName: overrides.firstName || 'Test',
    isProfileComplete: true,
    gender: 'male',
    interestedIn: ['female'],
    ...overrides,
  });
  const token = generateToken(user._id, 'user');
  return { user, token };
};

const makeAdminToken = async (overrides = {}) => {
  const admin = await Admin.create({
    username: overrides.username || `admin${Math.floor(Math.random() * 100000)}`,
    email: overrides.email || `admin${Math.floor(Math.random() * 100000)}@hemsely.com`,
    password: '123456',
    role: overrides.role || 'superadmin',
  });
  const token = jwt.sign({ id: admin._id.toString(), role: admin.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { admin, token };
};

describe('Admin panel functional-QA fixes', () => {
  describe('GET /api/admin/reports — real status counts', () => {
    it('returns global counts, not just the current page', async () => {
      const { user: reporter } = await makeUser();
      const { user: target1 } = await makeUser();
      const { user: target2 } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      await Report.create({ reporter: reporter._id, reportedUser: target1._id, category: 'spam', status: 'pending' });
      await Report.create({ reporter: reporter._id, reportedUser: target2._id, category: 'spam', status: 'reviewed' });

      const res = await request(app)
        .get('/api/admin/reports?status=pending&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.counts.pending).toBe(1);
      expect(res.body.counts.reviewed).toBe(1);
    });
  });

  describe('PATCH /api/admin/reports/:id/status — populate regression', () => {
    it('returns the reported user populated (not a bare ObjectId) after a status update', async () => {
      const { user: reporter } = await makeUser();
      const { user: reported } = await makeUser({ firstName: 'Reported', lastName: 'User' });
      const { token: adminToken } = await makeAdminToken();

      const report = await Report.create({ reporter: reporter._id, reportedUser: reported._id, category: 'spam' });

      const res = await request(app)
        .patch(`/api/admin/reports/${report._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'reviewed', notes: 'checked it out' });

      expect(res.status).toBe(200);
      expect(res.body.report.reportedUser.firstName).toBe('Reported');
      expect(res.body.report.reporter._id).toBeDefined();
      expect(res.body.report.notes).toBe('checked it out');
    });
  });

  describe('PUT /api/admin/users/:id — premium/expiry consistency', () => {
    it('sets a real premiumExpiry when granting premium, not just the isPremium flag', async () => {
      const { user } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .put(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPremium: true });

      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated.isPremium).toBe(true);
      expect(updated.premiumExpiry).not.toBeNull();
      expect(new Date(updated.premiumExpiry).getTime()).toBeGreaterThan(Date.now());
    });

    it('clears premiumExpiry when revoking premium', async () => {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 10);
      const { user } = await makeUser({ isPremium: true, premiumExpiry: expiry });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .put(`/api/admin/users/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPremium: false });

      expect(res.status).toBe(200);
      const updated = await User.findById(user._id);
      expect(updated.isPremium).toBe(false);
      expect(updated.premiumExpiry).toBeNull();
    });
  });

  describe('GET /api/admin/transactions — endDate timezone regression', () => {
    it('includes a transaction created today when filtering with endDate=today', async () => {
      const { user } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      await Transaction.create({
        transactionId: 'TXN_TZ_TEST',
        user: user._id,
        amount: 499,
        status: 'success',
      });

      const today = new Date().toISOString().slice(0, 10);
      const res = await request(app)
        .get(`/api/admin/transactions?endDate=${today}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.transactions.some((t) => t.transactionId === 'TXN_TZ_TEST')).toBe(true);
    });
  });

  describe('PUT /api/admin/profile — relaxed email validation regression', () => {
    it('accepts a valid email with a plus-tag and a 4-letter TLD that the old custom regex rejected', async () => {
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .put('/api/admin/profile')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ firstName: 'Ajay', email: 'admin+ops@example.email' });

      expect(res.status).toBe(200);
      expect(res.body.admin.email).toBe('admin+ops@example.email');
    });
  });

  describe('GET /api/admin/notifications — real broadcast/targeted counts', () => {
    it('returns counts reflecting the full history, not just the current page', async () => {
      const { admin, token: adminToken } = await makeAdminToken();

      await Notification.create({ title: 'A', body: 'a', target: 'all', sentBy: admin._id });
      await Notification.create({ title: 'B', body: 'b', target: 'segment', segment: 'premium', sentBy: admin._id });

      const res = await request(app)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.counts.total).toBe(2);
      expect(res.body.counts.broadcast).toBe(1);
      expect(res.body.counts.targeted).toBe(1);
    });
  });
});
