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
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";


initializeApp();
const db = getFirestore();
const auth = getAuth();

// Wrapper untuk menangani otentikasi dan error pada fungsi onCall
const createCallable = (handler: (data: any, context: any) => Promise<any>) => {
  return onCall(async (request) => {
    try {
      // Panggil handler asli dengan data dan konteks
      const result = await handler(request.data, request);
      return result;
    } catch (error: any) {
        logger.error("Function Error:", {
            message: error.message,
            stack: error.stack,
            details: error.details,
        });

        // Jika error sudah berupa HttpsError, lempar kembali
        if (error instanceof HttpsError) {
            throw error;
        }
        
        // Bungkus error umum ke dalam HttpsError agar bisa diterima klien
        throw new HttpsError("internal", error.message || "An unexpected error occurred.");
    }
  });
};


// Fungsi untuk membuat Owner baru saat registrasi
export const createOwner = createCallable(async (data) => {
  const {email, password, fullName, organizationName} = data;

  if (!email || !password || !fullName || !organizationName) {
    throw new HttpsError(
      "invalid-argument",
      "Data tidak lengkap untuk membuat akun pemilik.",
    );
  }
  
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

  return {
    status: "success",
    message: `Owner ${fullName} dan organisasi ${organizationName} berhasil dibuat.`,
    uid: userRecord.uid,
    organizationId: organizationRef.id,
  };
});

// Fungsi untuk membuat Pengguna/Staf baru
export const createUser = createCallable(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk membuat pengguna.");
    }
  const {email, password, fullName, role, organizationId} = data;
  
  const userRecord = await auth.createUser({email, password, displayName: fullName});

  await db.collection("profiles").doc(userRecord.uid).set({
    email,
    full_name: fullName,
    role,
    organization_id: organizationId,
    created_at: FieldValue.serverTimestamp(),
  });

  return {status: "success", uid: userRecord.uid};
});

// Fungsi untuk menghapus Pengguna/Staf
export const deleteUser = createCallable(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk menghapus pengguna.");
    }
  const {uid} = data;
  
  await auth.deleteUser(uid);
  await db.collection("profiles").doc(uid).delete();
  return {status: "success"};
});

// Fungsi untuk membuat outlet baru
export const createOutlet = createCallable(async (data, context) => {
    if (!context.auth) {
        throw new HttpsError("unauthenticated", "Anda harus login untuk membuat outlet.");
    }
  const {outletName} = data;
  const callerUid = context.auth.uid;

  const callerProfileSnap = await db.collection("profiles").doc(callerUid).get();
  if (!callerProfileSnap.exists) {
      throw new HttpsError("not-found", "Profil pemanggil tidak ditemukan.");
  }
  const callerProfile = callerProfileSnap.data();
  if (callerProfile?.role !== "owner" && callerProfile?.role !== "superadmin") {
      throw new HttpsError("permission-denied", "Hanya pemilik yang dapat membuat outlet.");
  }

  const newOutletRef = await db.collection("organizations").add({
      name: outletName,
      owner_id: callerUid,
      parent_organization_id: callerProfile.organization_id, // tautkan ke organisasi induk
      is_setup_complete: false,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
  });
  return {status: "success", outletId: newOutletRef.id};
});


// Fungsi untuk mengubah outlet
export const updateOutlet = createCallable(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Authentication required.");
  const {outletId, outletName} = data;
  // Tambahkan validasi izin di sini jika perlu
  await db.collection("organizations").doc(outletId).update({
      name: outletName,
      updated_at: FieldValue.serverTimestamp(),
  });
  return {status: "success"};
});


// Fungsi untuk menghapus outlet
export const deleteOutlet = createCallable(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Authentication required.");
  const {outletId} = data;
  // Tambahkan validasi izin di sini jika perlu
  // Hati-hati: Fungsi ini hanya menghapus dokumen outlet.
  // Data lain yang terkait (produk, transaksi) tidak ikut terhapus.
  await db.collection("organizations").doc(outletId).delete();
  return {status: "success"};
});
