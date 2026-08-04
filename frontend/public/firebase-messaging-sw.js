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

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'Hemsely';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: payload.notification?.image || payload.data?.image || '/icon.png',
    data: payload.data || {},
    tag: payload.data?.tag || payload.data?.notificationId || 'hemsely-push',
  };

  self.registration.showNotification(title, options);
});
