
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const createOwner = onCall(async (request) => {
    const { email, password, fullName, organizationName } = request.data;

    if (!email || !password || !fullName || !organizationName) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (password.length < 6) {
        throw new HttpsError("invalid-argument", "Password must be at least 6 characters long.");
    }

    const orgsRef = db.collection("organizations");
    const usersRef = db.collection("profiles");
    const organizationNameLower = organizationName.toLowerCase();

    let newUserRecord;
    try {
        const orgQuery = orgsRef.where("name_lowercase", "==", organizationNameLower);
        const orgSnapshot = await orgQuery.get();
        if (!orgSnapshot.empty) {
            throw new HttpsError("already-exists", "Organization name is already in use.");
        }

        try {
            await admin.auth().getUserByEmail(email);
            throw new HttpsError("already-exists", "Email is already in use.");
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error;
        }

        newUserRecord = await admin.auth().createUser({ email, password, displayName: fullName });

        const batch = db.batch();
        const orgDocRef = orgsRef.doc();
        batch.set(orgDocRef, {
            name: organizationName,
            name_lowercase: organizationNameLower,
            owner_id: newUserRecord.uid,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        const profileDocRef = usersRef.doc(newUserRecord.uid);
        batch.set(profileDocRef, {
            id: newUserRecord.uid,
            email,
            full_name: fullName,
            organization_id: orgDocRef.id,
            role: 'owner',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

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
        if (newUserRecord?.uid) {
            await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord!.uid, e));
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});


export const createUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { email, password, fullName, role, organizationId } = request.data;
    if (!organizationId || !email || !password || !fullName || !role) {
        throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    
    let newUserRecord;
    try {
        const callingUid = request.auth.uid;
        const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
        const callingUserData = callingUserDoc.data();

        if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
            throw new HttpsError("permission-denied", "You do not have permission to create users.");
        }

        // In a multi-tenant setup, ensure user is created within the correct organizational structure
        if (callingUserData.role !== 'superadmin' && callingUserData.organization_id !== organizationId) {
             const callerOrg = await db.doc(`organizations/${callingUserData.organization_id}`).get();
             const targetOrg = await db.doc(`organizations/${organizationId}`).get();
             const callerRootId = callerOrg.data()?.parent_organization_id || callerOrg.id;
             const targetRootId = targetOrg.data()?.parent_organization_id || targetOrg.id;
             if(callerRootId !== targetRootId) {
                throw new HttpsError("permission-denied", "You can only create users for your own organization structure.");
             }
        }
        
        try {
            await admin.auth().getUserByEmail(email);
            throw new HttpsError("already-exists", "Email is already in use.");
        } catch (error: any) {
            if (error.code !== 'auth/user-not-found') throw error;
        }

        newUserRecord = await admin.auth().createUser({ email, password, displayName: fullName });

        await db.doc(`profiles/${newUserRecord.uid}`).set({
            id: newUserRecord.uid,
            email,
            full_name: fullName,
            role,
            organization_id: organizationId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
            status: "success",
            message: `User ${fullName} created successfully.`,
            uid: newUserRecord.uid,
        };
    } catch (error: any) {
        logger.error("Error creating user:", error);
        if (newUserRecord?.uid) {
            await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord.uid, e));
        }
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});


export const deleteUser = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { uid } = request.data;
    const callingUid = request.auth.uid;

    if (uid === callingUid) {
        throw new HttpsError("invalid-argument", "You cannot delete your own account.");
    }

    try {
        const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
        const callingUserData = callingUserDoc.data();

        if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
            throw new HttpsError("permission-denied", "You do not have permission to delete users.");
        }
        
        const userToDeleteDoc = await db.doc(`profiles/${uid}`).get();
        if (!userToDeleteDoc.exists) {
            throw new HttpsError("not-found", "User to delete not found in Firestore.");
        }
        const userToDeleteData = userToDeleteDoc.data();

        if (userToDeleteData?.role === 'owner' && callingUserData.role !== 'superadmin') {
            throw new HttpsError("permission-denied", "Owners cannot delete other owners.");
        }
        if (callingUserData.role === 'admin' && ['owner', 'admin'].includes(userToDeleteData?.role)) {
            throw new HttpsError("permission-denied", "Admins cannot delete owners or other admins.");
        }

        await admin.auth().deleteUser(uid);
        await db.doc(`profiles/${uid}`).delete();

        return { status: "success", message: `User ${uid} deleted successfully.` };
    } catch (error: any) {
        logger.error("Error deleting user:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred while deleting the user.");
    }
});


export const createOutlet = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    const { outletName, parentOrganizationId } = request.data;
    if (!outletName || !parentOrganizationId) {
        throw new HttpsError("invalid-argument", "Outlet name and parent organization ID are required.");
    }

    try {
        const callingUid = request.auth.uid;
        const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
        const callingUserData = callingUserDoc.data();
        if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
            throw new HttpsError("permission-denied", "You do not have permission to create outlets.");
        }

        const parentOrgDoc = await db.doc(`organizations/${parentOrganizationId}`).get();
        if (!parentOrgDoc.exists()) {
            throw new HttpsError("not-found", "Parent organization not found.");
        }

        const orgsRef = db.collection("organizations");
        const orgDocRef = orgsRef.doc();
        await orgDocRef.set({
            name: outletName,
            name_lowercase: outletName.toLowerCase(),
            owner_id: parentOrgDoc.data()?.owner_id,
            parent_organization_id: parentOrganizationId,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { status: "success", message: "Outlet created successfully.", id: orgDocRef.id };
    } catch (error: any) {
        logger.error("Error creating outlet:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});

export const updateOutlet = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    
    const { outletId, outletName } = request.data;
    if (!outletId || !outletName) {
        throw new HttpsError("invalid-argument", "Outlet ID and outlet name are required.");
    }

    try {
        const callingUid = request.auth.uid;
        const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
        const callingUserData = callingUserDoc.data();
        if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
            throw new HttpsError("permission-denied", "You do not have permission to update outlets.");
        }

        const outletRef = db.doc(`organizations/${outletId}`);
        await outletRef.update({
            name: outletName,
            name_lowercase: outletName.toLowerCase(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { status: "success", message: "Outlet updated successfully." };
    } catch (error: any) {
        logger.error("Error updating outlet:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});

export const deleteOutlet = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const { outletId } = request.data;
    if (!outletId) {
        throw new HttpsError("invalid-argument", "Outlet ID is required.");
    }
    
    try {
        const callingUid = request.auth.uid;
        const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
        const callingUserData = callingUserDoc.data();
        if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
            throw new HttpsError("permission-denied", "You do not have permission to delete outlets.");
        }

        const outletRef = db.doc(`organizations/${outletId}`);
        const outletDoc = await outletRef.get();
        if (!outletDoc.exists) {
            throw new HttpsError("not-found", "Outlet not found.");
        }
        const outletData = outletDoc.data();

        if (!outletData?.parent_organization_id) {
            throw new HttpsError("permission-denied", "Cannot delete the main organization from this interface.");
        }
        
        await outletRef.delete();

        return { status: "success", message: "Outlet deleted successfully." };
    } catch (error: any) {
        logger.error("Error deleting outlet:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", error.message || "An unknown error occurred.");
    }
});

    