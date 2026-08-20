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

  const tokenStr = fcmToken.trim();
  const objectId = mongoose.Types.ObjectId.isValid(userId)
    ? new mongoose.Types.ObjectId(userId)
    : userId;

  const updateField = getFieldByPlatform(platform);

  console.log(`💾 [FCM] Saving token for user ${userId}... (platform: ${platform}, field: ${updateField})`);

  // Clean up this token if it exists anywhere across any user account
  // to ensure a single token is never attached to multiple accounts/fields.
  await Promise.all([
    User.updateMany({ fcmtokenweb: tokenStr }, { $set: { fcmtokenweb: null } }),
    User.updateMany({ fcmtokenmobile: tokenStr }, { $set: { fcmtokenmobile: null } }),
    User.updateMany({ fcmtokenios: tokenStr }, { $set: { fcmtokenios: null } }),
  ]);

  const result = await User.findByIdAndUpdate(
    objectId,
    { $set: { [updateField]: tokenStr } },
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
  await Promise.all([
    User.updateMany({ fcmtokenweb: tokenStr }, { $set: { fcmtokenweb: null } }),
    User.updateMany({ fcmtokenmobile: tokenStr }, { $set: { fcmtokenmobile: null } }),
    User.updateMany({ fcmtokenios: tokenStr }, { $set: { fcmtokenios: null } }),
  ]);
  console.log(`✅ [FCM] Token cleanup completed for token`);
}

/**
 * Get the active primary FCM token for a user.
 * Priority: Native mobile/android/ios token first, then web token fallback.
 * Guarantees exactly 1 token is returned per user account to prevent duplicate pushes.
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

  // Primary selection: mobile/ios takes precedence over web to avoid double alerts on phone
  const primaryToken = doc.fcmtokenmobile || doc.fcmtokenios || doc.fcmtokenweb;
  if (!primaryToken) return [];

  return [String(primaryToken).trim()];
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
  const tag = String(dataWithTag.tag || dataWithTag.notificationId || `hemsely_notif_${Date.now()}`);
  dataWithTag.tag = tag;

  const imageUrl = dataWithTag.image || null;

  const notificationObj = {
    title: notification.title || 'Hemsely Notification',
    body: notification.body || '',
  };

  // Title/body/image must also be in the data payload so the service worker
  // can read them to build the notification display.
  dataWithTag.title = notificationObj.title;
  dataWithTag.body = notificationObj.body;
  if (imageUrl) dataWithTag.image = imageUrl;

  // ─── WHY DATA-ONLY? ───────────────────────────────────────────────────────
  // firebase-messaging-compat.js (used in the service worker) has a well-known
  // double-notification bug:
  //   1. If the FCM message contains an android.notification block, Android
  //      system layer auto-shows notification #1 without any app code running.
  //   2. Then firebase-messaging-compat.js fires onBackgroundMessage which
  //      our handler uses to call showNotification() → notification #2.
  // Result: user sees the SAME push twice.
  //
  // Fix: send a pure data-only message (no notification block anywhere).
  //   • Android OS: receives data push, does NOT auto-display anything.
  //   • firebase-messaging-compat.js SW: fires onBackgroundMessage ONCE.
  //   • Our handler calls showNotification() exactly once → 1 notification.
  // ─────────────────────────────────────────────────────────────────────────
  const webpushTopic = tag.replace(/[^a-zA-Z0-9\-_]/g, '').substring(0, 32) || 'hemsely';
  const message = {
    data: Object.fromEntries(
      Object.entries(dataWithTag).map(([k, v]) => [String(k), String(v)])
    ),
    tokens: tokenArray,
    android: {
      priority: 'high',   // Required for data-only to wake device in Doze mode
      collapseKey: tag,   // FCM drops older pushes with same key on server side
      // NO android.notification → Android system will NOT auto-show anything
    },
    apns: {
      headers: {
        'apns-priority': '10',
        'apns-collapse-id': tag.substring(0, 64),
        'apns-push-type': 'background',
      },
      payload: {
        aps: {
          'content-available': 1,
          // NO alert → iOS will NOT auto-show anything
        },
      },
    },
    webpush: {
      headers: {
        Urgency: 'high',
        Topic: webpushTopic,  // Browser collapses repeated pushes server-side
      },
      // NO webpush.notification → browser will NOT auto-show anything
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
