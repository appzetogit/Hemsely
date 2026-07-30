import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';

// @desc Create and "send" a notification (persists + records recipient count)
// @route POST /api/admin/notifications
// @access Private/Admin
export const sendNotification = asyncHandler(async (req, res) => {
  const { title, body, target, segment, targetUsers } = req.body;

  let recipientCount = 0;
  if (target === 'all') {
    recipientCount = await User.countDocuments({});
  } else if (target === 'segment') {
    const segmentQuery =
      segment === 'premium' ? { isPremium: true } :
      segment === 'inactive' ? { isActive: false } :
      { isPremium: false };
    recipientCount = await User.countDocuments(segmentQuery);
  } else if (target === 'user') {
    recipientCount = Array.isArray(targetUsers) ? targetUsers.length : 0;
  }

  const notification = await Notification.create({
    title,
    body,
    target,
    segment: segment || '',
    targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
    sentBy: req.admin.id,
    deliveryStats: { recipientCount },
  });

  await logAdminAction({
    adminId: req.admin.id,
    action: 'send_notification',
    targetType: 'Notification',
    targetId: notification._id,
    details: { target, recipientCount },
    ip: req.ip,
  });

  res.status(201).json({ success: true, message: 'Notification sent', notification });
});

// @desc Get notification send history
// @route GET /api/admin/notifications
// @access Private/Admin
export const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '15', 10), 1), 50);
  const skip = (page - 1) * limit;

  const [notifications, totalNotifications] = await Promise.all([
    Notification.find({})
      .populate('sentBy', 'firstName lastName username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({}),
  ]);

  res.status(200).json({
    success: true,
    notifications,
    pagination: {
      page,
      limit,
      totalNotifications,
      totalPages: Math.max(Math.ceil(totalNotifications / limit), 1),
    },
  });
});
