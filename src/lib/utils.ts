import { getAuth } from 'firebase/auth';
import { firebaseApp } from './firebase/config';

export async function callFirebaseFunction(functionName: string, body: any) {
    const auth = getAuth(firebaseApp);
    const user = auth.currentUser;

    if (!user) {
        throw new Error("User not authenticated.");
    }

    const token = await user.getIdToken();

    const response = await fetch(`/api/functions/${functionName}`, {
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
            throw new Error(response.statusText || 'An unknown network error occurred.');
        }
        throw new Error(errorData.message || 'An unknown error occurred.');
    }

    // Handle cases where the response might be empty (e.g., for a 204 No Content)
    const responseText = await response.text();
    if (!responseText) {
        return { status: 'success' };
    }
    
    return await JSON.parse(responseText);
}
