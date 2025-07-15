"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Save,
  Download,
  Wand2,
  BrainCircuit,
  Loader2,
  FileCode,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { codeCompletion } from "@/ai/flows/code-completion";
import { codeExplanation } from "@/ai/flows/code-explanation";
import { SyntaxHighlighter } from "./syntax-highlighter";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const initialCode = `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::vector<std::string> messages = {"Hello", "from", "CodeCanvas!"};

    for (const std::string& msg : messages) {
        std::cout << msg << " ";
    }
    std::cout << std::endl;

    return 0;
}`;

function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

export function CodeCanvas() {
  const [code, setCode] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [explanation, setExplanation] = useState("");
  const [explanationCode, setExplanationCode] = useState("");
  const [isCompletionLoading, setIsCompletionLoading] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const savedCode = localStorage.getItem("code-canvas-code");
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(initialCode);
    }
  }, []);

  const fetchCompletions = useCallback(async (currentCode: string) => {
    if (!currentCode.trim()) {
      setSuggestions([]);
      return;
    }
    setIsCompletionLoading(true);
    try {
      const result = await codeCompletion({ codePrefix: currentCode });
      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Error fetching code completions:", error);
      toast({
        variant: "destructive",
        title: "Autocompletion Error",
        description: "Could not fetch code suggestions.",
      });
    } finally {
      setIsCompletionLoading(false);
    }
  }, [toast]);

  const debouncedFetchCompletions = useMemo(
    () => debounce(fetchCompletions, 500),
    [fetchCompletions]
  );

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    debouncedFetchCompletions(newCode);
  };

  const handleFormatCode = () => {
    let indentLevel = 0;
    const lines = code.split("\n");
    const formatted = lines
      .map((line) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("}") || trimmedLine.startsWith(")")) {
          indentLevel = Math.max(0, indentLevel - 1);
        }
        let indentedLine = "    ".repeat(indentLevel) + trimmedLine;
        if (trimmedLine.endsWith("{") || trimmedLine.endsWith("(")) {
          indentLevel++;
        }
        return indentedLine;
      })
      .join("\n");
    setCode(formatted);
    toast({ title: "Code Formatted", description: "Indentation has been adjusted." });
  };
  
  const handleExplainCode = async () => {
    if (!code.trim()) {
      toast({ variant: "destructive", title: "Nothing to explain", description: "The editor is empty." });
      return;
    }
    setIsExplanationLoading(true);
    setExplanation("");
    setExplanationCode(code);
    try {
      const result = await codeExplanation({ code });
      setExplanation(result.explanation);
    } catch (error) {
      console.error("Error fetching code explanation:", error);
      toast({
        variant: "destructive",
        title: "Explanation Error",
        description: "Could not fetch code explanation.",
      });
    } finally {
      setIsExplanationLoading(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("code-canvas-code", code);
    toast({ title: "Code Saved!", description: "Your work has been saved locally." });
  };

  const handleExport = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "code.cpp";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Code Exported", description: "Your code is being downloaded." });
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-body">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <FileCode className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-foreground">
            CodeCanvas
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleSave} aria-label="Save Code">
            <Save />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleExport} aria-label="Export Code">
            <Download />
          </Button>
        </div>
      </header>
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden p-4 gap-4">
        <div className="flex flex-col w-full md:w-2/3 h-full">
          <Card className="flex flex-col flex-1 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-lg">C++ Editor</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleFormatCode}>
                  <Wand2 className="mr-2 h-4 w-4" /> Format
                </Button>
                <Button size="sm" onClick={handleExplainCode} disabled={isExplanationLoading}>
                  {isExplanationLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BrainCircuit className="mr-2 h-4 w-4" />}
                  Explain
                </Button>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="p-0 flex-1">
              <Textarea
                value={code}
                onChange={handleCodeChange}
                className="w-full h-full p-4 font-code text-base resize-none border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-card"
                placeholder="Write your C++ code here..."
                aria-label="C++ Code Editor"
              />
            </CardContent>
          </Card>
        </div>
        <aside className="flex flex-col w-full md:w-1/3 h-full gap-4">
          <Card className="flex flex-col flex-1 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-lg flex items-center gap-2">
                Suggestions
                {isCompletionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4 overflow-y-auto">
              {suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="p-2 font-code text-sm bg-muted rounded-md">{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isCompletionLoading ? 'Loading suggestions...' : 'Type in the editor to get AI-powered suggestions.'}
                </p>
              )}
            </CardContent>
          </Card>
          <Card className="flex flex-col flex-1 shadow-lg">
            <CardHeader className="py-3">
              <CardTitle className="text-lg">AI Explanation</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-4 overflow-y-auto space-y-4">
              {isExplanationLoading ? (
                 <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                 </div>
              ) : explanation ? (
                <>
                  <SyntaxHighlighter code={explanationCode} />
                  <p className="text-sm leading-relaxed">{explanation}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click the "Explain" button to get an AI-powered explanation of your code.
                </p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
