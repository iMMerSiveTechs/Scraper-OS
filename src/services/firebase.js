import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Check whether Firebase is configured by verifying that the
 * required environment variables are present.  When they are
 * missing the app falls back to "demo mode" so it can run
 * without a real Firebase project.
 */
export function isFirebaseConfigured() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization failed:', error);
    console.warn('Falling back to demo mode.');
  }
} else {
  console.warn(
    'Firebase is not configured. Running in demo mode. ' +
      'Set VITE_FIREBASE_* environment variables to connect to Firebase.'
  );
}

export { app, db, auth };
