
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import cors from 'cors';

admin.initializeApp();
const db = admin.firestore();

const corsMiddleware = cors({ origin: true });

const getAuthenticatedUid = async (request: functions.https.Request): Promise<string> => {
    const authorization = request.headers.authorization;
    if (!authorization || !authorization.startsWith('Bearer ')) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const idToken = authorization.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        throw new functions.https.HttpsError("unauthenticated", "Invalid auth token.", error);
    }
};

export const createOwner = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        const { email, password, fullName, organizationName } = request.body;

        if (!email || !password || !fullName || !organizationName) {
            response.status(400).json({ status: "error", message: "Missing required fields." });
            return;
        }
        if (password.length < 6) {
            response.status(400).json({ status: "error", message: "Password must be at least 6 characters long." });
            return;
        }

        const orgsRef = db.collection("organizations");
        const usersRef = db.collection("profiles");
        const organizationNameLower = organizationName.toLowerCase();

        let newUserRecord;
        try {
            const orgQuery = orgsRef.where("name_lowercase", "==", organizationNameLower);
            const orgSnapshot = await orgQuery.get();
            if (!orgSnapshot.empty) {
                response.status(409).json({ status: "error", message: "Organization name is already in use." });
                return;
            }

            try {
                await admin.auth().getUserByEmail(email);
                response.status(409).json({ status: "error", message: "Email is already in use." });
                return;
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

            response.status(200).json({
                status: "success",
                message: `Owner ${fullName} and organization ${organizationName} created successfully.`,
                uid: newUserRecord.uid,
                organizationId: orgDocRef.id,
            });

        } catch (error: any) {
            logger.error("Error creating owner:", error);
            if (newUserRecord?.uid) {
                await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord!.uid, e));
            }
            response.status(500).json({ status: "error", message: error.message || "An unknown error occurred." });
        }
    });
});

export const createUser = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        let newUserRecord;
        try {
            const callingUid = await getAuthenticatedUid(request);
            const { email, password, fullName, role, organizationId } = request.body;

            if (!organizationId || !email || !password || !fullName || !role) {
                throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
            }
            
            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();

            if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
                throw new functions.https.HttpsError("permission-denied", "You do not have permission to create users.");
            }
            
            if (callingUserData.role !== 'superadmin' && callingUserData.organization_id !== organizationId) {
                throw new functions.https.HttpsError("permission-denied", "You can only create users for your own organization structure.");
            }
            
            try {
                await admin.auth().getUserByEmail(email);
                throw new functions.https.HttpsError("already-exists", "Email is already in use.");
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

            response.status(200).json({
                status: "success",
                message: `User ${fullName} created successfully.`,
                uid: newUserRecord.uid,
            });
        } catch (error: any) {
            logger.error("Error creating user:", error);
            if (newUserRecord?.uid) {
                await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord.uid, e));
            }
            const status = error.httpErrorCode?.status || 500;
            const message = error.message || "An unknown error occurred.";
            response.status(status).json({ status: "error", message });
        }
    });
});

export const deleteUser = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const callingUid = await getAuthenticatedUid(request);
            const { uid } = request.body;

            if (uid === callingUid) {
                throw new functions.https.HttpsError("invalid-argument", "You cannot delete your own account.");
            }
            
            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();

            if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
                throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete users.");
            }
            
            const userToDeleteDoc = await db.doc(`profiles/${uid}`).get();
            if (!userToDeleteDoc.exists) {
                throw new functions.https.HttpsError("not-found", "User to delete not found in Firestore.");
            }
            const userToDeleteData = userToDeleteDoc.data();

            if (userToDeleteData?.role === 'owner' && callingUserData.role !== 'superadmin') {
                throw new functions.https.HttpsError("permission-denied", "Owners cannot delete other owners.");
            }
            if (callingUserData.role === 'admin' && ['owner', 'admin'].includes(userToDeleteData?.role)) {
                throw new functions.https.HttpsError("permission-denied", "Admins cannot delete owners or other admins.");
            }

            await admin.auth().deleteUser(uid);
            await db.doc(`profiles/${uid}`).delete();

            response.status(200).json({ status: "success", message: `User ${uid} deleted successfully.` });
        } catch (error: any) {
            logger.error("Error deleting user:", error);
            const status = error.httpErrorCode?.status || 500;
            const message = error.message || "An unknown error occurred.";
            response.status(status).json({ status: "error", message });
        }
    });
});

export const createOutlet = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const callingUid = await getAuthenticatedUid(request);
            const { outletName } = request.body;
            if (!outletName) {
                throw new functions.https.HttpsError("invalid-argument", "Outlet name is required.");
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
                throw new functions.https.HttpsError("permission-denied", "You do not have permission to create outlets.");
            }
            
            const rootOrgId = callingUserData.parent_organization_id || callingUserData.organization_id;
            if(!rootOrgId) {
                throw new functions.https.HttpsError("failed-precondition", "User has no root organization.");
            }

            const parentOrgDoc = await db.doc(`organizations/${rootOrgId}`).get();
            if (!parentOrgDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Parent organization not found.");
            }

            const orgsRef = db.collection("organizations");
            const orgDocRef = orgsRef.doc();
            await orgDocRef.set({
                name: outletName,
                name_lowercase: outletName.toLowerCase(),
                owner_id: parentOrgDoc.data()?.owner_id,
                parent_organization_id: rootOrgId,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            response.status(200).json({ status: "success", message: "Outlet created successfully.", id: orgDocRef.id });
        } catch (error: any) {
            logger.error("Error creating outlet:", error);
            const status = error.httpErrorCode?.status || 500;
            const message = error.message || "An unknown error occurred.";
            response.status(status).json({ status: "error", message });
        }
    });
});

export const updateOutlet = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const callingUid = await getAuthenticatedUid(request);
            const { outletId, outletName } = request.body;
            if (!outletId || !outletName) {
                throw new functions.https.HttpsError("invalid-argument", "Outlet ID and outlet name are required.");
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
                throw new functions.https.HttpsError("permission-denied", "You do not have permission to update outlets.");
            }
            
            // Further permission check: ensure the user can edit this outlet
            const outletRef = db.doc(`organizations/${outletId}`);
            const outletDoc = await outletRef.get();
            if(!outletDoc.exists) throw new functions.https.HttpsError("not-found", "Outlet not found.");

            await outletRef.update({
                name: outletName,
                name_lowercase: outletName.toLowerCase(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            response.status(200).json({ status: "success", message: "Outlet updated successfully." });
        } catch (error: any) {
            logger.error("Error updating outlet:", error);
            const status = error.httpErrorCode?.status || 500;
            const message = error.message || "An unknown error occurred.";
            response.status(status).json({ status: "error", message });
        }
    });
});

export const deleteOutlet = functions.https.onRequest((request, response) => {
    corsMiddleware(request, response, async () => {
        if (request.method !== 'POST') {
            response.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const callingUid = await getAuthenticatedUid(request);
            const { outletId } = request.body;
            if (!outletId) {
                throw new functions.https.HttpsError("invalid-argument", "Outlet ID is required.");
            }
            
            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin'].includes(callingUserData.role)) {
                throw new functions.https.HttpsError("permission-denied", "You do not have permission to delete outlets.");
            }

            const outletRef = db.doc(`organizations/${outletId}`);
            const outletDoc = await outletRef.get();
            if (!outletDoc.exists) {
                throw new functions.https.HttpsError("not-found", "Outlet not found.");
            }
            const outletData = outletDoc.data();

            if (!outletData?.parent_organization_id) {
                throw new functions.https.HttpsError("permission-denied", "Cannot delete the main organization from this interface.");
            }
            
            await outletRef.delete();

            response.status(200).json({ status: "success", message: "Outlet deleted successfully." });
        } catch (error: any) {
            logger.error("Error deleting outlet:", error);
            const status = error.httpErrorCode?.status || 500;
            const message = error.message || "An unknown error occurred.";
            response.status(status).json({ status: "error", message });
        }
    });
});
