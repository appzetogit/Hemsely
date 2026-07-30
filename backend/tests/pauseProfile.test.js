import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import User from '../models/User.js';

const makeUser = async (overrides = {}) => {
  const user = await User.create({
    phoneNumber: overrides.phoneNumber || `+9198765${Math.floor(10000 + Math.random() * 89999)}`,
    firstName: overrides.firstName || 'TestUser',
    isProfileComplete: true,
    gender: overrides.gender || 'female',
    interestedIn: overrides.interestedIn || ['male'],
    isActive: true,
    isPaused: false,
    ...overrides,
  });
  const token = jwt.sign({ id: user._id.toString(), role: 'user' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token };
};

describe('Pause Profile functionality', () => {
  it('allows user to pause profile via PUT /api/users/me', async () => {
    const { user, token } = await makeUser();

    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ isPaused: true });

    expect(res.status).toBe(200);
    expect(res.body.user.isPaused).toBe(true);

    const reloaded = await User.findById(user._id);
    expect(reloaded.isPaused).toBe(true);
  });

  it('allows paused user to access authenticated endpoints', async () => {
    const { user, token } = await makeUser({ isPaused: true });

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.isPaused).toBe(true);
  });

  it('excludes paused users from another user discovery feed', async () => {
    const { user: femaleUser, token: femaleToken } = await makeUser({ gender: 'female', interestedIn: ['male'] });
    const { user: activeMale } = await makeUser({ gender: 'male', interestedIn: ['female'], firstName: 'Active Male' });
    const { user: pausedMale } = await makeUser({ gender: 'male', interestedIn: ['female'], firstName: 'Paused Male', isPaused: true });

    const res = await request(app)
      .get('/api/users/discovery')
      .set('Authorization', `Bearer ${femaleToken}`);

    expect(res.status).toBe(200);
    const userIds = res.body.users.map((u) => u._id.toString());
    expect(userIds).toContain(activeMale._id.toString());
    expect(userIds).not.toContain(pausedMale._id.toString());
  });

  it('restores profile to discovery feed when unpaused', async () => {
    const { user: femaleUser, token: femaleToken } = await makeUser({ gender: 'female', interestedIn: ['male'] });
    const { user: pausedMale, token: maleToken } = await makeUser({ gender: 'male', interestedIn: ['female'], firstName: 'Paused Male', isPaused: true });

    // Step 1: Verify not in discovery feed while paused
    const feed1 = await request(app)
      .get('/api/users/discovery')
      .set('Authorization', `Bearer ${femaleToken}`);

    const ids1 = feed1.body.users.map((u) => u._id.toString());
    expect(ids1).not.toContain(pausedMale._id.toString());

    // Step 2: Unpause profile
    const unpauseRes = await request(app)
      .put(`/api/users/${pausedMale._id}`)
      .set('Authorization', `Bearer ${maleToken}`)
      .send({ isPaused: false });

    expect(unpauseRes.status).toBe(200);
    expect(unpauseRes.body.user.isPaused).toBe(false);

    // Step 3: Verify user appears in discovery feed now
    const feed2 = await request(app)
      .get('/api/users/discovery')
      .set('Authorization', `Bearer ${femaleToken}`);

    const ids2 = feed2.body.users.map((u) => u._id.toString());
    expect(ids2).toContain(pausedMale._id.toString());
  });
});
