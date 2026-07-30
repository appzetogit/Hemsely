import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Report from '../models/Report.js';
import Plan from '../models/Plan.js';
import AppConfig from '../models/AppConfig.js';
import { evaluateQueueAccessForUser, isBlockedByQueue } from '../utils/queueService.js';
import { rankProfiles } from '../utils/rankingService.js';

const makeUser = async (overrides = {}) => {
  const user = await User.create({
    phoneNumber: overrides.phoneNumber || `+9198765${Math.floor(10000 + Math.random() * 89999)}`,
    firstName: overrides.firstName || 'Test',
    isProfileComplete: true,
    gender: 'male',
    interestedIn: ['female'],
    ...overrides,
  });
  const token = jwt.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
};

const makeAdminToken = async () => {
  const admin = await Admin.create({
    username: 'ajaypanchal',
    email: 'panchalajay717@gmail.com',
    password: '123456',
    role: 'superadmin',
  });
  const token = jwt.sign({ id: admin._id.toString(), role: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { admin, token };
};

describe('Phase 6 — moderation, queue, ranking, selfie, static plans', () => {
  describe('Auto-ban after 2 admin-verified reports', () => {
    it('does not ban after a single actioned report', async () => {
      const { user: reporter } = await makeUser();
      const { user: reported } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      const report = await Report.create({ reporter: reporter._id, reportedUser: reported._id, category: 'spam' });

      const res = await request(app)
        .patch(`/api/admin/reports/${report._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'actioned' });

      expect(res.status).toBe(200);
      expect(res.body.autoBanned).toBe(false);
      expect((await User.findById(reported._id)).isBanned).toBe(false);
    });

    it('auto-bans once a user accumulates 2 admin-actioned reports', async () => {
      const { user: reporter1 } = await makeUser();
      const { user: reporter2 } = await makeUser();
      const { user: reported } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      const report1 = await Report.create({ reporter: reporter1._id, reportedUser: reported._id, category: 'spam', status: 'actioned' });
      const report2 = await Report.create({ reporter: reporter2._id, reportedUser: reported._id, category: 'harassment' });

      const res = await request(app)
        .patch(`/api/admin/reports/${report2._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'actioned' });

      expect(res.status).toBe(200);
      expect(res.body.autoBanned).toBe(true);

      const bannedUser = await User.findById(reported._id);
      expect(bannedUser.isBanned).toBe(true);
      expect(bannedUser.banReason).toMatch(/2 admin-verified reports/i);
      void report1;
    });

    it('never auto-bans from reports that were only reviewed/dismissed, not actioned', async () => {
      const { user: reporter1 } = await makeUser();
      const { user: reporter2 } = await makeUser();
      const { user: reported } = await makeUser();
      const { token: adminToken } = await makeAdminToken();

      await Report.create({ reporter: reporter1._id, reportedUser: reported._id, status: 'dismissed' });
      const report2 = await Report.create({ reporter: reporter2._id, reportedUser: reported._id, status: 'pending' });

      const res = await request(app)
        .patch(`/api/admin/reports/${report2._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'dismissed' });

      expect(res.status).toBe(200);
      expect(res.body.autoBanned).toBe(false);
      expect((await User.findById(reported._id)).isBanned).toBe(false);
    });
  });

  describe('Gender-ratio access queue (1:4 male:female, hard block)', () => {
    beforeEach(async () => {
      await AppConfig.create({ genderQueueEnabled: true, queueRatioMale: 1, queueRatioFemale: 4 });
    });

    it('queues a male user once the male:female ratio cap is reached', async () => {
      // 4 females -> allowed males = floor(4 * 1/4) = 1
      await User.insertMany(
        Array.from({ length: 4 }, (_, i) => ({
          phoneNumber: `+91700000000${i}`,
          gender: 'female',
          isProfileComplete: true,
        }))
      );
      const { user: firstMale } = await makeUser({ gender: 'male' });
      await evaluateQueueAccessForUser(firstMale._id);
      expect((await User.findById(firstMale._id)).accessStatus).toBe('active');

      const { user: secondMale } = await makeUser({ gender: 'male' });
      await evaluateQueueAccessForUser(secondMale._id);
      const reloaded = await User.findById(secondMale._id);
      expect(reloaded.accessStatus).toBe('queued');
      expect(isBlockedByQueue(reloaded)).toBe(true);
    });

    it('hard-blocks a queued user\'s discovery feed and likes via the API', async () => {
      const { user: queuedUser, token } = await makeUser({ gender: 'male', accessStatus: 'queued', queuedAt: new Date() });
      const { user: target } = await makeUser({ gender: 'female' });

      const discoveryRes = await request(app).get('/api/users/discovery').set('Authorization', `Bearer ${token}`);
      expect(discoveryRes.status).toBe(403);
      expect(discoveryRes.body.queued).toBe(true);

      const likeRes = await request(app).post(`/api/matches/like/${target._id}`).set('Authorization', `Bearer ${token}`);
      expect(likeRes.status).toBe(403);
      expect(likeRes.body.queued).toBe(true);
    });

    it('premium/Super User/Super Subscriber users bypass the queue entirely', async () => {
      const { user: premiumUser } = await makeUser({ gender: 'male', isPremium: true });
      await evaluateQueueAccessForUser(premiumUser._id);
      expect((await User.findById(premiumUser._id)).accessStatus).toBe('active');
    });

    it('admin granting premium releases a queued user immediately', async () => {
      const { user: queuedUser } = await makeUser({ gender: 'male', accessStatus: 'queued', queuedAt: new Date() });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .patch(`/api/admin/subscriptions/users/${queuedUser._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isPremium: true });

      expect(res.status).toBe(200);
      expect(res.body.user.accessStatus).toBe('active');
    });
  });

  describe('Profile ranking algorithm (tier 30% / online 20% / time-spent 50%)', () => {
    it('ranks Super User above Premium+Verified above Verified above Premium above plain', () => {
      const superUser = { _id: 'a', isSuperUser: true, totalActiveMinutes: 0, sessionCount: 0 };
      const premiumVerified = { _id: 'b', isPremium: true, isVerified: true, totalActiveMinutes: 0, sessionCount: 0 };
      const verified = { _id: 'c', isVerified: true, totalActiveMinutes: 0, sessionCount: 0 };
      const premium = { _id: 'd', isPremium: true, totalActiveMinutes: 0, sessionCount: 0 };
      const plain = { _id: 'e', totalActiveMinutes: 0, sessionCount: 0 };

      const ranked = rankProfiles([plain, premium, verified, premiumVerified, superUser]);
      expect(ranked.map((u) => u._id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('breaks a tier tie using average time spent', () => {
      const highTimeSpent = { _id: 'high', isVerified: true, totalActiveMinutes: 300, sessionCount: 10 }; // 30 min avg
      const lowTimeSpent = { _id: 'low', isVerified: true, totalActiveMinutes: 10, sessionCount: 10 }; // 1 min avg

      const ranked = rankProfiles([lowTimeSpent, highTimeSpent]);
      expect(ranked.map((u) => u._id)).toEqual(['high', 'low']);
    });

    it('a plain user with heavy usage can still outrank an idle Premium user', () => {
      // premium tier alone = 0.3*0.25 = 0.075; plain user with maxed-out time-spent = 0.5*1 = 0.5
      const idlePremium = { _id: 'idle-premium', isPremium: true, totalActiveMinutes: 0, sessionCount: 0 };
      const activePlain = { _id: 'active-plain', totalActiveMinutes: 300, sessionCount: 10 };

      const ranked = rankProfiles([idlePremium, activePlain]);
      expect(ranked.map((u) => u._id)).toEqual(['active-plain', 'idle-premium']);
    });
  });

  describe('Manual selfie verification', () => {
    it('leaves the user unverified while pending, and sets isVerified on approval', async () => {
      const { user } = await makeUser({ selfiePhoto: '/uploads/amora/selfies/x.png', selfieStatus: 'pending' });
      const { token: adminToken } = await makeAdminToken();

      expect((await User.findById(user._id)).isVerified).toBe(false);

      const res = await request(app)
        .patch(`/api/admin/selfie-verifications/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: true });

      expect(res.status).toBe(200);
      expect(res.body.user.selfieStatus).toBe('approved');

      const reloaded = await User.findById(user._id);
      expect(reloaded.isVerified).toBe(true);
    });

    it('rejecting a selfie records a reason and does not verify the user', async () => {
      const { user } = await makeUser({ selfiePhoto: '/uploads/amora/selfies/x.png', selfieStatus: 'pending' });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .patch(`/api/admin/selfie-verifications/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: false, rejectionReason: 'Blurry photo' });

      expect(res.status).toBe(200);
      expect(res.body.user.selfieStatus).toBe('rejected');
      expect(res.body.user.selfieRejectionReason).toBe('Blurry photo');
      expect((await User.findById(user._id)).isVerified).toBe(false);
    });

    it('rejects reviewing a selfie that was already reviewed', async () => {
      const { user } = await makeUser({ selfiePhoto: '/uploads/amora/selfies/x.png', selfieStatus: 'approved' });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .patch(`/api/admin/selfie-verifications/${user._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ approve: true });

      expect(res.status).toBe(400);
    });
  });

  describe('Static subscription plans (price-only admin edits)', () => {
    it('always rejects creating a new plan — the catalog is static', async () => {
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .post('/api/admin/subscriptions/plans')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Plan', price: 100, durationDays: 30 });

      expect(res.status).toBe(403);
      expect(await Plan.countDocuments({})).toBe(0);
    });

    it('allows editing only price on a system plan, ignoring other fields', async () => {
      const plan = await Plan.create({ name: 'Weekly Lite', price: 399, durationDays: 7, isSystemPlan: true });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .patch(`/api/admin/subscriptions/plans/${plan._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 499, name: 'Renamed', durationDays: 999 });

      expect(res.status).toBe(200);
      expect(res.body.plan.price).toBe(499);
      expect(res.body.plan.name).toBe('Weekly Lite');
      expect(res.body.plan.durationDays).toBe(7);
    });

    it('rejects deleting a system plan', async () => {
      const plan = await Plan.create({ name: 'Monthly', price: 599, durationDays: 30, isSystemPlan: true });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .delete(`/api/admin/subscriptions/plans/${plan._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(403);
      expect(await Plan.findById(plan._id)).not.toBeNull();
    });
  });

  describe('Super User / Super Subscriber admin assignment', () => {
    it('grants Super User status and releases the user from the queue', async () => {
      const { user } = await makeUser({ accessStatus: 'queued', queuedAt: new Date() });
      const { token: adminToken } = await makeAdminToken();

      const res = await request(app)
        .patch(`/api/admin/users/${user._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isSuperUser: true });

      expect(res.status).toBe(200);
      expect(res.body.user.isSuperUser).toBe(true);
      expect(res.body.user.accessStatus).toBe('active');
    });
  });
});
