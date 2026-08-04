import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * @desc Get notifications for logged in user
 * @route GET /api/notifications
 * @access Private
 */
export const getUserNotifications = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const skip = (page - 1) * limit;

  const user = await User.findById(userId).select('isPremium isPaused isActive').lean();
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Build target query matching user's profile status or broadcast
  const userSegment = user.isPremium ? 'premium' : 'free';
  const isInactive = user.isPaused || user.isActive === false;

  const query = {
    $or: [
      { recipientUserId: userId },
      { target: 'all' },
      { target: 'segment', segment: userSegment },
      { target: 'segment', segment: isInactive ? 'inactive' : '' },
      { target: 'user', targetUsers: userId },
    ],
  };

  const [notifications, totalNotifications, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ ...query, isRead: false }),
  ]);

  return res.status(200).json({
    success: true,
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      totalNotifications,
      totalPages: Math.max(Math.ceil(totalNotifications / limit), 1),
    },
  });
});

/**
 * @desc Get unread notification count for user
 * @route GET /api/notifications/unread-count
 * @access Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('isPremium isPaused isActive').lean();
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  const userSegment = user.isPremium ? 'premium' : 'free';
  const isInactive = user.isPaused || user.isActive === false;

  const query = {
    isRead: false,
    $or: [
      { recipientUserId: userId },
      { target: 'all' },
      { target: 'segment', segment: userSegment },
      { target: 'segment', segment: isInactive ? 'inactive' : '' },
      { target: 'user', targetUsers: userId },
    ],
  };

  const unreadCount = await Notification.countDocuments(query);
  return res.status(200).json({
    success: true,
    unreadCount,
  });
});

/**
 * @desc Mark a notification as read
 * @route PATCH /api/notifications/:id/read
 * @access Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const notification = await Notification.findById(id);

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  const user = await User.findById(userId).select('isPremium isPaused isActive').lean();
  const userSegment = user?.isPremium ? 'premium' : 'free';
  const isInactive = user?.isPaused || user?.isActive === false;

  const isVisibleToUser =
    String(notification.recipientUserId || '') === String(userId) ||
    notification.target === 'all' ||
    (notification.target === 'segment' && (notification.segment === userSegment || (isInactive && notification.segment === 'inactive'))) ||
    (notification.target === 'user' && (notification.targetUsers || []).some((u) => String(u) === String(userId)));

  if (!isVisibleToUser) {
    return res.status(403).json({ success: false, message: 'Not authorized to modify this notification' });
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    notification,
  });
});

/**
 * @desc Mark all notifications as read for logged in user
 * @route PATCH /api/notifications/read-all
 * @access Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).select('isPremium isPaused isActive').lean();

  const userSegment = user?.isPremium ? 'premium' : 'free';
  const isInactive = user?.isPaused || user?.isActive === false;

  const query = {
    isRead: false,
    $or: [
      { recipientUserId: userId },
      { target: 'all' },
      { target: 'segment', segment: userSegment },
      { target: 'segment', segment: isInactive ? 'inactive' : '' },
      { target: 'user', targetUsers: userId },
    ],
  };

  await Notification.updateMany(query, {
    $set: { isRead: true, readAt: new Date() },
  });

  return res.status(200).json({
    success: true,
    message: 'All notifications marked as read',
  });
});
