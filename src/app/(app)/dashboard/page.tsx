
"use client";

import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useUser } from '@/context/user-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ModalDialogDescription, DialogFooter as ModalDialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDescription, AlertDialogFooter as AlertFooter, AlertDialogHeader as AlertHeader, AlertDialogTitle as AlertTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { User, Exercise, CodeSnippet, ProgressDataPoint, ClassGroup, Lab, LabChallenge, LabTargetCode, StudentLabAttempt, AssignedExerciseInfo, AssignedChallengeInfo, LabAssignment, Institution, Coupon, BillingTransaction, SupportedLanguage, SkillAssessmentOutput, EnforcedStatement, ClassMember, StudentProgress, LocalizedString, ProblemAssistantRequest, AssistantChatMessage, AdminSupportRequest, AdminChatMessage, PublicChatMessage } from "@/types";
import type { DashboardActions } from "@/components/dashboard/types";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { EditorView } from "@/components/dashboard/editor-view";
import { ExercisesView } from "@/components/dashboard/exercises-view";
import { ProgressView } from "@/components/dashboard/progress-view";
import { ClassManagementView } from "@/components/dashboard/admin/class-management-view";
import { StudentClassesView } from "@/components/dashboard/student/student-classes-view";
import { LabAdminView } from "@/components/dashboard/admin/lab-admin-view";
import { LabStudentView } from "@/components/dashboard/student/lab-student-view";
import { assistWithCode, CodeAssistantOutput } from '@/ai/flows/code-assistant-flow';
import { assessCodeSkill } from '@/ai/flows/skill-assessment-flow';
import { useLanguage } from "@/context/language-context";


import { initialMockUsers, mockExercises, mockInitialSavedCodes, mockClassGroups as initialMockClassGroups, initialMockLabs, initialMockTransactions, initialMockInstitutions, mockProgressData } from "@/lib/mock-data";
import { Code, ListChecks, BarChart3, Users, ChevronDown, Save, LogInIcon, PlusCircle, BookOpenCheck, RotateCcw, BrainCircuit, Bot, Send, XIcon, MessageCircleQuestion, Sparkles, Bug, Settings2, PencilRuler } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isValid, sub } from "date-fns";
import { th, enUS } from "date-fns/locale";

interface StoredUserFull extends User {
  passwordHash?: string;
}

const CLASS_GROUPS_STORAGE_KEY = 'codecampus_classgroups';
const LABS_STORAGE_KEY = 'codecampus_labs';
const SAVED_CODES_STORAGE_KEY = 'codecampus_saved_codes';
const EXERCISES_STORAGE_KEY = 'codecampus_exercises';
const INSTITUTIONS_STORAGE_KEY = 'codecampus_institutions';
const PROMPTPAY_STORAGE_KEY = 'codecampus_promptpay_number';
const COUPONS_STORAGE_KEY = 'codecampus_coupons';
const TRANSACTIONS_STORAGE_KEY = 'codecampus_transactions';
const ADMIN_SUPPORT_REQUEST_STORAGE_KEY = 'codecampus_admin_support_requests';
const PUBLIC_CHAT_LAST_SEEN_STORAGE_KEY = 'codecampus_public_chat_last_seen';

interface ApiExecutionPayload {
  code: string;
  input: string;
  language: SupportedLanguage;
  username: string;
  snippetName: string;
}

interface ApiExecutionResponse {
    output?: string | null;
    stderr?: string | null;
    compileError?: string | null;
    runtimeError?: string | null;
    networkError?: string | null; // For frontend network issues
    error?: string | null; // General error from API
}

interface TabItemConfig {
  value: string;
  label: string;
  Icon: React.ElementType;
  roles: Array<'normal' | 'student' | 'lecturer' | 'institution_admin' | 'admin'>;
}

interface OverwriteDialogDetails {
  titleToSave: string;
  codeToSave: string;
  snippetToOverwriteId: string;
  snippetIdOriginallyInEditor: string | null;
}

function useDashboardData() {
  const { toast } = useToast();
  const { user: currentUser, updateCurrentUser, allUsers, setAllUsers, getStoredUsersWithPasswords, persistAllUsers, institutions, setInstitutions: setGlobalInstitutions, setHeaderContent, setNotificationData } = useUser();
  const { t } = useLanguage();

  const [isMobile, setIsMobile] = useState(false);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [labAssignments, setLabAssignments] = useState<LabAssignment[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [savedCodes, setSavedCodes] = useState<CodeSnippet[]>([]);
  const [userProgress] = useState<ProgressDataPoint[]>(mockProgressData);
  const [promptPayNumber, setPromptPayNumber] = useState<string>('0954385969'); 
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [transactions, setTransactions] = useState<BillingTransaction[]>([]);
  const [adminSupportRequests, setAdminSupportRequests] = useState<AdminSupportRequest[]>([]);
  const [isAwaitingAIResponse, setIsAwaitingAIResponse] = useState(false);

  const [code, setCode] = useState<string>("#include <iostream>\nusing namespace std;\nint main() {\n  cout << \"Hello from Computer Engineering PNU CodeCampus!\" << endl;\n  return 0;\n}");

  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [codeTitle, setCodeTitle] = useState<string>("Untitled.cpp");
  const [currentSnippetId, setCurrentSnippetId] = useState<string | null>(null);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);

  const [activeTab, setActiveTab] = useState("labs");
  const [isClient, setIsClient] = useState(false);
  const [showJoinClassModal, setShowJoinClassModal] = useState(false);
  const [joinClassCode, setJoinClassCode] = useState("");
  const [isNewSnippetModalOpen, setIsNewSnippetModalOpen] = useState(false);
  const [newSnippetDialogInput, setNewSnippetDialogInput] = useState("Untitled");
  const [newSnippetLanguage, setNewSnippetLanguage] = useState<SupportedLanguage>('cpp');

  const [showConfirmOverwriteSnippetDialog, setShowConfirmOverwriteSnippetDialog] = useState(false);
  const [overwriteDialogDetails, setOverwriteDialogDetails] = useState<OverwriteDialogDetails | null>(null);

  const editorTabContentRef = useRef<HTMLDivElement>(null);

  const editorLanguage = useMemo((): SupportedLanguage => {
    if (codeTitle.endsWith('.py')) return 'python';
    if (codeTitle.endsWith('.html')) return 'html';
    if (codeTitle.endsWith('.js') || codeTitle.endsWith('.jsx')) return 'javascript';
    if (codeTitle.endsWith('.ts') || codeTitle.endsWith('.tsx')) return 'react';
    return 'cpp';
  }, [codeTitle]);

  const tabItemsConfig: TabItemConfig[] = useMemo(() => [
    { value: "progress", label: t('tabProgress'), Icon: BarChart3, roles: ['student', 'lecturer', 'admin', 'institution_admin'] },
    { value: "editor", label: t('tabEditor'), Icon: PencilRuler, roles: ['student', 'lecturer', 'normal', 'admin', 'institution_admin'] },
    { value: "labs", label: t('tabLabs'), Icon: BookOpenCheck, roles: ['student', 'lecturer', 'normal', 'admin', 'institution_admin'] },
    { value: "exercises", label: t('tabLearn'), Icon: ListChecks, roles: ['student', 'lecturer', 'normal', 'admin', 'institution_admin'] },
    { value: "my-classes", label: t('tabMyClasses'), Icon: Users, roles: ['student', 'normal'] },
    { value: "lecturer-panel", label: t('tabLecturerPanel'), Icon: Settings2, roles: ['lecturer', 'institution_admin', 'admin'] },
  ], [t]);

  const availableTabs = useMemo(() => {
    if (!currentUser) return [];
    return tabItemsConfig.filter(tab => {
        if (currentUser && tab.roles.includes(currentUser.role)) {
            if (tab.value === 'my-classes' && (currentUser.role === 'lecturer' || currentUser.isAdmin || currentUser.role === 'institution_admin')) return false;
            if (tab.value === 'lecturer-panel' && !['lecturer', 'institution_admin', 'admin'].includes(currentUser.role) ) return false;
            return true;
        }
        return false;
    });
  }, [currentUser, tabItemsConfig]);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768); // Adjust breakpoint as needed (md breakpoint)
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  useEffect(() => {
    if (!setHeaderContent || !availableTabs || availableTabs.length === 0) return;

    const renderTabs = (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="h-auto self-start items-center justify-center rounded-lg bg-transparent p-1 text-muted-foreground mb-0 border-0">
              {availableTabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50", "data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:shadow-sm")}>
                  <tab.Icon className="mr-2 h-4 w-4" /> {tab.label}
              </TabsTrigger>
              ))}
          </TabsList>
      </Tabs>
    );

    const renderDropdown = (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" className="w-full justify-between"><span className="flex items-center"><ChevronDown className="mr-2 h-4 w-4" /> {availableTabs.find(t => t.value === activeTab)?.label || availableTabs[0].label}</span></Button></DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          {availableTabs.map((tab) => (<DropdownMenuItem key={tab.value} onClick={() => setActiveTab(tab.value)}><tab.Icon className="mr-2 h-4 w-4" />{tab.label}</DropdownMenuItem>))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
    setHeaderContent(isMobile ? renderDropdown : renderTabs);
    return () => setHeaderContent(null);
  }, [setHeaderContent, activeTab, availableTabs, isMobile]);
  
  const localPersistAllUsers = useCallback((usersWithPasswords: StoredUserFull[]) => {
    persistAllUsers(usersWithPasswords);
    const uiUsers = usersWithPasswords
      .map(({ passwordHash, ...user }) => user as User)
      .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
    setAllUsers(uiUsers);
  }, [persistAllUsers, setAllUsers]);
  
  const executeCodeApi = useCallback(async (codeToExecute: string, inputForProgram: string, language: SupportedLanguage, snippetName: string): Promise<ApiExecutionResponse> => {
      const LOCAL_API_URL = '/api/local-run-code';
      if (!currentUser || !currentUser.username) {
        toast({ title: "Error", description: "User not logged in. Cannot execute code.", variant: "destructive" });
        return { networkError: "User not logged in." };
      }
      const apiPayload: ApiExecutionPayload = { code: codeToExecute, input: inputForProgram || "", language: language || 'cpp', username: currentUser.username, snippetName: snippetName || 'Untitled' };
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      try {
          const response = await fetch(LOCAL_API_URL, { method: 'POST', headers: headers, body: JSON.stringify(apiPayload) });
          const responseText = await response.text();
          const contentType = response.headers.get("content-type");
          if (!response.ok) {
              let specificError = `Local API Error ${response.status}: ${response.statusText}.`;
              if (contentType?.toLowerCase().includes("text/html")) {
                  specificError = `Local API Error ${response.status}: Server returned HTML. Check API route. Response: ${responseText.substring(0,200)}...`;
              } else {
                  try {
                      const errorJson = JSON.parse(responseText);
                      if (errorJson.error) specificError += ` Details: ${errorJson.error}`;
                      else if (language === 'cpp' && errorJson.compileError) specificError += ` Details: ${errorJson.compileError}`;
                      else if (errorJson.runtimeError) specificError += ` Details: ${errorJson.runtimeError}`;
                  } catch (e) { specificError += ` Raw response: ${responseText.substring(0, 200)}.`; }
              }
              toast({ title: "Execution Failed", description: specificError.substring(0,150), variant: "destructive" });
              return { output: null, stderr: null, compileError: language === 'cpp' ? specificError : null, runtimeError: specificError, networkError: specificError, error: specificError };
          }
          if (!contentType || !contentType.toLowerCase().includes("application/json")) {
              const networkErrorMsg = `Network Error: Unexpected response format from local API (expected JSON, got ${contentType || 'unknown'}). Raw response: ${responseText.substring(0,200)}...`;
              toast({ title: "Network Error", description: networkErrorMsg, variant: "destructive" });
              return { output: null, stderr: null, compileError: null, runtimeError: null, networkError: networkErrorMsg };
          }
          const result = JSON.parse(responseText) as ApiExecutionResponse;
          return { output: result.output || null, stderr: result.stderr || null, compileError: language === 'cpp' ? (result.compileError || null) : null, runtimeError: result.runtimeError || null, networkError: null, error: result.error || null };
      } catch (error: any) {
          const errorMessage = `Error Reaching Local API: Failed to fetch from ${LOCAL_API_URL}. Details: ${String(error)}`;
          toast({ title: "Local API Call Error", description: errorMessage, variant: "destructive" });
          return { output: null, stderr: null, compileError: language === 'cpp' ? `Local API Call Error: ${errorMessage}` : null, runtimeError: `Local API Call Error: ${errorMessage}`, networkError: `Local API Call Error: ${errorMessage}` };
      }
  }, [toast, currentUser]);

  const handleNewSnippet = useCallback(() => {
    const baseTitle = codeTitle.replace(/\.(cpp|py|html|js|jsx|tsx)$/i, "");
    setNewSnippetDialogInput(baseTitle || "Untitled");
    setNewSnippetLanguage(editorLanguage);
    setIsNewSnippetModalOpen(true);
  }, [codeTitle, editorLanguage]);

  const handleConfirmCreateNewSnippet = useCallback(() => {
    const baseFilename = newSnippetDialogInput.trim() || "Untitled";
    if (!baseFilename) {
      toast({ title: "Error", description: "Filename cannot be empty.", variant: "destructive" });
      return;
    }
    let extension = '.cpp';
    switch (newSnippetLanguage) {
        case 'python': extension = '.py'; break;
        case 'html': extension = '.html'; break;
        case 'javascript': extension = '.js'; break;
        case 'react': extension = '.tsx'; break;
        case 'cpp':
        default: extension = '.cpp';
    }
    const finalTitle = baseFilename.endsWith(extension) ? baseFilename : `${baseFilename}${extension}`;
    let defaultCodeContent = "";
    switch (newSnippetLanguage) {
        case 'python': defaultCodeContent = "# Your Python code here\n\nprint(\"Hello from Python!\")\n"; break;
        case 'html': defaultCodeContent = "<!DOCTYPE html>\n<html>\n<head>\n  <title>My Page</title>\n</head>\n<body>\n  <h1>Hello, HTML!</h1>\n</body>\n</html>"; break;
        case 'javascript': defaultCodeContent = "// Your JavaScript code here\n\nconsole.log(\"Hello from JavaScript!\");\n"; break;
        case 'react': defaultCodeContent = "import React from 'react';\n\nconst App = () => {\n  return <h1>Hello, React!</h1>;\n};\n\nexport default App;\n"; break;
        case 'cpp': default: defaultCodeContent = "#include <iostream>\nusing namespace std;\nint main() {\n  // Your C++ code here\n  cout << \"Hello from C++!\" << endl;\n  return 0;\n}"; break;
    }
    setCode(defaultCodeContent);
    setCodeTitle(finalTitle);
    setCurrentSnippetId(null);
    setIsNewSnippetModalOpen(false);
    setActiveTab("editor");
    toast({ title: "New Snippet Created", description: `Editor cleared for "${finalTitle}".` });
  }, [newSnippetDialogInput, newSnippetLanguage, toast]);

  const handleSaveOrUpdateSnippet = useCallback((data: { title: string; code: string; snippetIdToUpdate?: string | null }) => {
    if (!currentUser) {
      toast({ title: "Error", description: "You must be logged in to save code.", variant: "destructive" });
      return;
    }
    const finalTitle = data.title;
    if (!finalTitle.trim().replace(/\.(cpp|py|html|js|jsx|tsx)$/i, "")) {
      toast({ title: "Error", description: "Please enter a valid title for your code snippet.", variant: "destructive" });
      return;
    }
    if (!finalTitle.match(/\.(cpp|py|html|js|jsx|tsx)$/i)) {
      toast({ title: "Error", description: "Filename must end with a supported extension (.cpp, .py, .html, .js, .jsx, .tsx)", variant: "destructive" });
      return;
    }
    const snippetIdInEditor = data.snippetIdToUpdate;
    const conflictingSnippet = savedCodes.find(s => s.userId === currentUser.id && s.title === finalTitle && s.id !== snippetIdInEditor);
    if (conflictingSnippet) {
      setOverwriteDialogDetails({ titleToSave: finalTitle, codeToSave: data.code, snippetToOverwriteId: conflictingSnippet.id, snippetIdOriginallyInEditor: snippetIdInEditor || "" });
      setShowConfirmOverwriteSnippetDialog(true);
    } else {
      let updatedSnippets: CodeSnippet[];
      let newCurrentSnippetIdToSet: string | null = null;
      if (snippetIdInEditor) {
        updatedSnippets = savedCodes.map(snippet => snippet.id === snippetIdInEditor ? { ...snippet, title: finalTitle, code: data.code, userId: currentUser.id, updatedAt: new Date() } : snippet);
        newCurrentSnippetIdToSet = snippetIdInEditor;
        toast({ title: "Snippet Updated", description: `"${finalTitle}" has been updated.` });
      } else {
        const newSnippet: CodeSnippet = { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), title: finalTitle, code: data.code, userId: currentUser.id, createdAt: new Date(), updatedAt: new Date() };
        updatedSnippets = [newSnippet, ...savedCodes];
        newCurrentSnippetIdToSet = newSnippet.id;
        toast({ title: "Snippet Saved", description: `"${finalTitle}" has been saved.` });
      }
      setSavedCodes(updatedSnippets);
      setCurrentSnippetId(newCurrentSnippetIdToSet);
      setCodeTitle(finalTitle);
    }
  }, [savedCodes, currentUser, toast]);
    
  const handleConfirmOverwrite = useCallback(() => {
    if (!overwriteDialogDetails || !currentUser) return;
    const { titleToSave, codeToSave, snippetToOverwriteId, snippetIdOriginallyInEditor } = overwriteDialogDetails;
    let updatedSnippets = savedCodes.map(s => s.id === snippetToOverwriteId ? { ...s, code: codeToSave, title: titleToSave, userId: currentUser.id, updatedAt: new Date() } : s);
    if (snippetIdOriginallyInEditor && snippetIdOriginallyInEditor !== snippetToOverwriteId) {
      updatedSnippets = updatedSnippets.filter(s => s.id !== snippetIdOriginallyInEditor);
    }
    setSavedCodes(updatedSnippets);
    setCurrentSnippetId(snippetToOverwriteId);
    setCodeTitle(titleToSave);
    toast({ title: "Snippet Overwritten", description: `"${titleToSave}" has been updated with the new content.` });
    setShowConfirmOverwriteSnippetDialog(false);
    setOverwriteDialogDetails(null);
  }, [savedCodes, currentUser, overwriteDialogDetails, toast]);
  
  const handleRenameSnippetTitle = useCallback((snippetId: string, newTitleBase: string) => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in to rename snippets.", variant: "destructive" }); return; }
    const originalSnippet = savedCodes.find(s => s.id === snippetId);
    if (!originalSnippet) { toast({ title: "Error", description: "Original snippet not found.", variant: "destructive" }); return; }
    const originalExtensionMatch = originalSnippet.title.match(/\.(cpp|py|html|js|jsx|tsx)$/i);
    const originalExtension = originalExtensionMatch ? originalExtensionMatch[0] : ".cpp";
    const finalNewTitle = newTitleBase.match(/\.(cpp|py|html|js|jsx|tsx)$/i) ? newTitleBase : `${newTitleBase}${originalExtension}`;
    if (!finalNewTitle.trim().replace(/\.(cpp|py|html|js|jsx|tsx)$/i, "")) { toast({ title: "Error", description: "Please enter a valid new title for the snippet.", variant: "destructive" }); return; }
    const conflictingSnippet = savedCodes.find(s => s.userId === currentUser.id && s.title === finalNewTitle && s.id !== snippetId);
    if (conflictingSnippet) { toast({ title: "Error", description: `A snippet named "${finalNewTitle}" already exists. Please choose a different name or save to overwrite.`, variant: "destructive" }); return; }
    setSavedCodes(prevSnippets => {
        const updatedSnippets = prevSnippets.map(snippet => snippet.id === snippetId && snippet.userId === currentUser.id ? { ...snippet, title: finalNewTitle, updatedAt: new Date() } : snippet);
        if (JSON.stringify(prevSnippets) !== JSON.stringify(updatedSnippets)) {
            if (currentSnippetId === snippetId) { setCodeTitle(finalNewTitle); }
            toast({ title: "Snippet Renamed", description: `Snippet renamed to "${finalNewTitle}".` });
            return updatedSnippets;
        }
        toast({ title: "Info", description: "No snippet found to rename or title is the same.", variant: "default" });
        return prevSnippets;
    });
  }, [currentUser, currentSnippetId, savedCodes, toast]);
  
  const handleLoadCode = useCallback((snippet: CodeSnippet) => {
    setCode(snippet.code);
    setCodeTitle(snippet.title);
    setCurrentSnippetId(snippet.id);
    setActiveTab("editor");
    toast({ title: "Code Loaded", description: `"${snippet.title}" loaded into editor.` });
  }, [toast]);
  
  const handleDeleteSnippet = useCallback((snippetId: string) => {
    if (!currentUser) return;
    setSavedCodes(prev => prev.filter(s => s.id !== snippetId || s.userId !== currentUser.id));
    if (currentSnippetId === snippetId) {
      setCode("#include <iostream>\nusing namespace std;\nint main() {\n  // Your code here\n cout << \"Hello from C++!\" << endl;\n  return 0;\n}");
      setCodeTitle("Untitled.cpp");
      setCurrentSnippetId(null);
    }
    toast({ title: "Snippet Deleted", description: "The code snippet has been removed." });
  }, [currentUser, currentSnippetId, toast]);

  const handleSubmitExercise = useCallback(async () => {
    if (!currentExercise || !currentUser) return;
    setIsCompiling(true);
    toast({ title: "Submitting Exercise", description: `Submitting solution for "${getLocalizedText(currentExercise.title)}"...` });
    
    let overallSuccess = true;
    if (!(currentUser.completedExercises || []).some(comp => comp.exerciseId === currentExercise.id)) {
        const updatedUserForScoring = { ...currentUser, completedExercises: [...(currentUser.completedExercises || []), { exerciseId: currentExercise.id, completedAt: new Date().toISOString() }], totalScore: (currentUser.totalScore || 0) + currentExercise.points };
        updateCurrentUser(updatedUserForScoring);
        const allStoredUsers = getStoredUsersWithPasswords();
        const userIndex = allStoredUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            allStoredUsers[userIndex] = { ...allStoredUsers[userIndex], completedExercises: updatedUserForScoring.completedExercises, totalScore: updatedUserForScoring.totalScore };
            localPersistAllUsers(allStoredUsers);
        }
        toast({ title: "Exercise Submitted!", description: `You earned ${currentExercise.points} points.` });
    } else {
        toast({ title: "Exercise Submitted!", description: "You've already completed this exercise." });
    }

    setActiveTab("editor");
    setIsCompiling(false);
  }, [currentUser, currentExercise, toast, getStoredUsersWithPasswords, localPersistAllUsers, updateCurrentUser]);

  const handleCreateClassGroup = useCallback((data: { name: string; }) => {
    if (!currentUser) { toast({ title: "Error", description: "You must be logged in.", variant: "destructive" }); return; }
    if (!currentUser.institutionId) { toast({ title: "Error", description: "You are not associated with an institution.", variant: "destructive" }); return; }
    const newClass: ClassGroup = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: data.name,
      adminId: currentUser.id,
      classCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      assignedExercises: [],
      pendingJoinRequests: [],
      members: [],
      assignedChallenges: [],
      assistanceRequests: [],
      publicChatMessages: [],
      status: 'active',
      startedAt: new Date().toISOString(),
      institutionId: currentUser.institutionId,
      capacity: 100,
    };
    setClassGroups(prev => [newClass, ...prev]);
    toast({ title: "Class Created", description: `Class "${data.name}" has been created with code ${newClass.classCode}.` });
  }, [currentUser, toast]);

  const handleUpdateClassGroup = useCallback((updatedClassGroup: ClassGroup) => {
    if (!currentUser) return;
    setClassGroups(prev => prev.map(cg => cg.id === updatedClassGroup.id ? updatedClassGroup : cg));
    toast({ title: "Class Updated", description: `Class "${updatedClassGroup.name}" has been updated.` });
  }, [currentUser, toast]);

  const handleDeleteClassGroup = useCallback((classId: string) => {
    if (!currentUser) return;
    const classToDelete = classGroups.find(cg => cg.id === classId);
    if (!classToDelete) {
      toast({ title: "Error", description: "Class not found.", variant: "destructive" });
      return;
    }
    if (!currentUser.isAdmin && classToDelete.adminId !== currentUser.id) {
      toast({ title: "Permission Denied", description: "You are not authorized to delete this class.", variant: "destructive" });
      return;
    }
    setClassGroups(prev => prev.filter(cg => cg.id !== classId));
    toast({ title: "Class Deleted", description: `"${classToDelete.name}" has been deleted.` });
  }, [currentUser, classGroups, toast]);

  const handleUpdateClassStatus = (classId: string, status: ClassGroup['status']) => {
    let className = "";
    setClassGroups(prev => {
        const updatedGroups = prev.map(cg => {
            if (cg.id === classId) {
                className = cg.name;
                const now = new Date().toISOString();
                const updatedCg: ClassGroup = { ...cg, status };
                if (status === 'active' && !updatedCg.startedAt) {
                    updatedCg.startedAt = now;
                }
                if (status === 'finished' && !updatedCg.finishedAt) {
                    updatedCg.finishedAt = now;
                }
                return updatedCg;
            }
            return cg;
        });
        return updatedGroups;
    });

    if (className) {
        toast({ title: "Class Status Updated", description: `Class "${className}" is now ${status}.` });
    }
  };
  
  const handleUpdateUserRole = useCallback((userId: string, newRole: User['role']) => {
    if (!currentUser) { toast({ title: "Error", description: "Not logged in.", variant: "destructive" }); return; }
    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      allStoredUsers[userIndex].role = newRole;
      localPersistAllUsers(allStoredUsers);
      toast({ title: "User Role Updated", description: `Role updated to ${newRole}.` });
    }
  }, [currentUser, getStoredUsersWithPasswords, localPersistAllUsers, toast]);

  const handleAdminResetPassword = useCallback((userId: string) => {
    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      allStoredUsers[userIndex].passwordHash = "1234";
      allStoredUsers[userIndex].mustChangePassword = true;
      localPersistAllUsers(allStoredUsers);
      toast({ title: "Password Reset", description: "User's password has been reset to '1234'." });
    }
  }, [getStoredUsersWithPasswords, localPersistAllUsers, toast]);

  const handleToggleAdminStatus = useCallback((userId: string) => {
    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      allStoredUsers[userIndex].isAdmin = !allStoredUsers[userIndex].isAdmin;
      localPersistAllUsers(allStoredUsers);
      toast({ title: "Admin Status Changed", description: `Global admin status set to ${allStoredUsers[userIndex].isAdmin}.` });
    }
  }, [getStoredUsersWithPasswords, localPersistAllUsers, toast]);

  const handleAdminDeleteUser = useCallback((userId: string) => {
    const allStoredUsers = getStoredUsersWithPasswords();
    const updatedUsers = allStoredUsers.filter(u => u.id !== userId);
    localPersistAllUsers(updatedUsers);
    setClassGroups(prev => prev.map(cg => ({
      ...cg,
      members: cg.members.filter(m => m.userId !== userId),
      pendingJoinRequests: cg.pendingJoinRequests.filter(req => req.userId !== userId)
    })));
    toast({ title: "User Deleted", description: "User has been permanently deleted." });
  }, [getStoredUsersWithPasswords, localPersistAllUsers, toast]);

  const handleRequestToJoinClass = useCallback(async (classCode: string) => {
    if (!currentUser) return;
    
    // Read the source of truth from localStorage first
    const storedClassGroupsJSON = localStorage.getItem(CLASS_GROUPS_STORAGE_KEY);
    const allClassGroups: ClassGroup[] = storedClassGroupsJSON ? JSON.parse(storedClassGroupsJSON) : [];

    const targetClassIndex = allClassGroups.findIndex(cg => cg.classCode.toLowerCase() === classCode.toLowerCase());
    
    if (targetClassIndex === -1) {
      toast({ title: "Error", description: "Invalid class code.", variant: "destructive" });
      return;
    }
    
    const targetClass = allClassGroups[targetClassIndex];

    if (targetClass.institutionId !== currentUser.institutionId) {
        toast({ title: "Error", description: "You can only join classes within your institution.", variant: "destructive"});
        return;
    }
    if (targetClass.members.some(m => m.userId === currentUser.id)) {
        toast({ title: "Already Enrolled", description: "You are already a member of this class.", variant: "default" });
        return;
    }
    if (targetClass.pendingJoinRequests.some(req => req.userId === currentUser.id)) {
        toast({ title: "Request Pending", description: "You have already sent a request to join this class.", variant: "default" });
        return;
    }
    
    const newRequest = {
      classId: targetClass.id,
      className: targetClass.name,
      userId: currentUser.id,
      username: currentUser.username,
      no: currentUser.no,
      studentId: currentUser.studentId,
      fullName: currentUser.fullName,
      userEmail: currentUser.email,
      requestedAt: new Date().toISOString()
    };
    
    // Add the request to the class group from localStorage
    allClassGroups[targetClassIndex].pendingJoinRequests.push(newRequest);
    
    // Persist the updated class groups back to localStorage
    localStorage.setItem(CLASS_GROUPS_STORAGE_KEY, JSON.stringify(allClassGroups));

    // Update the local state to reflect the change immediately
    setClassGroups(allClassGroups);
    
    // Also update the user's local record of pending requests
    const updatedUser = { ...currentUser, pendingClassRequests: [...(currentUser.pendingClassRequests || []), newRequest] };
    updateCurrentUser(updatedUser);
    
    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        allStoredUsers[userIndex] = { ...allStoredUsers[userIndex], ...updatedUser };
        persistAllUsers(allStoredUsers);
    }
    
    toast({ title: "Request Sent", description: `Your request to join "${targetClass.name}" has been sent for approval.` });
    setShowJoinClassModal(false);
  }, [currentUser, toast, updateCurrentUser, getStoredUsersWithPasswords, persistAllUsers]);

  const handleApproveJoinRequest = useCallback(async (classId: string, requestingUserId: string, aliasForStudent: string) => {
      const allStoredUsers = getStoredUsersWithPasswords();
      const studentUserIndex = allStoredUsers.findIndex(u => u.id === requestingUserId);
  
      if (studentUserIndex === -1) {
          toast({ title: "Error", description: "Requesting student not found.", variant: "destructive" });
          return;
      }
  
      let classToUpdate = classGroups.find(cg => cg.id === classId);
      if (!classToUpdate) {
          toast({ title: "Error", description: "Class not found.", variant: "destructive" });
          return;
      }
      
      // Check if student is already a member
      if (classToUpdate.members.some(m => m.userId === requestingUserId)) {
          toast({ title: "Info", description: "This student is already a member of the class.", variant: "default" });
          return;
      }
  
      const targetInstitution = institutions.find(i => i.id === classToUpdate!.institutionId);
      const pricePerStudent = targetInstitution?.pricePerStudent ?? 0;
      const lecturerId = classToUpdate.adminId;
  
      const lecturerUserIndex = allStoredUsers.findIndex(u => u.id === lecturerId);
      if (lecturerUserIndex !== -1) {
          allStoredUsers[lecturerUserIndex].billingBalance = (allStoredUsers[lecturerUserIndex].billingBalance || 0) + pricePerStudent;
          const newTransaction: BillingTransaction = {
              id: `txn-${Date.now()}-${requestingUserId.slice(-4)}`,
              lecturerId,
              studentId: requestingUserId,
              classId,
              amount: pricePerStudent,
              timestamp: new Date().toISOString(),
              paid: false,
          };
          setTransactions(prev => [...prev, newTransaction]);
      }
  
      allStoredUsers[studentUserIndex].enrolledClassIds = [...new Set([...(allStoredUsers[studentUserIndex].enrolledClassIds || []), classId])];
      allStoredUsers[studentUserIndex].pendingClassRequests = (allStoredUsers[studentUserIndex].pendingClassRequests || []).filter(req => req.classId !== classId);
      
      const updatedClassGroups = classGroups.map(cg => {
          if (cg.id === classId) {
              const updatedPending = cg.pendingJoinRequests.filter(req => req.userId !== requestingUserId);
              const newMember: ClassMember = { userId: requestingUserId, alias: aliasForStudent, joinedAt: new Date().toISOString(), status: 'active' };
              const updatedMembers = [...cg.members, newMember];
              return { ...cg, members: updatedMembers, pendingJoinRequests: updatedPending };
          }
          return cg;
      });
  
      toast({ title: "Student Approved", description: `Approved ${aliasForStudent}. Lecturer balance updated by ฿${pricePerStudent.toFixed(2)}.` });
  
      localPersistAllUsers(allStoredUsers);
      setClassGroups(updatedClassGroups);
  }, [classGroups, institutions, getStoredUsersWithPasswords, localPersistAllUsers, toast]);

  const handleDenyJoinRequest = useCallback(async (classId: string, requestingUserId: string) => {
    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === requestingUserId);

    if (userIndex !== -1) {
        allStoredUsers[userIndex].pendingClassRequests = (allStoredUsers[userIndex].pendingClassRequests || []).filter(req => req.classId !== classId);
        localPersistAllUsers(allStoredUsers);
    }
    
    setClassGroups(prev => prev.map(cg => cg.id === classId ? { ...cg, pendingJoinRequests: cg.pendingJoinRequests.filter(req => req.userId !== requestingUserId) } : cg));
    toast({ title: "Request Denied", description: "The join request has been denied." });
  }, [getStoredUsersWithPasswords, localPersistAllUsers, toast, setClassGroups]);

  const handleUpdateClassExercises = useCallback((classId: string, newAssignedExercises: AssignedExerciseInfo[]) => {
    setClassGroups(prev => prev.map(cg => cg.id === classId ? { ...cg, assignedExercises: newAssignedExercises } : cg));
    toast({ title: "Exercises Updated", description: "The assigned exercises for the class have been updated." });
  }, [toast]);

  const handleLeaveClass = useCallback(async (classId: string) => {
    if (!currentUser) return;

    setClassGroups(prevClassGroups => {
        return prevClassGroups.map(cg => {
            if (cg.id === classId) {
                const updatedMembers = cg.members.map(m =>
                    m.userId === currentUser.id ? { ...m, status: 'removed' as const } : m
                );
                return { ...cg, members: updatedMembers };
            }
            return cg;
        });
    });

    const updatedUser = {
        ...currentUser,
        enrolledClassIds: currentUser.enrolledClassIds.filter(id => id !== classId)
    };
    updateCurrentUser(updatedUser);

    const allStoredUsers = getStoredUsersWithPasswords();
    const userIndex = allStoredUsers.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        allStoredUsers[userIndex].enrolledClassIds = updatedUser.enrolledClassIds;
        localPersistAllUsers(allStoredUsers);
    }

    toast({ title: "Left Class", description: "You have successfully left the class. Your lecturer will be notified." });
  }, [currentUser, getStoredUsersWithPasswords, localPersistAllUsers, toast, updateCurrentUser]);

  const handleRemoveStudentFromClass = useCallback((classId: string, studentUserId: string) => {
    setClassGroups(prev => prev.map(cg => {
        if (cg.id === classId) {
            const updatedMembers = cg.members.map(m => m.userId === studentUserId ? { ...m, status: 'removed' as const } : m);
            return { ...cg, members: updatedMembers };
        }
        return cg;
    }));
    toast({ title: "Student Removed", description: "Student has been marked as removed from the class." });
  }, [toast]);

  const handleReactivateStudentInClass = useCallback((classId: string, studentUserId: string) => {
    setClassGroups(prev => prev.map(cg => {
        if (cg.id === classId) {
            const updatedMembers = cg.members.map(m => m.userId === studentUserId ? { ...m, status: 'active' as const } : m);
            return { ...cg, members: updatedMembers };
        }
        return cg;
    }));
    toast({ title: "Student Reactivated", description: "Student has been reactivated in the class." });
  }, [toast]);

  const handleRenameStudentAlias = useCallback((classId: string, studentUserId: string, newAlias: string) => {
    setClassGroups(prev => prev.map(cg => {
        if (cg.id === classId) {
            const updatedMembers = cg.members.map(m => m.userId === studentUserId ? { ...m, alias: newAlias } : m);
            return { ...cg, members: updatedMembers };
        }
        return cg;
    }));
    toast({ title: "Alias Updated", description: "Student alias has been renamed." });
  }, [toast]);
  
  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    const lang = isClient ? (localStorage.getItem('codecampus_language') as 'en' | 'th' || 'th') : 'th';
    if (typeof text === 'string') return text;
    if (text) {
      return text[lang] || text.en;
    }
    return '';
  };

  const handleAddExercise = useCallback((data: { exerciseData: Omit<Exercise, 'id' | 'creatorId'>; classIdToAssign?: string; }) => {
      if (!currentUser) return;
      const newExercise: Exercise = {
          ...data.exerciseData,
          id: exercises.length > 0 ? Math.max(...exercises.map(e => e.id)) + 1 : 1,
          creatorId: currentUser.id,
      };
      setExercises(prev => [...prev, newExercise]);

      if (data.classIdToAssign) {
          const newAssignedInfo: AssignedExerciseInfo = {
              exerciseId: newExercise.id,
              addedAt: new Date().toISOString(),
          };
          setClassGroups(prev => prev.map(cg =>
              cg.id === data.classIdToAssign
                  ? { ...cg, assignedExercises: [...(cg.assignedExercises || []), newAssignedInfo] }
                  : cg
          ));
          toast({ title: "Exercise Added", description: `"${getLocalizedText(newExercise.title)}" has been added and assigned.` });
      } else {
          toast({ title: "Exercise Added", description: `"${getLocalizedText(newExercise.title)}" has been added globally.` });
      }
  }, [exercises, currentUser, toast, getLocalizedText]);

  const handleUpdateExercise = useCallback((updatedExercise: Exercise) => {
    setExercises(prev => prev.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex));
    toast({ title: "Exercise Updated", description: `"${getLocalizedText(updatedExercise.title)}" has been updated.` });
  }, [toast, getLocalizedText]);

  const handleDeleteExercise = useCallback((exerciseId: number) => {
    const exerciseToDelete = exercises.find(ex => ex.id === exerciseId);
    if (!exerciseToDelete) return;

    setExercises(prev => prev.filter(ex => ex.id !== exerciseId));

    // Also remove from any class assignments
    setClassGroups(prevClassGroups => {
        return prevClassGroups.map(cg => {
            const isAssigned = cg.assignedExercises.some(ae => ae.exerciseId === exerciseId);
            if (isAssigned) {
                return {
                    ...cg,
                    assignedExercises: cg.assignedExercises.filter(ae => ae.exerciseId !== exerciseId)
                };
            }
            return cg;
        });
    });

    toast({ title: "Exercise Deleted", description: `"${getLocalizedText(exerciseToDelete.title)}" has been deleted.` });
  }, [exercises, toast, getLocalizedText]);


  const handleAddLabSemester = useCallback((labData: Omit<Lab, 'id' | 'challenges' | 'creatorId'>): Lab | null => {
    if (!currentUser) return null;
    const newLab: Lab = {
        ...labData,
        id: `lab-${Date.now()}`,
        challenges: [],
        creatorId: currentUser.id,
        isTemplate: true,
    };
    setLabs(prev => [...prev, newLab]);
    toast({ title: "Lab Course Created", description: `Course "${getLocalizedText(newLab.title)}" created.` });
    return newLab;
  }, [currentUser, toast, getLocalizedText]);

  const handleUpdateLabSemester = useCallback((updatedLab: Lab) => {
    setLabs(prev => prev.map(lab => lab.id === updatedLab.id ? updatedLab : lab));
    toast({ title: "Lab Course Updated", description: `Course "${getLocalizedText(updatedLab.title)}" updated.` });
  }, [toast, getLocalizedText]);
  
  const handleDeleteLabSemester = useCallback((labId: string) => {
    setLabs(prev => prev.filter(lab => lab.id !== labId));
    toast({ title: "Lab Course Deleted", description: "Lab course removed." });
  }, [toast]);

  const handleAddWeekToSemester = useCallback((labId: string, weekData: Omit<LabChallenge, 'id' | 'targetCodes' | 'labId'>): LabChallenge | null => {
    let newChallenge: LabChallenge | null = null;
    setLabs(prev => prev.map(lab => {
        if (lab.id === labId) {
            newChallenge = {
                ...weekData,
                id: `challenge-${Date.now()}`,
                targetCodes: [],
                labId: lab.id
            } as LabChallenge;
            return { ...lab, challenges: [...lab.challenges, newChallenge] };
        }
        return lab;
    }));
    if (newChallenge && 'title' in newChallenge) {
        toast({ title: "Week Added", description: `Week "${newChallenge.title}" added.` });
    }
    return newChallenge;
  }, [toast]);
  
  const handleUpdateWeekInSemester = useCallback((labId: string, updatedChallenge: LabChallenge) => {
      setLabs(prev => prev.map(lab => {
          if (lab.id === labId) {
              return { ...lab, challenges: lab.challenges.map(c => c.id === updatedChallenge.id ? updatedChallenge : c) };
          }
          return lab;
      }));
      toast({ title: "Week Updated", description: `Week "${updatedChallenge.title}" updated.` });
  }, [toast]);

  const handleDeleteWeekFromSemester = useCallback((labId: string, challengeId: string) => {
      setLabs(prev => prev.map(lab => {
          if (lab.id === labId) {
              return { ...lab, challenges: lab.challenges.filter(c => c.id !== challengeId) };
          }
          return lab;
      }));
      toast({ title: "Week Deleted", description: "Week removed from semester." });
  }, [toast]);

  const handleAddTargetCodeToWeek = useCallback((labId: string, challengeId: string, codeData: Omit<LabTargetCode, 'id'>) => {
    setLabs(prev => prev.map(lab => {
        if (lab.id === labId) {
            const updatedChallenges = lab.challenges.map(c => {
                if (c.id === challengeId) {
                    const newTargetCode: LabTargetCode = { ...codeData, id: `tc-${Date.now()}` };
                    return { ...c, targetCodes: [...c.targetCodes, newTargetCode] };
                }
                return c;
            });
            return { ...lab, challenges: updatedChallenges };
        }
        return lab;
    }));
    toast({ title: "Target Code Added", description: "New target code has been added." });
  }, [toast]);

  const handleUpdateTargetCodeInWeek = useCallback((labId: string, challengeId: string, updatedTargetCode: LabTargetCode) => {
    setLabs(prev => prev.map(lab => {
        if (lab.id === labId) {
            const updatedChallenges = lab.challenges.map(c => {
                if (c.id === challengeId) {
                    return { ...c, targetCodes: c.targetCodes.map(tc => tc.id === updatedTargetCode.id ? updatedTargetCode : tc) };
                }
                return c;
            });
            return { ...lab, challenges: updatedChallenges };
        }
        return lab;
    }));
    toast({ title: "Target Code Updated", description: "Target code has been updated." });
  }, [toast]);

  const handleDeleteTargetCodeFromWeek = useCallback((labId: string, challengeId: string, targetCodeId: string) => {
      setLabs(prev => prev.map(lab => {
          if (lab.id === labId) {
              const updatedChallenges = lab.challenges.map(c => {
                  if (c.id === challengeId) {
                      return { ...c, targetCodes: c.targetCodes.filter(tc => tc.id !== targetCodeId) };
                  }
                  return c;
              });
              return { ...lab, challenges: updatedChallenges };
          }
          return lab;
      }));
      toast({ title: "Target Code Deleted", description: "Target code has been removed." });
  }, [toast]);
  
  const handleCloneWeekToCourse = useCallback((sourceLabId: string, sourceChallengeId: string, targetLabId: string) => {
      const sourceLab = labs.find(l => l.id === sourceLabId);
      const challengeToClone = sourceLab?.challenges.find(c => c.id === sourceChallengeId);
      
      if (!challengeToClone) {
          toast({ title: "Error", description: "Source week not found.", variant: "destructive" });
          return;
      }
      
      const newChallengeData: Omit<LabChallenge, 'id' | 'targetCodes' | 'labId'> = {
        title: `${challengeToClone.title} (Clone)`,
        description: challengeToClone.description,
        language: challengeToClone.language,
      };

      const newWeek = handleAddWeekToSemester(targetLabId, newChallengeData);
      
      if(newWeek) {
        // Now clone the target codes
        challengeToClone.targetCodes.forEach(tc => {
            const { id, ...restOfTc } = tc;
            handleAddTargetCodeToWeek(targetLabId, newWeek.id, restOfTc);
        });
         toast({ title: "Week Cloned", description: `Week "${challengeToClone.title}" was successfully cloned.` });
      }
  }, [labs, handleAddWeekToSemester, handleAddTargetCodeToWeek, toast]);


  const handleUseSnippetAsWeekTarget = useCallback((data: { snippet: CodeSnippet; labId: string; challengeId: string; points: number, targetDescription?: string; }) => {
      const { snippet, labId, challengeId, points, targetDescription } = data;
      const snippetLang = snippet.title.endsWith('.py') ? 'python' : 'cpp';
      
      const challenge = labs.find(l=>l.id===labId)?.challenges.find(c=>c.id===challengeId);
      if (challenge && challenge.language !== snippetLang) {
          toast({ title: "Language Mismatch", description: `Cannot add a ${snippetLang.toUpperCase()} snippet to a ${challenge.language.toUpperCase()} week.`, variant: "destructive"});
          return;
      }

      const newTarget: Omit<LabTargetCode, 'id'> = {
        code: snippet.code,
        description: targetDescription || snippet.title,
        requiredOutputSimilarity: 100, // For snippets, we can assume it should be a perfect match
        points: points,
        sourceSnippetId: snippet.id,
        testCases: [],
        enforcedStatement: undefined,
      };
      handleAddTargetCodeToWeek(labId, challengeId, newTarget);
      toast({ title: "Success", description: `Snippet "${snippet.title}" added as a target for the week.` });
  }, [labs, toast, handleAddTargetCodeToWeek]);

  const handleAssignWeeksToClass = useCallback((classId: string, selectedWeeksData: Array<{ labId: string; challengeId: string }>, expiryDate?: string) => {
      setClassGroups(prev => prev.map(cg => {
          if (cg.id === classId) {
              const newAssignments: AssignedChallengeInfo[] = selectedWeeksData.map(sc => ({
                  assignmentId: `asgn-${sc.labId}-${sc.challengeId}-${cg.id}`,
                  labId: sc.labId,
                  challengeId: sc.challengeId,
                  classId: cg.id,
                  assignedByLecturerId: currentUser!.id,
                  expiryDate: expiryDate,
                  studentProgress: {},
              }));
              const uniqueNewAssignments = newAssignments.filter(na => !cg.assignedChallenges.some(ac => ac.assignmentId === na.assignmentId));
              return { ...cg, assignedChallenges: [...cg.assignedChallenges, ...uniqueNewAssignments] };
          }
          return cg;
      }));
      toast({ title: "Weeks Assigned", description: "Selected weeks have been assigned to the class." });
  }, [currentUser, toast]);

  const handleUnassignWeekFromClass = useCallback((classId: string, assignmentId: string) => {
      setClassGroups(prev => prev.map(cg =>
          cg.id === classId
              ? { ...cg, assignedChallenges: cg.assignedChallenges.filter(ac => ac.assignmentId !== assignmentId) }
              : cg
      ));
      toast({ title: "Week Unassigned", description: "The week has been unassigned from the class." });
  }, [toast]);

  const handleUpdateAssignedWeekExpiry = useCallback((classId: string, assignmentId: string, expiryDate?: string) => {
      setClassGroups(prev => prev.map(cg => {
          if (cg.id === classId) {
              return {
                  ...cg,
                  assignedChallenges: cg.assignedChallenges.map(ac =>
                      ac.assignmentId === assignmentId ? { ...ac, expiryDate: expiryDate } : ac
                  )
              };
          }
          return cg;
      }));
      toast({ title: "Expiry Date Updated", description: "The assignment expiry date has been updated." });
  }, [toast]);

  const checkStatement = useCallback((code: string, statement: EnforcedStatement, language: SupportedLanguage): boolean => {
    if (language === 'python') {
        const noComments = code.replace(/#.*$/gm, '').replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, '');
        if (statement === 'if-else') return /\bif\s.*:/.test(noComments) && /\belse\s*:/.test(noComments);
        const regex = new RegExp(`\\b${statement}\\b`);
        return regex.test(noComments);
    } else { // cpp, javascript, react
        const noComments = code.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        if (statement === 'if-else') return /\bif\s*\(/.test(noComments) && /\belse\b/.test(noComments);
        if (statement === 'do-while') return /\bdo\b/.test(noComments) && /\bwhile\s*\(/.test(noComments);
        if (statement === 'pointer') return /(\w+\s*\*\s*\w+)|(\*\w+)/.test(noComments);
        if (statement === 'array') return /\w+\s+\w+\[.*\]/.test(noComments);
        const regex = new RegExp(`\\b${statement}\\b`);
        return regex.test(noComments);
    }
  }, []);

  const stripCodeCommentsAndWhitespace = useCallback((code: string, language: SupportedLanguage): string => {
    let noComments: string;
    if (language === 'html') {
      noComments = code.replace(/<!--[\s\S]*?-->/g, '');
    } else {
        noComments = code
          .replace(/\/\*[\s\S]*?\*\//g, '') 
          .replace(/\/\/.*$/g, '');      
    }
    return noComments.replace(/\s+/g, ''); // Remove all whitespace
  }, []);

  const calculateOutputSimilarity = useCallback((studentOutput: string, targetOutput: string, isSourceCode: boolean = false): number => {
    const normalize = (s: string) => {
      let normalized = s || '';
      if (isSourceCode) {
        normalized = normalized.replace(/\s+/g, '');
      } else {
        normalized = normalized
          .toLowerCase()
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
          .replace(/\s+/g, ' ')
          .trim();
      }
      return normalized;
    };
  
    const s1 = normalize(studentOutput || "");
    const s2 = normalize(targetOutput || "");
  
    if (s1 === s2) return 100;
  
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0 || len2 === 0) return 0;
    
    const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 1; j <= len2; j++) dp[0][j] = j;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,      
                dp[i][j - 1] + 1,      
                dp[i - 1][j - 1] + cost
            );
        }
    }

    const distance = dp[len1][len2];
    const maxLen = Math.max(len1, len2);
    if (maxLen === 0) return 100;

    const similarity = ((maxLen - distance) / maxLen) * 100;
    return Math.max(0, Math.round(similarity));
  }, []);

 const handleStudentSubmitLabCode = useCallback(async (assignmentId: string, challengeId: string, targetCodeId: string, studentCode: string) => {
    if (!currentUser) return;
    setIsCompiling(true);

    const assignment = classGroups.flatMap(cg => cg.assignedChallenges).find(ac => ac.assignmentId === assignmentId);
    if (!assignment) { toast({ title: "Error", description: "Assignment not found.", variant: "destructive" }); setIsCompiling(false); return; }
    
    const existingAttempt = assignment.studentProgress[currentUser.id]?.[targetCodeId];
    if (assignment.expiryDate && isPast(new Date(assignment.expiryDate)) && !existingAttempt?.completed && existingAttempt?.lateRequestStatus !== 'approved') {
        toast({ title: "Lab Expired", description: "This lab has expired and can no longer be submitted.", variant: "destructive"});
        setIsCompiling(false);
        return;
    }
    
    const labDetails = labs.find(l => l.id === assignment.labId);
    const challengeDetails = labDetails?.challenges.find(c => c.id === challengeId);
    const targetCodeDetails = challengeDetails?.targetCodes.find(tc => tc.id === targetCodeId);
    if (!challengeDetails || !targetCodeDetails) { toast({ title: "Error", description: "Problem details not found.", variant: "destructive" }); setIsCompiling(false); return; }
    
    toast({ title: "Submitting...", description: `Checking your solution for "${targetCodeDetails.description}"...` });

    const isWebLanguage = ['html', 'javascript', 'react'].includes(challengeDetails.language);

    // 1. Statement Check
    const statementCheckResult = targetCodeDetails.enforcedStatement
        ? { required: targetCodeDetails.enforcedStatement, found: checkStatement(studentCode, targetCodeDetails.enforcedStatement, challengeDetails.language) }
        : null;

    // 2. Output Comparison
    let averageOutputSimilarity = 0;
    
    if (isWebLanguage) {
      const studentCodeNormalized = stripCodeCommentsAndWhitespace(studentCode, challengeDetails.language);
      const targetCodeNormalized = stripCodeCommentsAndWhitespace(targetCodeDetails.code, challengeDetails.language);
      averageOutputSimilarity = studentCodeNormalized === targetCodeNormalized ? 100 : 0;
    } else {
        const testCases = targetCodeDetails.testCases && targetCodeDetails.testCases.length > 0
            ? targetCodeDetails.testCases
            : [{ input: "" }];
        
        let totalOutputSimilarity = 0;
        let testCasesRunCount = 0;
        let executionErrorOccurred = false;

        for (const testCase of testCases) {
          const studentExecutionResult = await executeCodeApi(studentCode, testCase.input, challengeDetails.language, `lab_submission_${targetCodeDetails.description}`);
          
          if (studentExecutionResult.networkError || studentExecutionResult.compileError || studentExecutionResult.runtimeError) {
            toast({ title: "Your Code Failed", description: `Your code has an error: ${studentExecutionResult.compileError || studentExecutionResult.runtimeError || studentExecutionResult.error}`, variant: "destructive" });
            setIsCompiling(false);
            executionErrorOccurred = true;
            break;
          }
          
          const targetExecutionResult = await executeCodeApi(targetCodeDetails.code, testCase.input, challengeDetails.language, `lab_target_${targetCodeDetails.id}`);
          
          if (targetExecutionResult.compileError || targetExecutionResult.runtimeError) {
              toast({ title: "Lab Error", description: "The lab's target solution has an error. Please contact your lecturer.", variant: "destructive"});
              setIsCompiling(false); 
              executionErrorOccurred = true;
              break;
          }
          
          const currentOutputSim = calculateOutputSimilarity(studentExecutionResult.output ?? "", targetExecutionResult.output ?? "");
          totalOutputSimilarity += currentOutputSim;
          testCasesRunCount++;
        }

        if (executionErrorOccurred) return;
        averageOutputSimilarity = testCasesRunCount > 0 ? Math.round(totalOutputSimilarity / testCasesRunCount) : 0;
    }
    
    // 3. Determine Status
    const threshold = targetCodeDetails.requiredOutputSimilarity || (isWebLanguage ? 100 : 95);
    const statementRequirementMet = !statementCheckResult || statementCheckResult.found;
    const meetsRequirements = averageOutputSimilarity >= threshold && statementRequirementMet;

    let finalStatus: StudentLabAttempt['status'] = 'fail';
    if (meetsRequirements) {
        finalStatus = averageOutputSimilarity >= 99.5 ? 'well-done' : 'good';
    }

    // 4. AI Assessment (Optional)
    let assessmentResult: SkillAssessmentOutput | undefined = undefined;
    if ((['cpp', 'python', 'javascript', 'react'].includes(challengeDetails.language)) && !meetsRequirements) {
      try {
          assessmentResult = await assessCodeSkill({ code: studentCode, language: challengeDetails.language });
      } catch (e: any) {
          console.error("AI assessment failed during submission:", e);
          toast({ title: "AI Feedback Unavailable", description: "Could not get AI feedback for this submission.", variant: "default" });
      }
    }

    // 5. Calculate score
    const maxPointsForProblem = existingAttempt?.lateSubmissionMaxScore ?? targetCodeDetails.points;

    let statusMultiplier = 0.8;
    if (finalStatus === 'well-done') {
        statusMultiplier = 1.0;
    } else if (finalStatus === 'good') {
        statusMultiplier = 0.9;
    }
    
    const pointsAwarded = (averageOutputSimilarity / 100) * maxPointsForProblem * statusMultiplier;
    
    // 6. Create final attempt object and update state
    const finalAttempt: StudentLabAttempt = {
        studentCode,
        statementCheck: statementCheckResult,
        outputComparisons: [], // Simplified for this fix
        status: finalStatus,
        lastCheckedAt: new Date().toISOString(),
        completed: meetsRequirements,
        language: challengeDetails.language,
        assessment: assessmentResult,
        averageOutputSimilarity,
        score: pointsAwarded,
        lateRequestStatus: existingAttempt?.lateRequestStatus,
        lateSubmissionMaxScore: existingAttempt?.lateSubmissionMaxScore
    };

    const previousAttempt = assignment.studentProgress[currentUser.id]?.[targetCodeId];
    const previousScore = previousAttempt?.score || 0;
    const scoreDifference = finalAttempt.score - previousScore;

    // 7. Update user's total score if score improves
    if (scoreDifference > 0) {
        const allStoredUsers = getStoredUsersWithPasswords();
        const userIndex = allStoredUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            allStoredUsers[userIndex].totalScore = (allStoredUsers[userIndex].totalScore || 0) + scoreDifference;
            localPersistAllUsers(allStoredUsers);
            updateCurrentUser(allStoredUsers[userIndex]);
        }
    }
    
    let resultMessage = `Result for "${targetCodeDetails.description}": ${finalStatus.replace('-', ' ')}.`;
    resultMessage += ` You earned ${pointsAwarded.toFixed(2)} points.`
    toast({ title: "Submission Checked", description: resultMessage });

    setClassGroups(prev => prev.map(cg => {
        if (cg.id === assignment.classId) {
            const updatedChallenges = cg.assignedChallenges.map(ac => {
                if (ac.assignmentId === assignmentId) {
                    const studentProgress: StudentProgress = ac.studentProgress[currentUser.id] || {};
                    const updatedStudentProgress: StudentProgress = { ...studentProgress, [targetCodeId]: finalAttempt };
                    return { ...ac, studentProgress: { ...ac.studentProgress, [currentUser.id]: updatedStudentProgress } };
                }
                return ac;
            });
            return { ...cg, assignedChallenges: updatedChallenges };
        }
        return cg;
    }));

    setIsCompiling(false);
  }, [currentUser, classGroups, labs, executeCodeApi, calculateOutputSimilarity, checkStatement, toast, assessCodeSkill, setIsCompiling, getStoredUsersWithPasswords, localPersistAllUsers, updateCurrentUser, stripCodeCommentsAndWhitespace]);
  
  const handleRequestLateSubmission = (assignmentId: string, challengeId: string, targetCodeId: string) => {
    if (!currentUser) return;
    setClassGroups(prev => prev.map(cg => {
      const assignment = cg.assignedChallenges.find(ac => ac.assignmentId === assignmentId);
      if (!assignment) return cg;

      const updatedChallenges = cg.assignedChallenges.map(ac => {
        if (ac.assignmentId === assignmentId) {
          const studentProgress = ac.studentProgress[currentUser.id] || {};
          const labDetails = labs.find(l => l.id === assignment.labId);
          const challengeDetails = labDetails?.challenges.find(c => c.id === challengeId);
          const targetCodeDetails = challengeDetails?.targetCodes.find(tc => tc.id === targetCodeId);
          if(!challengeDetails || !targetCodeDetails) return ac;

          const attempt = studentProgress[targetCodeId] || { studentCode: '', outputComparisons: [], status: 'fail', lastCheckedAt: new Date().toISOString(), completed: false, language: challengeDetails.language, averageOutputSimilarity: 0, score: 0 };
          const updatedAttempt: StudentLabAttempt = { ...attempt, lateRequestStatus: 'requested' };
          const updatedStudentProgress: StudentProgress = { ...studentProgress, [targetCodeId]: updatedAttempt };
          return { ...ac, studentProgress: { ...ac.studentProgress, [currentUser.id]: updatedStudentProgress } };
        }
        return ac;
      });
      return { ...cg, assignedChallenges: updatedChallenges };
    }));
    toast({ title: "Request Sent", description: "Your request for a late submission has been sent to the lecturer." });
  };
  
  const handleApproveLateSubmission = (classId: string, assignmentId: string, studentId: string, targetCodeId: string, newMaxScore?: number) => {
    setClassGroups(prev => prev.map(cg => {
      if (cg.id !== classId) return cg;

      const updatedChallenges = cg.assignedChallenges.map(ac => {
        if (ac.assignmentId === assignmentId) {
          const studentProgress = ac.studentProgress[studentId];
          const labDetails = labs.find(l => l.id === ac.labId);
          const challengeDetails = labDetails?.challenges.find(c => c.id === challengeId);
          const targetCodeDetails = challengeDetails?.targetCodes.find(tc => tc.id === targetCodeId);
          if (!studentProgress || !studentProgress[targetCodeId] || !targetCodeDetails) return ac;
          
          const attempt = studentProgress[targetCodeId];
          const updatedAttempt: StudentLabAttempt = { ...attempt, lateRequestStatus: 'approved', lateSubmissionMaxScore: newMaxScore ?? targetCodeDetails.points };
          const updatedStudentProgress: StudentProgress = { ...studentProgress, [targetCodeId]: updatedAttempt };
          
          return { ...ac, studentProgress: { ...ac.studentProgress, [studentId]: updatedStudentProgress } };
        }
        return ac;
      });
      return { ...cg, assignedChallenges: updatedChallenges };
    }));
    toast({ title: "Request Approved", description: "The student can now submit their work for this problem." });
  };

  const handleAddInstitution = useCallback((name: string, pricePerStudent: number) => {
    if (!name.trim() || pricePerStudent < 0) {
        toast({ title: "Invalid Input", description: "Institution name cannot be empty and price must be non-negative.", variant: "destructive" });
        return;
    }
    const newInstitution: Institution = {
        id: `inst-${Date.now()}`,
        name,
        pricePerStudent,
        adminUserIds: [],
    };
    setGlobalInstitutions(prev => [...prev, newInstitution]);
    toast({ title: "Institution Added", description: `Institution "${name}" created.` });
  }, [toast, setGlobalInstitutions]);
  
  const handleUpdateInstitution = useCallback((updatedInstitution: Institution) => {
    setGlobalInstitutions(prev => prev.map(inst => inst.id === updatedInstitution.id ? updatedInstitution : inst));
    toast({ title: "Institution Updated", description: `Institution "${updatedInstitution.name}" updated.` });
  }, [toast, setGlobalInstitutions]);

  const handleDeleteInstitution = useCallback((institutionId: string) => {
    setGlobalInstitutions(prev => prev.filter(inst => inst.id !== institutionId));
    toast({ title: "Institution Deleted", description: "Institution removed." });
  }, [toast, setGlobalInstitutions]);

  const handleAssignInstitutionAdmin = useCallback((institutionId: string, userId: string, assign: boolean) => {
    setGlobalInstitutions(prev => prev.map(inst => {
        if (inst.id === institutionId) {
            const currentAdmins = inst.adminUserIds || [];
            if (assign) {
                return { ...inst, adminUserIds: [...new Set([...currentAdmins, userId])] };
            } else {
                return { ...inst, adminUserIds: currentAdmins.filter(id => id !== userId) };
            }
        }
        return inst;
    }));
    toast({ title: "Institution Admin Updated", description: "Admin list for the institution has been updated." });
  }, [toast, setGlobalInstitutions]);
  
  const handleSimulatePayment = useCallback((selectedClassIds: string[], couponCode?: string) => {
    toast({ title: "Payment Simulated", description: `Payment for ${selectedClassIds.length} class(es) has been simulated.` });
  }, [toast]);

  const handleCreateCoupon = useCallback((couponData: Omit<Coupon, 'id' | 'timesUsed' | 'creatorId'>) => {
    if (!currentUser) return;
    const newCoupon: Coupon = {
        ...couponData,
        id: `coupon-${Date.now()}`,
        timesUsed: 0,
        creatorId: currentUser.id,
    };
    setCoupons(prev => [...prev, newCoupon]);
    toast({ title: "Coupon Created", description: `Coupon "${newCoupon.code}" has been created.` });
  }, [currentUser, toast]);
  
  const handleUpdateCoupon = useCallback((updatedCoupon: Coupon) => {
    setCoupons(prev => prev.map(c => c.id === updatedCoupon.id ? updatedCoupon : c));
    toast({ title: "Coupon Updated", description: `Coupon "${updatedCoupon.code}" has been updated.` });
  }, [toast]);

  const handleDeleteCoupon = useCallback((couponId: string) => {
    setCoupons(prev => prev.filter(c => c.id !== couponId));
    toast({ title: "Coupon Deleted", description: "Coupon has been removed." });
  }, [toast]);
  
  const handleCreateAdminSupportRequest = (subject: string, message: string) => {
    if (!currentUser) return;
    const newRequest: AdminSupportRequest = {
      id: `admin-support-${Date.now()}`,
      requesterId: currentUser.id,
      requesterName: currentUser.fullName,
      subject,
      status: 'open',
      createdAt: new Date().toISOString(),
      messages: [{
        id: `msg-${Date.now()}`,
        senderId: currentUser.id,
        text: message,
        timestamp: new Date().toISOString(),
      }],
    };
    setAdminSupportRequests(prev => [...prev, newRequest]);
    console.log(`[ADMIN SUPPORT REQUEST] New request from ${currentUser.fullName} (${currentUser.email}). Subject: ${subject}. Sending notification to binahmad.habib@gmail.com.`);
    toast({ title: 'Support Request Sent', description: 'Your request has been sent to the global administrators.' });
  };

  const handleSendAdminChatMessage = (requestId: string, text: string) => {
    try {
      if (!currentUser) {
        throw new Error("User not logged in.");
      }
      setAdminSupportRequests(prev => prev.map(req => {
          if (req.id === requestId) {
              const newMessage: AdminChatMessage = {
                  id: `msg-${Date.now()}`,
                  senderId: currentUser.id,
                  text,
                  timestamp: new Date().toISOString(),
              };
              const isReopening = req.status === 'closed' && req.requesterId === currentUser.id;
              return {
                  ...req,
                  messages: [...req.messages, newMessage],
                  status: isReopening ? 'open' : req.status,
              };
          }
          return req;
      }));
    } catch(e: any) {
        console.error("Failed to send admin chat message:", e);
        if (e instanceof Error) {
            toast({ title: "Error", description: e.message || "Failed to send message.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: "An unknown error occurred while sending the message.", variant: "destructive" });
        }
    }
  };

  const handleUpdateAdminSupportRequestStatus = (requestId: string, status: 'open' | 'closed') => {
    setAdminSupportRequests(prev => prev.map(req => req.id === requestId ? { ...req, status } : req));
    toast({ title: 'Request Status Updated', description: `Request has been ${status}.` });
  };

  const handleCreateAssistanceRequest = (classId: string, problemContext: string) => {
    if (!currentUser) return;
    const newRequest: ProblemAssistantRequest = {
      id: `assist-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      classId: classId,
      problemContext,
      status: 'open',
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'student',
          senderId: currentUser.id,
          text: problemContext,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    setClassGroups(prev => prev.map(cg => {
      if (cg.id === classId) {
        const updatedRequests = [...(cg.assistanceRequests || []), newRequest];
        return { ...cg, assistanceRequests: updatedRequests };
      }
      return cg;
    }));

    console.log(`[ASSISTANCE REQUEST] New request from ${currentUser.fullName} for class ${classId}. Problem: ${problemContext}. Sending notification to lecturer and binahmad.habib@gmail.com.`);
    toast({ title: 'Assistance Request Sent', description: 'Your request has been sent to your teacher.' });
  };
  
  const handleSendAssistanceMessage = (classId: string, requestId: string, text: string) => {
    try {
      if (!currentUser) {
        throw new Error("User not logged in.");
      }
      setClassGroups(prev => prev.map(cg => {
          if (cg.id === classId) {
              const updatedRequests = (cg.assistanceRequests || []).map(req => {
                  if (req.id === requestId) {
                      const newMessage: AssistantChatMessage = {
                          id: `msg-${Date.now()}`,
                          sender: currentUser.role === 'student' || currentUser.role === 'normal' ? 'student' : 'teacher',
                          senderId: currentUser.id,
                          text,
                          timestamp: new Date().toISOString(),
                      };
                      const isStudentReopening = req.status === 'closed' && req.studentId === currentUser.id;
                      return {
                          ...req,
                          messages: [...req.messages, newMessage],
                          status: isStudentReopening ? 'open' : req.status,
                      };
                  }
                  return req;
              });
              return { ...cg, assistanceRequests: updatedRequests };
          }
          return cg;
      }));
    } catch(e: any) {
      console.error("Failed to send assistance message:", e);
        if (e instanceof Error) {
            toast({ title: "Error", description: e.message || t('unexpectedError'), variant: "destructive" })
        } else {
            toast({ title: "Error", description: t('unexpectedError'), variant: "destructive" })
        }
    }
  };

  const handleCloseAssistanceRequest = (classId: string, requestId: string) => {
    setClassGroups(prev => prev.map(cg => {
      if (cg.id === classId) {
        const updatedRequests = (cg.assistanceRequests || []).map(req =>
          req.id === requestId ? { ...req, status: 'closed' as const } : req
        );
        return { ...cg, assistanceRequests: updatedRequests };
      }
      return cg;
    }));
  };
  
  const handleSendPublicChatMessage = (classId: string, text: string) => {
    if (!currentUser) return;
    const newMessage: PublicChatMessage = {
      id: `pub-msg-${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      text,
      timestamp: new Date().toISOString(),
    };
    setClassGroups(prev => prev.map(cg => {
      if (cg.id === classId) {
        const updatedMessages = [...(cg.publicChatMessages || []), newMessage];
        return { ...cg, publicChatMessages: updatedMessages };
      }
      return cg;
    }));
  };


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    try {
      const stored = localStorage.getItem(CLASS_GROUPS_STORAGE_KEY);
      if (stored) setClassGroups(JSON.parse(stored));
      else setClassGroups(initialMockClassGroups);
    } catch (e: any) {
      toast({ title: "Data Loading Error", description: `Could not load class data. ${String(e)}`, variant: "destructive" });
      setClassGroups(initialMockClassGroups);
    }

    try {
      const stored = localStorage.getItem(LABS_STORAGE_KEY);
      if (stored) setLabs(JSON.parse(stored));
      else setLabs(initialMockLabs);
    } catch (e: any) {
      toast({ title: "Data Loading Error", description: `Could not load lab data. ${String(e)}`, variant: "destructive" });
      setLabs(initialMockLabs);
    }

    try {
      const stored = localStorage.getItem(SAVED_CODES_STORAGE_KEY);
      if (stored) setSavedCodes(JSON.parse(stored));
      else setSavedCodes(mockInitialSavedCodes);
    } catch (e: any) {
      toast({ title: "Data Loading Error", description: `Could not load saved code. ${String(e)}`, variant: "destructive" });
      setSavedCodes(mockInitialSavedCodes);
    }

    try {
        const storedExercises = localStorage.getItem(EXERCISES_STORAGE_KEY);
        if(storedExercises) setExercises(JSON.parse(storedExercises));
        else setExercises(mockExercises);
    } catch(e: any) {
      toast({ title: "Data Loading Error", description: `Could not load exercises. ${String(e)}`, variant: "destructive" });
      setExercises(mockExercises);
    }
    
    try {
        const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
        if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
        else setTransactions(initialMockTransactions);
    } catch(e: any) {
        console.error("Error parsing transactions", e);
        setTransactions(initialMockTransactions);
    }
    
    try {
        const storedSupportRequests = localStorage.getItem(ADMIN_SUPPORT_REQUEST_STORAGE_KEY);
        if (storedSupportRequests) setAdminSupportRequests(JSON.parse(storedSupportRequests));
    } catch(e: any) {
        console.error("Error parsing admin support requests", e);
    }

  }, [isClient, currentUser, toast]);

  useEffect(() => { if(isClient) localStorage.setItem(CLASS_GROUPS_STORAGE_KEY, JSON.stringify(classGroups)); }, [classGroups, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(LABS_STORAGE_KEY, JSON.stringify(labs)); }, [labs, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(SAVED_CODES_STORAGE_KEY, JSON.stringify(savedCodes)); }, [savedCodes, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(EXERCISES_STORAGE_KEY, JSON.stringify(exercises)); }, [exercises, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons)); }, [coupons, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions)); }, [transactions, isClient]);
  useEffect(() => { if(isClient) localStorage.setItem(ADMIN_SUPPORT_REQUEST_STORAGE_KEY, JSON.stringify(adminSupportRequests)); }, [adminSupportRequests, isClient]);
  
  const dashboardActions: DashboardActions = useMemo(() => ({
    setCurrentUser: (user: User | null) => {
      if (user) updateCurrentUser(user);
    },
    setAllUsers, setCode, setIsCompiling, setCodeTitle, setSavedCodes, setCurrentSnippetId, setCurrentExercise, setExercises, handleNewSnippet, handleConfirmCreateNewSnippet, handleRenameSnippetTitle, handleSaveOrUpdateSnippet, handleLoadCode, handleDeleteSnippet, handleSubmitExercise, handleAddExercise, handleUpdateExercise, handleDeleteExercise, setClassGroups, handleCreateClassGroup, handleUpdateClassGroup, handleDeleteClassGroup, handleUpdateClassStatus, handleUpdateUserRole, handleAdminResetPassword, handleToggleAdminStatus, handleRemoveStudentFromClass, handleAdminDeleteUser, handleRequestToJoinClass, handleApproveJoinRequest, handleDenyJoinRequest, handleUpdateClassExercises, handleLeaveClass, setLabs, handleAddLabSemester, handleUpdateLabSemester, handleDeleteLabSemester, handleAddWeekToSemester, handleUpdateWeekInSemester, handleDeleteWeekFromSemester, handleCloneWeekToCourse, handleAddTargetCodeToWeek, handleUpdateTargetCodeInWeek, handleDeleteTargetCodeFromWeek, handleUseSnippetAsWeekTarget, handleAssignWeeksToClass, handleUnassignWeekFromClass, handleUpdateAssignedWeekExpiry, handleStudentSubmitLabCode, handleRequestLateSubmission, handleApproveLateSubmission, setIsNewSnippetModalOpen, setNewSnippetDialogInput, setActiveTab, handleRenameStudentAlias, setInstitutions: setGlobalInstitutions, handleAddInstitution, handleUpdateInstitution, handleDeleteInstitution, handleAssignInstitutionAdmin, setPromptPayNumber, setCoupons, setTransactions, handleSimulatePayment, handleCreateCoupon, handleUpdateCoupon, handleDeleteCoupon, handleReactivateStudentInClass, executeCodeApi, setShowJoinClassModal, setJoinClassCode, handleConfirmOverwrite, setNewSnippetLanguage, setOverwriteDialogDetails, setShowConfirmOverwriteSnippetDialog, setAdminSupportRequests, handleCreateAdminSupportRequest, handleSendAdminChatMessage, handleUpdateAdminSupportRequestStatus, handleCreateAssistanceRequest, handleSendAssistanceMessage, handleCloseAssistanceRequest, handleSendPublicChatMessage
  }), [
    updateCurrentUser, setAllUsers, setCode, setIsCompiling, setCodeTitle, setSavedCodes, setCurrentSnippetId, setCurrentExercise, setExercises, handleNewSnippet, handleConfirmCreateNewSnippet, handleRenameSnippetTitle, handleSaveOrUpdateSnippet, handleLoadCode, handleDeleteSnippet, handleSubmitExercise, handleAddExercise, handleUpdateExercise, handleDeleteExercise, setClassGroups, handleCreateClassGroup, handleUpdateClassGroup, handleDeleteClassGroup, handleUpdateClassStatus, handleUpdateUserRole, handleAdminResetPassword, handleToggleAdminStatus, handleRemoveStudentFromClass, handleAdminDeleteUser, handleRequestToJoinClass, handleApproveJoinRequest, handleDenyJoinRequest, handleUpdateClassExercises, handleLeaveClass, setLabs, handleAddLabSemester, handleUpdateLabSemester, handleDeleteLabSemester, handleAddWeekToSemester, handleUpdateWeekInSemester, handleDeleteWeekFromSemester, handleCloneWeekToCourse, handleAddTargetCodeToWeek, handleUpdateTargetCodeInWeek, handleDeleteTargetCodeFromWeek, handleUseSnippetAsWeekTarget, handleAssignWeeksToClass, handleUnassignWeekFromClass, handleUpdateAssignedWeekExpiry, handleStudentSubmitLabCode, handleRequestLateSubmission, handleApproveLateSubmission, setIsNewSnippetModalOpen, setNewSnippetDialogInput, setActiveTab, handleRenameStudentAlias, setGlobalInstitutions, handleAddInstitution, handleUpdateInstitution, handleDeleteInstitution, handleAssignInstitutionAdmin, setPromptPayNumber, setCoupons, setTransactions, handleSimulatePayment, handleCreateCoupon, handleUpdateCoupon, handleDeleteCoupon, handleReactivateStudentInClass, executeCodeApi, setShowJoinClassModal, setJoinClassCode, handleConfirmOverwrite, setNewSnippetLanguage, setOverwriteDialogDetails, setShowConfirmOverwriteSnippetDialog, setAdminSupportRequests, handleCreateAdminSupportRequest, handleSendAdminChatMessage, handleUpdateAdminSupportRequestStatus, handleCreateAssistanceRequest, handleSendAssistanceMessage, handleCloseAssistanceRequest, handleSendPublicChatMessage
  ]);

  useEffect(() => {
    const derivedAssignments: LabAssignment[] = [];
    classGroups.forEach(cg => {
        (cg.assignedChallenges || []).forEach(ac => {
            derivedAssignments.push({ id: ac.assignmentId, labId: ac.labId, challengeId: ac.challengeId, classId: cg.id, assignedByLecturerId: ac.assignedByLecturerId, expiryDate: ac.expiryDate, studentProgress: ac.studentProgress });
        });
    });
    setLabAssignments(derivedAssignments);
  }, [classGroups]);

  useEffect(() => {
    if (isClient && currentUser && availableTabs.length > 0 && !availableTabs.find(t => t.value === activeTab)) {
        setActiveTab(availableTabs[0].value);
    }
  }, [isClient, currentUser, availableTabs, activeTab]);
  
  // Pass notification data up to context
  useEffect(() => {
    if (setNotificationData) {
      setNotificationData({
        classGroups,
        adminSupportRequests,
        labs
      });
    }
  }, [classGroups, adminSupportRequests, labs, setNotificationData]);
  
  return {
    dashboardState: {
      currentUser, allUsers, code, isCompiling, codeTitle, savedCodes, currentSnippetId, exercises, currentExercise, userProgress, classGroups, labs, labAssignments, isNewSnippetModalOpen, newSnippetDialogInput, activeTab, institutions, promptPayNumber, coupons, transactions, showJoinClassModal, joinClassCode, newSnippetLanguage, showConfirmOverwriteSnippetDialog, overwriteDialogDetails, editorTabContentRef, editorLanguage, availableTabs, isClient, isAwaitingAIResponse, adminSupportRequests, isMobile
    },
    dashboardActions: { ...dashboardActions, setIsAwaitingAIResponse },
    t
  };
}


export default function DashboardPage() {
  const { dashboardState, dashboardActions, t } = useDashboardData();
  const { currentUser, isClient, activeTab, availableTabs, showJoinClassModal, joinClassCode, institutions, isNewSnippetModalOpen, newSnippetDialogInput, newSnippetLanguage, overwriteDialogDetails, showConfirmOverwriteSnippetDialog, classGroups, adminSupportRequests, isMobile } = dashboardState;
  const { setNotificationCount } = useUser();
  const { setActiveTab, handleRequestToJoinClass, setIsNewSnippetModalOpen, setNewSnippetDialogInput, setNewSnippetLanguage, handleConfirmCreateNewSnippet } = dashboardActions;
  
  const activeTabInfo = useMemo(() => {
    if (!currentUser || !availableTabs || availableTabs.length === 0) return null;
    let targetTabValue = activeTab;
    const foundTab = availableTabs.find(tab => tab.value === targetTabValue);
    if (foundTab) return foundTab;
    if (currentUser) {
      if (currentUser.role === 'lecturer' || currentUser.role === 'institution_admin' || currentUser.isAdmin) {
        targetTabValue = 'lecturer-panel';
      } else {
        targetTabValue = 'labs';
      }
    }
     const defaultTab = availableTabs.find(t => t.value === targetTabValue) || (availableTabs.length > 0 ? availableTabs[0] : null);
     return defaultTab || null;
  }, [availableTabs, activeTab, currentUser]);
  
  useEffect(() => {
    if (!currentUser || !isClient) return;

    let totalNotifications = 0;

    if (['lecturer', 'admin', 'institution_admin'].includes(currentUser.role)) {
      // 1. Pending join requests
      classGroups.forEach(cg => {
        if (cg.adminId === currentUser.id || currentUser.isAdmin) {
          totalNotifications += (cg.pendingJoinRequests || []).length;
        }
      });

      // 2. Pending late submission requests
      classGroups.forEach(cg => {
        if (cg.adminId === currentUser.id || currentUser.isAdmin) {
          (cg.assignedChallenges || []).forEach(ac => {
            Object.values(ac.studentProgress).forEach(progress => {
              Object.values(progress).forEach(attempt => {
                if (attempt.lateRequestStatus === 'requested') {
                  totalNotifications++;
                }
              });
            });
          });
        }
      });
      // 3. Unread lecturer/admin messages in assistance chats
       classGroups.forEach(cg => {
        if (cg.adminId === currentUser.id || currentUser.isAdmin) {
          (cg.assistanceRequests || []).forEach(req => {
            if (req.status === 'open' && req.messages.length > 0) {
              const lastMessage = req.messages[req.messages.length - 1];
              if (lastMessage.senderId !== currentUser.id) {
                totalNotifications++;
              }
            }
          });
        }
      });
       adminSupportRequests.forEach(req => {
        if (req.status === 'open' && req.messages.length > 0) {
          const lastMessage = req.messages[req.messages.length - 1];
          if (lastMessage.senderId !== currentUser.id) {
            totalNotifications++;
          }
        }
      });
    }

    // 4. Unread messages for students
    if (currentUser.role === 'student' || currentUser.role === 'normal') {
      classGroups.forEach(cg => {
        if ((currentUser.enrolledClassIds || []).includes(cg.id)) {
          (cg.assistanceRequests || []).forEach(req => {
            if (req.studentId === currentUser.id && req.status === 'open' && req.messages.length > 0) {
              const lastMessage = req.messages[req.messages.length - 1];
              if (lastMessage.senderId !== currentUser.id) {
                totalNotifications++;
              }
            }
          });
        }
      });
    }

    setNotificationCount(totalNotifications);

  }, [classGroups, adminSupportRequests, currentUser, setNotificationCount, isClient]);


  if (!isClient || !currentUser) {
    return (
       <div className="flex min-h-screen items-center justify-center">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-8 pb-8 flex flex-col">
        {currentUser && (currentUser.role === 'normal' || currentUser.role === 'student') && !(currentUser.enrolledClassIds || []).length && (
          <div className="mb-4 p-4 border border-primary/50 rounded-lg bg-primary/10 text-center">
            <p className="text-sm text-primary">{t('dashboardJoinClassPrompt')}</p>
            <Button onClick={() => dashboardActions.setShowJoinClassModal(true)} className="mt-2" variant="outline">
              <LogInIcon className="mr-2 h-4 w-4"/> {t('dashboardJoinClassButton')}
            </Button>
          </div>
        )}

        <Dialog open={showJoinClassModal} onOpenChange={dashboardActions.setShowJoinClassModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('joinClassDialogTitle')}</DialogTitle>
              <ModalDialogDescription>{t('joinClassDialogDesc', { institutionName: institutions.find(i => i.id === currentUser.institutionId)?.name || 'N/A' })}</ModalDialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="class-code-input" className="text-right">{t('classCodeLabel')}</Label>
                <Input id="class-code-input" value={joinClassCode} onChange={(e) => dashboardActions.setJoinClassCode(e.target.value)} className="col-span-3" placeholder={t('classCodePlaceholder')} />
              </div>
            </div>
            <ModalDialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">{t('cancelButton')}</Button></DialogClose>
              <Button type="button" onClick={() => handleRequestToJoinClass(joinClassCode)} disabled={!joinClassCode.trim()}>{t('requestToJoinButton')}</Button>
            </ModalDialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isNewSnippetModalOpen} onOpenChange={setIsNewSnippetModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('newSnippetDialogTitle')}</DialogTitle>
              <ModalDialogDescription>{t('newSnippetDialogDesc')}</ModalDialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-snippet-title-input" className="text-right">{t('newSnippetFilenameLabel')}</Label>
                <Input id="new-snippet-title-input" value={newSnippetDialogInput} onChange={(e) => setNewSnippetDialogInput(e.target.value)} className="col-span-3" placeholder={t('newSnippetFilenamePlaceholder')} />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-snippet-language-select" className="text-right">{t('newSnippetLanguageLabel')}</Label>
                 <Select value={newSnippetLanguage} onValueChange={(value: SupportedLanguage) => setNewSnippetLanguage(value)}>
                    <SelectTrigger id="new-snippet-language-select" className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cpp">C++ (.cpp)</SelectItem>
                        <SelectItem value="python">Python (.py)</SelectItem>
                        <SelectItem value="html">HTML (.html)</SelectItem>
                        <SelectItem value="javascript">JavaScript (.js)</SelectItem>
                        <SelectItem value="react">React (.tsx)</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            </div>
            <ModalDialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">{t('cancelButton')}</Button></DialogClose>
              <Button type="button" onClick={handleConfirmCreateNewSnippet} disabled={!newSnippetDialogInput.trim()}>{t('newSnippetCreateButton')}</Button>
            </ModalDialogFooter>
          </DialogContent>
        </Dialog>
        
        {overwriteDialogDetails && (
          <AlertDialog open={showConfirmOverwriteSnippetDialog} onOpenChange={dashboardActions.setShowConfirmOverwriteSnippetDialog}>
            <AlertDialogContent>
              <AlertHeader>
                <AlertTitle>{t('overwriteDialogTitle')}</AlertTitle>
                <AlertDescription>
                  {t('overwriteDialogDesc', { title: overwriteDialogDetails.titleToSave })}
                </AlertDescription>
              </AlertHeader>
              <AlertFooter>
                <AlertDialogCancel onClick={() => { dashboardActions.setOverwriteDialogDetails(null); }}>{t('cancelButton')}</AlertDialogCancel>
                <AlertDialogAction onClick={dashboardActions.handleConfirmOverwrite}>{t('overwriteButton')}</AlertDialogAction>
              </AlertFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        <Tabs value={activeTabInfo?.value || (availableTabs.length > 0 ? availableTabs[0].value : '')} onValueChange={setActiveTab} className="w-full flex flex-col">
          <TabsContent value="editor" ref={dashboardState.editorTabContentRef} className={cn("p-0")}>
            <EditorView {...dashboardState} {...dashboardActions} />
          </TabsContent>

          <TabsContent value="exercises" className={cn("p-0")}>
            <ExercisesView {...dashboardState} {...dashboardActions} />
          </TabsContent>

          <TabsContent value="labs" className={cn("p-0")}> 
            <div style={{ display: (currentUser.role === 'lecturer' || currentUser.isAdmin || currentUser.role === 'institution_admin') ? 'block' : 'none' }}>
              <LabAdminView {...dashboardState} {...dashboardActions} />
            </div>
            <div style={{ display: (currentUser.role === 'student' || currentUser.role === 'normal') ? 'block' : 'none' }}>
              <LabStudentView {...dashboardState} {...dashboardActions} />
            </div>
          </TabsContent>

          <TabsContent value="my-classes" className={cn("p-0")}>
              <StudentClassesView {...dashboardState} {...dashboardActions} onRequestToJoinClass={() => dashboardActions.setShowJoinClassModal(true)} />
          </TabsContent>

          <TabsContent value="progress" className={cn("p-0")}>
            <ProgressView {...dashboardState} {...dashboardActions} />
          </TabsContent>

          {(currentUser?.role === 'lecturer' || currentUser.isAdmin || currentUser.role === 'institution_admin') && (
            <TabsContent value="lecturer-panel" className={cn("p-0")}>
              <ClassManagementView {...dashboardState} {...dashboardActions} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
