/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Define reusable batch writer
const createBatch = () => db.batch();

/**
 * Creates a new user in Firebase Auth and a corresponding profile
 * in Firestore.
 * - This function is callable by 'owner' or 'admin' roles.
 */
export const createUser = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { email, password, fullName, role, organizationId } = request.data;
    const callingUid = request.auth?.uid;

    if (!callingUid) {
      throw new onCall.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
      const callingUserData = callingUserDoc.data();

      if (
        !callingUserData ||
        (callingUserData.role !== "owner" &&
          callingUserData.role !== "admin" &&
          callingUserData.role !== "superadmin")
      ) {
        throw new onCall.HttpsError(
          "permission-denied",
          "You do not have permission to create users."
        );
      }
      
      if (callingUserData.organization_id !== organizationId && callingUserData.role !== "superadmin") {
        throw new onCall.HttpsError(
          "permission-denied",
          "You can only create users for your own organization."
        );
      }

      const userRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: fullName,
      });

      await db.doc(`profiles/${userRecord.uid}`).set({
        id: userRecord.uid,
        email: email,
        full_name: fullName,
        role: role,
        organization_id: organizationId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        status: "success",
        message: `User ${fullName} created successfully.`,
        uid: userRecord.uid,
      };
    } catch (error: any) {
      logger.error("Error creating user:", error);
      // Clean up failed user creation in Auth
      if (error.uid) {
        await admin.auth().deleteUser(error.uid).catch(e => logger.error("Cleanup failed for UID:", error.uid, e));
      }
      throw new onCall.HttpsError("internal", error.message || "An unknown error occurred.");
    }
  }
);


/**
 * Deletes a user from Firebase Auth and their profile from Firestore.
 * - This function is callable by 'owner' or 'admin' roles.
 */
export const deleteUser = onCall(
  { enforceAppCheck: false },
  async (request) => {
    const { uid } = request.data;
    const callingUid = request.auth?.uid;

    if (!callingUid) {
      throw new onCall.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    if (uid === callingUid) {
       throw new onCall.HttpsError("invalid-argument", "You cannot delete your own account.");
    }

    try {
      const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
      const callingUserData = callingUserDoc.data();

      if (
        !callingUserData ||
        (callingUserData.role !== "owner" &&
          callingUserData.role !== "admin" &&
          callingUserData.role !== "superadmin")
      ) {
        throw new onCall.HttpsError("permission-denied", "You do not have permission to delete users.");
      }

      const userToDeleteDoc = await db.doc(`profiles/${uid}`).get();
      if (!userToDeleteDoc.exists) {
          throw new onCall.HttpsError("not-found", "User to delete not found in Firestore.");
      }
      const userToDeleteData = userToDeleteDoc.data();

      // Owners can't delete other owners. Only superadmin can.
      if (userToDeleteData?.role === 'owner' && callingUserData.role !== 'superadmin') {
          throw new onCall.HttpsError("permission-denied", "Owners cannot delete other owners.");
      }
      
      // Admins cannot delete owners or other admins.
      if (callingUserData.role === 'admin' && (userToDeleteData?.role === 'owner' || userToDeleteData?.role === 'admin')) {
        throw new onCall.HttpsError("permission-denied", "Admins cannot delete owners or other admins.");
      }
      
      // Ensure user is being deleted from the same organization
      if (userToDeleteData?.organization_id !== callingUserData.organization_id && callingUserData.role !== 'superadmin') {
         throw new onCall.HttpsError("permission-denied", "You can only delete users from your own organization.");
      }
      
      await admin.auth().deleteUser(uid);
      await db.doc(`profiles/${uid}`).delete();

      return {
        status: "success",
        message: `User ${uid} deleted successfully.`,
      };

    } catch (error: any) {
      logger.error("Error deleting user:", error);
      throw new onCall.HttpsError("internal", error.message || "An unknown error occurred while deleting the user.");
    }
  }
);

/**
 * Sets up initial data (grades, etc.) for a new organization.
 * This is a callable function that expects the user to be authenticated.
 */
export const setupInitialData = onCall(
  { enforceAppCheck: false },
  async (request) => {
    // 1. Authentication Check (Handled automatically by onCall)
    const uid = request.auth?.uid;
    if (!uid) {
      throw new onCall.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    try {
      // 2. Get User Profile & Organization
      const profileDoc = await db.collection("profiles").doc(uid).get();
      if (!profileDoc.exists) {
        throw new onCall.HttpsError("not-found", "Profile not found.");
      }
      const profileData = profileDoc.data();
      const organizationId = profileData?.organization_id;
      if (!organizationId) {
        throw new onCall.HttpsError("failed-precondition", "Organization ID not found for user.");
      }

      const orgDocRef = db.collection("organizations").doc(organizationId);

      // 3. Define initial data
      const initialGrades = [
        { name: "Standard", price_multiplier: 1.0, extra_essence_price: 1000 },
        { name: "Premium", price_multiplier: 1.5, extra_essence_price: 1500 },
      ];

      const batch = createBatch();

      // Add grades
      initialGrades.forEach(grade => {
        const gradeRef = db.collection("grades").doc();
        batch.set(gradeRef, { ...grade, organization_id: organizationId });
      });

      // 4. Mark organization setup as complete
      batch.update(orgDocRef, { is_setup_complete: true, updated_at: admin.firestore.FieldValue.serverTimestamp() });

      await batch.commit();
      logger.info(`Initial data setup complete for organization ${organizationId}`);
      return { status: "success", message: "Initial data setup was successful." };

    } catch (error: any) {
        logger.error("Error during initial data setup:", error);
        if (error instanceof onCall.HttpsError) {
          throw error;
        }
        throw new onCall.HttpsError("internal", "An internal error occurred during setup.");
    }
  }
);
