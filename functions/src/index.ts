/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {initializeApp} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as cors from "cors";

const corsHandler = cors({origin: true});

initializeApp();
const db = getFirestore();
const auth = getAuth();

// Helper untuk mengekstrak token dari header Authorization
const getUidFromRequest = async (request: any): Promise<string | null> => {
    if (!request.headers.authorization || !request.headers.authorization.startsWith("Bearer ")) {
        return null;
    }
    const idToken = request.headers.authorization.split("Bearer ")[1];
    try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken.uid;
    } catch (error) {
        logger.error("Error verifying token:", error);
        return null;
    }
};

export const signInUser = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const {email} = request.body;
        try {
            const userRecord = await auth.getUserByEmail(email);
            const customToken = await auth.createCustomToken(userRecord.uid);
            response.status(200).json({customToken});
        } catch (error: any) {
            logger.error("Error signing in user:", error);
            if (error.code === "auth/user-not-found") {
                response.status(404).json({error: "Pengguna tidak ditemukan."});
            } else {
                response.status(500).json({error: "Terjadi kesalahan saat login."});
            }
        }
    });
});


export const createOwner = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }

        const {email, password, fullName, organizationName} = request.body;

        if (!email || !password || !fullName || !organizationName) {
            response.status(400).json({error: "Data tidak lengkap untuk membuat akun pemilik."});
            return;
        }

        try {
            const userRecord = await auth.createUser({email, password});
            const organizationRef = db.collection("organizations").doc();
            const batch = db.batch();

            const profileRef = db.collection("profiles").doc(userRecord.uid);
            batch.set(profileRef, {
                email,
                full_name: fullName,
                organization_id: organizationRef.id,
                role: "owner",
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp(),
            });

            batch.set(organizationRef, {
                name: organizationName,
                owner_id: userRecord.uid,
                is_setup_complete: false,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp(),
            });

            await batch.commit();

            response.status(201).json({
                status: "success",
                message: `Owner ${fullName} dan organisasi ${organizationName} berhasil dibuat.`,
                uid: userRecord.uid,
                organizationId: organizationRef.id,
            });
        } catch (error: any) {
            logger.error("Error creating owner:", error);
            response.status(500).json({error: error.message});
        }
    });
});


export const createUser = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const uid = await getUidFromRequest(request);
        if (!uid) {
            response.status(401).json({error: "Unauthorized"});
            return;
        }

        const {email, password, fullName, role, organizationId} = request.body;
        try {
            const userRecord = await auth.createUser({email, password, displayName: fullName});
            await db.collection("profiles").doc(userRecord.uid).set({
                email,
                full_name: fullName,
                role,
                organization_id: organizationId,
                created_at: FieldValue.serverTimestamp(),
            });
            response.status(201).json({status: "success", uid: userRecord.uid});
        } catch (error: any) {
            logger.error("Error creating user:", error);
            response.status(500).json({error: error.message});
        }
    });
});


export const deleteUser = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const callerUid = await getUidFromRequest(request);
        if (!callerUid) {
            response.status(401).json({error: "Unauthorized"});
            return;
        }

        const {uid} = request.body;
        try {
            await auth.deleteUser(uid);
            await db.collection("profiles").doc(uid).delete();
            response.status(200).json({status: "success"});
        } catch (error: any) {
            logger.error("Error deleting user:", error);
            response.status(500).json({error: error.message});
        }
    });
});


export const createOutlet = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const callerUid = await getUidFromRequest(request);
        if (!callerUid) {
            response.status(401).json({error: "Unauthorized"});
            return;
        }

        const {outletName} = request.body;
        try {
            const callerProfileSnap = await db.collection("profiles").doc(callerUid).get();
            if (!callerProfileSnap.exists) {
                response.status(404).json({error: "Profil pemanggil tidak ditemukan."});
                return;
            }
            const callerProfile = callerProfileSnap.data();
            if (callerProfile?.role !== "owner" && callerProfile?.role !== "superadmin") {
                response.status(403).json({error: "Hanya pemilik yang dapat membuat outlet."});
                return;
            }

            const newOutletRef = await db.collection("organizations").add({
                name: outletName,
                owner_id: callerUid,
                parent_organization_id: callerProfile.organization_id,
                is_setup_complete: false,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp(),
            });
            response.status(201).json({status: "success", outletId: newOutletRef.id});
        } catch (error: any) {
            logger.error("Error creating outlet:", error);
            response.status(500).json({error: error.message});
        }
    });
});


export const updateOutlet = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const callerUid = await getUidFromRequest(request);
        if (!callerUid) {
            response.status(401).json({error: "Unauthorized"});
            return;
        }

        const {outletId, outletName} = request.body;
        try {
            await db.collection("organizations").doc(outletId).update({
                name: outletName,
                updated_at: FieldValue.serverTimestamp(),
            });
            response.status(200).json({status: "success"});
        } catch (error: any) {
            logger.error("Error updating outlet:", error);
            response.status(500).json({error: error.message});
        }
    });
});


export const deleteOutlet = onRequest((request, response) => {
    corsHandler(request, response, async () => {
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        const callerUid = await getUidFromRequest(request);
        if (!callerUid) {
            response.status(401).json({error: "Unauthorized"});
            return;
        }

        const {outletId} = request.body;
        try {
            await db.collection("organizations").doc(outletId).delete();
            response.status(200).json({status: "success"});
        } catch (error: any) {
            logger.error("Error deleting outlet:", error);
            response.status(500).json({error: error.message});
        }
    });
});
