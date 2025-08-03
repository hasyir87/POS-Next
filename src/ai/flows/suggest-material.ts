// This file holds the Genkit flow for suggesting the optimal material mix for custom fragrance orders.

'use server';

/**
 * @fileOverview An AI agent to suggest the optimal mix of available materials for custom fragrance orders.
 *
 * - suggestOptimalMaterialMix - A function that handles the suggestion of optimal material mix.
 * - SuggestMaterialInput - The input type for the suggestOptimalMaterialMix function.
 * - SuggestMaterialOutput - The return type for the suggestOptimalMaterialMix function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestMaterialInputSchema = z.object({
  fragranceOrder: z
    .string()
    .describe('The customer fragrance order to be fulfilled.'),
  availableMaterials: z
    .string()
    .describe(
      'JSON string of available materials in inventory, with name and quantity.'
    ),
});
export type SuggestMaterialInput = z.infer<typeof SuggestMaterialInputSchema>;

const SuggestMaterialOutputSchema = z.object({
  optimalMix: z
    .string()
    .describe(
      'The suggested optimal mix of materials to fulfill the fragrance order, considering available inventory.  Output should be a JSON string.'
    ),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested optimal mix.'),
});
export type SuggestMaterialOutput = z.infer<typeof SuggestMaterialOutputSchema>;

export async function suggestOptimalMaterialMix(
  input: SuggestMaterialInput
): Promise<SuggestMaterialOutput> {
  return suggestMaterialFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestMaterialPrompt',
  input: {
    schema: SuggestMaterialInputSchema,
  },
  output: {
    schema: SuggestMaterialOutputSchema,
  },
  prompt: `You are an expert fragrance mixologist. A customer has requested the following fragrance:

Fragrance Order: {{{fragranceOrder}}}

You have the following materials available in your inventory:

Available Materials: {{{availableMaterials}}}

Suggest the optimal mix of available materials to fulfill the customer's order. Consider the available quantities of each material.  Provide the optimal mix as a JSON string, and explain your reasoning. Return nothing but valid JSON in the format specified by the output schema. Ensure the JSON is valid.`,}
);

const suggestMaterialFlow = ai.defineFlow(
  {
    name: 'suggestMaterialFlow',
    inputSchema: SuggestMaterialInputSchema,
    outputSchema: SuggestMaterialOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
