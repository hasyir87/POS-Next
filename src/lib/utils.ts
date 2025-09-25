
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebase/config';

// Inisialisasi Firebase Functions
const functions = getFunctions(firebaseApp, 'us-central1');

/**
 * Memanggil Cloud Function (onCall) dengan aman.
 * @param functionName Nama fungsi yang akan dipanggil.
 * @param body Data yang akan dikirim ke fungsi.
 * @returns Promise yang resolve dengan hasil dari fungsi.
 */
export async function callFirebaseFunction(functionName: string, body: any) {
    try {
        const callableFunction = httpsCallable(functions, functionName);
        const result = await callableFunction(body);
        
        // v2 onCall functions wrap the result in a 'data' property.
        // We handle cases where it might or might not be wrapped.
        const responseData = (result.data as any)?.data || result.data;

        if ((result.data as any)?.status === 'error') {
             throw new Error((result.data as any).message || 'An unknown error occurred in the function.');
        }

        return responseData;
    } catch (error: any) {
        console.error(`Error calling function '${functionName}':`, error);
        // Melempar error dengan pesan yang lebih informatif dari backend
        throw new Error(error.message || `An unknown error occurred while calling ${functionName}.`);
    }
}
