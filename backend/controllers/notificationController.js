import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { logAdminAction } from '../utils/auditLog.js';
import { sendNotification as sendFcmPushNotification } from '../services/fcmService.js';
import { stripAllHtml } from '../utils/sanitize.js';

// In-memory guard to prevent duplicate concurrent or rapid double-submissions of the same broadcast
const recentBroadcastLocks = new Map();
const BROADCAST_DEDUP_WINDOW_MS = 5000;

/**
 * @desc Create and send push notification to targeted audience with real FCM dispatch
 * @route POST /api/admin/notifications
 * @access Private/Admin
 */
export const sendNotification = asyncHandler(async (req, res) => {
  let { title, body } = req.body || {};
  const { target = 'all', segment = '', targetUsers = [] } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({
      success: false,
      message: 'Title and body are required',
    });
  }

  title = stripAllHtml(title);
  body = stripAllHtml(body);

  const adminId = String(req.admin?.id || req.admin?._id || 'admin');
  const dedupKey = `${adminId}:${title}:${body}:${target}:${segment}`;
  const now = Date.now();
  const lastSentTime = recentBroadcastLocks.get(dedupKey);

  if (lastSentTime && now - lastSentTime < BROADCAST_DEDUP_WINDOW_MS) {
    return res.status(429).json({
      success: false,
      message: 'A duplicate notification was just sent. Please wait a few seconds before resending.',
    });
  }
  recentBroadcastLocks.set(dedupKey, now);

  // Prune expired entries
  for (const [key, time] of recentBroadcastLocks.entries()) {
    if (now - time > BROADCAST_DEDUP_WINDOW_MS) recentBroadcastLocks.delete(key);
  }

  // Build target query based on selected audience
  let userQuery = { isBanned: { $ne: true } };

  if (target === 'all') {
    userQuery = { isBanned: { $ne: true } };
  } else if (target === 'segment') {
    if (segment === 'premium') {
      userQuery = { isPremium: true, isBanned: { $ne: true } };
    } else if (segment === 'inactive') {
      userQuery = { $or: [{ isPaused: true }, { isActive: false }], isBanned: { $ne: true } };
    } else if (segment === 'free') {
      userQuery = { isPremium: false, isBanned: { $ne: true } };
    }
  } else if (target === 'user') {
    const validIds = Array.isArray(targetUsers) ? targetUsers.filter(Boolean) : [];
    userQuery = { _id: { $in: validIds }, isBanned: { $ne: true } };
  }

  // Find matching users and extract single primary FCM token per recipient
  const targetUserDocs = await User.find(userQuery).select('_id fcmtokenweb fcmtokenmobile fcmtokenios').lean();
  const recipientCount = targetUserDocs.length;

  const fcmTokens = [];
  targetUserDocs.forEach((u) => {
    // Select exactly 1 primary token per user account: Mobile/iOS first, then Web fallback
    const primaryToken = u.fcmtokenmobile || u.fcmtokenios || u.fcmtokenweb;
    if (primaryToken) {
      fcmTokens.push(String(primaryToken).trim());
    }
  });

  const uniqueTokens = Array.from(new Set(fcmTokens.filter(Boolean)));

  // Dispatch real FCM Push Notifications via Firebase Admin SDK
  let fcmResult = { success: false, successCount: 0, failureCount: 0, invalidTokensRemoved: 0 };
  if (uniqueTokens.length > 0) {
    fcmResult = await sendFcmPushNotification(
      uniqueTokens,
      { title, body },
      { type: 'admin_broadcast', tag: `admin_notif_${Date.now()}` }
    );
  }

  const notification = await Notification.create({
    title,
    body,
    target,
    segment: segment || '',
    targetUsers: Array.isArray(targetUsers) ? targetUsers : [],
    sentBy: req.admin?.id || req.admin?._id,
    deliveryStats: {
      recipientCount,
      successCount: fcmResult.successCount || 0,
      failureCount: fcmResult.failureCount || 0,
      invalidTokensRemoved: fcmResult.invalidTokensRemoved || 0,
    },
    type: 'broadcast',
  });

  await logAdminAction({
    adminId: req.admin?.id || req.admin?._id,
    action: 'send_notification',
    targetType: 'Notification',
    targetId: notification._id,
    details: {
      target,
      segment,
      recipientCount,
      tokensCount: uniqueTokens.length,
      successCount: fcmResult.successCount || 0,
    },
    ip: req.ip,
  });

  return res.status(201).json({
    success: true,
    message: fcmResult.successCount > 0
      ? `Notification sent to ${fcmResult.successCount} device(s) (${recipientCount} recipient users)`
      : `Notification saved (${recipientCount} recipient users)`,
    notification,
    fcmResult,
  });
});

/**
 * @desc Get notification send history for Admin Panel
 * @route GET /api/admin/notifications
 * @access Private/Admin
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '15', 10), 1), 50);
  const skip = (page - 1) * limit;

  const query = {
    $or: [{ recipientUserId: null }, { recipientUserId: { $exists: false } }],
  };

  let notifications = [];
  let totalNotifications = 0;
  let broadcastCount = 0;

  try {
    [notifications, totalNotifications, broadcastCount] = await Promise.all([
      Notification.find(query)
        .populate({
          path: 'sentBy',
          select: 'firstName lastName username',
          strictPopulate: false,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, target: 'all' }),
    ]);
  } catch (err) {
    console.warn('⚠️ [getNotifications] Populate fallback triggered:', err.message);
    [notifications, totalNotifications, broadcastCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ ...query, target: 'all' }),
    ]);
  }

  // Ensure sentBy is safely formatted as object or null even if populate returned null/string
  const sanitizedNotifications = (notifications || []).map((n) => {
    if (n.sentBy && typeof n.sentBy === 'object') {
      return n;
    }
    return { ...n, sentBy: null };
  });

  return res.status(200).json({
    success: true,
    notifications: sanitizedNotifications,
    counts: {
      total: totalNotifications || 0,
      broadcast: broadcastCount || 0,
      targeted: Math.max(0, (totalNotifications || 0) - (broadcastCount || 0)),
    },
    pagination: {
      page,
      limit,
      totalNotifications: totalNotifications || 0,
      totalPages: Math.max(Math.ceil((totalNotifications || 0) / limit), 1),
    },
  });
});

/**
 * @desc Delete notification record from history
 * @route DELETE /api/admin/notifications/:id
 * @access Private/Admin
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findById(id);

  if (!notification) {
    return res.status(404).json({
      success: false,
      message: 'Notification record not found',
    });
  }

  await notification.deleteOne();

  await logAdminAction({
    adminId: req.admin?.id || req.admin?._id,
    action: 'delete_notification',
    targetType: 'Notification',
    targetId: id,
    ip: req.ip,
  });

  return res.status(200).json({
    success: true,
    message: 'Notification history record deleted successfully',
  });
});
