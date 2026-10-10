import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// The Admin SDK talks to the emulator whenever FIRESTORE_EMULATOR_HOST is set.
export const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// Local development must never reach a real Firebase project by accident.
if (process.env.APP_ENV === 'local' && !usingEmulator) {
  throw new Error(
    'APP_ENV=local requires FIRESTORE_EMULATOR_HOST (and FIREBASE_AUTH_EMULATOR_HOST). ' +
    'Start the emulators with `npm run emulators` from the repo root.'
  );
}

// Initialize Firebase Admin
const app = usingEmulator
  ? initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-reserveease' })
  : initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY
    })
  });

// Get Firestore instance
export const db = getFirestore(app);
export default app;
