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

  // Construct the URL based on the Firebase project ID and region.
  // This needs to be configured correctly for your project.
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const region = "us-central1"; // Ganti dengan region fungsi Anda jika berbeda
  const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  if (!response.ok) {
    // Melemparkan error dengan pesan dari backend jika ada
    throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
  }

  return responseData;
}
