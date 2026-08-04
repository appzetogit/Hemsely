import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('CSRF protection for cookie-authenticated requests', () => {
  it('blocks a state-changing request declaring a foreign Origin with no Bearer token', async () => {
    const user = await User.create({ phoneNumber: '+919876500040', firstName: 'Csrf', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Cookie', [`token=${token}`])
      .set('Origin', 'https://evil-attacker.example')
      .send({ bio: 'forged via csrf' });

    expect(res.status).toBe(403);

    const unchanged = await User.findById(user._id);
    expect(unchanged.bio).not.toBe('forged via csrf');
  });

  it('allows a state-changing request from the configured frontend origin with no Bearer token', async () => {
    const user = await User.create({ phoneNumber: '+919876500041', firstName: 'Csrf2', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Cookie', [`token=${token}`])
      .set('Origin', process.env.FRONTEND_URL)
      .send({ bio: 'same origin update' });

    expect(res.status).toBe(200);
  });

  it('allows a state-changing request with a Bearer token regardless of Origin (real frontend auth path)', async () => {
    const user = await User.create({ phoneNumber: '+919876500042', firstName: 'Csrf3', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Origin', 'https://evil-attacker.example')
      .send({ bio: 'bearer path' });

    expect(res.status).toBe(200);
  });

  it('leaves safe methods (GET) unaffected', async () => {
    const user = await User.create({ phoneNumber: '+919876500043', firstName: 'Csrf4', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .get(`/api/users/${user._id}`)
      .set('Cookie', [`token=${token}`])
      .set('Origin', 'https://evil-attacker.example');

    expect(res.status).toBe(200);
  });
});
