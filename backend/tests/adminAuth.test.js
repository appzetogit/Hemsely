import request from 'supertest';
import app from '../app.js';
import Admin from '../models/Admin.js';

const createSuperAdmin = async (overrides = {}) => {
  const admin = await Admin.create({
    username: 'ajaypanchal',
    email: 'panchalajay717@gmail.com',
    password: '123456',
    firstName: 'Ajay',
    lastName: 'Panchal',
    role: 'superadmin',
    ...overrides,
  });
  return admin;
};

describe('Admin auth', () => {
  describe('POST /api/admin/register', () => {
    it('rejects registration with no admin token at all (was publicly callable — Phase 0 fix)', async () => {
      const res = await request(app).post('/api/admin/register').send({
        username: 'intruder',
        email: 'intruder@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(401);

      const created = await Admin.findOne({ email: 'intruder@example.com' });
      expect(created).toBeNull();
    });

    it('rejects registration from a non-superadmin admin', async () => {
      const plainAdmin = await Admin.create({
        username: 'plainadmin',
        email: 'plain@example.com',
        password: '123456',
        role: 'admin',
      });

      const loginRes = await request(app).post('/api/admin/login').send({
        email: 'plain@example.com',
        password: '123456',
      });

      const res = await request(app)
        .post('/api/admin/register')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ username: 'intruder2', email: 'intruder2@example.com', password: 'password123' });

      expect(res.status).toBe(403);
      void plainAdmin;
    });

    it('allows a superadmin to create a new admin account', async () => {
      await createSuperAdmin();
      const loginRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });

      const res = await request(app)
        .post('/api/admin/register')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ username: 'newadmin', email: 'newadmin@example.com', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.admin.role).toBe('admin');
    });
  });

  describe('Password hash stability (Phase 0 regression: missing `return` in pre-save hook)', () => {
    it('lets the seeded superadmin log in repeatedly across many sessions without lockout', async () => {
      await createSuperAdmin();

      for (let i = 0; i < 4; i += 1) {
        const res = await request(app).post('/api/admin/login').send({
          email: 'panchalajay717@gmail.com',
          password: '123456',
        });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeTruthy();
      }
    });

    it('keeps the password hash stable after unrelated saves (e.g. lastLogin update)', async () => {
      const admin = await createSuperAdmin();
      const initialHash = admin.password || (await Admin.findById(admin._id).select('+password')).password;

      // Simulate what adminLogin does: update lastLogin and save, without touching password.
      const reloaded = await Admin.findById(admin._id).select('+password');
      reloaded.lastLogin = new Date();
      await reloaded.save();

      const afterSave = await Admin.findById(admin._id).select('+password');
      expect(afterSave.password).toBe(initialHash);

      const loginRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('Login identifier options & attempt resets', () => {
    it('allows logging in using username instead of email', async () => {
      await createSuperAdmin();
      const res = await request(app).post('/api/admin/login').send({
        email: 'ajaypanchal',
        password: '123456',
      });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
    });

    it('resets failed login attempts counter in database upon successful login', async () => {
      await createSuperAdmin();

      // Make 3 failed attempts
      for (let i = 0; i < 3; i += 1) {
        await request(app).post('/api/admin/login').send({
          email: 'panchalajay717@gmail.com',
          password: 'wrong-password',
        });
      }

      const adminBeforeSuccess = await Admin.findOne({ email: 'panchalajay717@gmail.com' });
      expect(adminBeforeSuccess.loginAttempts).toBe(3);

      // Now log in successfully
      const successRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });
      expect(successRes.status).toBe(200);

      // Verify loginAttempts is 0 in DB
      const adminAfterSuccess = await Admin.findOne({ email: 'panchalajay717@gmail.com' });
      expect(adminAfterSuccess.loginAttempts).toBe(0);
    });
  });

  describe('Login lockout', () => {
    it('locks the account after 10 failed attempts', async () => {
      await createSuperAdmin();

      for (let i = 0; i < 10; i += 1) {
        const res = await request(app).post('/api/admin/login').send({
          email: 'panchalajay717@gmail.com',
          password: 'wrong-password',
        });
        expect(res.status).toBe(401);
      }

      const finalRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });
      expect(finalRes.status).toBe(403);
      expect(finalRes.body.message).toMatch(/locked/i);
    });
  });

  describe('PUT /api/admin/password', () => {
    it('rejects the old password and accepts the new one on next login', async () => {
      await createSuperAdmin();
      const loginRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });
      const token = loginRes.body.token;

      const changeRes = await request(app)
        .put('/api/admin/password')
        .set('Authorization', `Bearer ${token}`)
        .send({ currentPassword: '123456', newPassword: 'newpassword789' });
      expect(changeRes.status).toBe(200);

      const oldLoginRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: '123456',
      });
      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await request(app).post('/api/admin/login').send({
        email: 'panchalajay717@gmail.com',
        password: 'newpassword789',
      });
      expect(newLoginRes.status).toBe(200);
    });
  });
});
