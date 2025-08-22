
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Cloud Function untuk mendaftar pemilik baru
export const signupOwner = functions.https.onCall(async (data, context) => {
  const {email, password, fullName, organizationName} = data;

  if (!email || !password || !fullName || !organizationName) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email, password, nama lengkap, dan nama organisasi harus diisi.",
    );
  }

  // Periksa duplikasi email di Firebase Auth
  try {
    await admin.auth().getUserByEmail(email);
    // Jika tidak ada error, berarti user sudah ada
    throw new functions.https.HttpsError(
      "already-exists",
      "Email ini sudah terdaftar.",
    );
  } catch (error: any) {
    // Error 'auth/user-not-found' adalah yang kita harapkan.
    // Jika error lain, lemparkan lagi.
    if (error.code !== 'auth/user-not-found') {
      throw new functions.https.HttpsError('internal', error.message);
    }
  }

  // Periksa duplikasi nama organisasi di Firestore
  const orgsRef = db.collection("organizations");
  const orgQuery = await orgsRef.where("name", "==", organizationName).get();
  if (!orgQuery.empty) {
    throw new functions.https.HttpsError(
      "already-exists",
      "Nama organisasi sudah digunakan.",
    );
  }

  try {
    // Buat pengguna di Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    // Buat organisasi di Firestore
    const orgRef = db.collection("organizations").doc();
    await orgRef.set({
      name: organizationName,
      owner_id: userRecord.uid,
      is_setup_complete: false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Buat profil pengguna di Firestore
    const profileRef = db.collection("profiles").doc(userRecord.uid);
    await profileRef.set({
      id: userRecord.uid,
      email,
      full_name: fullName,
      organization_id: orgRef.id,
      role: "owner",
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      status: "success",
      message: "Pemilik berhasil didaftarkan.",
      uid: userRecord.uid,
      organizationId: orgRef.id,
    };
  } catch (error: any) {
     console.error("Error creating user/org/profile:", error);
     throw new functions.https.HttpsError(
      "internal",
      "Terjadi kesalahan internal saat membuat akun Anda.",
      error.message
    );
  }
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
