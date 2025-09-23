import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAuth } from 'firebase/auth';
import { firebaseApp } from "./firebase/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * A helper function to fetch data from a Cloud Function with authentication.
 * @param functionName The name of the Cloud Function to call.
 * @param body The data to send in the request body.
 * @param requireAuth Whether to include the auth token. Defaults to true.
 * @returns The JSON response from the function.
 */
export async function fetchWithAuth(functionName: string, body: object, requireAuth = true) {
  const auth = getAuth(firebaseApp);
  const user = auth.currentUser;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (requireAuth) {
    if (!user) {
      throw new Error("User is not authenticated.");
    }
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Construct the full Cloud Function URL
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = 'us-central1'; // Or your specific region
  if (!projectId) {
    throw new Error("Firebase Project ID is not configured in environment variables.");
  }
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Check if the response is successful, but also if it has content
    if (!response.ok) {
        let errorData: { message?: string } = {};
        try {
            errorData = await response.json();
        } catch (e) {
            // Response is not JSON or is empty
        }
        const errorMessage = errorData.message || response.statusText || `Request failed with status ${response.status}`;
        throw new Error(errorMessage);
    }
    
    // Handle cases where the response might be empty (e.g., for a 204 No Content)
    const responseText = await response.text();
    if (!responseText) {
        return { status: "success", message: "Operation successful with no content." };
    }
    
    return JSON.parse(responseText);

  } catch (error: any) {
    console.error(`Fetch error for ${functionName}:`, error);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
}
