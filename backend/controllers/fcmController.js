import { asyncHandler } from '../middleware/errorHandler.js';
import { saveFcmToken, removeFcmToken, sendToUser, sendNotification, getTokensForUser } from '../services/fcmService.js';
import User from '../models/User.js';

/**
 * @desc Register or update FCM token
 * @route POST /api/fcm/register-token
 * @access Private
 */
export const registerToken = asyncHandler(async (req, res) => {
  const { fcmToken, platform = 'web' } = req.body || {};

  if (!fcmToken || typeof fcmToken !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'fcmToken is required and must be a string',
    });
  }

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required to register FCM token',
    });
  }

  const user = await saveFcmToken({
    userId,
    fcmToken: fcmToken.trim(),
    platform: String(platform || 'web').toLowerCase(),
  });

  return res.status(200).json({
    success: true,
    message: 'FCM token registered successfully',
    data: {
      userId: user._id,
      platform,
      hasWebToken: Boolean(user.fcmtokenweb),
      hasMobileToken: Boolean(user.fcmtokenmobile),
      hasIosToken: Boolean(user.fcmtokenios),
    },
  });
});

/**
 * @desc Remove FCM token (e.g. on logout)
 * @route POST /api/fcm/remove-token
 * @access Public (or Private)
 */
export const unregisterToken = asyncHandler(async (req, res) => {
  const { fcmToken } = req.body || {};

  if (!fcmToken) {
    return res.status(400).json({
      success: false,
      message: 'fcmToken is required',
    });
  }

  await removeFcmToken(fcmToken);

  return res.status(200).json({
    success: true,
    message: 'FCM token removed successfully',
  });
});

/**
 * @desc Send test push notification
 * @route POST /api/fcm/test
 * @access Private
 */
export const sendTestNotification = asyncHandler(async (req, res) => {
  const { title, body, fcmToken } = req.body || {};
  // Test notifications may only target the caller's own registered devices -
  // this endpoint is for a user to verify their own push setup, not to message others.
  const userId = req.user?.id || req.user?._id;

  const notification = {
    title: title || 'Hemsely Test Notification',
    body: body || 'Push notifications are working end-to-end!',
  };

  const data = {
    type: 'test_notification',
    timestamp: new Date().toISOString(),
  };

  let result;
  if (fcmToken) {
    const ownedTokens = await getTokensForUser(userId);
    if (!ownedTokens.includes(String(fcmToken))) {
      return res.status(403).json({
        success: false,
        message: 'You can only send a test notification to a device registered to your own account',
      });
    }
    result = await sendNotification([fcmToken], notification, data);
  } else if (userId) {
    result = await sendToUser(userId, notification, data);
  } else {
    return res.status(400).json({
      success: false,
      message: 'Authentication required for test notification',
    });
  }

  return res.status(200).json({
    success: result.success,
    message: result.success ? 'Test notification sent' : 'Test notification failed',
    result,
  });
});
