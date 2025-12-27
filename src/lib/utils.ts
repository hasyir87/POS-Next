
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase/config';

// Mendapatkan instance Firebase Functions
const functions = getFunctions(firebaseApp, 'us-central1');

/**
 * Memanggil Cloud Function (onCall) dengan aman menggunakan Firebase SDK.
 * @param functionName Nama fungsi yang akan dipanggil.
 * @param data Data yang akan dikirim ke fungsi.
 * @returns Promise yang resolve dengan hasil dari fungsi.
 */
export async function callFirebaseFunction(functionName: string, data: any) {
    try {
        const callable = httpsCallable(functions, functionName);
        const result = await callable(data);
        return result.data;
    } catch (error: any) {
        console.error(`Error calling function '${functionName}':`, error);
        // Melempar error dengan pesan yang lebih informatif dari Firebase
        throw new Error(error.message || `An unknown error occurred while calling ${functionName}.`);
    }
}
