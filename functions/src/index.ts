
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
