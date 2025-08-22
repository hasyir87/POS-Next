
import * as admin from 'firebase-admin';

// This file is for server-side operations only.
// It initializes the Firebase Admin SDK.

const serviceAccount = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

export const initAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error("Firebase Admin credentials are not set. Check FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in your environment variables.");
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error("Firebase admin initialization error", error);
    throw new Error("Could not initialize Firebase Admin SDK. Check server credentials.");
  }
};
