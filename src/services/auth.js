import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';

// ---------------------------------------------------------------------------
// Demo user returned when Firebase is not configured
// ---------------------------------------------------------------------------

const DEMO_USER = {
  uid: 'demo',
  displayName: 'Demo User',
  email: 'demo@scraper-os.local',
};

// ---------------------------------------------------------------------------
// Auth functions
// ---------------------------------------------------------------------------

/**
 * Sign in with a Google popup.
 * In demo mode, resolves immediately with the demo user.
 */
export async function signInWithGoogle() {
  if (!isFirebaseConfigured()) {
    return DEMO_USER;
  }
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/**
 * Sign the current user out.
 * In demo mode this is a no-op.
 */
export async function signOut() {
  if (!isFirebaseConfigured()) return;
  await firebaseSignOut(auth);
}

/**
 * Listen for authentication state changes.
 * Returns an unsubscribe function.
 *
 * In demo mode the callback is invoked once with the demo user.
 */
export function onAuthChange(callback) {
  if (!isFirebaseConfigured()) {
    // Simulate an async auth state resolution
    const timeout = setTimeout(() => callback(DEMO_USER), 0);
    return () => clearTimeout(timeout);
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Return the currently signed-in user (or null).
 * In demo mode, always returns the demo user.
 */
export function getCurrentUser() {
  if (!isFirebaseConfigured()) {
    return DEMO_USER;
  }
  return auth.currentUser;
}
