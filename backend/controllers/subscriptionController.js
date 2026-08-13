import Plan from '../models/Plan.js';
import User from '../models/User.js';
import Transaction from '../models/Transaction.js';
import Notification from '../models/Notification.js';
import razorpayService from '../services/razorpayService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseFromQueue } from '../utils/queueService.js';
import { getOrCreateConfig } from './appConfigController.js';

// @desc List all plans
// @route GET /api/admin/subscriptions/plans
// @access Private/Admin
export const getPlans = asyncHandler(async (req, res) => {
  let plans = await Plan.find({}).sort({ price: 1 });

  if (plans.length === 0) {
    const defaultPremium = await Plan.create({
      name: 'Premium',
      description: 'Get full access to priority discovery, location changes, unlimited likes, and profile boosts!',
      price: 499,
      durationDays: 30,
      isSystemPlan: true,
      isActive: true,
      features: [
        'Unlimited Likes',
        'Location Changes (Passport Mode)',
        'View Who Likes You',
        'Unlimited Rewinds',
        '1 Profile Boost per week',
        'Advanced Filters',
        'Priority Profile Visibility',
      ],
    });
    plans = [defaultPremium];
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

  let user = await User.findByIdAndUpdate(
    req.params.id,
    { isPremium: !!isPremium, premiumExpiry: expiryDate },
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

// @desc Create Razorpay Order for Subscription
// @route POST /api/subscriptions/create-order or /api/users/subscribe/create-order
// @access Private/User
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { planId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  let plan;
  if (planId) {
    plan = await Plan.findById(planId);
  }
  if (!plan) {
    plan = await Plan.findOne({ isActive: true });
  }
  if (!plan) {
    return res.status(404).json({ success: false, message: 'No active subscription plan found' });
  }

  const transactionId = razorpayService.generateTransactionId('TXN');
  const subscriptionId = razorpayService.generateTransactionId('SUB');
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Hemsely User';
  const userEmail = user.email || `${user.phoneNumber || userId}@hemsely.com`;
  const userPhone = user.phoneNumber || '';

  let razorpayOrder;
  const isConfigured = razorpayService.isConfigured();

  if (isConfigured) {
    try {
      razorpayOrder = await razorpayService.createOrder({
        amount: plan.price,
        receipt: transactionId,
        notes: {
          userId: String(user._id),
          userName,
          userEmail,
          userPhone,
          planId: String(plan._id),
          planName: plan.name,
          transactionId,
          subscriptionId,
        },
      });
    } catch (err) {
      console.warn('⚠️ Razorpay order creation warning:', err.message);
    }
  }

  const orderId = razorpayOrder?.id || `order_${Date.now()}`;
  const amountInPaise = Math.round(parseFloat(plan.price) * 100);

  // Save pending transaction record with end-to-end user & plan details
  const transaction = await Transaction.create({
    transactionId,
    subscriptionId,
    user: user._id,
    userName,
    userEmail,
    userPhone,
    plan: plan._id,
    planName: plan.name,
    durationDays: plan.durationDays || 30,
    amount: plan.price,
    currency: 'INR',
    status: 'pending',
    gateway: 'razorpay',
    gatewayOrderId: orderId,
  });

  const key = process.env.RAZORPAY_KEY_ID?.trim() || 'rzp_test_mockkey';

  res.status(200).json({
    success: true,
    orderId,
    amount: amountInPaise,
    currency: 'INR',
    key,
    transactionId,
    subscriptionId,
    userDetails: {
      name: userName,
      email: userEmail,
      phone: userPhone,
    },
    plan: {
      id: plan._id,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays || 30,
    },
    transaction,
  });
});

// @desc Verify Razorpay Payment Signature and Activate Premium
// @route POST /api/subscriptions/verify-payment or /api/users/subscribe/verify
// @access Private/User
export const verifyRazorpayPayment = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

  let transaction = await Transaction.findOne({
    $or: [
      { transactionId },
      { gatewayOrderId: razorpay_order_id },
    ],
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction record not found' });
  }

  if (String(transaction.user) !== String(userId)) {
    return res.status(403).json({ success: false, message: 'This transaction does not belong to you' });
  }

  const isConfigured = razorpayService.isConfigured();
  let isValid = false;

  if (isConfigured) {
    isValid = Boolean(razorpay_order_id && razorpay_payment_id && razorpay_signature) &&
      razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } else {
    // Development fallback for testing when live keys aren't set
    isValid = true;
  }

  if (!isValid) {
    transaction.status = 'failed';
    await transaction.save();
    return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
  }

  // Update transaction status to success
  transaction.status = 'success';
  transaction.gatewayPaymentId = razorpay_payment_id || `pay_${Date.now()}`;
  transaction.gatewaySignature = razorpay_signature || '';
  await transaction.save();

  // Activate Premium subscription for user
  const durationDays = transaction.durationDays || 30;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { isPremium: true, premiumExpiry: expiryDate },
    { new: true, runValidators: true }
  );

  if (userId) {
    await releaseFromQueue(userId);
  }

  // Create notification for user
  try {
    await Notification.create({
      user: userId,
      type: 'system',
      title: 'Premium Subscription Activated! 🎉',
      message: `Your ${transaction.planName || 'Premium'} subscription (${transaction.subscriptionId}) is active until ${expiryDate.toLocaleDateString()}.`,
    });
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: 'Payment verified and subscription activated successfully!',
    user: updatedUser,
    transaction,
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
      { id: 'left', count: 1, label: 'Boost', price: config.boostPrice1 ?? 199 },
      { id: 'right', count: 5, label: 'Boosts', price: config.boostPrice5 ?? 399 },
    ],
  });
});

// @desc Create Razorpay Order for Boost Package
// @route POST /api/subscriptions/boost/create-order or /api/users/boost/create-order
// @access Private/User
export const createBoostOrder = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { optionId } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const config = await getOrCreateConfig();
  const price1 = config.boostPrice1 ?? 199;
  const price5 = config.boostPrice5 ?? 399;

  const boostCountNum = optionId === 'left' ? 1 : 5;
  const boostPriceNum = optionId === 'left' ? price1 : price5;

  const transactionId = razorpayService.generateTransactionId('TXN');
  const subscriptionId = razorpayService.generateTransactionId('BST');
  const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Hemsely User';
  const userEmail = user.email || `${user.phoneNumber || userId}@hemsely.com`;
  const userPhone = user.phoneNumber || '';

  let razorpayOrder;
  const isConfigured = razorpayService.isConfigured();

  if (isConfigured) {
    try {
      razorpayOrder = await razorpayService.createOrder({
        amount: boostPriceNum,
        receipt: transactionId,
        notes: {
          userId: String(user._id),
          userName,
          userEmail,
          userPhone,
          planName: `${boostCountNum} Profile Boost${boostCountNum > 1 ? 's' : ''}`,
          transactionId,
          subscriptionId,
        },
      });
    } catch (err) {
      console.warn('⚠️ Razorpay order creation warning:', err.message);
    }
  }

  const orderId = razorpayOrder?.id || `order_boost_${Date.now()}`;
  const amountInPaise = Math.round(parseFloat(boostPriceNum) * 100);

  const transaction = await Transaction.create({
    transactionId,
    subscriptionId,
    user: user._id,
    userName,
    userEmail,
    userPhone,
    planName: `${boostCountNum} Profile Boost${boostCountNum > 1 ? 's' : ''}`,
    amount: boostPriceNum,
    currency: 'INR',
    status: 'pending',
    gateway: 'razorpay',
    gatewayOrderId: orderId,
  });

  const key = process.env.RAZORPAY_KEY_ID?.trim() || 'rzp_test_mockkey';

  res.status(200).json({
    success: true,
    orderId,
    amount: amountInPaise,
    currency: 'INR',
    key,
    transactionId,
    subscriptionId,
    boostCount: boostCountNum,
    price: boostPriceNum,
    userDetails: {
      name: userName,
      email: userEmail,
      phone: userPhone,
    },
    transaction,
  });
});

// @desc Verify Razorpay Payment Signature and Grant Boosts
// @route POST /api/subscriptions/boost/verify or /api/users/boost/verify
// @access Private/User
export const verifyBoostPayment = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

  let transaction = await Transaction.findOne({
    $or: [
      { transactionId },
      { gatewayOrderId: razorpay_order_id },
    ],
  });

  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction record not found' });
  }

  if (String(transaction.user) !== String(userId)) {
    return res.status(403).json({ success: false, message: 'This transaction does not belong to you' });
  }

  const isConfigured = razorpayService.isConfigured();
  let isValid = false;

  if (isConfigured) {
    isValid = Boolean(razorpay_order_id && razorpay_payment_id && razorpay_signature) &&
      razorpayService.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  } else {
    isValid = true;
  }

  if (!isValid) {
    transaction.status = 'failed';
    await transaction.save();
    return res.status(400).json({ success: false, message: 'Payment signature verification failed' });
  }

  transaction.status = 'success';
  transaction.gatewayPaymentId = razorpay_payment_id || `pay_${Date.now()}`;
  transaction.gatewaySignature = razorpay_signature || '';
  await transaction.save();

  // Derive the credited count from the amount actually paid for, never from client input.
  const boostInc = parseInt(transaction.planName, 10) || 1;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { boostCount: boostInc } },
    { new: true, runValidators: true }
  );

  try {
    await Notification.create({
      user: userId,
      type: 'system',
      title: 'Boost Package Purchased! 🚀',
      message: `You successfully added ${boostInc} Profile Boost(s) to your account.`,
    });
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: 'Boost payment verified and credits added successfully!',
    user: updatedUser,
    transaction,
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
      const expiry = txn.user?.premiumExpiry ? new Date(txn.user.premiumExpiry) : null;
      let remainingDays = 0;
      let isExpired = false;

      if (expiry) {
        const diffMs = expiry - now;
        remainingDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (remainingDays <= 0) isExpired = true;
      }

      userSubMap.set(userId, {
        _id: userId,
        user: typeof txn.user === 'object' ? txn.user : { _id: userId },
        subscriptionId: txn.subscriptionId || `SUB_${String(txn._id).slice(-8).toUpperCase()}`,
        transactionId: txn.transactionId || txn.gatewayPaymentId || String(txn._id),
        planName: txn.planName || txn.plan?.name || 'Premium',
        amount: txn.amount || 0,
        startDate: txn.createdAt,
        expiryDate: expiry || new Date(new Date(txn.createdAt).getTime() + (txn.durationDays || 30) * 86400000),
        remainingDays,
        isPremium: Boolean(txn.user?.isPremium) && !isExpired,
        isExpired: !txn.user?.isPremium || isExpired,
        gateway: txn.gateway || 'Razorpay',
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
