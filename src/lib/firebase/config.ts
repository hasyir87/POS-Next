
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

// In development, connect to the emulators
if (process.env.NODE_ENV === 'development') {
    try {
        // It's important to disable app check in emulator mode
        if (typeof window !== "undefined") {
          self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        const auth = getAuth(firebaseApp);
        connectAuthEmulator(auth, 'http://localhost:9099', { disableEmulatorWarnings: true });

        const db = getFirestore(firebaseApp);
        connectFirestoreEmulator(db, 'localhost', 8080);
        
        const functions = getFunctions(firebaseApp, 'us-central1');
        connectFunctionsEmulator(functions, 'localhost', 5001);
    } catch(e) {
        console.error("Error connecting to Firebase emulators. Make sure they are running. `npm run emulators:start`", e);
    }
}

export { firebaseApp };
