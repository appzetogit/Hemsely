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

// ponytail: some browsers redeliver/double-fire the 'push' event for the same
// message (or the SDK invokes this handler twice internally on certain
// versions) which showed the same notification twice. Guard by tag so a
// repeat within a short window is dropped instead of re-shown. Ceiling: the
// Map is per-SW-lifetime (resets if the SW is terminated), fine for this
// use case since duplicates arrive within milliseconds of each other.
const recentlyShownTags = new Map();
const DEDUP_WINDOW_MS = 15000;

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const tag = payload.data?.tag || payload.data?.notificationId || 'hemsely-push';
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

  const title = payload.notification?.title || payload.data?.title || 'Hemsely';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.image || payload.data?.image || '/icon.png',
    data: payload.data || {},
    tag,
  };

  self.registration.showNotification(title, options);
});
