
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors";

const corsHandler = cors({origin: true});

// Initialize the Admin SDK safely
try {
  if (admin.apps.length === 0) {
    admin.initializeApp();
  }
} catch (e) {
  console.error("Firebase admin initialization error", e);
}

const db = admin.firestore();

// --- Cloud Function to create a new Owner and their Organization ---
export const createOwner = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    functions.logger.info("createOwner function triggered", {body: req.body});

    const {email, password, fullName, organizationName} = req.body.data;

    if (!email || !password || !fullName || !organizationName) {
      res.status(400).json({
        error: {
          message: "Data tidak lengkap. Pastikan semua field terisi.",
        },
      });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({
        error: {
          message: "Password harus minimal 6 karakter.",
        },
      });
      return;
    }

    let newUserRecord: admin.auth.UserRecord | null = null;
    try {
      const orgsRef = db.collection("organizations");
      const orgQuery = orgsRef.where("name", "==", organizationName);
      const orgQuerySnapshot = await orgQuery.get();
      if (!orgQuerySnapshot.empty) {
        res.status(409).json({
          error: {
            message: "Nama organisasi sudah digunakan.",
          },
        });
        return;
      }

      newUserRecord = await admin.auth().createUser({
        email,
        password,
        displayName: fullName,
      });

      const orgDocRef = await db.collection("organizations").add({
        name: organizationName,
        owner_id: newUserRecord.uid,
        is_setup_complete: false,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      await db.collection("profiles").doc(newUserRecord.uid).set({
        id: newUserRecord.uid,
        email,
        full_name: fullName,
        organization_id: orgDocRef.id,
        role: "owner",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        data: {
          status: "success",
          message: "Pemilik dan organisasi berhasil dibuat.",
          uid: newUserRecord.uid,
        },
      });
    } catch (error: unknown) {
      if (newUserRecord) {
        await admin.auth().deleteUser(newUserRecord.uid)
          .catch((err) => functions.logger.error(
            "Gagal rollback user auth:", err));
      }
      functions.logger.error("ERROR IN createOwner:", error);
      
      const errorMessage = (error instanceof Error) ? error.message : "An unknown error occurred.";

      if (errorMessage.includes("auth/email-already-exists")) {
        res.status(409).json({error: {message: "Email ini sudah terdaftar."}});
      } else {
        res.status(500).json({
          error: {
            message: `Gagal membuat pemilik baru: ${errorMessage}`,
          },
        });
      }
    }
  });
});

export const createUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
      "Anda harus login untuk melakukan aksi ini.");
  }
  const {email, password, fullName, role, organizationId} = data;
  const requestingUid = context.auth.uid;

  if (!email || !password || !fullName || !role || !organizationId) {
    throw new functions.https.HttpsError("invalid-argument",
      "Data tidak lengkap untuk membuat pengguna baru.");
  }
  // Logic for creating user by an admin/owner
  console.log(requestingUid);
});


export const deleteUser = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
      "Anda harus login untuk melakukan aksi ini.");
  }
  const {uid: uidToDelete} = data;
  console.log(uidToDelete);
});

export const setupInitialData = functions.https.onCall(async (data,
  context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
      "Anda harus login untuk melakukan setup.");
  }
});

export const getDashboardAnalytics = functions.https.onCall(async (data,
  context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated",
      "Anda harus login untuk melihat data ini.");
  }
});
