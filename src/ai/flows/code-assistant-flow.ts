'use server';
/**
 * @fileOverview An AI flow for assisting with code understanding and improvement.
 *
 * - assistWithCode - Analyzes a code snippet based on a specific request type.
 */
import { ai } from '@/ai/genkit';
import { CodeAssistantInputSchema, CodeAssistantOutputSchema, CodeAssistantInput, CodeAssistantOutput } from '@/ai/types';

const assistantPrompt = ai.definePrompt({
    name: 'codeAssistantPrompt',
    input: { schema: CodeAssistantInputSchema },
    output: { schema: CodeAssistantOutputSchema },
    prompt: `You are an expert programming tutor. The user has provided a snippet of {{language}} code and requires assistance.

    Full code context:
    \`\`\`{{language}}
    {{{code}}}
    \`\`\`

    User's selected code snippet to analyze:
    \`\`\`{{language}}
    {{{selectedCode}}}
    \`\`\`

    The user's request is to: **{{requestType}}**.

    Your task is to respond to the user's request in a helpful and educational manner.
    - If the request is 'explain': Provide a clear, concise explanation of what the selected code does in the 'response' field. Do not suggest new code.
    - If the request is 'suggest_improvement': Analyze the selected code for clarity, efficiency, or best practices. Explain your suggestion in the 'response' field and provide the improved code in the 'suggestedCode' field. If no improvement is possible, say so in the 'response' field and leave 'suggestedCode' empty.
    - If the request is 'find_bugs': Analyze the selected code for potential bugs or errors. Explain the bug in the 'response' field and provide the corrected code in the 'suggestedCode' field. If no bugs are found, state that clearly in the 'response' field and leave 'suggestedCode' empty.

    Always provide a helpful textual response in the 'response' field. Only provide 'suggestedCode' when it is relevant to the request.
    `,
});


const codeAssistantFlow = ai.defineFlow(
  {
    name: 'codeAssistantFlow',
    inputSchema: CodeAssistantInputSchema,
    outputSchema: CodeAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await assistantPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a response for the code assistance request.');
    }
    return output;
  }
);

// Wrapper function to be called from the UI
export async function assistWithCode(input: CodeAssistantInput): Promise<CodeAssistantOutput> {
  return await codeAssistantFlow(input);
}
