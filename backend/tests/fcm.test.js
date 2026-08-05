import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { generateToken } from '../utils/tokenUtils.js';
import { saveFcmToken, removeFcmToken, getTokensForUser } from '../services/fcmService.js';

describe('FCM Push Notification Service & Routes', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      firstName: 'Push',
      lastName: 'User',
      phoneNumber: '+919876543210',
      isProfileComplete: true,
    });
    token = generateToken(user._id, 'user');
  });

  describe('FCM Service Functions', () => {
    it('should save fcmtokenweb for web platform', async () => {
      await saveFcmToken({
        userId: user._id,
        fcmToken: 'test_web_token_123',
        platform: 'web',
      });

      const updated = await User.findById(user._id);
      expect(updated.fcmtokenweb).toBe('test_web_token_123');
    });

    it('should save fcmtokenmobile for android platform', async () => {
      await saveFcmToken({
        userId: user._id,
        fcmToken: 'test_mobile_token_456',
        platform: 'android',
      });

      const updated = await User.findById(user._id);
      expect(updated.fcmtokenmobile).toBe('test_mobile_token_456');
    });

    it('should save fcmtokenios for ios platform', async () => {
      await saveFcmToken({
        userId: user._id,
        fcmToken: 'test_ios_token_789',
        platform: 'ios',
      });

      const updated = await User.findById(user._id);
      expect(updated.fcmtokenios).toBe('test_ios_token_789');
    });

    it('should retrieve all non-null tokens for user', async () => {
      await saveFcmToken({ userId: user._id, fcmToken: 'web_tok', platform: 'web' });
      await saveFcmToken({ userId: user._id, fcmToken: 'mob_tok', platform: 'mobile' });
      await saveFcmToken({ userId: user._id, fcmToken: 'ios_tok', platform: 'ios' });

      const tokens = await getTokensForUser(user._id);
      expect(tokens).toEqual(expect.arrayContaining(['web_tok', 'mob_tok', 'ios_tok']));
      expect(tokens.length).toBe(3);
    });

    it('should remove FCM token by token string', async () => {
      await saveFcmToken({ userId: user._id, fcmToken: 'token_to_remove', platform: 'web' });
      await removeFcmToken('token_to_remove');

      const updated = await User.findById(user._id);
      expect(updated.fcmtokenweb).toBeNull();
    });
  });

  describe('FCM Endpoints', () => {
    it('POST /api/fcm/register-token registers token for authenticated user', async () => {
      const res = await request(app)
        .post('/api/fcm/register-token')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fcmToken: 'api_registered_token_111',
          platform: 'web',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await User.findById(user._id);
      expect(dbUser.fcmtokenweb).toBe('api_registered_token_111');
    });

    it('POST /fcm/register-token registers token on bare route (proxy prefix stripped)', async () => {
      const res = await request(app)
        .post('/fcm/register-token')
        .set('Authorization', `Bearer ${token}`)
        .send({
          fcmToken: 'bare_route_token_222',
          platform: 'web',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await User.findById(user._id);
      expect(dbUser.fcmtokenweb).toBe('bare_route_token_222');
    });

    it('POST /api/fcm/remove-token removes registered token', async () => {
      await saveFcmToken({ userId: user._id, fcmToken: 'tok_remove_api', platform: 'web' });

      const res = await request(app)
        .post('/api/fcm/remove-token')
        .send({ fcmToken: 'tok_remove_api' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await User.findById(user._id);
      expect(dbUser.fcmtokenweb).toBeNull();
    });

    it('POST /api/fcm/test rejects targeting another user\'s registered device (cross-user push regression)', async () => {
      const otherUser = await User.create({
        firstName: 'Other',
        phoneNumber: '+919876543219',
        isProfileComplete: true,
      });
      await saveFcmToken({ userId: otherUser._id, fcmToken: 'other_users_device_token', platform: 'web' });

      const res = await request(app)
        .post('/api/fcm/test')
        .set('Authorization', `Bearer ${token}`)
        .send({ fcmToken: 'other_users_device_token' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
