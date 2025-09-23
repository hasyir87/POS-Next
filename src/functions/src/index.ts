
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import * as cors from "cors";

admin.initializeApp();
const db = admin.firestore();

// Inisialisasi CORS middleware
const corsMiddleware = cors({ origin: true });

// Helper untuk memverifikasi token otentikasi dari header
const getAuthenticatedUid = async (request: any): Promise<string> => {
  if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const idToken = request.headers.authorization.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    logger.error("Error verifying token:", error);
    throw new Error('Unauthorized');
  }
};


export const createOwner = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        const { email, password, fullName, organizationName } = req.body;

        if (!email || !password || !fullName || !organizationName) {
            res.status(400).json({ status: "error", message: "Missing required fields." });
            return;
        }
        if (password.length < 6) {
            res.status(400).json({ status: "error", message: "Password must be at least 6 characters long." });
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
                res.status(409).json({ status: "error", message: "Organization name is already in use.", field: 'organization' });
                return;
            }

            try {
                await admin.auth().getUserByEmail(email);
                res.status(409).json({ status: "error", message: "Email is already in use.", field: 'email' });
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

            res.status(200).json({
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
            res.status(500).json({ status: "error", message: error.message || "An unknown error occurred." });
        }
    });
});


export const createUser = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        let newUserRecord;
        try {
            const callingUid = await getAuthenticatedUid(req);
            const { email, password, fullName, role, organizationId } = req.body;
            
            if (!organizationId) {
                res.status(400).json({ status: 'error', message: 'Organization ID is required to create a user.' });
                return;
            }
            if (!email || !password || !fullName || !role) {
                res.status(400).json({ status: 'error', message: 'Missing required fields.' });
                return;
            }
            
            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();

            if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
                res.status(403).json({ status: 'error', message: 'You do not have permission to create users.' });
                return;
            }

            if (callingUserData.role !== "superadmin") {
                const callerParentOrgId = (await db.doc(`organizations/${callingUserData.organization_id}`).get()).data()?.parent_organization_id || callingUserData.organization_id;
                const targetParentOrgId = (await db.doc(`organizations/${organizationId}`).get()).data()?.parent_organization_id || organizationId;
                if (callerParentOrgId !== targetParentOrgId) {
                    res.status(403).json({ status: 'error', message: 'You can only create users for your own organization structure.' });
                    return;
                }
            }
            
            try {
                await admin.auth().getUserByEmail(email);
                res.status(409).json({ status: 'error', message: 'Email is already in use.' });
                return;
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

            res.status(200).json({
                status: "success",
                message: `User ${fullName} created successfully.`,
                uid: newUserRecord.uid,
            });
        } catch (error: any) {
            logger.error("Error creating user:", error);
            if (newUserRecord?.uid) {
                await admin.auth().deleteUser(newUserRecord.uid).catch(e => logger.error("Cleanup failed for UID:", newUserRecord.uid, e));
            }
            if (error.message === 'Unauthorized') {
                 res.status(401).json({ status: 'error', message: 'The function must be called while authenticated.' });
            } else {
                 res.status(500).json({ status: 'error', message: error.message || "An unknown error occurred." });
            }
        }
    });
});


export const deleteUser = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        
        try {
            const callingUid = await getAuthenticatedUid(req);
            const { uid } = req.body;

            if (uid === callingUid) {
                res.status(400).json({ status: 'error', message: 'You cannot delete your own account.' });
                return;
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();

            if (!callingUserData || !['owner', 'admin', 'superadmin'].includes(callingUserData.role)) {
                res.status(403).json({ status: 'error', message: 'You do not have permission to delete users.' });
                return;
            }
            
            const userToDeleteDoc = await db.doc(`profiles/${uid}`).get();
            if (!userToDeleteDoc.exists) {
                res.status(404).json({ status: 'error', message: 'User to delete not found in Firestore.' });
                return;
            }
            const userToDeleteData = userToDeleteDoc.data();

            if (userToDeleteData?.role === 'owner' && callingUserData.role !== 'superadmin') {
                res.status(403).json({ status: 'error', message: 'Owners cannot delete other owners.' });
                return;
            }
            if (callingUserData.role === 'admin' && ['owner', 'admin'].includes(userToDeleteData?.role)) {
                res.status(403).json({ status: 'error', message: 'Admins cannot delete owners or other admins.' });
                return;
            }

            await admin.auth().deleteUser(uid);
            await db.doc(`profiles/${uid}`).delete();

            res.status(200).json({ status: "success", message: `User ${uid} deleted successfully.` });
        } catch (error: any) {
            logger.error("Error deleting user:", error);
            if (error.message === 'Unauthorized') {
                 res.status(401).json({ status: 'error', message: 'The function must be called while authenticated.' });
            } else {
                res.status(500).json({ status: 'error', message: error.message || 'An unknown error occurred while deleting the user.' });
            }
        }
    });
});


export const createOutlet = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        
        try {
            const callingUid = await getAuthenticatedUid(req);
            const { outletName, parentOrganizationId } = req.body;

            if (!outletName || !parentOrganizationId) {
                res.status(400).json({ status: 'error', message: 'Outlet name and parent organization ID are required.' });
                return;
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin', 'admin'].includes(callingUserData.role)) {
                res.status(403).json({ status: 'error', message: 'You do not have permission to create outlets.' });
                return;
            }

            const parentOrgDoc = await db.doc(`organizations/${parentOrganizationId}`).get();
            if (!parentOrgDoc.exists) {
                res.status(404).json({ status: 'error', message: 'Parent organization not found.' });
                return;
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

            res.status(200).json({ status: "success", message: "Outlet created successfully.", id: orgDocRef.id });
        } catch (error: any) {
            logger.error("Error creating outlet:", error);
            if (error.message === 'Unauthorized') {
                 res.status(401).json({ status: 'error', message: 'The function must be called while authenticated.' });
            } else {
                 res.status(500).json({ status: 'error', message: error.message || 'An unknown error occurred.' });
            }
        }
    });
});

export const updateOutlet = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }
        
        try {
            const callingUid = await getAuthenticatedUid(req);
            const { outletId, outletName } = req.body;

            if (!outletId || !outletName) {
                res.status(400).json({ status: 'error', message: 'Outlet ID and outlet name are required.' });
                return;
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin', 'admin'].includes(callingUserData.role)) {
                res.status(403).json({ status: 'error', message: 'You do not have permission to update outlets.' });
                return;
            }

            const outletRef = db.doc(`organizations/${outletId}`);
            await outletRef.update({
                name: outletName,
                name_lowercase: outletName.toLowerCase(),
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });

            res.status(200).json({ status: "success", message: "Outlet updated successfully." });
        } catch (error: any) {
            logger.error("Error updating outlet:", error);
            if (error.message === 'Unauthorized') {
                 res.status(401).json({ status: 'error', message: 'The function must be called while authenticated.' });
            } else {
                 res.status(500).json({ status: 'error', message: error.message || 'An unknown error occurred.' });
            }
        }
    });
});


export const deleteOutlet = onRequest({ enforceAppCheck: false }, (req, res) => {
    corsMiddleware(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send('Method Not Allowed');
            return;
        }

        try {
            const callingUid = await getAuthenticatedUid(req);
            const { outletId } = req.body;
            
            if (!outletId) {
                res.status(400).json({ status: 'error', message: 'Outlet ID is required.' });
                return;
            }

            const callingUserDoc = await db.doc(`profiles/${callingUid}`).get();
            const callingUserData = callingUserDoc.data();
            if (!callingUserData || !['owner', 'superadmin', 'admin'].includes(callingUserData.role)) {
                res.status(403).json({ status: 'error', message: 'You do not have permission to delete outlets.' });
                return;
            }

            const outletRef = db.doc(`organizations/${outletId}`);
            const outletDoc = await outletRef.get();
            if (!outletDoc.exists) {
                res.status(404).json({ status: 'error', message: 'Outlet not found.' });
                return;
            }
            const outletData = outletDoc.data();

            if (!outletData?.parent_organization_id) {
                res.status(403).json({ status: 'error', message: 'Cannot delete the main organization from this interface.' });
                return;
            }
            
            await outletRef.delete();

            res.status(200).json({ status: "success", message: "Outlet deleted successfully." });
        } catch (error: any) {
            logger.error("Error deleting outlet:", error);
            if (error.message === 'Unauthorized') {
                 res.status(401).json({ status: 'error', message: 'The function must be called while authenticated.' });
            } else {
                 res.status(500).json({ status: 'error', message: error.message || 'An unknown error occurred.' });
            }
        }
    });
});

    