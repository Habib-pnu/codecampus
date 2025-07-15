
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Edit3, Trash2, BookCopy, FileCode, Save, X, Languages, AlertCircle, Info, ListTree, Code, Shield, MessageSquareQuote, Gem, Copy as CopyIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ModalDescription, DialogFooter as ModalDialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Editor from "@monaco-editor/react";

import type { DashboardState, DashboardActions } from '../types';
import type { Lab, LabChallenge, LabTargetCode, CodeSnippet, SupportedLanguage, EnforcedStatement, User } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription as UIDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import { useLanguage } from '@/context/language-context';
import { translateContent } from '@/ai/flows/translate-content-flow';

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

export function LabAdminView({
  labs, currentUser, savedCodes, allUsers,
  handleAddLabSemester, handleUpdateLabSemester, handleDeleteLabSemester,
  handleAddWeekToSemester, handleUpdateWeekInSemester, handleDeleteWeekFromSemester,
  handleAddTargetCodeToWeek, handleUpdateTargetCodeInWeek, handleDeleteTargetCodeFromWeek,
  setActiveTab, handleCloneWeekToCourse
}: Pick<DashboardState, "labs" | "currentUser" | "savedCodes" | "allUsers"> &
  Pick<DashboardActions, 
    "handleAddLabSemester" | "handleUpdateLabSemester" | "handleDeleteLabSemester" | 
    "handleAddWeekToSemester" | "handleUpdateWeekInSemester" | "handleDeleteWeekFromSemester" |
    "handleAddTargetCodeToWeek" | "handleUpdateTargetCodeInWeek" | "handleDeleteTargetCodeFromWeek" |
    "setActiveTab" | "handleCloneWeekToCourse"
  >
) {
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const monacoEditorRef = React.useRef<any>(null);
  const copyTempRef = React.useRef<string | null>(null);

  const [showCreateLabDialog, setShowCreateLabDialog] = useState(false);
  const [newLabTitle, setNewLabTitle] = useState("");
  const [newLabDescription, setNewLabDescription] = useState("");
  const [newLabScope, setNewLabScope] = useState<'personal' | 'institutional' | 'global'>('personal');

  const [showEditLabDialog, setShowEditLabDialog] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [tempLabTitle, setTempLabTitle] = useState("");
  const [tempLabDescription, setTempLabDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showWeekDialog, setShowWeekDialog] = useState(false);
  const [weekDialogMode, setWeekDialogMode] = useState<'add' | 'edit'>('add');
  const [weekLabId, setWeekLabId] = useState<string | null>(null);
  const [editingWeek, setEditingWeek] = useState<LabChallenge | null>(null);
  const [tempWeekTitle, setTempWeekTitle] = useState("");
  const [tempWeekDescription, setTempWeekDescription] = useState("");
  const [tempWeekLanguage, setTempWeekLanguage] = useState<SupportedLanguage>('cpp');

  const [showCloneWeekDialog, setShowCloneWeekDialog] = useState(false);
  const [weekToClone, setWeekToClone] = useState<{ labId: string; challengeId: string; } | null>(null);
  const [cloneTargetLabId, setCloneTargetLabId] = useState<string>("");

  const [showTargetCodeDialog, setShowTargetCodeDialog] = useState(false);
  const [targetCodeDialogMode, setTargetCodeDialogMode] = useState<'add' | 'edit'>('add');
  const [targetCodeLabId, setTargetCodeLabId] = useState<string | null>(null);
  const [targetCodeChallengeId, setTargetCodeChallengeId] = useState<string | null>(null);
  const [editingTargetCode, setEditingTargetCode] = useState<LabTargetCode | null>(null);
  const [tempTargetCode, setTempTargetCode] = useState("");
  const [tempTargetCodeDescription, setTempTargetCodeDescription] = useState("");
  const [tempEnforcedStatement, setTempEnforcedStatement] = useState<EnforcedStatement | 'none'>('none');
  const [tempRequiredOutputSimilarity, setTempRequiredOutputSimilarity] = useState<number>(95);
  const [tempPoints, setTempPoints] = useState<number>(100);
  const [tempSourceSnippetId, setTempSourceSnippetId] = useState<string | undefined>(undefined);
  const [targetCodeSourceType, setTargetCodeSourceType] = useState<'manual' | 'snippet'>('manual');
  const [tempTargetTestCases, setTempTargetTestCases] = useState<string[]>(['', '', '']);
  
  const [typingMetrics, setTypingMetrics] = React.useState<TypingMetrics>({
    keystrokes: [], warnings: 0, isBlocked: false, lastKeystroke: 0
  });
  const [securityAlerts, setSecurityAlerts] = React.useState<string[]>([]);
  const [protectedTargetCode, setProtectedTargetCode] = useState("");

  const userSavedSnippets = savedCodes?.filter(sc => sc.userId === currentUser?.id) || [];

  const currentChallengeForTargetDialog = useMemo(() => {
    if (!targetCodeLabId || !targetCodeChallengeId) return null;
    return labs.find(l => l.id === targetCodeLabId)?.challenges.find(c => c.id === targetCodeChallengeId) || null;
  }, [labs, targetCodeLabId, targetCodeChallengeId]);

  const isWebLanguageForTargetDialog = useMemo(() => {
    const lang = currentChallengeForTargetDialog?.language;
    return lang === 'html' || lang === 'javascript' || lang === 'react';
  }, [currentChallengeForTargetDialog]);

  const addSecurityAlert = useCallback((messageKey: string, params?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    const translatedMessage = t(messageKey, params);
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

  const checkTypingSpeed = useCallback((newText: string, oldText: string) => {
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
  }, [addSecurityAlert, t]);

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

  const handleTargetCodeEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    if (!typingMetrics.isBlocked) {
        if(checkTypingSpeed(newValue, protectedTargetCode)) {
          setProtectedTargetCode(newValue);
          setTempTargetCode(newValue);
        }
    }
  };
  
  useEffect(() => {
    if (tempTargetCode !== protectedTargetCode) {
        setProtectedTargetCode(tempTargetCode);
    }
  }, [tempTargetCode, protectedTargetCode]);

  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      if (monacoEditorRef.current?.hasTextFocus()) {
        e.preventDefault();
        addSecurityAlert("systemPasteBlocked");
      }
    }
    window.addEventListener('paste', handleGlobalPaste, true);
    return () => window.removeEventListener('paste', handleGlobalPaste, true);
  }, [addSecurityAlert]);

  const openCreateLabDialog = () => {
    setNewLabTitle("");
    setNewLabDescription("");
    setNewLabScope('personal');
    setShowCreateLabDialog(true);
  };

  const handleConfirmCreateLab = async () => {
    if (!newLabTitle.trim() || !newLabDescription.trim()) {
      toast({ title: t('errorToast'), description: t('labFieldsError'), variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: t('errorToast'), description: t('loginRequiredDesc'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    let finalTitle = { en: "", th: "" };
    let finalDescription = { en: "", th: "" };

    try {
        if (language === 'en') {
            finalTitle.en = newLabTitle;
            finalDescription.en = newLabDescription;
            if (newLabTitle) {
                const res = await translateContent({ text: newLabTitle, targetLanguage: 'th' });
                finalTitle.th = res.translatedText;
            }
            if (newLabDescription) {
                const res = await translateContent({ text: newLabDescription, targetLanguage: 'th' });
                finalDescription.th = res.translatedText;
            }
        } else {
            finalTitle.th = newLabTitle;
            finalDescription.th = newLabDescription;
            if (newLabTitle) {
                const res = await translateContent({ text: newLabTitle, targetLanguage: 'en' });
                finalTitle.en = res.translatedText;
            }
            if (newLabDescription) {
                const res = await translateContent({ text: newLabDescription, targetLanguage: 'en' });
                finalDescription.en = res.translatedText;
            }
        }
        toast({ title: t('translationComplete'), description: t('bilingualContentSaved')});
    } catch(e) {
        toast({ title: t('translationFailed'), description: t('translationProceedError'), variant: "destructive" });
        if (language === 'en') {
            finalTitle.en = newLabTitle;
            finalDescription.en = newLabDescription;
        } else {
            finalTitle.th = newLabTitle;
            finalDescription.th = newLabDescription;
        }
    }
    
    const createdLab = handleAddLabSemester({ title: finalTitle, description: finalDescription, scope: newLabScope, creatorId: currentUser.id });
    if (createdLab) {
      setShowCreateLabDialog(false);
    }
    setIsSubmitting(false);
  };

  const openEditLabDialog = (lab: Lab) => {
    setEditingLab(lab);
    setTempLabTitle(typeof lab.title === 'string' ? lab.title : lab.title[language] || lab.title.en);
    setTempLabDescription(typeof lab.description === 'string' ? lab.description : lab.description[language] || lab.description.en);
    setShowEditLabDialog(true);
  };

  const handleConfirmEditLab = async () => {
    if (!editingLab || !tempLabTitle.trim() || !tempLabDescription.trim()) {
        toast({ title: t('errorToast'), description: t('labFieldsError'), variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    
    let finalTitle = { ... (typeof editingLab.title === 'object' ? editingLab.title : { en: editingLab.title, th: '' })};
    let finalDescription = { ... (typeof editingLab.description === 'object' ? editingLab.description : { en: editingLab.description, th: '' }) };
    
    finalTitle[language] = tempLabTitle;
    finalDescription[language] = tempLabDescription;
    
    const otherLang = language === 'en' ? 'th' : 'en';

    try {
        if (tempLabTitle) {
            const res = await translateContent({ text: tempLabTitle, targetLanguage: otherLang });
            finalTitle[otherLang] = res.translatedText;
        }
        if (tempLabDescription) {
            const res = await translateContent({ text: tempLabDescription, targetLanguage: otherLang });
            finalDescription[otherLang] = res.translatedText;
        }
        toast({ title: t('translationComplete'), description: t('bilingualContentUpdated')});
    } catch(e) {
         toast({ title: t('translationFailed'), description: t('translationUpdateError'), variant: "destructive" });
    }

    handleUpdateLabSemester({ ...editingLab, title: finalTitle, description: finalDescription });
    setShowEditLabDialog(false);
    setEditingLab(null);
    setIsSubmitting(false);
  };

  const openWeekDialog = (mode: 'add' | 'edit', labId: string, week?: LabChallenge) => {
    setWeekDialogMode(mode);
    setWeekLabId(labId);
    if (mode === 'edit' && week) {
      setEditingWeek(week);
      setTempWeekTitle(week.title);
      setTempWeekDescription(week.description);
      setTempWeekLanguage(week.language || 'cpp');
    } else {
      setEditingWeek(null);
      setTempWeekTitle("");
      setTempWeekDescription("");
      setTempWeekLanguage('cpp');
    }
    setShowWeekDialog(true);
  };

  const handleConfirmWeekForm = () => {
    if (!weekLabId || !tempWeekTitle.trim() || !tempWeekDescription.trim()) {
      toast({ title: t('errorToast'), description: t('weekFieldsError'), variant: "destructive" });
      return;
    }

    if (weekDialogMode === 'edit' && editingWeek) {
      handleUpdateWeekInSemester(weekLabId, { ...editingWeek, title: tempWeekTitle, description: tempWeekDescription, language: tempWeekLanguage });
    } else {
      handleAddWeekToSemester(weekLabId, { title: tempWeekTitle, description: tempWeekDescription, language: tempWeekLanguage });
    }
    setShowWeekDialog(false);
    setEditingWeek(null);
    setWeekLabId(null);
  };

  const openCloneWeekDialog = (labId: string, challengeId: string) => {
    setWeekToClone({ labId, challengeId });
    setShowCloneWeekDialog(true);
  };
  
  const handleConfirmCloneWeek = () => {
    if (weekToClone && cloneTargetLabId) {
      handleCloneWeekToCourse(weekToClone.labId, weekToClone.challengeId, cloneTargetLabId);
      setShowCloneWeekDialog(false);
      setWeekToClone(null);
      setCloneTargetLabId("");
    }
  };

  const openTargetCodeDialog = (mode: 'add' | 'edit', labId: string, challengeId: string, targetCode?: LabTargetCode) => {
    setTargetCodeDialogMode(mode);
    setTargetCodeLabId(labId);
    setTargetCodeChallengeId(challengeId);
    
    setTypingMetrics({ keystrokes: [], warnings: 0, isBlocked: false, lastKeystroke: 0 });
    setSecurityAlerts([]);

    if (mode === 'edit' && targetCode) {
      setEditingTargetCode(targetCode);
      setTempTargetCode(targetCode.code);
      setProtectedTargetCode(targetCode.code);
      setTempTargetCodeDescription(targetCode.description);
      setTempEnforcedStatement(targetCode.enforcedStatement || 'none');
      setTempRequiredOutputSimilarity(targetCode.requiredOutputSimilarity || 95);
      setTempPoints(targetCode.points || 100);
      setTempSourceSnippetId(targetCode.sourceSnippetId);
      setTargetCodeSourceType(targetCode.sourceSnippetId ? 'snippet' : 'manual');
      const testCases = (targetCode.testCases || []).map(tc => tc.input);
      setTempTargetTestCases([testCases[0] || '', testCases[1] || '', testCases[2] || '']);
    } else {
      const challenge = labs.find(l => l.id === labId)?.challenges.find(c => c.id === challengeId);
      let defaultCode = "";
       switch (challenge?.language) {
          case 'python': defaultCode = "# Python target solution\n\nprint(\"Hello from Python Target\")\n"; break;
          case 'html': defaultCode = "<!DOCTYPE html>\n<html>\n<body>\n  <h1>Target Solution</h1>\n</body>\n</html>"; break;
          case 'javascript': defaultCode = "// Target JavaScript solution\nconsole.log('Target executed');"; break;
          case 'react': defaultCode = "import React from 'react';\n\nconst App = () => {\n  return <h1>Target React Solution</h1>;\n};\n\nexport default App;"; break;
          case 'cpp':
          default: defaultCode = "#include <iostream>\n\nint main() {\n    // Target solution code\n    return 0;\n}";
      }
      setEditingTargetCode(null);
      setTempTargetCode(defaultCode);
      setProtectedTargetCode(defaultCode);
      setTempTargetCodeDescription("");
      setTempEnforcedStatement('none');
      setTempRequiredOutputSimilarity(95);
      setTempPoints(100);
      setTempSourceSnippetId(undefined);
      setTargetCodeSourceType('manual');
      setTempTargetTestCases(['', '', '']);
    }
    setShowTargetCodeDialog(true);
  };

  const handleTargetCodeSourceTypeChange = (type: 'manual' | 'snippet') => {
    setTargetCodeSourceType(type);
    if (type === 'manual') {
        setTempSourceSnippetId(undefined);
    }
  };

  const handleSnippetSelectionForTargetCode = (snippetId: string) => {
    const selectedSnippet = userSavedSnippets.find(s => s.id === snippetId);
    if (selectedSnippet) {
        setTempTargetCode(selectedSnippet.code);
        setProtectedTargetCode(selectedSnippet.code);
        setTempSourceSnippetId(selectedSnippet.id);
        if (!tempTargetCodeDescription.trim()) {
            setTempTargetCodeDescription(selectedSnippet.title.replace(/\.(cpp|py|html|js|jsx|tsx)$/, ''));
        }
    }
  };

  const handleTestCaseChange = (index: number, value: string) => {
    const newTestCases = [...tempTargetTestCases];
    newTestCases[index] = value;
    setTempTargetTestCases(newTestCases);
  };

  const handleConfirmTargetCodeForm = () => {
    if (typingMetrics.isBlocked) {
        toast({ title: t('errorToast'), description: t('submissionBlockedSecurity'), variant: "destructive" });
        return;
    }
    if (!targetCodeLabId || !targetCodeChallengeId || !tempTargetCode.trim()) {
      toast({ title: t('errorToast'), description: t('targetCodeEmptyError'), variant: "destructive" });
      return;
    }
    if (!tempTargetCodeDescription.trim()) {
      toast({ title: t('errorToast'), description: t('targetDescRequiredError'), variant: "destructive" });
      return;
    }
    const requiredSim = tempRequiredOutputSimilarity;
    if (requiredSim < 0 || requiredSim > 100) {
      toast({ title: t('errorToast'), description: t('similarityRangeError'), variant: "destructive" });
      return;
    }
    if (tempPoints <= 0) {
        toast({ title: t('errorToast'), description: t('pointsPositiveError'), variant: "destructive" });
        return;
    }
    
    const finalTestCases = tempTargetTestCases.map(input => ({ input })).filter(tc => tc.input.trim() !== '' || tempTargetTestCases.some(t => t.trim() !== ''));

    const targetCodeData: Omit<LabTargetCode, 'id'> = {
        code: tempTargetCode,
        description: tempTargetCodeDescription,
        enforcedStatement: tempEnforcedStatement === 'none' ? undefined : tempEnforcedStatement,
        requiredOutputSimilarity: isWebLanguageForTargetDialog ? 100 : Math.min(100, Math.max(0, requiredSim)),
        points: tempPoints,
        sourceSnippetId: targetCodeSourceType === 'snippet' ? tempSourceSnippetId : undefined,
        testCases: isWebLanguageForTargetDialog ? [] : finalTestCases,
    };

    if (targetCodeDialogMode === 'edit' && editingTargetCode) {
      handleUpdateTargetCodeInWeek(targetCodeLabId, targetCodeChallengeId, { ...editingTargetCode, ...targetCodeData });
    } else {
      handleAddTargetCodeToWeek(targetCodeLabId, targetCodeChallengeId, targetCodeData);
    }
    setShowTargetCodeDialog(false);
    setEditingTargetCode(null);
    setTargetCodeLabId(null);
    setTargetCodeChallengeId(null);
  };
  
  const languageSpecificStatements: Record<SupportedLanguage, EnforcedStatement[]> = {
    cpp: ['if', 'if-else', 'switch', 'for', 'while', 'do-while', 'array', 'pointer'],
    python: ['if', 'if-else', 'for', 'while', 'array'],
    html: [],
    javascript: ['if', 'if-else', 'switch', 'for', 'while', 'do-while', 'array'],
    react: ['if', 'if-else', 'for', 'array'],
  };

  const availableStatements = currentChallengeForTargetDialog ? languageSpecificStatements[currentChallengeForTargetDialog.language] : [];

  const getLocalizedText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text && typeof text === 'object') {
      return text[language] || text.en || '';
    }
    return '';
  };

  const viewableLabCourses = useMemo(() => {
    if (!currentUser || !allUsers) return [];
    return labs.filter(l => {
      if (!l.isTemplate) return false;
      const creator = allUsers.find(u => u.id === l.creatorId);
      if (!creator) return false;
      if (l.creatorId === currentUser.id) return true;
      if (l.scope === 'global') return true;
      if (l.scope === 'institutional' && creator.institutionId === currentUser.institutionId) return true;
      return false;
    });
  }, [labs, currentUser, allUsers]);

  if (!currentUser || (currentUser.role !== 'lecturer' && !currentUser.isAdmin && currentUser.role !== 'institution_admin')) {
    return <p>{t('accessDenied')}</p>;
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PlusCircle className="h-5 w-5 text-primary" /> {t('manageCoursesTitle')}</CardTitle>
          <CardDescription>{t('manageCoursesDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
           <Button onClick={openCreateLabDialog} size="sm">{t('createCourseButton')}</Button>
        </CardContent>
      </Card>

      <Dialog open={showCreateLabDialog} onOpenChange={setShowCreateLabDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createCourseButton')}</DialogTitle>
            <ModalDescription>{t('createCourseDesc')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-lab-title-dialog">{t('courseTitleLabel')}</Label>
              <Input id="new-lab-title-dialog" value={newLabTitle} onChange={(e) => setNewLabTitle(e.target.value)} placeholder={t('courseTitlePlaceholder')} />
            </div>
            <div>
              <Label htmlFor="new-lab-description-dialog">{t('courseDescriptionLabel')}</Label>
              <Textarea id="new-lab-description-dialog" value={newLabDescription} onChange={(e) => setNewLabDescription(e.target.value)} placeholder={t('courseDescriptionPlaceholder')} />
            </div>
            {(currentUser?.isAdmin || currentUser?.role === 'institution_admin') && (
              <div>
                <Label htmlFor="new-lab-scope-dialog">{t('scope')}</Label>
                <Select value={newLabScope} onValueChange={(v) => setNewLabScope(v as any)}>
                    <SelectTrigger id="new-lab-scope-dialog"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="personal">{t('personal')}</SelectItem>
                        {currentUser?.role === 'institution_admin' && <SelectItem value="institutional">{t('institutional')}</SelectItem>}
                        {currentUser?.isAdmin && <SelectItem value="global">{t('global')}</SelectItem>}
                    </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancelButton')}</Button></DialogClose>
            <Button onClick={handleConfirmCreateLab} disabled={isSubmitting}>{isSubmitting ? t('processing') : t('createCourse')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditLabDialog} onOpenChange={setShowEditLabDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editCourseTitle', { title: getLocalizedText(editingLab?.title) })}</DialogTitle>
            <ModalDescription>{t('editCourseDesc')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-lab-title-dialog">{t('titleLabel')}</Label>
              <Input id="edit-lab-title-dialog" value={tempLabTitle} onChange={e => setTempLabTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="edit-lab-desc-dialog">{t('descriptionLabel')}</Label>
              <Textarea id="edit-lab-desc-dialog" value={tempLabDescription} onChange={e => setTempLabDescription(e.target.value)} />
            </div>
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => setEditingLab(null)}>{t('cancelButton')}</Button></DialogClose>
            <Button onClick={handleConfirmEditLab} disabled={isSubmitting}><Save className="mr-2 h-4 w-4" /> {isSubmitting ? t('processing') : t('saveChangesButton')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
       <Dialog open={showCloneWeekDialog} onOpenChange={setShowCloneWeekDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clone Week</DialogTitle>
            <ModalDescription>Select a destination course to clone this week into.</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label htmlFor="clone-target-lab">Destination Course</Label>
            <Select onValueChange={setCloneTargetLabId} value={cloneTargetLabId}>
              <SelectTrigger id="clone-target-lab">
                <SelectValue placeholder="Select a course..." />
              </SelectTrigger>
              <SelectContent>
                {viewableLabCourses
                  .filter(lab => lab.id !== weekToClone?.labId)
                  .map(lab => (
                    <SelectItem key={lab.id} value={lab.id}>
                      {getLocalizedText(lab.title)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleConfirmCloneWeek} disabled={!cloneTargetLabId}>Clone</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWeekDialog} onOpenChange={setShowWeekDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{weekDialogMode === 'edit' ? t('editWeekTitle', { title: editingWeek?.title }) : t('addWeekTitle', { semester: getLocalizedText(labs.find(l=>l.id===weekLabId)?.title)})}</DialogTitle>
            <ModalDescription>{t('weekDialogDesc')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div>
              <Label htmlFor="week-title-dialog">{t('weekTitleLabel')}</Label>
              <Input id="week-title-dialog" value={tempWeekTitle} onChange={e => setTempWeekTitle(e.target.value)} placeholder={t('weekTitlePlaceholder')}/>
            </div>
            <div>
              <Label htmlFor="week-desc-dialog">{t('weekDescriptionLabel')}</Label>
              <Textarea id="week-desc-dialog" value={tempWeekDescription} onChange={e => setTempWeekDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="week-lang-dialog">{t('languageLabel')}</Label>
              <Select value={tempWeekLanguage} onValueChange={(value: SupportedLanguage) => setTempWeekLanguage(value)}>
                <SelectTrigger id="week-lang-dialog"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpp">C++</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="react">React</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => { setEditingWeek(null); setWeekLabId(null); }}>{t('cancelButton')}</Button></DialogClose>
            <Button onClick={handleConfirmWeekForm}><Save className="mr-2 h-4 w-4" /> {weekDialogMode === 'edit' ? t('saveWeek') : t('addWeek')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTargetCodeDialog} onOpenChange={setShowTargetCodeDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{targetCodeDialogMode === 'edit' ? t('editTargetCodeTitle', { week: currentChallengeForTargetDialog?.title }) : t('addTargetCodeTitle', { week: currentChallengeForTargetDialog?.title })}</DialogTitle>
            <ModalDescription>{t('targetCodeDialogDesc')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {(typingMetrics.warnings > 0 || securityAlerts.length > 0) && (
              <Alert className={cn("mb-4", typingMetrics.isBlocked ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50")}>
                <UIAlertTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  {t('securityStatus')}
                </UIAlertTitle>
                <UIDescription>
                  <p>{t('warnings', { count: typingMetrics.warnings })} {typingMetrics.isBlocked && `- ${t('editorLocked')}`}</p>
                  {securityAlerts.length > 0 && (
                    <ol className="text-xs mt-2 space-y-1 list-decimal list-inside font-mono">
                      {[...new Set(securityAlerts.slice(-2))].map((alert, i) => (
                        <li key={i}>{alert}</li>
                      ))}
                    </ol>
                  )}
                </UIDescription>
              </Alert>
            )}
            <div>
                <Label htmlFor="target-code-source-type-dialog">{t('sourceType')}</Label>
                <Select value={targetCodeSourceType} onValueChange={(value) => handleTargetCodeSourceTypeChange(value as 'manual' | 'snippet')}>
                    <SelectTrigger id="target-code-source-type-dialog"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="manual">{t('manualInput')}</SelectItem>
                        <SelectItem value="snippet">{t('fromMySnippets')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {targetCodeSourceType === 'snippet' && (
              <div>
                <Label htmlFor="snippet-select-dialog">{t('selectSnippet')}</Label>
                <Select onValueChange={handleSnippetSelectionForTargetCode} value={tempSourceSnippetId}>
                  <SelectTrigger id="snippet-select-dialog"><SelectValue placeholder={t('chooseSnippetPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {userSavedSnippets.length > 0 ? (
                      userSavedSnippets.map(snippet => (
                        <SelectItem key={snippet.id} value={snippet.id}>{snippet.title}</SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-center text-sm text-muted-foreground">{t('noSavedSnippets')}</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
                <Label htmlFor="target-code-desc-dialog">{t('targetNameDesc')}</Label>
                <Input id="target-code-desc-dialog" value={tempTargetCodeDescription} onChange={e => setTempTargetCodeDescription(e.target.value)} placeholder={t('targetNameDescPlaceholder')}/>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isWebLanguageForTargetDialog && (
                    <>
                    <div>
                        <Label htmlFor="enforced-statement-dialog">{t('enforcedStatement')}</Label>
                        <Select value={tempEnforcedStatement} onValueChange={v => setTempEnforcedStatement(v as EnforcedStatement | 'none')}>
                            <SelectTrigger id="enforced-statement-dialog"><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t('none')}</SelectItem>
                                {availableStatements.map(stmt => (
                                    <SelectItem key={stmt} value={stmt} className="capitalize">{stmt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="target-output-sim-dialog">{t('requiredOutputSimilarityLabel')}</Label>
                        <Input id="target-output-sim-dialog" type="number" min="0" max="100" value={tempRequiredOutputSimilarity} onChange={e => setTempRequiredOutputSimilarity(parseInt(e.target.value,10) || 0)} />
                    </div>
                    </>
                )}
                 <div>
                    <Label htmlFor="target-points-dialog">{t('fullScore')}</Label>
                    <Input id="target-points-dialog" type="number" min="1" value={tempPoints} onChange={e => setTempPoints(parseInt(e.target.value, 10) || 0)} />
                </div>
            </div>
            <div>
                <Label htmlFor="target-code-dialog">{t('targetCodeLabel', { lang: currentChallengeForTargetDialog?.language.toUpperCase()})}</Label>
                <div className="h-64 border rounded-md overflow-hidden mt-1">
                    <Editor
                        height="100%"
                        language={currentChallengeForTargetDialog?.language}
                        theme="vs-dark"
                        value={protectedTargetCode}
                        onMount={handleEditorMount}
                        onChange={handleTargetCodeEditorChange}
                        options={{
                            readOnly: (targetCodeSourceType === 'snippet' && !!tempSourceSnippetId) || typingMetrics.isBlocked,
                            fontSize: 14, minimap: { enabled: true }, automaticLayout: true, contextmenu: false
                        }}
                    />
                </div>
                {targetCodeSourceType === 'snippet' && !!tempSourceSnippetId && (
                    <p className="text-xs text-muted-foreground mt-1">{t('codeFromSnippetNote')}</p>
                )}
            </div>
             {!isWebLanguageForTargetDialog && (
                <div className="space-y-2">
                    <Label>{t('testCaseInputs')}</Label>
                    <div className="space-y-1">
                      <Input value={tempTargetTestCases[0]} onChange={(e) => handleTestCaseChange(0, e.target.value)} placeholder={t('testInput1')} />
                      <Input value={tempTargetTestCases[1]} onChange={(e) => handleTestCaseChange(1, e.target.value)} placeholder={t('testInput2')} />
                      <Input value={tempTargetTestCases[2]} onChange={(e) => handleTestCaseChange(2, e.target.value)} placeholder={t('testInput3')} />
                    </div>
                </div>)}
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline" onClick={() => { setEditingTargetCode(null); setTargetCodeLabId(null); setTargetCodeChallengeId(null); }}>{t('cancelButton')}</Button></DialogClose>
            <Button onClick={handleConfirmTargetCodeForm} disabled={typingMetrics.isBlocked}><Save className="mr-2 h-4 w-4" /> {targetCodeDialogMode === 'edit' ? t('saveTargetCode') : t('addTargetCode')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary" /> {t('existingCoursesTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          {viewableLabCourses.length === 0 ? <p>{t('noCoursesYet')}</p> : (
            <div className="space-y-4">
              {viewableLabCourses.map(lab => {
                return (
                <Card key={lab.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/50 p-3">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                       <div>
                         <h3 className="text-lg font-semibold flex items-center gap-2">{getLocalizedText(lab.title)} <Badge variant="secondary" className="capitalize text-xs">{t(lab.scope)}</Badge></h3>
                         <p className="text-sm text-muted-foreground mt-1">{getLocalizedText(lab.description)}</p>
                       </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => setActiveTab('lecturer-panel')}>
                            <ListTree className="mr-2 h-4 w-4"/>
                            {t('assignToClass')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEditLabDialog(lab)}><Edit3 className="mr-1 h-4 w-4" /> {t('editCourse')}</Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="mr-1 h-4 w-4" /> {t('deleteCourse')}</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>{t('deleteCourseConfirmTitle', { title: getLocalizedText(lab.title) })}</AlertDialogTitle><AlertDialogDescription>{t('deleteCourseConfirmDesc')}</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteLabSemester(lab.id)}>{t('confirmDelete')}</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold text-sm">{t('weeks')} ({lab.challenges.length})</h4>
                      <Button size="sm" onClick={() => openWeekDialog('add', lab.id)}><PlusCircle className="mr-2 h-4 w-4"/>{t('addWeek')}</Button>
                    </div>
                    {lab.challenges.length === 0 ? <p className="text-sm text-muted-foreground">{t('noWeeksInCourse')}</p> : (
                      <ul className="space-y-2 pl-2">
                        {lab.challenges.map(challenge => {
                            return (
                          <li key={challenge.id} className="p-2 border rounded-md bg-background">
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-sm">{challenge.title} <span className="text-xs text-muted-foreground">({challenge.language.toUpperCase()})</span></h5>
                                <p className="text-xs text-muted-foreground">{challenge.description}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="xs" onClick={() => openCloneWeekDialog(lab.id, challenge.id)} title="Clone Week"><CopyIcon className="h-3 w-3"/></Button>
                                <Button variant="ghost" size="xs" onClick={() => openWeekDialog('edit', lab.id, challenge)}><Edit3 className="h-3 w-3"/></Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild><Button variant="ghost" size="xs" className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3"/></Button></AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>{t('deleteWeekConfirmTitle', { title: challenge.title })}</AlertDialogTitle><AlertDialogDescription>{t('deleteActionUndo')}</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteWeekFromSemester(lab.id, challenge.id)}>{t('confirmDelete')}</AlertDialogAction></AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="mt-2 pl-3">
                              <div className="flex justify-between items-center mb-1">
                                  <h6 className="text-xs font-semibold">{t('problems')} ({challenge.targetCodes.length} / {t('maxTen')})</h6>
                                  {challenge.targetCodes.length < 10 && <Button variant="link" size="xs" className="h-auto p-0 text-xs" onClick={() => openTargetCodeDialog('add', lab.id, challenge.id)}><PlusCircle className="mr-1 h-3 w-3"/>{t('addProblem')}</Button>}
                              </div>
                              {challenge.targetCodes.length === 0 ? <p className="text-xs text-muted-foreground italic">{t('noProblemsDefined')}</p> : (
                                  <ul className="space-y-1">
                                  {challenge.targetCodes.map(tc => (
                                      <li key={tc.id} className="text-xs p-1 border-l-2 border-primary/50 bg-muted/30 rounded-r-md flex justify-between items-center">
                                          <div className='flex-1 truncate'>
                                              <span className="font-mono text-muted-foreground" title={tc.code}>{tc.description}</span>
                                               {tc.enforcedStatement && <span className="text-blue-600 ml-2 text-[10px] font-semibold flex items-center gap-1"><Code size={12}/> ({tc.enforcedStatement})</span>}
                                          </div>
                                          <div className="flex gap-0.5">
                                            <Button variant="ghost" size="xs" onClick={() => openTargetCodeDialog('edit', lab.id, challenge.id, tc)}><Edit3 className="h-3 w-3"/></Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild><Button variant="ghost" size="xs" className="text-destructive hover:text-destructive"><Trash2 className="h-3 w-3"/></Button></AlertDialogTrigger>
                                                <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>{t('deleteTargetCodeConfirmTitle')}</AlertDialogTitle><AlertDialogDescription>{t('deleteActionUndo')}</AlertDialogDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteTargetCodeFromWeek(lab.id, challenge.id, tc.id)}>{t('confirmDelete')}</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                          </div>
                                      </li>
                                  ))}
                                  </ul>
                              )}
                            </div>
                          </li>
                        )})}
                      </ul>
                    )}
                  </CardContent>
                </Card>
              )})}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
