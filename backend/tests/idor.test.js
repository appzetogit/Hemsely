import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
import Message from '../models/Message.js';

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

describe('IDOR regressions — a user must never mutate another user\'s data by guessing their ID', () => {
  describe('PUT /api/users/:id (profile update)', () => {
    it('rejects updating another user\'s profile', async () => {
      const { token: attackerToken } = await makeUser();
      const { user: victim } = await makeUser();

      const res = await request(app)
        .put(`/api/users/${victim._id}`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .send({ bio: 'hacked' });

      expect(res.status).toBe(403);

      const reloaded = await User.findById(victim._id);
      expect(reloaded.bio).not.toBe('hacked');
    });

    it('allows updating your own profile', async () => {
      const { user, token } = await makeUser();

      const res = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'my own bio' });

      expect(res.status).toBe(200);
      expect(res.body.user.bio).toBe('my own bio');
    });
  });

  describe('DELETE /api/users/:id (account deletion)', () => {
    it('rejects deleting another user\'s account', async () => {
      const { token: attackerToken } = await makeUser();
      const { user: victim } = await makeUser();

      const res = await request(app)
        .delete(`/api/users/${victim._id}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.status).toBe(403);
      expect(await User.findById(victim._id)).not.toBeNull();
    });
  });

  describe('POST /api/users/:id/block/:blockedUserId', () => {
    it('rejects managing another user\'s block list', async () => {
      const { token: attackerToken } = await makeUser();
      const { user: victim } = await makeUser();
      const { user: target } = await makeUser();

      const res = await request(app)
        .post(`/api/users/${victim._id}/block/${target._id}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.status).toBe(403);
      expect((await User.findById(victim._id)).blockedUsers).toHaveLength(0);
    });
  });

  describe('POST /api/users/:id/report/:reportedUserId', () => {
    it('rejects reporting as another user', async () => {
      const { token: attackerToken } = await makeUser();
      const { user: victim } = await makeUser();
      const { user: target } = await makeUser();

      const res = await request(app)
        .post(`/api/users/${victim._id}/report/${target._id}`)
        .set('Authorization', `Bearer ${attackerToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/matches/:matchId/accept and /reject', () => {
    it('rejects accepting a match you are not a participant in', async () => {
      const { user: userA } = await makeUser();
      const { user: userB } = await makeUser();
      const { token: outsiderToken } = await makeUser();

      const match = await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userA._id, status: 'pending' });

      const res = await request(app)
        .put(`/api/matches/${match._id}/accept`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect((await Match.findById(match._id)).status).toBe('pending');
    });

    it('rejects rejecting a match you are not a participant in', async () => {
      const { user: userA } = await makeUser();
      const { user: userB } = await makeUser();
      const { token: outsiderToken } = await makeUser();

      const match = await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userA._id, status: 'pending' });

      const res = await request(app)
        .put(`/api/matches/${match._id}/reject`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
    });

    it('allows a real participant to accept their own match', async () => {
      const { user: userA, token: tokenA } = await makeUser();
      const { user: userB } = await makeUser();

      const match = await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userB._id, status: 'pending' });

      const res = await request(app)
        .put(`/api/matches/${match._id}/accept`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.match.status).toBe('accepted');
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    it('rejects deleting a message you did not send', async () => {
      const { user: sender } = await makeUser();
      const { user: receiver } = await makeUser();
      const { token: outsiderToken } = await makeUser();

      const message = await Message.create({
        sender: sender._id,
        receiver: receiver._id,
        message: 'hello',
        conversationId: [sender._id.toString(), receiver._id.toString()].sort().join('_'),
      });

      const res = await request(app)
        .delete(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${outsiderToken}`);

      expect(res.status).toBe(403);
      expect(await Message.findById(message._id)).not.toBeNull();
    });

    it('allows the sender to delete their own message', async () => {
      const { user: sender, token: senderToken } = await makeUser();
      const { user: receiver } = await makeUser();

      const message = await Message.create({
        sender: sender._id,
        receiver: receiver._id,
        message: 'hello',
        conversationId: [sender._id.toString(), receiver._id.toString()].sort().join('_'),
      });

      const res = await request(app)
        .delete(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${senderToken}`);

      expect(res.status).toBe(200);
      expect(await Message.findById(message._id)).toBeNull();
    });
  });
});
