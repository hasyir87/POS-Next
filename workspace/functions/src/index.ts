
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// This Cloud Function is now deprecated as the logic has been moved to the client-side
// to avoid requiring a Firebase plan upgrade. It's kept here for reference purposes.
export const signupOwner = functions.https.onRequest(async (req, res) => {
  res.status(410).json({ error: "This function is deprecated. Signup logic is handled on the client." });
});


// Cloud Function untuk membuat pengguna (kasir/admin) oleh owner/admin
export const createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk membuat pengguna.");
  }

  const {email, password, fullName, role, organizationId} = data;
  const requesterUid = context.auth.uid;

  // Verifikasi peran pembuat permintaan
  const requesterProfileRef = db.doc(`profiles/${requesterUid}`);
  const requesterProfileSnap = await requesterProfileRef.get();
  if (!requesterProfileSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
  }
  const requesterProfile = requesterProfileSnap.data();
  if (requesterProfile?.role !== "owner" && requesterProfile?.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Anda tidak punya izin untuk membuat pengguna.");
  }

  try {
    const userRecord = await admin.auth().createUser({email, password, displayName: fullName});
    await db.collection("profiles").doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      full_name: fullName,
      role: role, // 'cashier' or 'admin'
      organization_id: organizationId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return {uid: userRecord.uid, message: "Pengguna berhasil dibuat."};
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Email sudah digunakan oleh pengguna lain.');
    }
    throw new functions.https.HttpsError("internal", error.message, error);
  }
});

// Cloud Function untuk menghapus pengguna
export const deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk menghapus pengguna.");
  }

  const {uid} = data;
  const requesterUid = context.auth.uid;

  // Verifikasi peran pembuat permintaan
  const requesterProfileRef = db.doc(`profiles/${requesterUid}`);
  const requesterProfileSnap = await requesterProfileRef.get();
  if (!requesterProfileSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
  }
  const requesterProfile = requesterProfileSnap.data();
  if (requesterProfile?.role !== "owner") {
     throw new functions.https.HttpsError("permission-denied", "Hanya pemilik yang dapat menghapus pengguna.");
  }

  try {
    await admin.auth().deleteUser(uid);
    await db.collection("profiles").doc(uid).delete();
    return {message: "Pengguna berhasil dihapus."};
  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message, error);
  }
});
