
import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase/config';

// Mendapatkan URL dasar untuk fungsi berdasarkan lingkungan
const getFunctionsBaseUrl = () => {
    // Di lingkungan produksi/staging, kita akan menggunakan URL asli.
    // Di lokal, kita akan menargetkan emulator.
    const isEmulator = process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && window.location.hostname === 'localhost';
    if (isEmulator) {
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        // Port default untuk emulator functions adalah 5001
        return `http://127.0.0.1:5001/${projectId}/us-central1`;
    }
    // Ganti 'scentpos' dengan ID proyek Firebase Anda jika berbeda
    return `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net`;
}

/**
 * Memanggil Cloud Function (onRequest) dengan aman menggunakan fetch.
 * @param functionName Nama fungsi yang akan dipanggil (tanpa path).
 * @param body Data yang akan dikirim dalam body permintaan.
 * @returns Promise yang resolve dengan hasil dari fungsi.
 */
export async function callFirebaseFunction(functionName: string, body: any) {
    const baseUrl = getFunctionsBaseUrl();
    const url = `${baseUrl}/${functionName}`;
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    let token;
    if (user) {
        token = await user.getIdToken();
    }
    
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        });

        const responseData = await response.json();

        if (!response.ok) {
            // Melempar error dengan pesan dari backend jika ada
            throw new Error(responseData.error || `HTTP error! status: ${response.status}`);
        }

        return responseData;
    } catch (error: any) {
        console.error(`Error calling function '${functionName}':`, error);
        throw new Error(error.message || `An unknown error occurred while calling ${functionName}.`);
    }
}
