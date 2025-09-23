
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

/**
 * Creates a new owner user, an organization, and initial data in a single transaction.
 * This function is callable without authentication.
 */
export const createOwner = onCall({ enforceAppCheck: false }, async (request) => {
  const { email, password, fullName, organizationName } = request.data;

  // Validate required fields
  if (!email || !password || !fullName || !organizationName) {
    throw new onCall.HttpsError("invalid-argument", "Missing required fields.");
  }
  if (password.length < 6) {
    throw new onCall.HttpsError("invalid-argument", "Password must be at least 6 characters long.");
  }

  const orgsRef = db.collection("organizations");
  const usersRef = db.collection("profiles");
  const organizationNameLower = organizationName.toLowerCase();

  let newUserRecord;
  try {
    // Check for duplicate organization name (case-insensitive)
    const orgQuery = orgsRef.where("name_lowercase", "==", organizationNameLower);
    const orgSnapshot = await orgQuery.get();
    if (!orgSnapshot.empty) {
      throw new onCall.HttpsError("already-exists", "Organization name is already in use.", { field: 'organization' });
    }

    // Check for duplicate email
    try {
      await admin.auth().getUserByEmail(email);
      // If the above line doesn't throw, the user exists.
      throw new onCall.HttpsError("already-exists", "Email is already in use.", { field: 'email' });
    } catch (error: any) {
      // "user-not-found" is the expected error if the email is available.
      if (error.code !== 'auth/user-not-found') {
        throw error; // Re-throw other auth errors
      }
    }

    // Create user in Firebase Auth
    newUserRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    const batch = db.batch();

    // Create organization document
    const orgDocRef = orgsRef.doc();
    batch.set(orgDocRef, {
      name: organizationName,
      name_lowercase: organizationNameLower,
      owner_id: newUserRecord.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create user profile document
    const profileDocRef = usersRef.doc(newUserRecord.uid);
    batch.set(profileDocRef, {
      id: newUserRecord.uid,
      email: email,
      full_name: fullName,
      organization_id: orgDocRef.id,
      role: 'owner',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create initial grades
    const initialGrades = [
      { name: "Standard", price_multiplier: 1.0, extra_essence_price: 1000 },
      { name: "Premium", price_multiplier: 1.5, extra_essence_price: 1500 },
    ];
    
    initialGrades.forEach(grade => {
      const gradeRef = db.collection("grades").doc();
      batch.set(gradeRef, { ...grade, organization_id: orgDocRef.id });
    });

    await batch.commit();

    return {
      status: "success",
      message: `Owner ${fullName} and organization ${organizationName} created successfully.`,
      uid: newUserRecord.uid,
      organizationId: orgDocRef.id,
    };

  } catch (error: any) {
    logger.error("Error creating owner:", error);
    // Clean up failed user creation in Auth if it exists
    if (newUserRecord?.uid) {
      await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord!.uid, e));
    }
    // Re-throw HttpsError to be caught by the client
    if (error instanceof onCall.HttpsError) {
      throw error;
    }
    // Throw a generic internal error for other cases
    throw new onCall.HttpsError("internal", error.message || "An unknown error occurred.");
  }
});


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
    
    if (!organizationId) {
       throw new onCall.HttpsError("invalid-argument", "Organization ID is required to create a user.");
    }

    let newUserRecord;
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
      
      // Allow superadmin to create anywhere, otherwise check organization match
      if (callingUserData.role !== "superadmin") {
        const callerParentOrgId = (await db.doc(`organizations/${callingUserData.organization_id}`).get()).data()?.parent_organization_id || callingUserData.organization_id;
        const targetParentOrgId = (await db.doc(`organizations/${organizationId}`).get()).data()?.parent_organization_id || organizationId;
        
        if (callerParentOrgId !== targetParentOrgId) {
            throw new onCall.HttpsError(
              "permission-denied",
              "You can only create users for your own organization structure."
            );
        }
      }
      
      // Check for duplicate email before creating user
      try {
        await admin.auth().getUserByEmail(email);
        // If the above line doesn't throw, the user exists.
        throw new onCall.HttpsError("already-exists", "Email is already in use.");
      } catch (error: any) {
        // "user-not-found" is the expected error if the email is available.
        if (error.code !== 'auth/user-not-found') {
          throw error; // Re-throw other auth errors, including the one we just threw
        }
      }

      newUserRecord = await admin.auth().createUser({
        email: email,
        password: password,
        displayName: fullName,
      });

      await db.doc(`profiles/${newUserRecord.uid}`).set({
        id: newUserRecord.uid,
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
        uid: newUserRecord.uid,
      };
    } catch (error: any)
    {
      logger.error("Error creating user:", error);
      // Clean up failed user creation in Auth
      if (newUserRecord?.uid) {
        await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord.uid, e));
      }

      if (error instanceof onCall.HttpsError) {
        throw error;
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
      
      // Ensure user is being deleted from the same organization structure
      if (callingUserData.role !== 'superadmin') {
         const callerParentOrgId = (await db.doc(`organizations/${callingUserData.organization_id}`).get()).data()?.parent_organization_id || callingUserData.organization_id;
         const targetOrgDoc = await db.doc(`organizations/${userToDeleteData?.organization_id}`).get();
         if (!targetOrgDoc.exists()) {
             throw new onCall.HttpsError("not-found", "Organization of user to delete not found.");
         }
         const targetParentOrgId = targetOrgDoc.data()?.parent_organization_id || userToDeleteData?.organization_id;
         
         if(callerParentOrgId !== targetParentOrgId) {
             throw new onCall.HttpsError("permission-denied", "You can only delete users from your own organization structure.");
         }
      }
      
      await admin.auth().deleteUser(uid);
      await db.doc(`profiles/${uid}`).delete();

      return {
        status: "success",
        message: `User ${uid} deleted successfully.`,
      };

    } catch (error: any) {
      logger.error("Error deleting user:", error);
      if (error instanceof onCall.HttpsError) {
        throw error;
      }
      throw new onCall.HttpsError("internal", error.message || "An unknown error occurred while deleting the user.");
    }
  }
);


export const createOutlet = onCall({ enforceAppCheck: false }, async (request) => {
    const { outletName, parentOrganizationId } = request.data;
    const callingUid = request.auth?.uid;

    if (!callingUid) {
      throw new onCall.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (!outletName || !parentOrganizationId) {
        throw new onCall.HttpsError("invalid-argument", "Outlet name and parent organization ID are required.");
    }
    
    const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
    const callingUserData = callingUserDoc.data();
    if (!callingUserData || (callingUserData.role !== "owner" && callingUserData.role !== "superadmin" && callingUserData.role !== "admin")) {
        throw new onCall.HttpsError("permission-denied", "You do not have permission to create outlets.");
    }
    
    const parentOrgDoc = await db.doc(`organizations/${parentOrganizationId}`).get();
    if (!parentOrgDoc.exists) {
        throw new onCall.HttpsError("not-found", "Parent organization not found.");
    }

    const orgsRef = db.collection("organizations");
    const orgDocRef = orgsRef.doc();
    
    await orgDocRef.set({
        name: outletName,
        name_lowercase: outletName.toLowerCase(),
        owner_id: parentOrgDoc.data()?.owner_id, // Inherit owner from parent
        parent_organization_id: parentOrganizationId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { status: "success", message: "Outlet created successfully.", id: orgDocRef.id };
});

export const deleteOutlet = onCall({ enforceAppCheck: false }, async (request) => {
    const { outletId } = request.data;
    const callingUid = request.auth?.uid;

    if (!callingUid) {
      throw new onCall.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    if (!outletId) {
        throw new onCall.HttpsError("invalid-argument", "Outlet ID is required.");
    }
    
    const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
    const callingUserData = callingUserDoc.data();
     if (!callingUserData || (callingUserData.role !== "owner" && callingUserData.role !== "superadmin" && callingUserData.role !== "admin")) {
        throw new onCall.HttpsError("permission-denied", "You do not have permission to delete outlets.");
    }

    const outletRef = db.doc(`organizations/${outletId}`);
    const outletDoc = await outletRef.get();
    if (!outletDoc.exists) {
        throw new onCall.HttpsError("not-found", "Outlet not found.");
    }
    const outletData = outletDoc.data();

    // Prevent deleting parent organization from here
    if (!outletData?.parent_organization_id) {
        throw new onCall.HttpsError("permission-denied", "Cannot delete the main organization from this interface.");
    }
    
    // Security check: ensure the caller belongs to the same parent organization
    if (callingUserData.role !== 'superadmin') {
      const parentOrgIdFromOutlet = outletData?.parent_organization_id;
      
      const callerOrgDoc = await db.doc(`organizations/${callingUserData.organization_id}`).get();
      if (!callerOrgDoc.exists()) {
          throw new onCall.HttpsError("not-found", "Caller's organization not found.");
      }
      const callerParentOrgId = callerOrgDoc.data()?.parent_organization_id || callingUserData.organization_id;

      if (callerParentOrgId !== parentOrgIdFromOutlet) {
          throw new onCall.HttpsError("permission-denied", "You can only delete outlets within your own organization structure.");
      }
    }
    
    await outletRef.delete();

    return { status: "success", message: "Outlet deleted successfully." };
});

    