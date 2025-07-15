
"use client";
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, BrainCircuit, CheckCircle, Lightbulb, TrendingUp, ShieldAlert, Bot, CheckSquare } from 'lucide-react';
import type { SkillAssessmentOutput } from '@/ai/types';

interface SkillAssessmentViewProps {
  assessment: SkillAssessmentOutput | null | undefined;
}

const getDimensionIcon = (dimension: string) => {    
    switch(dimension) {
        case 'Logic': return <BrainCircuit className="h-4 w-4 text-blue-500" />;
        case 'Syntax': return <CheckSquare className="h-4 w-4 text-green-500" />;
        case 'Efficiency': return <TrendingUp className="h-4 w-4 text-purple-500" />;
        case 'Clarity': return <Lightbulb className="h-4 w-4 text-yellow-500" />;
        case 'ProblemSolving':
        case 'Problem Solving':
            return <BrainCircuit className="h-4 w-4 text-indigo-500" />;
        default: return <AlertCircle className="h-4 w-4" />;
    }
}

export function SkillAssessmentView({ assessment }: SkillAssessmentViewProps) {
  if (!assessment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot size={18}/> AI Assessment</CardTitle>
          <CardDescription>No AI assessment data is available for this submission.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot size={18}/> AI Assessment</CardTitle>
          <CardDescription>AI-powered feedback on the submitted code.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {assessment.plagiarismFlag && (
              <div className="p-3 rounded-md border bg-destructive/10 border-destructive/30 text-destructive flex items-center gap-2">
                  <ShieldAlert size={18} />
                  <p className="text-sm font-medium">Potential Plagiarism Detected: The AI flagged this code as highly generic or similar to common solutions.</p>
              </div>
          )}
          <div>
            <h3 className="text-lg font-semibold mb-2">Overall Score: {assessment.overallScore}/100</h3>
            <Progress value={assessment.overallScore} />
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Detailed Feedback</h3>
            <Accordion type="single" collapsible className="w-full" defaultValue="Logic">
              {assessment.scores.map(item => (
                <AccordionItem value={item.dimension} key={item.dimension}>
                  <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-4">
                      <span className="flex items-center gap-2 font-medium">
                        {getDimensionIcon(item.dimension)}
                        {item.dimension}
                      </span>
                      <Badge variant={item.score > 75 ? 'default' : item.score > 50 ? 'secondary' : 'destructive'}>
                        {item.score}/100
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.feedback}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
            
          <div>
            <h3 className="text-lg font-semibold mb-2">Personalized Recommendations</h3>
            <ul className="space-y-2">
              {assessment.recommendations.map((rec, index) => (
                <li key={index} className="p-3 border rounded-md bg-muted/50 text-sm">
                  {rec.recommendation}
                  {rec.suggestedExerciseId && (
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Suggested Practice:</span> Exercise ID {rec.suggestedExerciseId}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
