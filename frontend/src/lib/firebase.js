import { initializeApp, getApps, getApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA3PXEALXVYqAaFxBCPPBzFb1SLZ-3MUjY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hemsely-d2910.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hemsely-d2910",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hemsely-d2910.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "919927932946",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:919927932946:web:dc4bb8f0cdc4c0aa04b0cb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-2ZKKJT7TPQ",
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
