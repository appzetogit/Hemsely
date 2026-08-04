import request from 'supertest';
import crypto from 'crypto';
import app from '../app.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import { generateToken } from '../utils/tokenUtils.js';
import razorpayService from '../services/razorpayService.js';

describe('Razorpay payment verification security (regression for signature-bypass fix)', () => {
  let user;
  let token;

  beforeAll(() => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_dummykey123';
    process.env.RAZORPAY_KEY_SECRET = 'dummy_test_secret';
    razorpayService.reinitialize();
  });

  beforeEach(async () => {
    user = await User.create({ phoneNumber: '+919876500002', firstName: 'Payer', isProfileComplete: true });
    token = generateToken(user._id, 'user');
  });

  it('rejects a forged order id with no payment_id/signature even though Razorpay is fully configured', async () => {
    const transaction = await Transaction.create({
      transactionId: 'TXN_SEC_1',
      user: user._id,
      amount: 499,
      status: 'pending',
      gatewayOrderId: 'order_forgedByAttacker',
    });

    const res = await request(app)
      .post('/api/subscriptions/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({ transactionId: transaction.transactionId, razorpay_order_id: 'order_forgedByAttacker' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isPremium).not.toBe(true);

    const updatedTransaction = await Transaction.findById(transaction._id);
    expect(updatedTransaction.status).toBe('failed');
  });

  it('activates premium when a genuinely valid signature is provided', async () => {
    const orderId = 'order_realOrder123';
    const paymentId = 'pay_realPayment456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const transaction = await Transaction.create({
      transactionId: 'TXN_SEC_2',
      user: user._id,
      amount: 499,
      durationDays: 30,
      status: 'pending',
      gatewayOrderId: orderId,
    });

    const res = await request(app)
      .post('/api/subscriptions/verify-payment')
      .set('Authorization', `Bearer ${token}`)
      .send({
        transactionId: transaction.transactionId,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isPremium).toBe(true);
  });

  it('no longer exposes the unauthenticated free-premium endpoint', async () => {
    const res = await request(app)
      .post('/api/users/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);

    const updatedUser = await User.findById(user._id);
    expect(updatedUser.isPremium).not.toBe(true);
  });
});
