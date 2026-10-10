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

const firebaseConfig = {
  apiKey: "AIzaSyDrZH-OSMSOwpgTk5bDZktFA8pI3cgxyBY",
  authDomain: "boo-king-app.firebaseapp.com",
  projectId: "boo-king-app",
  storageBucket: "boo-king-app.firebasestorage.app",
  messagingSenderId: "445312816620",
  appId: "1:445312816620:web:51c73010410fbeb23b5cc9",
  measurementId: "G-9VZ2SB8P17"
};

// Initialize Firebase
const app = initializeApp(useEmulators ? emulatorConfig : firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export const googleProvider = new GoogleAuthProvider();

export default app;
