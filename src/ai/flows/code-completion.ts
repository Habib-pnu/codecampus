'use server';

/**
 * @fileOverview Implements code autocompletion and suggestion for C++ code.
 *
 * - codeCompletion - A function that provides code autocompletion and suggestions.
 * - CodeCompletionInput - The input type for the codeCompletion function.
 * - CodeCompletionOutput - The return type for the codeCompletion function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CodeCompletionInputSchema = z.object({
  codePrefix: z
    .string()
    .describe('The partial C++ code the user has already typed.'),
});
export type CodeCompletionInput = z.infer<typeof CodeCompletionInputSchema>;

const CodeCompletionOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe('An array of code completion suggestions.'),
});
export type CodeCompletionOutput = z.infer<typeof CodeCompletionOutputSchema>;

export async function codeCompletion(input: CodeCompletionInput): Promise<CodeCompletionOutput> {
  return codeCompletionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'codeCompletionPrompt',
  input: {schema: CodeCompletionInputSchema},
  output: {schema: CodeCompletionOutputSchema},
  prompt: `You are a C++ code completion assistant. Given the following code prefix, provide a list of possible code completions and suggestions.

Code Prefix:
{{codePrefix}}

Suggestions (as a JSON array of strings):`,
});

const codeCompletionFlow = ai.defineFlow(
  {
    name: 'codeCompletionFlow',
    inputSchema: CodeCompletionInputSchema,
    outputSchema: CodeCompletionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
