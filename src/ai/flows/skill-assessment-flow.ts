
'use server';
/**
 * @fileOverview An AI flow for assessing code skill and providing recommendations.
 *
 * - assessCodeSkill - Analyzes code for skill dimensions and provides feedback.
 */
import { ai } from '@/ai/genkit';
import { SkillAssessmentInputSchema, SkillAssessmentOutputSchema, SkillAssessmentInput, SkillAssessmentOutput } from '@/ai/types';

const assessmentPrompt = ai.definePrompt({
    name: 'skillAssessmentPrompt',
    input: { schema: SkillAssessmentInputSchema },
    output: { schema: SkillAssessmentOutputSchema },
    prompt: `You are an expert programming instructor. Your task is to analyze the following {{language}} code snippet and provide a detailed skill assessment. For web languages like HTML, JavaScript, or React (TSX), also assess structure, best practices, and potential browser compatibility issues.

    **Code to Assess:**
    \`\`\`{{language}}
    {{{code}}}
    \`\`\`

    **Assessment Criteria:**
    1.  **Logic:** Evaluate the correctness and soundness of the algorithm or structure. For web, this includes layout logic and component structure.
    2.  **Syntax:** Assess the correct use of {{language}} syntax and language features. For web, this includes valid HTML/JSX and modern JavaScript/React practices.
    3.  **Efficiency:** Analyze the code for performance. Consider time and space complexity, or rendering performance for web.
    4.  **Clarity:** Evaluate the code's readability, including variable naming, comments, and structure.
    5.  **ProblemSolving:** Assess how well the code solves the implied problem.

    **Instructions:**
    -   Provide a score from 0 to 100 for each of the five dimensions.
    -   Provide specific, constructive feedback for each dimension.
    -   Calculate an overall score based on a weighted average of the dimension scores.
    -   Based on the assessment, provide 2-3 personalized learning recommendations. If a specific area is weak, suggest what to study.
    -   Based on the code, determine if it looks like a very common or copied-and-pasted solution (e.g., from a textbook or the first result on a search engine) and populate the plagiarismFlag field.

    Please provide the full assessment in the required JSON format.
    `,
});


const assessCodeSkillFlow = ai.defineFlow(
  {
    name: 'assessCodeSkillFlow',
    inputSchema: SkillAssessmentInputSchema,
    outputSchema: SkillAssessmentOutputSchema,
  },
  async (input) => {
    const { output } = await assessmentPrompt(input);
    if (!output) {
      throw new Error('AI failed to generate a skill assessment.');
    }
    return output;
  }
);

// Wrapper function to be called from the UI
export async function assessCodeSkill(input: SkillAssessmentInput): Promise<SkillAssessmentOutput> {
  return await assessCodeSkillFlow(input);
}
