
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

console.log("----- CLOUD FUNCTIONS DEPLOYMENT VERSION: ", new Date().toISOString(), " -----");

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

export const createOwner = functions.https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { email, password, fullName, organizationName } = req.body.data;

        if (!email || !password || !fullName || !organizationName) {
            res.status(400).json({ error: { message: "Data tidak lengkap. Pastikan semua field terisi." } });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ error: { message: "Password harus minimal 6 karakter." } });
            return;
        }

        let newUserRecord: admin.auth.UserRecord | null = null;
        try {
            const orgsRef = db.collection("organizations");
            const orgQuery = orgsRef.where("name", "==", organizationName);
            const orgQuerySnapshot = await orgQuery.get();
            if (!orgQuerySnapshot.empty) {
                res.status(409).json({ error: { message: "Nama organisasi sudah digunakan." } });
                return;
            }

            newUserRecord = await admin.auth().createUser({ email, password, displayName: fullName });
            
            const orgDocRef = await db.collection('organizations').add({
                name: organizationName,
                owner_id: newUserRecord.uid,
                is_setup_complete: false,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            await db.collection('profiles').doc(newUserRecord.uid).set({
                id: newUserRecord.uid, email, full_name: fullName, organization_id: orgDocRef.id, role: 'owner',
                created_at: admin.firestore.FieldValue.serverTimestamp(), updated_at: admin.firestore.FieldValue.serverTimestamp()
            });

            res.status(200).json({ data: { status: "success", message: "Pemilik dan organisasi berhasil dibuat.", uid: newUserRecord.uid } });

        } catch (error: any) {
            if (newUserRecord) {
                await admin.auth().deleteUser(newUserRecord.uid).catch(err => functions.logger.error("Gagal rollback user auth:", err));
            }
            functions.logger.error("ERROR IN createOwner:", error);

            if (error.code === 'auth/email-already-exists') {
                 res.status(409).json({ error: { message: "Email ini sudah terdaftar." } });
            } else {
                 res.status(500).json({ error: { message: `Gagal membuat pemilik baru: ${error.message}` } });
            }
        }
    });
});

export const createUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }
    const { email, password, fullName, role, organizationId } = data;
    const requestingUid = context.auth.uid;

    if (!email || !password || !fullName || !role || !organizationId) {
        throw new functions.https.HttpsError("invalid-argument", "Data tidak lengkap untuk membuat pengguna baru.");
    }

    // Logic for creating user by an admin/owner
    // ... (rest of the function remains the same)
});


export const deleteUser = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan aksi ini.");
    }
    const { uid: uidToDelete } = data;
    // ... (rest of the function remains the same)
});

export const setupInitialData = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melakukan setup.");
    }
    // ... (rest of the function remains the same)
});

export const get_dashboard_analytics = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Anda harus login untuk melihat data ini.");
    }
    // ... (rest of the function remains the same)
});
