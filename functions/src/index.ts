
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

const corsHandler = cors({origin: true});

admin.initializeApp();
const db = admin.firestore();

// Cloud Function untuk mendaftar pemilik baru
export const signupOwner = functions.https.onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const {email, password, fullName, organizationName} = req.body;

    if (!email || !password || !fullName || !organizationName) {
      res.status(400).json({
        error: "Email, password, nama lengkap, dan nama organisasi harus diisi.",
      });
      return;
    }

    try {
      // Periksa duplikasi email di Firebase Auth
      try {
        await admin.auth().getUserByEmail(email);
        res.status(409).json({error: "Email ini sudah terdaftar."});
        return;
      } catch (error: any) {
        if (error.code !== "auth/user-not-found") {
          throw error; // Lemparkan error lain yang tidak terduga
        }
        // Jika user tidak ditemukan, lanjutkan proses
      }

      // Periksa duplikasi nama organisasi di Firestore
      const orgsRef = db.collection("organizations");
      const orgQuery = await orgsRef.where("name", "==", organizationName).get();
      if (!orgQuery.empty) {
        res.status(409).json({error: "Nama organisasi sudah digunakan."});
        return;
      }

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

      res.status(201).json({
        status: "success",
        message: "Pemilik berhasil didaftarkan.",
        uid: userRecord.uid,
        organizationId: orgRef.id,
      });
    } catch (error: any) {
      console.error("Error creating user/org/profile:", error);
      res.status(500).json({
        error: "Terjadi kesalahan internal saat membuat akun Anda.",
        details: error.message,
      });
    }
  });
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
