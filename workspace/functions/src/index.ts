
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize the Admin SDK safely
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// --- Cloud Function to create a new Owner and their Organization ---
export const createOwner = functions.https.onCall(async (data, context) => {
    const { email, password, fullName, organizationName } = data;

    // --- Validation ---
    if (!email || !password || !fullName || !organizationName) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap. Pastikan semua field terisi.");
    }
    if (password.length < 8) {
        throw new functions.https.HttpsError("invalid-argument", "Password harus minimal 8 karakter.");
    }

    let newUserRecord: admin.auth.UserRecord | null = null;
    try {
        // --- Check for duplicate organization name ---
        const orgsRef = db.collection("organizations");
        const orgQuery = orgsRef.where("name", "==", organizationName);
        const orgQuerySnapshot = await orgQuery.get();
        if (!orgQuerySnapshot.empty) {
            throw new functions.https.HttpsError("already-exists", "Nama organisasi sudah digunakan.");
        }

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
        if (newUserRecord) {
            await admin.auth().deleteUser(newUserRecord.uid).catch(err => functions.logger.error("Failed to rollback auth user creation:", err));
        }

        functions.logger.error("ERROR IN createOwner:", error);
        if (error.code === 'auth/email-already-exists' || error.message.includes("email-already-exists")) {
            throw new functions.https.HttpsError("already-exists", "Email ini sudah terdaftar.");
        }
        if (error instanceof functions.https.HttpsError) {
            throw error; // Re-throw HttpsError directly
        }
        throw new functions.https.HttpsError("internal", `Gagal membuat pemilik baru: ${error.message}`, error);
    }
});


// --- Cloud Function for an Owner/Admin to create a new user (cashier/admin) ---
export const createUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }
    
    const { email, password, fullName, role, organizationId } = data;
    const requestingUid = context.auth.uid;

    if (!email || !password || !fullName || !role || !organizationId) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap untuk membuat pengguna baru.");
    }
    if (role === 'owner' || role === 'superadmin') {
         throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat membuat pengguna dengan peran ini.");
    }

    let newUserRecord: admin.auth.UserRecord | null = null;
    try {
        const requestingProfileRef = db.collection('profiles').doc(requestingUid);
        const requestingProfileSnap = await requestingProfileRef.get();
        if (!requestingProfileSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
        }
        const requestingProfile = requestingProfileSnap.data();

        if (requestingProfile?.organization_id !== organizationId && requestingProfile?.role !== 'superadmin') {
             throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat membuat pengguna untuk organisasi lain.");
        }
        if (requestingProfile?.role !== 'owner' && requestingProfile?.role !== 'admin' && requestingProfile?.role !== 'superadmin') {
            throw new functions.https.HttpsError("permission-denied", "Anda tidak memiliki izin untuk membuat pengguna.");
        }

        newUserRecord = await admin.auth().createUser({ email, password, displayName: fullName });
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
            await admin.auth().deleteUser(newUserRecord.uid).catch(err => functions.logger.error("Failed to rollback auth user creation:", err));
        }
        functions.logger.error("ERROR IN createUser:", error);
         if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError("already-exists", "Email ini sudah terdaftar.");
        }
        throw new functions.https.HttpsError("internal", `Gagal membuat pengguna baru: ${error.message}`, error);
    }
});


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

    try {
        const requesterProfileRef = db.collection('profiles').doc(requestingUid);
        const userToDeleteProfileRef = db.collection('profiles').doc(uidToDelete);
        const [requesterProfileSnap, userToDeleteProfileSnap] = await Promise.all([requesterProfileRef.get(), userToDeleteProfileRef.get()]);

        if (!requesterProfileSnap.exists()) {
            throw new functions.https.HttpsError("not-found", "Profil Anda tidak ditemukan.");
        }
         if (!userToDeleteProfileSnap.exists) {
            await admin.auth().deleteUser(uidToDelete).catch(err => functions.logger.warn("Auth user not found, nothing to delete.", err));
            return { status: "success", message: "Profil pengguna tidak ditemukan, akun login (jika ada) telah dihapus." };
        }
        
        const requesterProfile = requesterProfileSnap.data();
        const userToDeleteProfile = userToDeleteProfileSnap.data();

        if(requesterProfile?.organization_id !== userToDeleteProfile?.organization_id && requesterProfile?.role !== 'superadmin') {
            throw new functions.https.HttpsError("permission-denied", "Anda tidak dapat menghapus pengguna dari organisasi lain.");
        }
        if (requesterProfile?.role !== 'owner' && requesterProfile?.role !== 'admin' && requesterProfile?.role !== 'superadmin') {
             throw new functions.https.HttpsError("permission-denied", "Anda tidak memiliki izin untuk menghapus pengguna.");
        }
        if (userToDeleteProfile?.role === 'owner') {
            throw new functions.https.HttpsError("permission-denied", "Akun pemilik tidak dapat dihapus melalui cara ini.");
        }

        await admin.auth().deleteUser(uidToDelete);
        await db.collection('profiles').doc(uidToDelete).delete();
        return { status: 'success' };
    } catch (error: any) {
        functions.logger.error("ERROR IN deleteUser:", error);
        throw new functions.https.HttpsError("internal", `Gagal menghapus pengguna: ${error.message}`, error);
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

    initialCategories.forEach((category) => {
      const categoryRef = db.collection("categories").doc();
      batch.set(categoryRef, { ...category, organization_id: organizationId });
    });

    initialGrades.forEach((grade) => {
      const gradeRef = db.collection("grades").doc();
      batch.set(gradeRef, { ...grade, organization_id: organizationId });
    });

    batch.update(orgRef, {
        is_setup_complete: true,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { status: "success", message: "Toko berhasil disiapkan." };
  } catch (error: any) {
    functions.logger.error("ERROR IN setupInitialData:", error);
    throw new functions.https.HttpsError("internal", `Gagal melakukan setup: ${error.message}`, error);
  }
});

export const get_dashboard_analytics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melihat data ini.");
  }
  const { organizationId } = data;
  if (!organizationId) {
    throw new functions.https.HttpsError("invalid-argument", "ID Organisasi diperlukan.");
  }

  // Check if user has permission for this organization
  const profileSnap = await db.collection('profiles').doc(context.auth.uid).get();
  if (!profileSnap.exists || profileSnap.data()?.organization_id !== organizationId) {
      throw new functions.https.HttpsError("permission-denied", "Anda tidak memiliki akses ke organisasi ini.");
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfToday = admin.firestore.Timestamp.fromDate(today);

    // Daily Revenue & Sales Count
    const transactionsRef = db.collection('transactions');
    const todayTransactionsQuery = transactionsRef
      .where('organization_id', '==', organizationId)
      .where('created_at', '>=', startOfToday);
    const todayTransactionsSnap = await todayTransactionsQuery.get();
    
    let dailyRevenue = 0;
    todayTransactionsSnap.forEach(doc => {
      dailyRevenue += doc.data().total_amount;
    });
    const dailySalesCount = todayTransactionsSnap.size;

    // New Customers Today
    const customersRef = db.collection('customers');
    const newCustomersQuery = customersRef
        .where('organization_id', '==', organizationId)
        .where('created_at', '>=', startOfToday);
    const newCustomersSnap = await newCustomersQuery.get();
    const newCustomersToday = newCustomersSnap.size;

    // Top Selling Products (Simplified)
     const productsQuery = db.collection('transaction_items')
        .where('transaction_id', 'in', todayTransactionsSnap.docs.map(d => d.id))
    
    // This is a placeholder as a proper aggregation would require more complex logic
    // or a different data structure.
    const topProducts = [
        { name: 'Contoh Produk', sales: 5 },
    ];


    return {
      dailyRevenue,
      dailySalesCount,
      newCustomersToday,
      topProducts,
    };
  } catch (error: any) {
    functions.logger.error("ERROR IN get_dashboard_analytics:", error);
    throw new functions.https.HttpsError("internal", `Gagal mengambil data analitik: ${error.message}`, error);
  }
});
