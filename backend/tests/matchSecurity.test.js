import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Match from '../models/Match.js';
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

describe('Block enforcement regression (likeUser / sendMessage)', () => {
  it('rejects liking a user who has blocked you', async () => {
    const { user: blocker } = await makeUser();
    const { user: target, token: targetToken } = await makeUser();

    blocker.blockedUsers = [target._id];
    await blocker.save();

    const res = await request(app)
      .post(`/api/matches/like/${blocker._id}`)
      .set('Authorization', `Bearer ${targetToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('rejects sending a message between users where either side has blocked the other', async () => {
    const { user: userA, token: tokenA } = await makeUser();
    const { user: userB } = await makeUser();

    userA.blockedUsers = [userB._id];
    await userA.save();

    await Match.create({ user1: userA._id, user2: userB._id, initiatedBy: userA._id, status: 'accepted' });

    const res = await request(app)
      .post(`/api/messages/send/${userB._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ message: 'hello' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

describe('Match document canonical ordering (prevents duplicate-match race)', () => {
  it('stores user1/user2 in a consistent order regardless of who liked first', async () => {
    const { user: userA, token: tokenA } = await makeUser();
    const { user: userB, token: tokenB } = await makeUser();

    // B likes A first (one-directional, no match yet)
    await request(app).post(`/api/matches/like/${userA._id}`).set('Authorization', `Bearer ${tokenB}`);
    // A likes B back -> mutual match created
    const res = await request(app).post(`/api/matches/like/${userB._id}`).set('Authorization', `Bearer ${tokenA}`);

    expect(res.body.isMatched).toBe(true);

    const matches = await Match.find({
      $or: [
        { user1: userA._id, user2: userB._id },
        { user1: userB._id, user2: userA._id },
      ],
    });

    expect(matches.length).toBe(1);
    const [smaller, larger] = [userA._id.toString(), userB._id.toString()].sort();
    expect(matches[0].user1.toString()).toBe(smaller);
    expect(matches[0].user2.toString()).toBe(larger);
  });
});
