import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
