import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase/config';

export async function callFirebaseFunction(functionName: string, body: any) {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const token = await user.getIdToken();
    const functionUrl = process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL;

    if (!functionUrl) {
        throw new Error("Firebase Functions URL is not configured.");
    }

    const url = `${functionUrl}/${functionName}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            throw new Error(response.statusText || `An unknown network error occurred (${response.status}).`);
        }
        throw new Error(errorData.message || `An unknown error occurred (${response.status}).`);
    }
    
    // Handle empty responses
    const responseText = await response.text();
    if (!responseText) {
        return { status: 'success' };
    }
    
    return JSON.parse(responseText);
}
