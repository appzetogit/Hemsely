import User from '../models/User.js';
import Plan from '../models/Plan.js';
import googlePlayService from '../services/googlePlayService.js';
import { verifyPurchase } from '../controllers/googlePlayController.js';

// No Google credentials in tests → service runs its dev mock (isMock: true).
// asyncHandler doesn't return its promise, so resolve on res.json / next(err).
const call = (userId, body) =>
  new Promise((resolve, reject) => {
    const res = { statusCode: 200, body: null };
    res.status = (c) => ((res.statusCode = c), res);
    res.json = (b) => ((res.body = b), resolve(res), res);
    verifyPurchase({ user: { id: String(userId) }, body }, res, reject);
  });

describe('Google Play verifyPurchase', () => {
  let user;
  beforeEach(async () => {
    user = await User.create({ phoneNumber: '9000000001' });
    await Plan.create({ name: '1 Month', price: 499, durationDays: 30, productId: 'hemsely_premium_monthly' });
  });

  it('grants premium and stacks a second pass on top of the first', async () => {
    const r1 = await call(user._id, { purchaseToken: 'tok-1', productId: 'hemsely_premium_monthly' });
    expect(r1.statusCode).toBe(200);
    const first = new Date(r1.body.user.premiumExpiry).getTime();
    expect(r1.body.user.isPremium).toBe(true);
    expect(first - Date.now()).toBeGreaterThan(29 * 86400000);

    const r2 = await call(user._id, { purchaseToken: 'tok-2', productId: 'hemsely_premium_monthly' });
    expect(new Date(r2.body.user.premiumExpiry).getTime() - first).toBeGreaterThanOrEqual(30 * 86400000 - 1000);
  });

  it('adds 5 boosts once; replaying the token does not double-credit', async () => {
    const r1 = await call(user._id, { purchaseToken: 'tok-b', productId: 'hemsely_boost_5' });
    expect(r1.body.user.boostCount).toBe(5);
    const r2 = await call(user._id, { purchaseToken: 'tok-b', productId: 'hemsely_boost_5' });
    expect(r2.body.alreadyProcessed).toBe(true);
    expect((await User.findById(user._id)).boostCount).toBe(5);
  });

  it('rejects a token already claimed by another user', async () => {
    const other = await User.create({ phoneNumber: '9000000002' });
    await call(user._id, { purchaseToken: 'tok-x', productId: 'hemsely_boost_1' });
    const r = await call(other._id, { purchaseToken: 'tok-x', productId: 'hemsely_boost_1' });
    expect(r.statusCode).toBe(409);
  });

  it('rejects unknown products and purchases made from another account', async () => {
    expect((await call(user._id, { purchaseToken: 't', productId: 'free_stuff' })).statusCode).toBe(400);

    const orig = googlePlayService.verifyProduct;
    googlePlayService.verifyProduct = async () => ({ purchaseState: 0, obfuscatedExternalAccountId: 'someone-else' });
    try {
      const r = await call(user._id, { purchaseToken: 'tok-y', productId: 'hemsely_boost_1' });
      expect(r.statusCode).toBe(403);
    } finally {
      googlePlayService.verifyProduct = orig;
    }
  });
});
