
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const functions = getFunctions(firebaseApp, 'us-central1');

// Connect to emulators in development.
// This logic ensures that the client-side code connects to the emulators
// ONLY when running in a development environment (like `npm run dev`).
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  // Point to the emulators running on your local machine.
  // We use 127.0.0.1 instead of localhost to avoid potential network routing issues
  // in containerized environments like Firebase Studio.
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableEmulatorWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  
  // Disable App Check for emulator usage
  if (process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
  }
}


export { firebaseApp, auth, db, functions };
