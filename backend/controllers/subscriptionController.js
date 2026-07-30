import Plan from '../models/Plan.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseFromQueue } from '../utils/queueService.js';

// @desc List all plans
// @route GET /api/admin/subscriptions/plans
// @access Private/Admin
export const getPlans = asyncHandler(async (req, res) => {
  let plans = await Plan.find({}).sort({ price: 1 });
  const hasOldPlans = plans.some((p) => ['Weekly Lite', 'Monthly', '3 Months VIP'].includes(p.name));
  const targetFeatures = [
    'Unlimited Likes',
    'Location Changes (Passport Mode)',
    'View Who Likes You',
    'Unlimited Rewinds',
    '1 Profile Boost per week',
    'Advanced Filters',
    'Priority Profile Visibility',
  ];

  if (plans.length === 0 || hasOldPlans) {
    await Plan.deleteMany({});
    const defaultPremium = await Plan.create({
      name: 'Premium',
      description: 'Get full access to priority discovery, location changes, unlimited likes, and profile boosts!',
      price: 499,
      durationDays: 30,
      isSystemPlan: true,
      isActive: true,
      features: targetFeatures,
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

  let user = await User.findByIdAndUpdate(
    req.params.id,
    { isPremium: !!isPremium, premiumExpiry: isPremium ? premiumExpiry || null : null },
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

// @desc Subscribe to plan (user side)
// @route POST /api/users/subscribe
// @access Private/User
export const subscribeUserToPlan = asyncHandler(async (req, res) => {
  const userId = req.user?._id || req.user?.id;
  const { planId } = req.body;

  let plan;
  if (planId) {
    plan = await Plan.findById(planId);
  }
  if (!plan) {
    plan = await Plan.findOne({ isActive: true });
  }

  if (!plan) {
    return res.status(404).json({ success: false, message: 'No active plan found' });
  }

  const durationDays = plan.durationDays || 30;
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

  res.status(200).json({
    success: true,
    message: `Subscribed to ${plan.name} successfully!`,
    user: updatedUser,
    plan,
  });
});
