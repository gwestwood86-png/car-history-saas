import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// ========================
// Firebase Config (ENV SAFE)
// ========================
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 🔥 HARD STOP if env missing (prevents silent Firestore offline bug)
if (!firebaseConfig.apiKey) {
  throw new Error("Missing Firebase API key (Vercel env issue)");
}

// ========================
// Initialize App (SAFE for Next.js hot reload)
// ========================
console.log("FIREBASE CONFIG CHECK:", {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
});
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// ========================
// Auth
// ========================
export const auth = getAuth(app);

// persistence (don’t crash SSR / build)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence);
}

// ========================
// Firestore
// ========================
export const db = getFirestore(app);

// ========================
// Analytics (ONLY client-side)
// ========================
export const initAnalytics = async () => {
  if (typeof window === "undefined") return null;

  const supported = await isSupported();
  if (!supported) return null;

  return getAnalytics(app);
};

export default app;