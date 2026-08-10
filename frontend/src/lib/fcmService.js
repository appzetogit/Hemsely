import { app } from './firebase.js';
import { API_BASE_URL, apiClient } from '../shared/services/apiClient.js';

let messagingInstance = null;

/**
 * Lazy loads Firebase messaging instance if supported in browser environment
 */
async function getMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FCM] Firebase Messaging is not supported in this browser context.');
      return null;
    }
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.error('[FCM] Failed to initialize Firebase Messaging:', err.message);
    return null;
  }
}

/**
 * Get VAPID key from environment variables
 */
function getVapidKey() {
  return (
    import.meta.env.VITE_FIREBASE_VAPID_KEY ||
    "BLb3uNSRqbFp0QiMAu3rE1KQq6yz42fsy9CmUA6GovE4HAiJT-p73faEqhRyFH2PrPWrEHira-9rcn70mr5JKK0"
  );
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<string|null>} FCM token string or null
 */
export async function getFcmToken() {
  try {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('[FCM] Notification API is not available.');
      return null;
    }

    if (Notification.permission === 'denied') {
      console.warn('[FCM] Notification permission was denied by user.');
      return null;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[FCM] Notification permission request denied.');
        return null;
      }
    }

    const messaging = await getMessaging();
    if (!messaging) return null;

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.warn('[FCM] VAPID key is missing.');
      return null;
    }

    const { getToken } = await import('firebase/messaging');

    let serviceWorkerRegistration;
    if ('serviceWorker' in navigator) {
      serviceWorkerRegistration = await navigator.serviceWorker.register(
        '/firebase-messaging-sw.js'
      );
      await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey,
      ...(serviceWorkerRegistration ? { serviceWorkerRegistration } : {}),
    });

    if (token) {
      console.log('✅ [FCM] FCM Token generated successfully:', token.substring(0, 20) + '...');
      return token;
    }

    return null;
  } catch (err) {
    console.warn('[FCM] getFcmToken failed:', err?.message || err);
    return null;
  }
}

/**
 * Register FCM token with Hemsely backend
 * @param {string} tokenOrAuthToken - JWT token or provided FCM token
 * @param {object} options - { fcmToken?, platform?: 'web'|'android'|'ios' }
 */
export async function registerFcmToken(tokenOrAuthToken, options = {}) {
  try {
    const providedFcmToken = options.fcmToken;
    const platform = options.platform || 'web';

    // Get Auth token from argument, sessionStorage, or localStorage
    const jwtToken =
      typeof tokenOrAuthToken === 'string' && !providedFcmToken
        ? tokenOrAuthToken
        : sessionStorage.getItem('token') ||
          localStorage.getItem('token') ||
          sessionStorage.getItem('authToken') ||
          localStorage.getItem('authToken');

    if (!jwtToken) {
      // User is not authenticated; skip registering FCM token with backend
      return;
    }

    const fcmToken = providedFcmToken || (await getFcmToken());
    if (!fcmToken) return;

    const customHeaders = { Authorization: `Bearer ${jwtToken}` };

    const { data } = await apiClient.request('/fcm/register-token', {
      method: 'POST',
      headers: customHeaders,
      body: JSON.stringify({
        fcmToken,
        platform,
      }),
    });

    if (data && data.success) {
      console.log('✅ [FCM] Registered token with backend successfully');
    } else {
      console.warn('⚠️ [FCM] Backend token registration message:', data?.message || 'Failed');
    }
  } catch (err) {
    console.warn('[FCM] Failed to register token with backend:', err.message);
  }
}

/**
 * Register Native FCM token (for Mobile Apps / Flutter / React Native)
 */
export async function registerNativeFcmToken(jwtToken, nativeFcmToken, platform = 'android') {
  if (!nativeFcmToken) return;
  return registerFcmToken(jwtToken, {
    fcmToken: nativeFcmToken,
    platform: platform === 'ios' ? 'ios' : 'mobile',
  });
}

/**
 * Remove FCM token on logout
 */
export async function removeFcmToken(customFcmToken = null) {
  try {
    const fcmToken = customFcmToken || (await getFcmToken());
    if (!fcmToken) return;

    await apiClient.request('/fcm/remove-token', {
      method: 'POST',
      body: JSON.stringify({ fcmToken }),
    });
    console.log('✅ [FCM] Token removed on logout');
  } catch (err) {
    console.warn('[FCM] Failed to remove token on logout:', err.message);
  }
}

/**
 * Set up foreground message listener
 * @param {Function} callback - Callback function (payload) => void
 * @returns {Promise<Function>} Cleanup function
 */
export async function onForegroundMessage(callback) {
  try {
    const messaging = await getMessaging();
    if (!messaging) return () => {};

    const { onMessage } = await import('firebase/messaging');

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('🔔 [FCM] Foreground notification received:', payload);
      if (typeof callback === 'function') {
        callback(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[FCM] Error setting up foreground message listener:', err.message);
    return () => {};
  }
}
