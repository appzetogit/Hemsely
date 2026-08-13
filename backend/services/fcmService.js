import adminModule from 'firebase-admin';
import { getMessaging } from 'firebase-admin/messaging';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { ensureFirebaseAdminApp } from '../config/firebaseAdminInit.js';

// firebase-admin v14's default export is flat and has no `.apps` array — use
// getApps() instead (see config/firebaseAdminInit.js for the same fix).
const admin = adminModule.default || adminModule;

let fcmInitialized = false;

/**
 * Initialize Firebase Admin default app for FCM
 */
export function initializeFcm() {
  if (fcmInitialized && admin.getApps().length > 0) return true;
  const ok = ensureFirebaseAdminApp();
  if (ok) {
    fcmInitialized = true;
    console.log('✅ FCM: Firebase Admin ready for messaging');
  }
  return ok;
}

/**
 * Determine schema field by platform:
 * - web -> fcmtokenweb
 * - android / mobile -> fcmtokenmobile
 * - ios -> fcmtokenios
 */
export function getFieldByPlatform(platform) {
  const p = (platform || 'web').toLowerCase();
  if (p === 'ios') return 'fcmtokenios';
  if (p === 'android' || p === 'mobile') return 'fcmtokenmobile';
  return 'fcmtokenweb';
}

/**
 * Save or update FCM token for a user based on platform
 */
export async function saveFcmToken({ userId, fcmToken, platform = 'web' }) {
  if (!userId || !fcmToken) {
    throw new Error('userId and fcmToken are required');
  }

  const objectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const updateField = getFieldByPlatform(platform);
  const updateDoc = { [updateField]: fcmToken.trim() };

  console.log(`💾 [FCM] Saving token for user ${userId}... (platform: ${platform}, field: ${updateField})`);

  const result = await User.findByIdAndUpdate(
    objectId,
    { $set: updateDoc },
    { new: true, runValidators: true }
  );

  if (!result) {
    throw new Error('User not found');
  }

  console.log(`✅ [FCM] Token saved successfully to ${updateField} for User ${result._id}`);
  return result;
}

/**
 * Remove FCM token on logout or invalidation
 */
export async function removeFcmToken(fcmToken) {
  if (!fcmToken) return;

  const tokenStr = String(fcmToken).trim();
  const doc = await User.findOne({
    $or: [
      { fcmtokenweb: tokenStr },
      { fcmtokenmobile: tokenStr },
      { fcmtokenios: tokenStr },
    ],
  });

  if (doc) {
    if (doc.fcmtokenweb === tokenStr) doc.fcmtokenweb = null;
    if (doc.fcmtokenmobile === tokenStr) doc.fcmtokenmobile = null;
    if (doc.fcmtokenios === tokenStr) doc.fcmtokenios = null;
    await doc.save();
    console.log(`✅ [FCM] Token removed from User ${doc._id}`);
  }
}

/**
 * Get all active FCM tokens for a user
 */
export async function getTokensForUser(userId) {
  if (!userId) return [];

  const objectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const doc = await User.findById(objectId)
    .select('fcmtokenweb fcmtokenmobile fcmtokenios')
    .lean();

  if (!doc) {
    console.warn(`⚠️ [FCM] No User found with ID ${userId}`);
    return [];
  }

  const tokens = [];
  if (doc.fcmtokenweb) tokens.push(String(doc.fcmtokenweb));
  if (doc.fcmtokenmobile) tokens.push(String(doc.fcmtokenmobile));
  if (doc.fcmtokenios) tokens.push(String(doc.fcmtokenios));

  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  return uniqueTokens;
}

/**
 * Send FCM notification to device(s)
 * @param {string|string[]} tokens - FCM token(s)
 * @param {object} notification - { title, body }
 * @param {object} data - optional data payload
 */
export async function sendNotification(tokens, notification, data = {}) {
  if (!initializeFcm()) {
    return { success: false, error: 'FCM not initialized' };
  }

  const tokenArrayRaw = Array.isArray(tokens) ? tokens : [tokens];
  const tokenArray = Array.from(
    new Set(tokenArrayRaw.map((t) => String(t || '').trim()).filter(Boolean))
  );

  if (tokenArray.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  const dataWithTag = { ...data };
  if (!dataWithTag.tag) {
    dataWithTag.tag = dataWithTag.notificationId || Date.now().toString();
  }

  const imageUrl = dataWithTag.image || null;

  const notificationObj = {
    title: notification.title || 'Hemsely Notification',
    body: notification.body || '',
  };
  if (imageUrl) {
    notificationObj.image = imageUrl;
  }

  // Web display is data-only (see message.webpush below) — the service
  // worker reads title/body from `data`, so they must travel here too.
  dataWithTag.title = notificationObj.title;
  dataWithTag.body = notificationObj.body;
  if (imageUrl) dataWithTag.image = imageUrl;

  const androidConfig = {
    priority: 'high',
    notification: {
      title: notificationObj.title,
      body: notificationObj.body,
      sound: dataWithTag.sound ? String(dataWithTag.sound) : 'default',
      ...(dataWithTag.channelId && { channelId: String(dataWithTag.channelId) }),
      ...(imageUrl && { imageUrl }),
    },
  };

  const apnsSound = dataWithTag.sound ? String(dataWithTag.sound) : 'default';
  const apnsConfig = {
    payload: {
      aps: {
        alert: { title: notificationObj.title, body: notificationObj.body },
        sound: apnsSound,
        ...(imageUrl && { 'mutable-content': 1 }),
      },
    },
  };
  if (imageUrl) {
    apnsConfig.payload.imageUrl = imageUrl;
  }

  // No top-level `notification` and no `webpush.notification`: on web, either
  // one makes the browser auto-display a system notification, while our
  // service worker's onBackgroundMessage ALSO calls showNotification() from
  // `data` — together that's 2 notifications for 1 push. Android/iOS get
  // their display payload from android.notification / apns.payload.aps.alert
  // above instead.
  const message = {
    data: Object.fromEntries(
      Object.entries(dataWithTag).map(([k, v]) => [String(k), String(v)])
    ),
    tokens: tokenArray,
    android: androidConfig,
    apns: apnsConfig,
    webpush: {
      headers: { Urgency: 'high' },
    },
  };

  try {
    console.log(`📤 [FCM] Sending notification: "${notificationObj.title}" - "${notificationObj.body}" to ${tokenArray.length} token(s)`);

    const messaging = getMessaging();
    const sendFn =
      typeof messaging.sendEachForMulticast === 'function'
        ? messaging.sendEachForMulticast.bind(messaging)
        : typeof messaging.sendMulticast === 'function'
        ? messaging.sendMulticast.bind(messaging)
        : null;

    let response = null;
    const invalidTokens = [];

    if (sendFn) {
      try {
        response = await sendFn(message);
      } catch (multicastErr) {
        console.warn('⚠️ [FCM] Multicast failed, falling back to per-token send():', multicastErr.message);

        const baseMessage = { ...message };
        delete baseMessage.tokens;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < tokenArray.length; i++) {
          const token = tokenArray[i];
          try {
            await messaging.send({ ...baseMessage, token });
            successCount++;
          } catch (err) {
            failureCount++;
            const code = err?.errorInfo?.code || err?.code;
            if (
              code === 'messaging/invalid-registration-token' ||
              code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(token);
            }
          }
        }

        response = {
          successCount,
          failureCount,
          responses: [],
          __invalidTokens: invalidTokens,
        };
      }
    } else {
      const baseMessage = { ...message };
      delete baseMessage.tokens;
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < tokenArray.length; i++) {
        const token = tokenArray[i];
        try {
          await messaging.send({ ...baseMessage, token });
          successCount++;
        } catch (err) {
          failureCount++;
          const code = err?.errorInfo?.code || err?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(token);
          }
        }
      }
      response = {
        successCount,
        failureCount,
        responses: [],
        __invalidTokens: invalidTokens,
      };
    }

    if (Array.isArray(response.responses)) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered'
          ) {
            invalidTokens.push(tokenArray[idx]);
          }
        }
      });
    }

    // Clean up invalid tokens from User model
    if (invalidTokens.length > 0) {
      console.log(`🧹 [FCM] Cleaning up ${invalidTokens.length} invalid FCM token(s)`);
      await User.updateMany(
        { fcmtokenweb: { $in: invalidTokens } },
        { $set: { fcmtokenweb: null } }
      );
      await User.updateMany(
        { fcmtokenmobile: { $in: invalidTokens } },
        { $set: { fcmtokenmobile: null } }
      );
      await User.updateMany(
        { fcmtokenios: { $in: invalidTokens } },
        { $set: { fcmtokenios: null } }
      );
    }

    console.log(`📊 [FCM] Result: ${response.successCount} succeeded, ${response.failureCount} failed`);

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokensRemoved: invalidTokens.length,
    };
  } catch (err) {
    console.error('❌ [FCM] Send error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send notification to a specific user by userId
 */
export async function sendToUser(userId, notification, data = {}) {
  const tokens = await getTokensForUser(userId);
  if (tokens.length === 0) {
    console.warn(`⚠️ [FCM] No tokens found for user ${userId}`);
    return { success: false, error: 'No FCM tokens found for user' };
  }
  return sendNotification(tokens, notification, data);
}
