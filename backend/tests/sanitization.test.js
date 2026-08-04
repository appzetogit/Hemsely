import request from 'supertest';
import app from '../app.js';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import WebsitePageContent from '../models/WebsitePageContent.js';
import { generateToken } from '../utils/tokenUtils.js';

describe('HTML sanitization regressions (stored-XSS fix)', () => {
  it('strips scripts from CMS body but keeps safe formatting tags', async () => {
    const admin = await Admin.create({
      username: 'cmsadmin',
      email: 'cmsadmin@hemsely.com',
      password: 'password123',
      role: 'admin',
      isActive: true,
    });
    const token = generateToken(admin._id, 'admin');

    const res = await request(app)
      .put('/api/admin/website-pages/privacy-policy')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Privacy Policy',
        summary: 'How we handle data',
        body: '<p>We respect your <strong>privacy</strong>.</p><script>alert(1)</script><img src=x onerror=alert(2)>',
      });

    expect(res.status).toBe(200);
    expect(res.body.page.body).toContain('<strong>privacy</strong>');
    expect(res.body.page.body).not.toContain('<script>');
    expect(res.body.page.body).not.toContain('onerror');

    const stored = await WebsitePageContent.findOne({ slug: 'privacy-policy' });
    expect(stored.body).not.toContain('<script>');
    expect(stored.body).not.toContain('onerror');
  });

  it('strips all markup from a user bio update', async () => {
    const user = await User.create({ phoneNumber: '+919876500030', firstName: 'Bio', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .put(`/api/users/${user._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ bio: '<img src=x onerror=alert(1)>Hello <b>world</b>' });

    expect(res.status).toBe(200);
    expect(res.body.user.bio).toBe('Hello world');
  });

  it('strips all markup from a support ticket subject/message', async () => {
    const user = await User.create({ phoneNumber: '+919876500031', firstName: 'Ticket', isProfileComplete: true });
    const token = generateToken(user._id, 'user');

    const res = await request(app)
      .post('/api/support/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ subject: '<script>alert(1)</script>Help', message: 'Broken <b>button</b> on <script>bad()</script>page' });

    expect(res.status).toBe(201);
    expect(res.body.ticket.subject).toBe('Help');
    expect(res.body.ticket.message).toBe('Broken button on page');

    const stored = await Ticket.findById(res.body.ticket._id);
    expect(stored.subject).not.toContain('<');
    expect(stored.message).not.toContain('<');
  });
});
