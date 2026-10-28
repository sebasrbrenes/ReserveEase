import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

// Local development: VITE_USE_EMULATORS=true points the app at the Firebase
// emulators with a "demo-" project, which can never reach real resources.
const useEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

const emulatorConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-reserveease.firebaseapp.com",
  projectId: "demo-reserveease",
  appId: "demo-app-id"
};

// Production: the web config of the Firebase project, set in Vercel. These
// values are public by design; Firestore rules are what protect the data.
const env = import.meta.env;
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

if (!useEmulators && !firebaseConfig.projectId) {
  throw new Error(
    "Missing Firebase config: set the VITE_FIREBASE_* variables " +
    "(or VITE_USE_EMULATORS=true for local development)."
  );
}

// Initialize Firebase
const app = initializeApp(useEmulators ? emulatorConfig : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Verification and password reset emails from Firebase, in Spanish.
auth.languageCode = "es";

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export const googleProvider = new GoogleAuthProvider();

export default app;
