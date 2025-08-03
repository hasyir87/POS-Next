"use server";

import { suggestOptimalMaterialMix, type SuggestMaterialInput } from '@/ai/flows/suggest-material';

// This is an RPC-style function that can be called from client components.
export async function getMaterialSuggestion(input: SuggestMaterialInput) {
  try {
    const result = await suggestOptimalMaterialMix(input);
    return { success: true, data: result };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: errorMessage };
  }
}
