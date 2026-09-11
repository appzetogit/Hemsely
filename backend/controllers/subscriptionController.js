import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseFromQueue } from '../utils/queueService.js';
import { getOrCreateConfig } from './appConfigController.js';

// @desc List all plans
// @route GET /api/admin/subscriptions/plans or /api/subscriptions/plans
// @access Private/Admin or Private/User
export const getPlans = asyncHandler(async (req, res) => {
  let plans = await Plan.find({}).sort({ durationDays: 1, price: 1 });

  // If plans table has less than the 3 standard tiers, auto-populate them
  if (plans.length < 3) {
    const DEFAULT_FEATURES = [
      'Unlimited Likes',
      'Location Changes (Passport Mode)',
      'View Who Likes You',
      'Unlimited Rewinds',
      '1 Profile Boost per week',
      'Advanced Filters',
      'Priority Profile Visibility',
    ];

    const standardTiers = [
      {
        slug: 'weekly',
        productId: 'hemsely_premium_weekly',
        name: '1 Week',
        description: 'Get 7 days of full VIP access, unlimited likes, and instant discovery!',
        price: 199,
        durationDays: 7,
        badge: '7 DAYS',
        isSystemPlan: true,
        isActive: true,
        features: DEFAULT_FEATURES,
      },
      {
        slug: 'monthly',
        productId: 'hemsely_premium_monthly',
        name: '1 Month',
        description: 'Full monthly access to priority discovery, unlimited likes, and direct chat!',
        price: 499,
        durationDays: 30,
        badge: 'POPULAR',
        isSystemPlan: true,
        isActive: true,
        features: DEFAULT_FEATURES,
      },
      {
        slug: '3months',
        productId: 'hemsely_premium_3months',
        name: '3 Months',
        description: 'Best value VIP pass with 90 days of full discovery and profile boosts!',
        price: 1199,
        durationDays: 90,
        badge: 'BEST VALUE',
        isSystemPlan: true,
        isActive: true,
        features: DEFAULT_FEATURES,
      },
    ];

    for (const tier of standardTiers) {
      const exists = await Plan.findOne({
        $or: [{ name: tier.name }, { productId: tier.productId }, { slug: tier.slug }],
      });
      if (!exists) {
        await Plan.create(tier);
      }
    }

    // Clean up deprecated generic "Premium" plan if present
    await Plan.deleteMany({ name: 'Premium', isSystemPlan: true });

    plans = await Plan.find({}).sort({ durationDays: 1, price: 1 });
  }

  res.status(200).json({ success: true, plans });
});

// @desc Create a plan — disabled: the plan catalog is static (seeded via scripts/seedPlans.js).
// @route POST /api/admin/subscriptions/plans
// @access Private/Admin
export const createPlan = asyncHandler(async (req, res) => {
  res.status(403).json({
    success: false,
    message: 'Subscription plans are static. Only pricing can be edited on existing plans.',
  });
});

// @desc Update a plan (system plans: price only; custom plans: fully editable)
// @route PATCH /api/admin/subscriptions/plans/:id
// @access Private/Admin
export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  if (plan.isSystemPlan) {
    if (req.body.price !== undefined) plan.price = req.body.price;
    if (req.body.description !== undefined) plan.description = req.body.description;
  } else {
    const allowedFields = ['name', 'description', 'price', 'currency', 'durationDays', 'features', 'isActive'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) plan[field] = req.body[field];
    });
  }

  await plan.save();

  await logAdminAction({ adminId: req.admin.id, action: 'update_plan', targetType: 'Plan', targetId: plan._id, ip: req.ip });

  res.status(200).json({ success: true, message: 'Plan updated', plan });
});

// @desc Delete a plan (system plans cannot be deleted — the catalog is static)
// @route DELETE /api/admin/subscriptions/plans/:id
// @access Private/Admin
export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await Plan.findById(req.params.id);
  if (!plan) {
    return res.status(404).json({ success: false, message: 'Plan not found' });
  }

  if (plan.isSystemPlan) {
    return res.status(403).json({ success: false, message: 'Static system plans cannot be deleted' });
  }

  await plan.deleteOne();

  await logAdminAction({ adminId: req.admin.id, action: 'delete_plan', targetType: 'Plan', targetId: plan._id, ip: req.ip });

  res.status(200).json({ success: true, message: 'Plan deleted' });
});

// @desc Manually grant or revoke premium on a user (e.g. comped subscription, support override)
// @route PATCH /api/admin/subscriptions/users/:id
// @access Private/Admin
export const setUserPremium = asyncHandler(async (req, res) => {
  const { isPremium, premiumExpiry } = req.body;
  let expiryDate = null;
  if (isPremium) {
    if (premiumExpiry) {
      expiryDate = new Date(premiumExpiry);
    } else {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    }
  }

  const updatePayload = { isPremium: !!isPremium, premiumExpiry: expiryDate };
  if (isPremium) {
    updatePayload.$inc = { boostCount: 1 };
  }

  let user = await User.findByIdAndUpdate(
    req.params.id,
    updatePayload,
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (isPremium) {
    await releaseFromQueue(user._id);
    user = await User.findById(user._id);
  }

  await logAdminAction({
    adminId: req.admin.id,
    action: isPremium ? 'grant_premium' : 'revoke_premium',
    targetType: 'User',
    targetId: user._id,
    ip: req.ip,
  });

  res.status(200).json({ success: true, message: 'User subscription updated', user });
});

// @desc Create Order - Migrated to Google Play Billing
// @route POST /api/subscriptions/create-order or /api/users/subscribe/create-order
// @access Private/User
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Billing is now handled via Google Play Billing. Please use /api/google-play/verify-subscription.',
    provider: 'google_play',
  });
});

// @desc Verify Payment - Migrated to Google Play Billing
// @route POST /api/subscriptions/verify-payment or /api/users/subscribe/verify
// @access Private/User
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Razorpay is disabled. Please verify your purchase using /api/google-play/verify-subscription.',
  });
});

// @desc Get Boost Plans with dynamic pricing
// @route GET /api/subscriptions/boost-plans or /api/users/boost-plans
// @access Private/User
export const getBoostPlans = asyncHandler(async (req, res) => {
  const config = await getOrCreateConfig();
  res.status(200).json({
    success: true,
    plans: [
      { id: 'left', count: 1, label: 'Boost', price: config.boostPrice1 ?? 199, productId: 'hemsely_boost_1' },
      { id: 'right', count: 5, label: 'Boosts', price: config.boostPrice5 ?? 399, productId: 'hemsely_boost_5' },
    ],
  });
});

// @desc Create Boost Order - Migrated to Google Play Billing
// @route POST /api/subscriptions/boost/create-order or /api/users/boost/create-order
// @access Private/User
export const createBoostOrder = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Boost billing is handled via Google Play In-App purchases. Use /api/google-play/verify-purchase.',
    provider: 'google_play',
  });
});

// @desc Verify Boost Payment - Migrated to Google Play Billing
// @route POST /api/subscriptions/boost/verify or /api/users/boost/verify
// @access Private/User
export const verifyBoostPayment = asyncHandler(async (req, res) => {
  res.status(400).json({
    success: false,
    message: 'Razorpay is disabled. Please verify consumable boost purchases using /api/google-play/verify-purchase.',
  });
});

// @desc Get list of all users who have an active or past subscription
// @route GET /api/admin/subscription-users
// @access Private/Admin
// ponytail: loads every successful subscription transaction + every premium user into
// memory to dedupe-by-user and paginate with .slice(), instead of paginating at the DB
// layer. Fine at current admin-only scale; upgrade to a $group+$facet aggregation if
// the transaction/premium-user history grows large enough for this page to slow down.
// @desc Get all users with active or past subscription transactions for Admin Panel
// @route GET /api/admin/subscription-users
// @access Private/Admin
export const getSubscriptionUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  let transactions = [];
  try {
    transactions = await Transaction.find({
      status: 'success',
      planName: { $not: /Boost/i },
    })
      .populate({
        path: 'user',
        select: 'firstName lastName email phoneNumber profilePicture isPremium premiumExpiry createdAt',
        strictPopulate: false,
      })
      .populate({
        path: 'plan',
        select: 'name price durationDays',
        strictPopulate: false,
      })
      .sort({ createdAt: -1 })
      .lean();
  } catch (err) {
    console.warn('⚠️ [getSubscriptionUsers] Populate fallback triggered:', err.message);
    transactions = await Transaction.find({
      status: 'success',
      planName: { $not: /Boost/i },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  const userSubMap = new Map();

  for (const txn of transactions) {
    if (!txn || !txn.user) continue;
    const userId = txn.user._id ? txn.user._id.toString() : String(txn.user);
    if (!userSubMap.has(userId)) {
      const now = new Date();
      const startDate = txn.createdAt ? new Date(txn.createdAt) : now;
      const duration = txn.durationDays || (
        (txn.planName || '').toLowerCase().includes('week') || (txn.productId || '').toLowerCase().includes('week') ? 7 :
        (txn.planName || '').toLowerCase().includes('3 month') || (txn.productId || '').toLowerCase().includes('3month') ? 90 :
        (txn.planName || '').toLowerCase().includes('6 month') || (txn.productId || '').toLowerCase().includes('6month') ? 180 :
        (txn.planName || '').toLowerCase().includes('year') || (txn.productId || '').toLowerCase().includes('year') ? 365 : 30
      );

      const calculatedExpiry = new Date(startDate.getTime() + duration * 24 * 60 * 60 * 1000);
      const expiry = txn.user?.premiumExpiry ? new Date(txn.user.premiumExpiry) : calculatedExpiry;
      
      const diffMs = expiry.getTime() - now.getTime();
      let remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      let isExpired = diffMs <= 0;

      userSubMap.set(userId, {
        _id: userId,
        user: typeof txn.user === 'object' ? txn.user : { _id: userId },
        subscriptionId: txn.subscriptionId || `SUB_${String(txn._id).slice(-8).toUpperCase()}`,
        transactionId: txn.transactionId || txn.gatewayPaymentId || String(txn._id),
        planName: txn.planName || txn.plan?.name || (duration === 7 ? 'Premium (1 Week)' : 'Premium (1 Month)'),
        amount: txn.amount || 0,
        startDate: txn.createdAt,
        expiryDate: expiry,
        remainingDays,
        isPremium: Boolean(txn.user?.isPremium) && !isExpired,
        isExpired: !txn.user?.isPremium || isExpired,
        gateway: txn.gateway || 'Google Play',
      });
    }
  }

  // 2. Also include users who are currently marked isPremium: true in DB
  let premiumUsers = [];
  try {
    premiumUsers = await User.find({ isPremium: true, _id: { $nin: Array.from(userSubMap.keys()) } })
      .select('firstName lastName email phoneNumber profilePicture isPremium premiumExpiry createdAt')
      .lean();
  } catch (pErr) {
    console.warn('⚠️ [getSubscriptionUsers] Premium users query fallback:', pErr.message);
  }

  for (const pUser of premiumUsers) {
    if (!pUser || !pUser._id) continue;
    const userId = pUser._id.toString();
    const now = new Date();
    const expiry = pUser.premiumExpiry ? new Date(pUser.premiumExpiry) : null;
    let remainingDays = 0;
    let isExpired = false;

    if (expiry) {
      const diffMs = expiry - now;
      remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (remainingDays <= 0) isExpired = true;
    }

    userSubMap.set(userId, {
      _id: userId,
      user: pUser,
      subscriptionId: `SUB_ADMIN_${String(pUser._id).slice(-6).toUpperCase()}`,
      transactionId: 'ADMIN_GRANT',
      planName: 'Premium (Admin Granted)',
      amount: 0,
      startDate: pUser.createdAt,
      expiryDate: expiry || new Date(now.getTime() + 30 * 86400000),
      remainingDays,
      isPremium: !isExpired,
      isExpired,
      gateway: 'Manual Override',
    });
  }

  let allList = Array.from(userSubMap.values());

  if (search) {
    const s = search.toLowerCase();
    allList = allList.filter((item) => {
      if (!item || !item.user) return false;
      const name = `${item.user.firstName || ''} ${item.user.lastName || ''}`.toLowerCase();
      const email = (item.user.email || '').toLowerCase();
      const phone = (item.user.phoneNumber || '').toLowerCase();
      const subId = (item.subscriptionId || '').toLowerCase();
      const txnId = (item.transactionId || '').toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s) || subId.includes(s) || txnId.includes(s);
    });
  }

  const total = allList.length;
  const paginated = allList.slice(skip, skip + limit);

  return res.status(200).json({
    success: true,
    subscriptionUsers: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    },
  });
});
