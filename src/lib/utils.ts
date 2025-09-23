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

  // Correct URL format for Firebase App Hosting with Next.js
  const url = `/api/${functionName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Check if the response is successful, but also if it has content
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            // If response is not JSON, use the status text
            errorMessage = response.statusText;
        }
        throw new Error(errorMessage);
    }
    
    // Handle cases where the response might be empty (e.g., for a 204 No Content)
    const responseText = await response.text();
    if (!responseText) {
        return { status: "success", message: "Operation successful with no content." };
    }
    
    return JSON.parse(responseText);

  } catch (error) {
    console.error(`Fetch error for ${functionName}:`, error);
    // Re-throw the error to be caught by the calling function
    throw error;
  }
}
