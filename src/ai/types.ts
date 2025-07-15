/**
 * @fileOverview This file contains all shared Zod schemas and TypeScript types for the AI flows.
 * This is to prevent "use server" files from exporting non-async functions, which is not allowed.
 */
import { z } from 'zod';

// Types for: skill-assessment-flow.ts
const SkillDimensionSchema = z.enum(['Logic', 'Syntax', 'Efficiency', 'Clarity', 'ProblemSolving']);

const SkillScoreSchema = z.object({
  dimension: SkillDimensionSchema,
  score: z.number().min(0).max(100).describe('The score for this dimension, from 0 to 100.'),
  feedback: z.string().describe('Specific, constructive feedback for this skill dimension.'),
});

const LearningRecommendationSchema = z.object({
    recommendation: z.string().describe('A personalized learning recommendation based on the assessment.'),
    suggestedExerciseId: z.number().optional().describe('The ID of a relevant exercise to practice, if applicable.'),
});

export const SkillAssessmentInputSchema = z.object({
  code: z.string().describe('The code snippet to be assessed.'),
  language: z.enum(['cpp', 'python', 'html', 'javascript', 'react']).describe('The programming language of the code.'),
});
export type SkillAssessmentInput = z.infer<typeof SkillAssessmentInputSchema>;

export const SkillAssessmentOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('The overall skill score, from 0 to 100.'),
  scores: z.array(SkillScoreSchema).describe('A granular breakdown of scores by skill dimension.'),
  recommendations: z.array(LearningRecommendationSchema).describe('Personalized learning recommendations.'),
  plagiarismFlag: z.boolean().describe('True if the code is suspected of plagiarism based on similarity to common solutions.')
});
export type SkillAssessmentOutput = z.infer<typeof SkillAssessmentOutputSchema>;


// Types for: code-assistant-flow.ts
export const CodeAssistantInputSchema = z.object({
  code: z.string().describe('The full code from the editor.'),
  selectedCode: z.string().describe('The specific snippet of code the user has selected for assistance.'),
  language: z.enum(['cpp', 'python', 'html', 'javascript', 'react']).describe('The programming language of the code.'),
  requestType: z.enum(['explain', 'suggest_improvement', 'find_bugs']).describe('The type of assistance requested.'),
});
export type CodeAssistantInput = z.infer<typeof CodeAssistantInputSchema>;

export const CodeAssistantOutputSchema = z.object({
  response: z.string().describe('The AI-generated explanation, suggestion, or bug analysis.'),
  suggestedCode: z.string().optional().describe('The improved or fixed code snippet, if applicable.'),
});
export type CodeAssistantOutput = z.infer<typeof CodeAssistantOutputSchema>;


// Types for: translate-content-flow.ts
export const TranslateContentInputSchema = z.object({
  text: z.string().describe('The text to be translated.'),
  targetLanguage: z.enum(['en', 'th']).describe('The target language to translate the text into.'),
});
export type TranslateContentInput = z.infer<typeof TranslateContentInputSchema>;

export const TranslateContentOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type TranslateContentOutput = z.infer<typeof TranslateContentOutputSchema>;
