// This file is machine-generated - edit with caution!
'use server';
/**
 * @fileOverview A code explanation AI agent.
 *
 * - codeExplanation - A function that handles the code explanation process.
 * - CodeExplanationInput - The input type for the codeExplanation function.
 * - CodeExplanationOutput - The return type for the codeExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeExplanationInputSchema = z.object({
  code: z.string().describe('The C++ code to be explained.'),
});
export type CodeExplanationInput = z.infer<typeof CodeExplanationInputSchema>;

const CodeExplanationOutputSchema = z.object({
  explanation: z.string().describe('The plain language explanation of the code.'),
});
export type CodeExplanationOutput = z.infer<typeof CodeExplanationOutputSchema>;

export async function codeExplanation(input: CodeExplanationInput): Promise<CodeExplanationOutput> {
  return codeExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeExplanationPrompt',
  input: {schema: CodeExplanationInputSchema},
  output: {schema: CodeExplanationOutputSchema},
  prompt: `You are an expert C++ developer. Please provide a plain language explanation of the following C++ code:\n\n{{code}}`,
});

const codeExplanationFlow = ai.defineFlow(
  {
    name: 'codeExplanationFlow',
    inputSchema: CodeExplanationInputSchema,
    outputSchema: CodeExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
