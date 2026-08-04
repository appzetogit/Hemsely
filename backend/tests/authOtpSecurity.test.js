import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';

describe('OTP verification security (regression for hardcoded-bypass fix)', () => {
  const realPhone = '9876500001';

  beforeAll(() => {
    // Simulate a real (non-mock) deployment so the fixed backdoor codes must not work.
    process.env.OTP_USE_MOCK = 'false';
  });

  afterAll(() => {
    process.env.OTP_USE_MOCK = 'true';
  });

  it('rejects the hardcoded 123456/1234 backdoor codes for a real, non-default phone number', async () => {
    await request(app).post('/api/auth/send-otp').send({ phoneNumber: realPhone });

    const attempt1 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: realPhone, otp: '123456' });
    expect(attempt1.status).toBe(400);
    expect(attempt1.body.success).toBe(false);

    const attempt2 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: realPhone, otp: '1234' });
    expect(attempt2.status).toBe(400);
    expect(attempt2.body.success).toBe(false);
  });

  it('accepts the real, randomly generated OTP that was actually issued', async () => {
    await request(app).post('/api/auth/send-otp').send({ phoneNumber: realPhone });
    const user = await User.findOne({ phoneNumber: '+919876500001' });
    expect(user.otpCode).toMatch(/^\d{6}$/);
    expect(user.otpCode).not.toBe('123456');

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: realPhone, otp: user.otpCode });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('rejects an expired OTP even if it is otherwise correct', async () => {
    await request(app).post('/api/auth/send-otp').send({ phoneNumber: realPhone });
    const user = await User.findOne({ phoneNumber: '+919876500001' });
    user.otpExpires = new Date(Date.now() - 60 * 1000);
    await user.save();

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: realPhone, otp: user.otpCode });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('still allows the designated default/demo phone number to use the mock code in non-mock mode', async () => {
    const defaultPhone = (process.env.DEFAULT_OTP_NUMBERS || '9009925021').split(',')[0].trim();
    await request(app).post('/api/auth/send-otp').send({ phoneNumber: defaultPhone });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber: defaultPhone, otp: process.env.OTP_MOCK_CODE || '123456' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
