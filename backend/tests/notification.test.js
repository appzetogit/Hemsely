import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import Notification from '../models/Notification.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('End-to-End Notification System (Admin & User APIs)', () => {
  let adminUser;
  let adminToken;
  let regularUser;
  let userToken;
  let premiumUser;

  beforeEach(async () => {
    adminUser = await Admin.create({
      username: 'adminnotif',
      email: 'adminnotif@hemsely.com',
      password: 'password123',
      firstName: 'Notif',
      lastName: 'Admin',
      role: 'admin',
      isActive: true,
    });
    adminToken = generateToken(adminUser._id, 'admin');

    regularUser = await User.create({
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+919876543200',
      isProfileComplete: true,
      fcmtokenweb: 'web_token_john',
      isPremium: false,
    });
    userToken = generateToken(regularUser._id, 'user');

    premiumUser = await User.create({
      firstName: 'Jane',
      lastName: 'VIP',
      phoneNumber: '+919876543201',
      isProfileComplete: true,
      fcmtokenmobile: 'mobile_token_jane',
      isPremium: true,
    });
  });

  describe('Admin Notification Endpoints', () => {
    it('POST /api/admin/notifications sends broadcast notification to all users', async () => {
      const res = await request(app)
        .post('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Special Offer!',
          body: 'Check out our new features today.',
          target: 'all',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.notification).toBeDefined();
      expect(res.body.notification.deliveryStats.recipientCount).toBeGreaterThanOrEqual(2);

      const dbNotif = await Notification.findById(res.body.notification._id);
      expect(dbNotif.title).toBe('Special Offer!');
    });

    it('POST /api/admin/notifications sends targeted notification to premium segment', async () => {
      const res = await request(app)
        .post('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'VIP Lounge Open',
          body: 'Exclusive event for premium members.',
          target: 'segment',
          segment: 'premium',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.deliveryStats.recipientCount).toBe(1);
    });

    it('GET /api/admin/notifications returns notification history', async () => {
      await Notification.create({
        title: 'History 1',
        body: 'Body 1',
        target: 'all',
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .get('/api/admin/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('DELETE /api/admin/notifications/:id deletes notification record', async () => {
      const notif = await Notification.create({
        title: 'To Delete',
        body: 'Will be deleted',
        target: 'all',
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .delete(`/api/admin/notifications/${notif._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await Notification.findById(notif._id);
      expect(check).toBeNull();
    });
  });

  describe('User Notification Endpoints', () => {
    it('GET /api/notifications returns notifications targeted for logged in user', async () => {
      await Notification.create({
        title: 'Broadcast for All',
        body: 'Hello world',
        target: 'all',
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notifications.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /api/notifications/unread-count returns unread count', async () => {
      await Notification.create({
        title: 'Unread 1',
        body: 'Unread body',
        target: 'all',
        isRead: false,
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('PATCH /api/notifications/:id/read marks notification as read', async () => {
      const notif = await Notification.create({
        title: 'Mark Read',
        body: 'Body',
        target: 'all',
        isRead: false,
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.notification.isRead).toBe(true);
    });

    it('PATCH /api/notifications/:id/read rejects marking a notification targeted at a different user (IDOR regression)', async () => {
      const notif = await Notification.create({
        title: 'Personal for premiumUser',
        body: 'Only for Jane',
        target: 'user',
        targetUsers: [premiumUser._id],
        isRead: false,
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif._id}/read`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);

      const unchanged = await Notification.findById(notif._id);
      expect(unchanged.readBy || []).toHaveLength(0);
    });

    it('PATCH /api/notifications/read-all marks all notifications as read', async () => {
      await Notification.create({
        title: 'Notif 1',
        body: 'Body 1',
        target: 'all',
        isRead: false,
        sentBy: adminUser._id,
      });

      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const countRes = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${userToken}`);
      expect(countRes.body.unreadCount).toBe(0);
    });
  });
});
