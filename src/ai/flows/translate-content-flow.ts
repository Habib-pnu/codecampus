'use server';
/**
 * @fileOverview An AI flow for translating text content.
 *
 * - translateContent - Translates text to a target language.
 */
import { ai } from '@/ai/genkit';
import { TranslateContentInputSchema, TranslateContentOutputSchema, TranslateContentInput, TranslateContentOutput } from '@/ai/types';

const translationPrompt = ai.definePrompt({
    name: 'translationPrompt',
    input: { schema: TranslateContentInputSchema },
    output: { schema: TranslateContentOutputSchema },
    prompt: `Translate the following text into {{targetLanguage}}. Provide only the translated text in your response.

    Text to translate:
    {{{text}}}
    `,
});

const translateContentFlow = ai.defineFlow(
  {
    name: 'translateContentFlow',
    inputSchema: TranslateContentInputSchema,
    outputSchema: TranslateContentOutputSchema,
  },
  async (input) => {
    const { output } = await translationPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a translation.');
    }
    return output;
  }
);

// Wrapper function to be called from the UI
export async function translateContent(input: TranslateContentInput): Promise<TranslateContentOutput> {
  return await translateContentFlow(input);
}
