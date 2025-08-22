
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// --- Cloud Function to create a new Owner and their Organization ---
export const createOwner = functions.https.onCall(async (data, context) => {
    const { email, password, fullName, organizationName } = data;

    // --- Validation ---
    if (!email || !password || !fullName || !organizationName) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap.");
    }
    if (password.length < 8) {
        throw new functions.https.HttpsError("invalid-argument", "Password harus minimal 8 karakter.");
    }

    // --- Check for duplicate organization name ---
    const orgsRef = db.collection("organizations");
    const orgQuery = orgsRef.where("name", "==", organizationName);
    const orgQuerySnapshot = await orgQuery.get();
    if (!orgQuerySnapshot.empty) {
        throw new functions.https.HttpsError("already-exists", "Nama organisasi sudah digunakan.");
    }

    let newUserRecord: admin.auth.UserRecord | null = null;
    try {
        // Step 1: Create user in Firebase Auth
        newUserRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: fullName,
            emailVerified: false,
        });

        // Step 2: Create the organization document
        const orgDocRef = await db.collection('organizations').add({
            name: organizationName,
            owner_id: newUserRecord.uid,
            is_setup_complete: false,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Step 3: Create the user's profile document
        const profileDocRef = db.collection('profiles').doc(newUserRecord.uid);
        await profileDocRef.set({
            id: newUserRecord.uid,
            email: email,
            full_name: fullName,
            organization_id: orgDocRef.id,
            role: 'owner',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return { status: "success", message: "Pemilik dan organisasi berhasil dibuat.", uid: newUserRecord.uid };

    } catch (error: any) {
        // --- Rollback logic ---
        // If user was created in Auth but a subsequent step failed, delete the Auth user.
        if (newUserRecord) {
            await admin.auth().deleteUser(newUserRecord.uid);
        }

        console.error("Error in createOwner function:", error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError("already-exists", "Email ini sudah terdaftar.");
        }
        throw new functions.https.HttpsError("internal", "Gagal membuat pemilik baru. Silakan coba lagi.");
    }
});


// --- Cloud Function for an Owner/Admin to create a new user (cashier/admin) ---
export const createUser = functions.https.onCall(async (data, context) => {
    // Check for authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }
    
    const { email, password, fullName, role, organizationId } = data;
    const requestingUid = context.auth.uid;

    // --- Validation ---
    if (!email || !password || !fullName || !role || !organizationId) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap untuk membuat pengguna baru.");
    }
    if (role === 'owner' || role === 'superadmin') {
         throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat membuat pengguna dengan peran ini.");
    }

    // --- Authorization Check ---
    const requestingProfileRef = db.collection('profiles').doc(requestingUid);
    const requestingProfileSnap = await requestingProfileRef.get();
    if (!requestingProfileSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
    }
    const requestingProfile = requestingProfileSnap.data();

    if (requestingProfile?.organization_id !== organizationId) {
         throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat membuat pengguna untuk organisasi lain.");
    }
    if (requestingProfile?.role !== 'owner' && requestingProfile?.role !== 'admin' && requestingProfile?.role !== 'superadmin') {
        throw new functions.https.HttpsError("permission-denied", "Anda tidak memiliki izin untuk membuat pengguna.");
    }

    let newUserRecord: admin.auth.UserRecord | null = null;
    try {
        // Step 1: Create user in Firebase Auth
        newUserRecord = await admin.auth().createUser({ email, password, displayName: fullName });

        // Step 2: Create profile in Firestore
        await db.collection('profiles').doc(newUserRecord.uid).set({
            id: newUserRecord.uid,
            email,
            full_name: fullName,
            role,
            organization_id: organizationId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        return { status: "success", uid: newUserRecord.uid };
    } catch (error: any) {
        if (newUserRecord) {
            await admin.auth().deleteUser(newUserRecord.uid);
        }
        console.error("Error creating user:", error);
         if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError("already-exists", "Email ini sudah terdaftar.");
        }
        throw new functions.https.HttpsError("internal", "Gagal membuat pengguna baru.");
    }
});


// --- Cloud Function to delete a user ---
export const deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }

    const { uid: uidToDelete } = data;
    const requestingUid = context.auth.uid;

    if (!uidToDelete) {
        throw new functions.https.HttpsError("invalid-argument", "User ID yang akan dihapus tidak disediakan.");
    }
    if(uidToDelete === requestingUid) {
        throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat menghapus akun Anda sendiri.");
    }

    // Get profiles for both requester and user to be deleted
    const requesterProfileRef = db.collection('profiles').doc(requestingUid);
    const userToDeleteProfileRef = db.collection('profiles').doc(uidToDelete);
    const [requesterProfileSnap, userToDeleteProfileSnap] = await Promise.all([requesterProfileRef.get(), userToDeleteProfileRef.get()]);

    if (!requesterProfileSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
    }
     if (!userToDeleteProfileSnap.exists) {
        // If profile doesn't exist, just try to delete the auth user to be safe
        await admin.auth().deleteUser(uidToDelete).catch(err => console.log("Auth user not found, nothing to delete."));
        return { status: "success", message: "Profil pengguna tidak ditemukan, akun login (jika ada) telah dihapus." };
    }
    
    const requesterProfile = requesterProfileSnap.data();
    const userToDeleteProfile = userToDeleteProfileSnap.data();

    // Authorization checks
    if(requesterProfile?.organization_id !== userToDeleteProfile?.organization_id) {
        throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat menghapus pengguna dari organisasi lain.");
    }
    if (requesterProfile?.role !== 'owner' && requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'superadmin') {
         throw new functions.https.HttpsError("permission-denied", "Anda tidak memiliki izin untuk menghapus pengguna.");
    }
    if (userToDeleteProfile?.role === 'owner') {
        throw new functions.https.HttpsError("permission-denied", "Akun pemilik tidak dapat dihapus melalui cara ini.");
    }

    try {
        // Delete from Auth, then delete from Firestore (or use a trigger for that)
        await admin.auth().deleteUser(uidToDelete);
        await db.collection('profiles').doc(uidToDelete).delete();
        return { status: 'success' };
    } catch (error: any) {
        console.error("Error deleting user:", error);
        throw new functions.https.HttpsError("internal", "Gagal menghapus pengguna.");
    }
});



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
