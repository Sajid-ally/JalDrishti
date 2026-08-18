import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
export const isFirebaseConfigured = Boolean(apiKey && !apiKey.includes("Dummy"));

const firebaseConfig = {
  apiKey: apiKey || "AIzaSyDummyKeyForLocalDevelopment-JalDrishti",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "jaldrishti-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "jaldrishti-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "jaldrishti-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
