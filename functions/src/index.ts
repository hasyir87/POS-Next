
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const initialCategories = [
  { name: "Bibit Parfum" },
  { name: "Pelarut" },
  { name: "Bahan Sintetis" },
  { name: "Kemasan" },
];

const initialGrades = [
  { name: "Standard", price_multiplier: 1.0, extra_essence_price: 2000 },
  { name: "Premium", price_multiplier: 1.5, extra_essence_price: 3500 },
];

export const setupInitialData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan setup.");
  }

  const uid = context.auth.uid;
  const profileRef = db.collection("profiles").doc(uid);

  try {
    const profileSnap = await profileRef.get();
    if (!profileSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Profil pengguna tidak ditemukan.");
    }

    const profileData = profileSnap.data();
    if (!profileData || !profileData.organization_id) {
      throw new functions.https.HttpsError("failed-precondition", "Pengguna tidak terhubung ke organisasi.");
    }

    const organizationId = profileData.organization_id;
    const orgRef = db.collection("organizations").doc(organizationId);
    const orgSnap = await orgRef.get();
    const orgData = orgSnap.data();

    if (!orgData) {
        throw new functions.https.HttpsError("not-found", "Organisasi tidak ditemukan.");
    }

    if (orgData.is_setup_complete) {
        return { status: "success", message: "Toko sudah disiapkan sebelumnya." };
    }


    const batch = db.batch();

    // Seed Categories
    initialCategories.forEach((category) => {
      const categoryRef = db.collection("categories").doc();
      batch.set(categoryRef, { ...category, organization_id: organizationId });
    });

    // Seed Grades
    initialGrades.forEach((grade) => {
      const gradeRef = db.collection("grades").doc();
      batch.set(gradeRef, { ...grade, organization_id: organizationId });
    });

    // Mark setup as complete
    batch.update(orgRef, {
        is_setup_complete: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { status: "success", message: "Toko berhasil disiapkan." };
  } catch (error: any) {
    console.error("Error in setupInitialData function:", error);
    // Re-throw as an HttpsError to be caught by the client
    throw new functions.https.HttpsError("internal", error.message, error);
  }
});

// Cloud Function untuk mendaftar pemilik baru
export const signupOwner = functions.https.onRequest(async (req, res) => {
  const cors = (await import("cors"))({ origin: true });
  cors(req, res, async () => {
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
      try {
        await admin.auth().getUserByEmail(email);
        res.status(409).json({error: "Email ini sudah terdaftar."});
        return;
      } catch (error: any) {
        if (error.code !== "auth/user-not-found") {
          throw error;
        }
      }

      const orgsRef = db.collection("organizations");
      const orgQuery = await orgsRef.where("name", "==", organizationName).get();
      if (!orgQuery.empty) {
        res.status(409).json({error: "Nama organisasi sudah digunakan."});
        return;
      }

      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: fullName,
      });

      const orgRef = db.collection("organizations").doc();
      await orgRef.set({
        name: organizationName,
        owner_id: userRecord.uid,
        is_setup_complete: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

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
      role: role,
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
