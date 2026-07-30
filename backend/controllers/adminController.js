import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { releaseFromQueue, getQueueAdminSnapshot } from '../utils/queueService.js';

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc Get paginated users for moderation
// @route GET /api/admin/users
// @access Private/Admin
export const getModerationUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '8', 10), 1), 50);
  const skip = (page - 1) * limit;
  const search = (req.query.search || '').trim();

  const query = {};

  if (search) {
    const safeSearch = escapeRegex(search).slice(0, 100);
    query.$or = [
      { firstName: { $regex: safeSearch, $options: 'i' } },
      { lastName: { $regex: safeSearch, $options: 'i' } },
      { email: { $regex: safeSearch, $options: 'i' } },
      { phoneNumber: { $regex: safeSearch, $options: 'i' } },
    ];
  }

  const [users, totalUsers] = await Promise.all([
    User.find(query)
      .select(
        'firstName lastName email phoneNumber profilePicture galleryImages isPremium premiumExpiry isVerified isActive isBanned banReason bannedAt createdAt age gender bio interests relationshipGoal education profession smokingStatus drinkingStatus location.address location.city location.state isSuperUser isSuperSubscriber selfiePhoto selfieStatus accessStatus queuedAt'
      )
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  const normalizedUsers = users.map((user) => ({
    ...user.toObject(),
    subscriptionName: user.isPremium ? 'Premium' : 'Free',
  }));

  res.status(200).json({
    success: true,
    users: normalizedUsers,
    pagination: {
      page,
      limit,
      totalUsers,
      totalPages: Math.max(Math.ceil(totalUsers / limit), 1),
    },
  });
});

// @desc Ban a user
// @route PATCH /api/admin/users/:id/ban
// @access Private/Admin
export const banUser = asyncHandler(async (req, res) => {
  const reason = (req.body.reason || 'Banned by admin').trim();

  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.isBanned = true;
  user.banReason = reason;
  user.bannedAt = new Date();
  user.bannedBy = req.admin?.id || null;
  user.isActive = false;

  await user.save();

  await logAdminAction({
    adminId: req.admin.id,
    action: 'ban_user',
    targetType: 'User',
    targetId: user._id,
    details: { reason },
    ip: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'User banned successfully',
    user,
  });
});

// @desc Unban a user
// @route PATCH /api/admin/users/:id/unban
// @access Private/Admin
export const unbanUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User not found',
    });
  }

  user.isBanned = false;
  user.banReason = '';
  user.bannedAt = null;
  user.bannedBy = null;
  user.isActive = true;

  await user.save();

  await logAdminAction({
    adminId: req.admin.id,
    action: 'unban_user',
    targetType: 'User',
    targetId: user._id,
    ip: req.ip,
  });

  res.status(200).json({
    success: true,
    message: 'User unbanned successfully',
    user,
  });
});

// @desc List selfie verification submissions (defaults to pending queue)
// @route GET /api/admin/selfie-verifications
// @access Private/Admin
export const getSelfieVerifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 50);
  const skip = (page - 1) * limit;
  const status = req.query.status || 'pending';

  const query = status === 'all' ? { selfieStatus: { $ne: 'not_submitted' } } : { selfieStatus: status };

  const [users, total] = await Promise.all([
    User.find(query)
      .select('firstName lastName phoneNumber profilePicture selfiePhoto selfieStatus selfieRejectionReason selfieReviewedAt createdAt')
      .populate('selfieReviewedBy', 'firstName lastName username')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    users,
    pagination: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
  });
});

// @desc Approve or reject a user's selfie verification submission
// @route PATCH /api/admin/selfie-verifications/:id
// @access Private/Admin
export const reviewSelfieVerification = asyncHandler(async (req, res) => {
  const { approve, rejectionReason } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (user.selfieStatus !== 'pending') {
    return res.status(400).json({ success: false, message: 'This selfie has already been reviewed' });
  }

  user.selfieStatus = approve ? 'approved' : 'rejected';
  user.selfieReviewedBy = req.admin.id;
  user.selfieReviewedAt = new Date();
  user.selfieRejectionReason = approve ? '' : (rejectionReason || 'Did not pass manual review');
  if (approve) {
    user.isVerified = true;
  }
  await user.save();

  await logAdminAction({
    adminId: req.admin.id,
    action: approve ? 'approve_selfie' : 'reject_selfie',
    targetType: 'User',
    targetId: user._id,
    ip: req.ip,
  });

  res.status(200).json({
    success: true,
    message: approve ? 'Selfie approved — user is now verified' : 'Selfie rejected',
    user,
  });
});

// @desc Grant or revoke Super User / Super Subscriber admin-assigned status
// @route PATCH /api/admin/users/:id/status
// @access Private/Admin
export const setUserStatus = asyncHandler(async (req, res) => {
  const { isSuperUser, isSuperSubscriber } = req.body;

  const updates = {};
  if (isSuperUser !== undefined) updates.isSuperUser = !!isSuperUser;
  if (isSuperSubscriber !== undefined) updates.isSuperSubscriber = !!isSuperSubscriber;

  let user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  if (updates.isSuperUser || updates.isSuperSubscriber) {
    await releaseFromQueue(user._id);
    user = await User.findById(user._id);
  }

  await logAdminAction({
    adminId: req.admin.id,
    action: 'set_user_status',
    targetType: 'User',
    targetId: user._id,
    details: updates,
    ip: req.ip,
  });

  res.status(200).json({ success: true, message: 'User status updated', user });
});

// @desc Get a snapshot of gender-ratio queue health (active/queued counts, current ratio)
// @route GET /api/admin/queue-status
// @access Private/Admin
export const getQueueStatusSnapshot = asyncHandler(async (req, res) => {
  const snapshot = await getQueueAdminSnapshot();
  res.status(200).json({ success: true, ...snapshot });
});
