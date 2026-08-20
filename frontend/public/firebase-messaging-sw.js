// Service Worker for Firebase Cloud Messaging (Hemsely)
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA3PXEALXVYqAaFxBCPPBzFb1SLZ-3MUjY",
  authDomain: "hemsely-d2910.firebaseapp.com",
  projectId: "hemsely-d2910",
  storageBucket: "hemsely-d2910.firebasestorage.app",
  messagingSenderId: "919927932946",
  appId: "1:919927932946:web:dc4bb8f0cdc4c0aa04b0cb",
  measurementId: "G-2ZKKJT7TPQ"
});

// Activate this SW immediately instead of waiting for all tabs to close, so
// fixes here (like the dedup guard below) take effect on the next push
// rather than only after every open tab is closed and reopened.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

const messaging = firebase.messaging();

// Guard to prevent double notifications: tracks recently shown notification tags and content signatures
const recentlyShownTags = new Map();
const DEDUP_WINDOW_MS = 30000;

messaging.onBackgroundMessage(async (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const title = payload.notification?.title || payload.data?.title || 'Hemsely';
  const body = payload.notification?.body || payload.data?.body || '';
  const notifId = payload.data?.notificationId || payload.data?.tag || '';
  const tag = String(notifId || `${title}:${body}`);

  const now = Date.now();
  const lastShown = recentlyShownTags.get(tag);
  if (lastShown && now - lastShown < DEDUP_WINDOW_MS) {
    console.log('[firebase-messaging-sw.js] Duplicate suppressed for tag:', tag);
    return;
  }
  recentlyShownTags.set(tag, now);

  // Prune old entries so the map doesn't grow unbounded over the SW's life.
  for (const [key, ts] of recentlyShownTags) {
    if (now - ts > DEDUP_WINDOW_MS) recentlyShownTags.delete(key);
  }

  // If a tab is open, focused, and visible in foreground, the in-app foreground listener
  // (NotificationListener) already handles displaying the notification toast to the user.
  // Suppress background system popup to avoid duplicate notifications.
  try {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hasFocusedClient = windowClients.some(
      (client) => client.visibilityState === 'visible' && client.focused
    );
    if (hasFocusedClient) {
      console.log('[firebase-messaging-sw.js] Foreground tab is active; suppressing duplicate background OS notification.');
      return;
    }
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Window client check failed:', err);
  }

  try {
    const existing = await self.registration.getNotifications();
    const isAlreadyShown = existing.some(
      (n) => n.tag === tag || (n.title === title && n.body === body)
    );
    if (isAlreadyShown) {
      console.log('[firebase-messaging-sw.js] Notification already active in system tray, suppressing duplicate.');
      return;
    }
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Notification query check failed:', err);
  }

  const options = {
    body,
    icon: payload.notification?.image || payload.data?.image || '/icon.png',
    data: payload.data || {},
    tag,
    renotify: false,
  };

  self.registration.showNotification(title, options);
});

// Handle push notification click (opens target chat screen if user taps notification on mobile/desktop)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/chats';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
