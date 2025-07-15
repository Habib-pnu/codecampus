
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import Editor from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { Exercise, ClassGroup, SupportedLanguage, User, LocalizedString } from "@/types";
import { PlusCircle, Languages, Shield, AlertTriangle, MessageSquareQuote } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription as UIDescription } from "@/components/ui/alert";
import { translateContent } from "@/ai/flows/translate-content-flow";

const NO_CLASS_SELECTED_VALUE = "__NO_CLASS__";

const localizedStringSchema = z.object({
  en: z.string().min(1, "English version is required."),
  th: z.string().optional(),
});

const exerciseSchema = z.object({
  title: localizedStringSchema.refine(data => data.en.length >= 3, { 
    message: "Title must be at least 3 characters",
    path: ['en'],
  }),
  description: localizedStringSchema.refine(data => data.en.length >= 10, { 
    message: "Description must be at least 10 characters",
    path: ['en'],
  }),
  language: z.enum(["cpp", "python", "html", "javascript", "react"], { required_error: "Please select a language." }),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  startingCode: z.string().min(10, "Starting code must be provided"),
  points: z.coerce.number().min(1, "Points must be at least 1").positive("Points must be a positive number"),
  classIdToAssign: z.string().optional(),
  scope: z.enum(["personal", "institutional", "global"]),
});

type ExerciseFormData = z.infer<typeof exerciseSchema>;

interface AddExerciseFormProps {
  onAddExercise: (data: { exerciseData: Omit<Exercise, 'id' | 'creatorId'>; classIdToAssign?: string }) => void;
  onUpdateExercise: (data: Exercise) => void;
  classGroupsForLecturer?: ClassGroup[];
  defaultSelectedClassId?: string;
  mode: 'add' | 'edit';
  initialData?: Exercise | null;
  currentUser: User | null;
}

const defaultCodes: Record<SupportedLanguage, string> = {
  cpp: "#include <iostream>\nusing namespace std;\nint main() {\n  // Your C++ code here\n  return 0;\n}",
  python: "# Your Python code here\n\nprint(\"Hello from Python!\")\n",
  html: "<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, HTML!</h1>\n</body>\n</html>",
  javascript: "// Your JavaScript code here\n\nconsole.log(\"Hello from JavaScript!\");\n",
  react: "import React from 'react';\n\nconst App = () => {\n  return <h1>Hello, React!</h1>;\n};\n\nexport default App;\n"
};

// Security Configuration
const SECURITY_CONFIG = {
  MAX_TYPING_SPEED: 15, // characters per second
  TYPING_WINDOW: 1000, // 1 second window
  MIN_KEYSTROKE_INTERVAL: 20, // minimum milliseconds between keystrokes
  SUSPICIOUS_PASTE_SIZE: 10, // characters that trigger paste detection
  WARNING_THRESHOLD: 3, // number of warnings before blocking
};

interface TypingMetrics {
  keystrokes: Array<{ timestamp: number; length: number }>;
  warnings: number;
  isBlocked: boolean;
  lastKeystroke: number;
}


export function AddExerciseForm({
  onAddExercise,
  onUpdateExercise,
  classGroupsForLecturer,
  defaultSelectedClassId,
  mode,
  initialData,
  currentUser
}: AddExerciseFormProps) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const monacoEditorRef = React.useRef<any>(null);
  const copyTempRef = React.useRef<string | null>(null);

  const [typingMetrics, setTypingMetrics] = React.useState<TypingMetrics>({
    keystrokes: [],
    warnings: 0,
    isBlocked: false,
    lastKeystroke: 0,
  });
  const [securityAlerts, setSecurityAlerts] = React.useState<string[]>([]);
  
  const form = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      title: { en: "", th: "" },
      description: { en: "", th: "" },
      language: "cpp",
      difficulty: "beginner",
      startingCode: defaultCodes.cpp,
      points: 10,
      classIdToAssign: defaultSelectedClassId || (classGroupsForLecturer && classGroupsForLecturer.length > 0 ? NO_CLASS_SELECTED_VALUE : undefined),
      scope: 'personal',
    },
  });
  
  const protectedStartingCode = form.watch("startingCode");

  const addSecurityAlert = React.useCallback((message: string, params?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const translatedMessage = t(message, params);
    const alertMessage = `[${timestamp}] ${translatedMessage}`;
    setTimeout(() => {
        setSecurityAlerts(prev => [...prev.slice(-4), alertMessage]);
        toast({
          title: t('securityAlertTitle'),
          description: translatedMessage,
          variant: "destructive",
        });
    }, 0);
  }, [t, toast]);

  const checkTypingSpeed = React.useCallback((newText: string, oldText: string) => {
    const now = Date.now();
    const lengthDiff = newText.length - oldText.length;
    if (lengthDiff === 0) return true;

    setTypingMetrics(prev => {
      const newMetrics = { ...prev };
      if (newMetrics.lastKeystroke > 0) {
        const interval = now - newMetrics.lastKeystroke;
        if (interval < SECURITY_CONFIG.MIN_KEYSTROKE_INTERVAL && lengthDiff > 0) {
          addSecurityAlert('typingTooFast', { interval });
          newMetrics.warnings++;
        }
      }
      newMetrics.lastKeystroke = now;
      if (lengthDiff > 0 && lengthDiff >= SECURITY_CONFIG.SUSPICIOUS_PASTE_SIZE) {
        addSecurityAlert('largePaste', { chars: lengthDiff });
        if (monacoEditorRef.current) {
          monacoEditorRef.current.trigger('keyboard', 'undo');
        }
        newMetrics.warnings++;
        return newMetrics;
      }

      newMetrics.keystrokes = [
        ...newMetrics.keystrokes.filter(k => now - k.timestamp < SECURITY_CONFIG.TYPING_WINDOW),
        { timestamp: now, length: Math.abs(lengthDiff) }
      ];
      const totalChars = newMetrics.keystrokes.reduce((sum, k) => sum + k.length, 0);
      const timeWindow = Math.max(SECURITY_CONFIG.TYPING_WINDOW, now - (newMetrics.keystrokes[0]?.timestamp || now));
      const typingSpeed = (totalChars / timeWindow) * 1000;
      if (typingSpeed > SECURITY_CONFIG.MAX_TYPING_SPEED && newMetrics.keystrokes.length > 3) {
        addSecurityAlert('highSpeedTyping', { speed: typingSpeed.toFixed(1) });
        newMetrics.warnings++;
      }
      if (newMetrics.warnings >= SECURITY_CONFIG.WARNING_THRESHOLD) {
        newMetrics.isBlocked = true;
        addSecurityAlert("securityBlock");
      }
      return newMetrics;
    });
    return true;
  }, [addSecurityAlert]);

  const handleEditorMount = (editorInstance: any, monaco: any) => {
    monacoEditorRef.current = editorInstance;
    if (monaco) {
      const blockAction = (alertMsgKey: string) => { addSecurityAlert(alertMsgKey); copyTempRef.current = null; return null; };
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => blockAction("copyBlocked"));
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => blockAction("pasteBlocked"));
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => blockAction("cutBlocked"));
    }
    editorInstance.onContextMenu(() => addSecurityAlert("rightClickBlocked"));

    const editorDomNode = editorInstance.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('contextmenu', (e: MouseEvent) => { e.preventDefault(); e.stopPropagation(); addSecurityAlert("rightClickBlocked"); });
      editorDomNode.addEventListener('paste', (e: ClipboardEvent) => { e.preventDefault(); addSecurityAlert("pasteBlocked"); copyTempRef.current = null; });
      editorDomNode.addEventListener('copy', (e: ClipboardEvent) => { e.preventDefault(); addSecurityAlert("copyBlocked"); copyTempRef.current = null; });
      editorDomNode.addEventListener('cut', (e: ClipboardEvent) => { e.preventDefault(); addSecurityAlert("cutBlocked"); copyTempRef.current = null; });
      editorDomNode.addEventListener('mousedown', () => {
        copyTempRef.current = null;
        if (navigator.clipboard?.writeText) { navigator.clipboard.writeText('').catch(() => {}); }
      });
    }
  };

  const selectedLanguage = form.watch("language");

  React.useEffect(() => {
    if (mode === 'add') {
      form.setValue("startingCode", defaultCodes[selectedLanguage]);
    }
  }, [selectedLanguage, form, mode]);
  
  React.useEffect(() => {
    if (mode === 'edit' && initialData) {
      form.reset({
        title: { en: initialData.title.en || '', th: initialData.title.th || '' },
        description: { en: initialData.description.en || '', th: initialData.description.th || '' },
        language: initialData.language,
        difficulty: initialData.difficulty,
        startingCode: initialData.startingCode,
        points: initialData.points,
        classIdToAssign: undefined,
        scope: initialData.scope || 'personal',
      });
    } else if (mode === 'add') {
      form.reset({
        title: { en: "", th: "" },
        description: { en: "", th: "" },
        language: "cpp",
        difficulty: "beginner",
        startingCode: defaultCodes.cpp,
        points: 10,
        classIdToAssign: defaultSelectedClassId || (classGroupsForLecturer && classGroupsForLecturer.length > 0 ? NO_CLASS_SELECTED_VALUE : undefined),
        scope: 'personal',
      });
    }
    setTypingMetrics({ keystrokes: [], warnings: 0, isBlocked: false, lastKeystroke: 0 });
    setSecurityAlerts([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialData, defaultSelectedClassId, classGroupsForLecturer]);

  React.useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      if (monacoEditorRef.current?.hasTextFocus()) {
        e.preventDefault();
        addSecurityAlert("systemPasteBlocked");
      }
    }
    window.addEventListener('paste', handleGlobalPaste, true);
    return () => window.removeEventListener('paste', handleGlobalPaste, true);
  }, [addSecurityAlert]);


  const onSubmit = async (data: ExerciseFormData) => {
    if (typingMetrics.isBlocked) {
        toast({ title: t('errorToast'), description: t('submissionBlockedSecurity'), variant: "destructive" });
        return;
    }

    const finalData = { ...data };

    try {
        // Translate Title
        if (finalData.title.en && !finalData.title.th) {
            const result = await translateContent({ text: finalData.title.en, targetLanguage: 'th' });
            finalData.title.th = result.translatedText;
        } else if (finalData.title.th && !finalData.title.en) {
            const result = await translateContent({ text: finalData.title.th, targetLanguage: 'en' });
            finalData.title.en = result.translatedText;
        }
        
        // Translate Description
        if (finalData.description.en && !finalData.description.th) {
            const result = await translateContent({ text: finalData.description.en, targetLanguage: 'th' });
            finalData.description.th = result.translatedText;
        } else if (finalData.description.th && !finalData.description.en) {
            const result = await translateContent({ text: finalData.description.th, targetLanguage: 'en' });
            finalData.description.en = result.translatedText;
        }
        
        toast({ title: "Translation Complete", description: "Bilingual content saved." });

    } catch (error) {
        console.error("Auto-translation failed:", error);
        toast({ title: "Translation Failed", description: "Could not auto-translate content. Proceeding with provided text.", variant: "destructive" });
    }

    const { classIdToAssign, ...exerciseDetails } = finalData;
    const exercisePayload: Omit<Exercise, 'id' | 'creatorId'> = {
        title: exerciseDetails.title,
        description: exerciseDetails.description,
        language: data.language,
        difficulty: data.difficulty,
        points: data.points,
        startingCode: data.startingCode,
        scope: data.scope,
    };

    if (mode === 'edit' && initialData) {
        onUpdateExercise({ ...initialData, ...exercisePayload });
    } else {
        onAddExercise({
            exerciseData: exercisePayload,
            classIdToAssign: classIdToAssign === NO_CLASS_SELECTED_VALUE ? undefined : classIdToAssign
        });
        form.reset();
    }
  };

  return (
    <div className="space-y-4 py-4 pr-2">
        {(typingMetrics.warnings > 0 || securityAlerts.length > 0) && (
            <Alert className={cn("mb-4", typingMetrics.isBlocked ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50")}>
              <Shield className="h-4 w-4" />
              <UIDescription>
                <strong>{t('securityStatus')}:</strong> {t('warnings', { count: typingMetrics.warnings })}
                {typingMetrics.isBlocked && ` ${t('editorLocked')}`}
              </UIDescription>
            </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-lg font-medium">{mode === 'add' ? 'New Exercise Details' : 'Edit Exercise Details'}</h3>
              </div>

            {mode === 'add' && classGroupsForLecturer && classGroupsForLecturer.length > 0 && (
              <FormField
                control={form.control}
                name="classIdToAssign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assignToClassLabel')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      defaultValue={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('assignToClassPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_CLASS_SELECTED_VALUE}>{t('assignToClassNone')}</SelectItem>
                        {classGroupsForLecturer.map(cg => (
                          <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>{t('assignToClassDesc')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(currentUser?.isAdmin || currentUser?.role === 'institution_admin') && (
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select visibility..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="personal">Personal (Only you can see)</SelectItem>
                        {currentUser?.role === 'institution_admin' && (
                          <SelectItem value="institutional">Institutional (Visible to your institution)</SelectItem>
                        )}
                        {currentUser?.isAdmin && (
                          <SelectItem value="global">Global (Visible to everyone)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>Set the visibility of this exercise.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name={`title.${language}`}
              render={({ field }) => (
                <FormItem>
                   <FormLabel>{t('titleLabel')} ({language.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Input placeholder={t('titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`description.${language}`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('descriptionLabel')} ({language.toUpperCase()})</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('descriptionPlaceholder')} {...field} rows={3}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><Languages size={16}/> {t('languageLabel')}</FormLabel>
                    <Select onValueChange={(value: SupportedLanguage) => field.onChange(value)} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('languagePlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpp">C++</SelectItem>
                        <SelectItem value="python">Python</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="javascript">JavaScript</SelectItem>
                        <SelectItem value="react">React (TSX)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('difficultyLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('difficultyPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="beginner">{t('beginner')}</SelectItem>
                        <SelectItem value="intermediate">{t('intermediate')}</SelectItem>
                        <SelectItem value="advanced">{t('advanced')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('pointsLabel')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t('pointsPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="startingCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('startingCodeLabel', { language: selectedLanguage.toUpperCase() })}</FormLabel>
                  <FormControl>
                    <div className="h-[250px] border rounded-md overflow-hidden">
                       <Editor
                        height="100%"
                        language={selectedLanguage}
                        theme="vs-dark"
                        value={field.value}
                        onMount={handleEditorMount}
                        onChange={(value) => {
                            const newValue = value || "";
                            if (!typingMetrics.isBlocked) {
                                if(checkTypingSpeed(newValue, protectedStartingCode)) {
                                  field.onChange(newValue);
                                }
                            }
                        }}
                        options={{ 
                            fontSize: 14, 
                            minimap: { enabled: true }, 
                            automaticLayout: true,
                            contextmenu: false,
                            readOnly: typingMetrics.isBlocked
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex flex-wrap gap-2 items-center">
                <Button type="submit" className="w-full sm:w-auto" disabled={form.formState.isSubmitting || typingMetrics.isBlocked}>
                    {form.formState.isSubmitting ? t('processing') : (mode === 'add' ? t('addExerciseButton') : t('saveChangesButton'))}
                </Button>
            </div>
          </form>
        </Form>
    </div>
  );
}
