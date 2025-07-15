
"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import Editor from "@monaco-editor/react";
import type { DashboardState, DashboardActions } from '../types';
import type { Lab, LabAssignment, LabChallenge, StudentLabAttempt, User, LabTargetCode, ClassGroup, LocalizedString, ProblemAssistantRequest } from '@/types';
import { BookOpenCheck, CheckCircle, AlertTriangle, CircleDotDashed, Clock, Info, Languages, Play, RotateCw, Bot, FolderKanban, ChevronLeft, ChevronRight, Percent, Code, TerminalIcon, TestTubeDiagonal, Shield, Gem, Globe, Send, MessageSquare, History, X, Circle, Check } from 'lucide-react';
import { format, isPast, isValid } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { SkillAssessmentView } from '@/components/dashboard/skill-assessment-view';
import { useLanguage } from '@/context/language-context';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription as UIDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FilePreparationResponse {
  success: boolean;
  baseFilename?: string;
  language?: 'cpp' | 'python';
  compileError?: string | null;
  error?: string | null; 
}

const getWebSocketUrl = () => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8080';
  }
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const hostname = window.location.hostname;
  return `${protocol}://${hostname}:8080`;
};

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || getWebSocketUrl();

// Security Configuration
const SECURITY_CONFIG = {
  MAX_TYPING_SPEED: 15,
  TYPING_WINDOW: 1000,
  MIN_KEYSTROKE_INTERVAL: 20,
  SUSPICIOUS_PASTE_SIZE: 10,
  WARNING_THRESHOLD: 3,
};

interface TypingMetrics {
  keystrokes: Array<{ timestamp: number; length: number }>;
  warnings: number;
  isBlocked: boolean;
  lastKeystroke: number;
}

type LabStudentViewProps = Pick<DashboardState, "labs" | "labAssignments" | "classGroups" | "currentUser" | "code" | "isCompiling"> &
  Pick<DashboardActions, "handleStudentSubmitLabCode" | "setCode" | "handleRequestLateSubmission" | "handleCreateAssistanceRequest" | "handleSendAssistanceMessage" | "handleCloseAssistanceRequest" | "handleSendPublicChatMessage">;

export function LabStudentView({
  labs, labAssignments, classGroups, currentUser, code, isCompiling,
  handleStudentSubmitLabCode, setCode, handleRequestLateSubmission,
}: LabStudentViewProps) {
  // --- Hooks and State ---
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [activeLabAssignmentId, setActiveLabAssignmentId] = useState<string | null>(null);
  const [activeChallenge, setActiveChallenge] = useState<LabChallenge | null>(null);
  const [activeTargetCode, setActiveTargetCode] = useState<LabTargetCode | null>(null);
  const [typingMetrics, setTypingMetrics] = useState<TypingMetrics>({
    keystrokes: [], warnings: 0, isBlocked: false, lastKeystroke: 0
  });
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const monacoEditorRef = useRef<any>(null);
  const copyTempRef = useRef<string | null>(null);
  const [protectedCode, setProtectedCode] = useState(code);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isTerminalPopupOpen, setIsTerminalPopupOpen] = useState(false);
  const [preparedBaseFilename, setPreparedBaseFilename] = useState<string | null>(null);
  const [preparedLanguage, setPreparedLanguage] = useState<'cpp' | 'python' | null>(null);
  const [isPreparingFile, setIsPreparingFile] = useState(false);
  const [pendingTerminalMessages, setPendingTerminalMessages] = useState<string[]>([]);
  const [terminalKey, setTerminalKey] = useState(Date.now());
  const [terminalWindowTitle, setTerminalWindowTitle] = useState("Execution Terminal");
  const [terminalInput, setTerminalInput] = useState<string | null>(null);
  const [hasAutoReExecuted, setHasAutoReExecuted] = useState(false);
  const [showBrowsePopup, setShowBrowsePopup] = useState(false);
  const [browseContent, setBrowseContent] = useState("");
  const [browseTitle, setBrowseTitle] = useState("");
  const [showProblemsDialog, setShowProblemsDialog] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<{assignment: LabAssignment; challenge: LabChallenge; lab: Lab} | null>(null);


  // --- Helper Functions ---
   const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en || '';
    }
    return '';
  };

  const addSecurityAlert = useCallback((messageKey: string, params?: any) => {
    setTimeout(() => {
        const timestamp = new Date().toLocaleTimeString();
        const translatedMessage = t(messageKey, params);
        const alertMessage = `[${timestamp}] ${translatedMessage}`;
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
  
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    if (!typingMetrics.isBlocked) {
        if(checkTypingSpeed(newValue, protectedCode)) {
          setProtectedCode(newValue);
          setCode(newValue);
        }
    }
  };
  
  useEffect(() => {
    if (code !== protectedCode) {
        setProtectedCode(code);
    }
  }, [code, protectedCode]);

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

  useEffect(() => {
    if (activeChallenge && activeLabAssignmentId && currentUser && activeTargetCode) {
        const assignment = labAssignments.find(la => la.id === activeLabAssignmentId);
        const attempt = assignment?.studentProgress[currentUser.id]?.[activeTargetCode.id];

        let defaultCode = "";
        switch (activeChallenge.language) {
          case 'python':
            defaultCode = `# Your Python solution for ${getLocalizedText(activeChallenge.title)}\n\nprint("Student code for ${getLocalizedText(activeTargetCode.description)}")\n`;
            break;
          case 'html':
            defaultCode = `<!DOCTYPE html>\n<html>\n<head><title>${getLocalizedText(activeTargetCode.description)}</title></head>\n<body>\n  <h1>My Solution</h1>\n</body>\n</html>`;
            break;
          case 'javascript':
            defaultCode = `// Student solution for ${getLocalizedText(activeTargetCode.description)}\nconsole.log('Hello from my script!');`;
            break;
          case 'react':
            defaultCode = `import React from 'react';\n\nconst App = () => {\n  return <h1>My Solution for ${getLocalizedText(activeTargetCode.description)}</h1>;\n};\n\nexport default App;`;
            break;
          case 'cpp':
          default:
            defaultCode = `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Your C++ solution for ${getLocalizedText(activeTargetCode.description)}\n    cout << "Student code for ${getLocalizedText(activeTargetCode.description)}" << endl;\n    return 0;\n}`;
            break;
        }
        const initialCode = attempt?.studentCode || defaultCode;
        setCode(initialCode);
        setProtectedCode(initialCode);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChallenge, activeLabAssignmentId, activeTargetCode, currentUser, labAssignments, setCode]);


  const xtermWrite = useCallback((data: string, type: 'stdout' | 'stderr' | 'info' | 'error' | 'stdin' = 'info') => {
    if (terminalInstanceRef.current) {
        if (type === 'stdout' || type === 'stdin') {
            terminalInstanceRef.current.write(data);
        } else {
            let colorPrefix = '';
            if (type === 'stderr' || type === 'error') colorPrefix = '\x1b[31m'; // Red
            else if (type === 'info') colorPrefix = '\x1b[34m'; // Blue
            
            const colorSuffix = '\x1b[0m';
            const formattedData = data.replace(/\n/g, '\r\n');
            terminalInstanceRef.current.write(colorPrefix + formattedData + colorSuffix + '\r\n');
        }
    } else {
      console.warn("xtermWrite called but terminalInstanceRef.current is null. Message dropped:", data);
      setPendingTerminalMessages(prev => [...prev, data]);
    }
  }, []);

  const triggerFilePreparationAndTerminalLaunch = useCallback(async (codeToRun: string, title: string, input?: string | null) => {
    if (!codeToRun.trim() || !activeChallenge) {
      toast({ title: t('missingInfoTitle'), description: t('missingInfoDesc'), variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: t('loginRequiredTitle'), description: t('loginRequiredDesc'), variant: "destructive" });
      return;
    }

    setTerminalWindowTitle(`Execution: ${title} (${activeChallenge.language.toUpperCase()})`);
    setTerminalInput(input || null);
    setIsPreparingFile(true);
    toast({ title: t('preparingFilesTitle'), description: t('preparingFilesDesc') });

    try {
      const apiPayload = {
        code: codeToRun,
        language: activeChallenge.language,
        username: currentUser.username,
        snippetName: `lab_${activeChallenge.id}_${activeTargetCode?.id}`,
      };
      const response = await fetch('/api/local-run-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const result: FilePreparationResponse = await response.json();

      if (response.ok && result.success && result.baseFilename && result.language) {
        toast({ title: t('filesReadyTitle'), description: t('filesReadyDesc') });
        setPreparedBaseFilename(result.baseFilename);
        setPreparedLanguage(result.language);
        if (isTerminalPopupOpen) {
           setTerminalKey(Date.now());
        } else {
           setIsTerminalPopupOpen(true);
        }
      } else {
        const errorMsg = result.compileError || result.error || "Unknown error during file preparation.";
        toast({ title: t('filePrepFailedTitle'), description: errorMsg, variant: "destructive" });
        setPreparedBaseFilename(null);
        setPreparedLanguage(null);
      }
    } catch (e: any) {
      const errorMsg = e.message || "Network error or API unreachable.";
      toast({ title: t('apiErrorTitle'), description: errorMsg, variant: "destructive" });
      setPreparedBaseFilename(null);
      setPreparedLanguage(null);
    } finally {
      setIsPreparingFile(false);
    }
  }, [activeChallenge, activeTargetCode, currentUser, toast, t, isTerminalPopupOpen]);
  
  const reexecuteFromTmp = useCallback(() => {
    if (!preparedBaseFilename || !preparedLanguage) return;
    if (terminalInstanceRef.current) {
      wsRef.current?.close();
      terminalInstanceRef.current.dispose();
      terminalInstanceRef.current = null;
      fitAddonRef.current = null;
    }
    setTerminalKey(Date.now());
    if (!isTerminalPopupOpen) {
      setIsTerminalPopupOpen(true);
    }
  }, [preparedBaseFilename, preparedLanguage, isTerminalPopupOpen]);

  useEffect(() => {
    if (
      isTerminalPopupOpen &&
      preparedBaseFilename &&
      preparedLanguage &&
      !isPreparingFile &&
      !hasAutoReExecuted
    ) {
      setHasAutoReExecuted(true);
      triggerFilePreparationAndTerminalLaunch(code, "My Code", terminalInput);
    }
    if (!isTerminalPopupOpen && hasAutoReExecuted) {
      setHasAutoReExecuted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalPopupOpen, preparedBaseFilename, preparedLanguage, isPreparingFile]);


  useEffect(() => {
    let resizeObserver: ResizeObserver | null = null;
    let term: Terminal | null = null;

    if (isTerminalPopupOpen && preparedBaseFilename && preparedLanguage && terminalRef.current) {
      if (terminalInstanceRef.current) {
        wsRef.current?.close();
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
        fitAddonRef.current = null;
      }
      
      term = new Terminal({
        cursorBlink: true,
        fontFamily: 'monospace',
        fontSize: 14,
        theme: {
          background: '#1e1e1e', foreground: '#d4d4d4', cursor: '#d4d4d4',
          selectionBackground: '#264f78', black: '#000000', red: '#cd3131',
          green: '#0dbc79', yellow: '#e5e510', blue: '#2472c8',
          magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5',
          brightBlack: '#666666', brightRed: '#f14c4c', brightGreen: '#23d18b',
          brightYellow: '#f5f543', brightBlue: '#3b8eea', brightMagenta: '#d670d6',
          brightCyan: '#29b8db', brightWhite: '#e5e5e5',
        },
        convertEol: true,
        rows: 20,
        disableStdin: false,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      
      try {
        term.open(terminalRef.current);
        setTimeout(() => {
            if (fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
        }, 100);
        term.options.disableStdin = false;
        term.write('\x1b[?25h'); 

        terminalInstanceRef.current = term;
        fitAddonRef.current = fit;
        
        pendingTerminalMessages.forEach(msg => xtermWrite(msg, 'info'));
        setPendingTerminalMessages([]);

        wsRef.current = new WebSocket(WEBSOCKET_URL);

        wsRef.current.onopen = () => {
          let command;
          if (preparedLanguage === 'cpp') {
            command = `./${preparedBaseFilename}.out`;
          } else {
            command = `python3 ./${preparedBaseFilename}.py`;
          }
          wsRef.current?.send(JSON.stringify({
            type: 'execute',
            command: command,
            stdin: terminalInput,
            cols: terminalInstanceRef.current?.cols || 80,
            rows: terminalInstanceRef.current?.rows || 24,
          }));
          terminalInstanceRef.current?.focus();
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string);
            if (message.type === 'stdout') {
              xtermWrite(message.data, 'stdout');
            } else if (message.type === 'stderr') {
              xtermWrite(message.data, 'stderr');
            } else if (message.type === 'info') {
              xtermWrite(message.data, 'info');
            } else if (message.type === 'exit') {
              xtermWrite(`\n\n... End ...`, 'info');
              if (terminalInstanceRef.current) {
                terminalInstanceRef.current.options.cursorBlink = false;
                terminalInstanceRef.current.options.disableStdin = true; 
                terminalInstanceRef.current.write('\x1b[?25l');
              }
              wsRef.current?.close();
            }
          } catch (e) {
            xtermWrite(`Error parsing message from server: ${event.data}`, 'error');
          }
        };

        wsRef.current.onerror = (errorEvent) => {
            const errorMsg = `WebSocket Error. Ensure server is at ${WEBSOCKET_URL}. Type: ${errorEvent.type}`;
            xtermWrite(errorMsg, 'error');
        };

        wsRef.current.onclose = () => {
           if (terminalInstanceRef.current && !terminalInstanceRef.current.isDisposed) {
            if (!terminalInstanceRef.current.options.disableStdin) {
                terminalInstanceRef.current.options.cursorBlink = false;
                terminalInstanceRef.current.options.disableStdin = true;
                terminalInstanceRef.current.write('\x1b[?25l');
            }
          }
        };

        term.onData((data) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'stdin', data }));
          }
        });
        
        if (terminalRef.current) {
          resizeObserver = new ResizeObserver(() => {
            setTimeout(() => {
              fitAddonRef.current?.fit();
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && terminalInstanceRef.current) {
                  const { cols, rows } = terminalInstanceRef.current;
                  wsRef.current.send(JSON.stringify({ type: 'resize', cols, rows }));
              }
            }, 50);
          });
          resizeObserver.observe(terminalRef.current);
        }

      } catch (error) {
        toast({title: "Terminal Init Error", description: "Could not initialize the terminal component.", variant: "destructive"});
        setIsTerminalPopupOpen(false);
      }
    }
    
    return () => {
      resizeObserver?.disconnect();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (terminalInstanceRef.current) {
        terminalInstanceRef.current.dispose();
        terminalInstanceRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, [isTerminalPopupOpen, preparedBaseFilename, preparedLanguage, terminalKey, toast, xtermWrite, terminalInput]);

  // --- Helper: Get Problem Status ---
  const getProblemStatus = useCallback((assignmentId: string, targetCodeId: string): StudentLabAttempt | undefined => {
    const assignment = labAssignments.find(la => la.id === assignmentId);
    if (!assignment || !currentUser) return undefined;
    return assignment.studentProgress[currentUser.id]?.[targetCodeId];
  }, [labAssignments, currentUser]);

  // --- Helper: Is Lab Assignment Expired ---
  const isLabAssignmentExpired = useCallback((assignment: LabAssignment): boolean => {
    return assignment.expiryDate ? isPast(new Date(assignment.expiryDate)) : false;
  }, []);

  const handleBrowseClick = (code: string, title: string) => {
    if (!activeChallenge) return;
    const lang = activeChallenge.language;
    let htmlContent = "";

    if (lang === 'html') {
        htmlContent = code;
    } else if (lang === 'javascript') {
        htmlContent = `<!DOCTYPE html><html><head><title>Preview</title></head><body><script>${code}</script></body></html>`;
    } else if (lang === 'react') {
        const sanitizedCode = code
            .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '')
            .replace(/export\s+default\s+\w+;?/g, '');
        htmlContent = `
            <!DOCTYPE html><html><head><title>React Preview</title>
            <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
            <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
            </head><body><div id="root"></div>
            <script type="text/babel" data-presets="react,typescript">
                try {
                    ${sanitizedCode}
                    const container = document.getElementById('root');
                    const root = ReactDOM.createRoot(container);
                    root.render(React.createElement(App));
                } catch (err) {
                    document.getElementById('root').innerHTML = '<pre style=\"color:red;\">' + err + '</pre>';
                }
            </script>
            </body></html>`;
    }

    setBrowseContent(htmlContent);
    setBrowseTitle(title);
    setShowBrowsePopup(true);
  };

  const groupedAssignments = useMemo(() => {
    const studentEnrolledClassIds = currentUser?.enrolledClassIds || [];
    const relevantAssignments = labAssignments.filter(la => {
      const classGroup = classGroups.find(cg => cg.id === la.classId);
      return studentEnrolledClassIds.includes(la.classId) && !classGroup?.isHalted && classGroup?.status === 'active';
    });

    const groupsByClass: { [classId: string]: { classGroup: ClassGroup; labs: { lab: Lab; assignments: LabAssignment[] }[] } } = {};

    relevantAssignments.forEach(assignment => {
      const classGroup = classGroups.find(cg => cg.id === assignment.classId);
      const lab = labs.find(l => l.id === assignment.labId);

      if (classGroup && lab) {
        if (!groupsByClass[classGroup.id]) {
          groupsByClass[classGroup.id] = { classGroup, labs: [] };
        }

        let labGroup = groupsByClass[classGroup.id].labs.find(lg => lg.lab.id === lab.id);
        if (!labGroup) {
          labGroup = { lab, assignments: [] };
          groupsByClass[classGroup.id].labs.push(labGroup);
        }
        labGroup.assignments.push(assignment);
      }
    });

    return Object.values(groupsByClass);
  }, [labAssignments, classGroups, currentUser, labs]);

  
  // --- Main Active Lab/Challenge View ---
  if (activeLabAssignmentId && activeChallenge && activeTargetCode) {
    const assignment = labAssignments.find(la => la.id === activeLabAssignmentId)!;
    const lab = labs.find(l => l.id === assignment.labId)!;
    const attempt = getProblemStatus(activeLabAssignmentId, activeTargetCode.id);
    const expired = isLabAssignmentExpired(assignment);
    const problemIsCompleted = attempt?.completed === true;
    const currentProblemIndex = activeChallenge.targetCodes.findIndex(tc => tc.id === activeTargetCode.id);
    const hasNextProblem = currentProblemIndex < activeChallenge.targetCodes.length - 1;
    const hasPrevProblem = currentProblemIndex > 0;
    const isWebLanguage = ['html', 'javascript', 'react'].includes(activeChallenge.language);
    const maxScoreForProblem = attempt?.lateSubmissionMaxScore ?? activeTargetCode.points;

    // Helper: Navigate between problems
    const navigateProblem = (direction: 'prev' | 'next') => {
      if (!activeChallenge || !activeTargetCode) return;
      const currentIndex = activeChallenge.targetCodes.findIndex(tc => tc.id === activeTargetCode.id);
      let newIndex = currentIndex;
      if (direction === 'prev' && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (direction === 'next' && currentIndex < activeChallenge.targetCodes.length - 1) {
        newIndex = currentIndex + 1;
      }
      if (newIndex !== currentIndex) {
        setActiveTargetCode(activeChallenge.targetCodes[newIndex]);
      }
    };

    // Handler for submitting code
    const handleSubmitCode = () => {
      if (
        !activeLabAssignmentId ||
        !activeChallenge ||
        !activeTargetCode ||
        !currentUser
      ) {
        toast({
          title: t('missingInformation'),
          description: t('pleaseSelectProblem'),
          variant: "destructive",
        });
        return;
      }
      handleStudentSubmitLabCode(
        activeLabAssignmentId,
        activeChallenge.id,
        activeTargetCode.id,
        protectedCode
      );
    };

    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => {setActiveChallenge(null); setActiveLabAssignmentId(null); setActiveTargetCode(null);}}>
          <ChevronLeft className="h-4 w-4 mr-1" /> {t('backToLabs')}
        </Button>
        <Card>
            <CardHeader>
            <CardTitle>{t('labTitle', { lab: getLocalizedText(lab.title), challenge: getLocalizedText(activeChallenge.title) })}</CardTitle>
            <div className="flex justify-between items-center">
                <CardDescription>
                {t('problemTitle')}<span className="font-semibold text-foreground">{getLocalizedText(activeTargetCode.description)}</span>
                <span className="block mt-1 text-xs font-semibold flex items-center gap-1"><Languages size={14}/> {t('languageLabel')} {activeChallenge.language.toUpperCase()}</span>
                <span className="block mt-1 text-xs font-semibold text-primary flex items-center gap-1"><Gem size={14}/> {maxScoreForProblem} Points</span>
                </CardDescription>
                <div className="flex gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateProblem('prev')} disabled={!hasPrevProblem} title={t('prevProblem')}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateProblem('next')} disabled={!hasNextProblem} title={t('nextProblem')}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            {assignment.expiryDate && (
                <p className={cn("text-sm mt-1", expired && !problemIsCompleted ? "text-destructive font-semibold" : "text-muted-foreground")}>
                <Clock size={14} className="inline mr-1" />
                {expired && !problemIsCompleted ? t('expiredOn') : t('expiresOn')} { isValid(new Date(assignment.expiryDate)) ? format(new Date(assignment.expiryDate), "PPp HH:mm", { locale: language === 'th' ? th : enUS }) : 'N/A'}
                </p>
            )}
            </CardHeader>
            <CardContent className="space-y-4">
            {(typingMetrics.warnings > 0 || securityAlerts.length > 0) && (
                <Alert className={cn("mb-4", typingMetrics.isBlocked ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50")}> 
                <Shield className="h-4 w-4" />
                <UIDescription>
                    <strong>{t('securityStatus')}:</strong> {t('warnings', { count: typingMetrics.warnings })}
                    {typingMetrics.isBlocked && ` ${t('editorLocked')}`}
                </UIDescription>
                </Alert>
            )}
            
            <Card className="bg-muted/30">
                <CardHeader className="p-3">
                    <CardTitle className="text-sm">{t('problemRequirements')}</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 grid grid-cols-2 gap-4 text-sm">
                    {activeTargetCode.enforcedStatement ? (
                        <div className="flex items-center gap-2">
                            <Code className="h-5 w-5 text-primary"/>
                            <div>
                                <p className="font-semibold">{t('enforcedStatement')}</p>
                                <p className="text-muted-foreground capitalize">{activeTargetCode.enforcedStatement}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Code className="h-5 w-5 text-muted-foreground"/>
                            <div>
                                <p className="font-semibold">{t('enforcedStatement')}</p>
                                <p className="text-muted-foreground">{t('none')}</p>
                            </div>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Percent className="h-5 w-5 text-primary"/>
                        <div>
                            <p className="font-semibold">{t('requiredOutputMatch')}</p>
                            <p className="text-muted-foreground">
                                {activeTargetCode.requiredOutputSimilarity}%
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div>
                <Label htmlFor="lab-student-code-editor">{t('yourCodeLabel')}</Label>
                <div className="h-[300px] border rounded-md overflow-hidden mt-1">
                <Editor
                    height="100%"
                    language={activeChallenge.language}
                    theme="vs-dark"
                    value={protectedCode}
                    onMount={handleEditorMount}
                    onChange={handleEditorChange}
                    options={{ 
                        fontSize: 16, 
                        minimap: { enabled: false },
                        readOnly: typingMetrics.isBlocked,
                        contextmenu: false 
                    }}
                />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                    variant="secondary"
                    onClick={() => isWebLanguage ? handleBrowseClick(activeTargetCode.code, `Target: ${getLocalizedText(activeTargetCode.description)}`) : triggerFilePreparationAndTerminalLaunch(activeTargetCode.code, `Target: ${getLocalizedText(activeTargetCode.description)}`)}
                    disabled={isPreparingFile || isCompiling}
                >
                    {isWebLanguage ? <Globe className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    <span>{isWebLanguage ? `Browse Target: ${getLocalizedText(activeTargetCode.description)}` : t('runTargetFor', {name: getLocalizedText(activeTargetCode.description)})}</span>
                </Button>
                <Button
                    variant="outline"
                    onClick={() => isWebLanguage ? handleBrowseClick(code, "My Code") : triggerFilePreparationAndTerminalLaunch(code, "My Code")}
                    disabled={isPreparingFile || isCompiling}
                    >
                    {isPreparingFile ? <div className="h-4 w-4 border-2 border-transparent border-t-primary rounded-full animate-spin" /> : (isWebLanguage ? <Globe className="h-4 w-4" /> : <Play className="h-4 w-4" />)}
                    <span className="ml-2">{isWebLanguage ? 'Browse My Code' : t('runMyCode')}</span>
                </Button>
            </div>
            
            {attempt && (
                <div className={cn("p-3 rounded-md border text-sm",
                attempt.status === 'well-done' ? 'bg-green-100 border-green-500 dark:bg-green-900/30 dark:border-green-700 text-green-700 dark:text-green-300' :
                attempt.status === 'good' ? 'bg-yellow-100 border-yellow-500 dark:bg-yellow-900/30 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300' :
                'bg-red-100 border-red-500 dark:bg-red-900/30 dark:border-red-700 text-red-700 dark:text-red-300'
                )}>
                <p className="font-semibold">{t('lastSubmissionResult')}</p>
                <div className="mt-2 space-y-1">
                    <p>{t('statusLabel')} <span className="capitalize font-medium">{attempt.status.replace('-', ' ')}</span></p>
                    <p>Your Score: <span className="font-bold">{(attempt.score ?? 0).toFixed(2)} / {maxScoreForProblem} pts</span></p>
                    {attempt.statementCheck && (
                        <p>{t('statementCheck')} {attempt.statementCheck.found ? 
                            <span className="font-semibold text-green-600">{t('passUsed', {statement: attempt.statementCheck.required})}</span> : 
                            <span className="font-semibold text-red-600">{t('failNotUsed', {statement: attempt.statementCheck.required})}</span>}
                        </p>
                    )}
                    
                    <Accordion type="single" collapsible className="w-full mt-2">
                        <AccordionItem value="test-cases-result" className="border-none">
                            <AccordionTrigger className="text-sm py-1 hover:no-underline">
                                <Info size={14} className="mr-1"/> Test Case Results
                            </AccordionTrigger>
                            <AccordionContent>
                                {attempt.outputComparisons && attempt.outputComparisons.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Test Case</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Similarity</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attempt.outputComparisons.map((tc, index) => (
                                            <TableRow key={index}>
                                                <TableCell>Test Case #{index + 1}</TableCell>
                                                <TableCell>
                                                    {tc.passed ? <span className="text-green-600 font-semibold">Pass</span> : <span className="text-red-600 font-semibold">Fail</span>}
                                                </TableCell>
                                                <TableCell>{tc.similarity.toFixed(2)}%</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                ) : <p className="text-xs italic p-2">No test case data available.</p>}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                    
                </div>
                <p className="text-xs text-muted-foreground mt-2">{t('checkedAt')} { isValid(new Date(attempt.lastCheckedAt)) ? format(new Date(attempt.lastCheckedAt), "PPp HH:mm", { locale: language === 'th' ? th : enUS }) : 'N/A'}</p>
                {attempt.assessment && (
                    <Accordion type="single" collapsible className="w-full mt-2">
                        <AccordionItem value="ai-feedback">
                            <AccordionTrigger className="text-sm font-medium py-1"><Bot size={14} className="mr-1"/>{t('viewAIFeedback')}</AccordionTrigger>
                            <AccordionContent>
                                <SkillAssessmentView assessment={attempt.assessment} />
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )}
                </div>
            )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
            <Button
                onClick={handleSubmitCode}
                disabled={isCompiling || typingMetrics.isBlocked || (expired && attempt?.lateRequestStatus !== 'approved' && !problemIsCompleted)}
            >
                {isCompiling ? t('processing') : t('submitAndCheck', {name: getLocalizedText(activeTargetCode.description)})}
            </Button>
            {expired && !problemIsCompleted && attempt?.lateRequestStatus !== 'approved' && (
                <Button
                variant="outline"
                onClick={() => handleRequestLateSubmission(activeLabAssignmentId, activeChallenge.id, activeTargetCode.id)}
                disabled={attempt?.lateRequestStatus === 'requested'}
                >
                <Send className="h-4 w-4 mr-2" />
                {attempt?.lateRequestStatus === 'requested' ? "Request Sent" : "Request Late Submission"}
                </Button>
            )}
            </CardFooter>
        </Card>
        <Dialog open={isTerminalPopupOpen} onOpenChange={(open) => { 
          if (!open) setIsTerminalPopupOpen(false); 
          else setIsTerminalPopupOpen(true);
        }}>
        <DialogContent className="sm:max-w-3xl h-[70vh] flex flex-col p-0 gap-0">
          <div key={terminalKey} className="h-full flex flex-col">
            <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <DialogTitle>{terminalWindowTitle}</DialogTitle>
                <DialogDescription>
                  Interactive terminal for execution.
                  {terminalInput && <span className="block text-xs text-amber-500">Auto-providing input: "{terminalInput}"</span>}
                </DialogDescription>
              </div>
              <div className="flex flex-row items-center gap-2" style={{ paddingRight: 30 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reexecuteFromTmp}
                  disabled={isPreparingFile || isCompiling}
                  title={t('rerun')}
                >
                  <RotateCw className="h-4 w-4 mr-1" /> {t('rerun')}
                </Button>
              </div>
            </DialogHeader>
            <div
              ref={terminalRef}
              className="flex-1 min-h-0 overflow-hidden bg-[#1e1e1e] p-1"
              onClick={() => terminalInstanceRef.current?.focus()}
            >
            </div>
          </div>
        </DialogContent>
      </Dialog>
       <Dialog open={showBrowsePopup} onOpenChange={setShowBrowsePopup}>
        <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{browseTitle}</DialogTitle>
            <DialogDescription>
              Live preview. Note: Complex scripts or external resources may not work as expected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 border rounded-md overflow-hidden bg-white">
            <iframe
              srcDoc={browseContent}
              title="Browser Preview"
              sandbox="allow-scripts"
              className="w-full h-full"
            />
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  }
  
  // Helper: Select a challenge/problem to work on
  const selectChallenge = (assignmentId: string, challenge: LabChallenge, targetCode: LabTargetCode) => {
    setActiveLabAssignmentId(assignmentId);
    setActiveChallenge(challenge);
    setActiveTargetCode(targetCode);
  };

  const openProblemsDialog = (assignment: LabAssignment, challenge: LabChallenge, lab: Lab) => {
    setSelectedWeek({ assignment, challenge, lab });
    setShowProblemsDialog(true);
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpenCheck className="h-6 w-6 text-primary" /> {t('assignedLabsTitle')}</CardTitle>
          <CardDescription>{t('assignedLabsDesc')}</CardDescription>
        </CardHeader>
      </Card>

      {groupedAssignments.length === 0 && (
        <p className="text-muted-foreground text-center py-4">
        {t('noLabsAssigned')}
        </p>
      )}

      {groupedAssignments.map(({ classGroup, labs: labsInClass }) => (
          <Card key={classGroup.id} className="overflow-hidden">
              <CardHeader className="p-4 bg-muted/30">
                <h3 className="text-lg font-semibold text-primary">{classGroup.name}</h3>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-4">
                {labsInClass.map(({ lab, assignments }) => (
                  <div key={lab.id} className="border rounded-md p-3">
                    <h4 className="font-semibold text-base mb-2">{getLocalizedText(lab.title)}</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
                       {assignments.map(assignment => {
                         const challenge = lab.challenges.find(c => c.id === assignment.challengeId);
                         if (!challenge) return null;

                         const allProblemsCompleted = challenge.targetCodes.every(tc => getProblemStatus(assignment.id, tc.id)?.completed);
                         const isExpired = isLabAssignmentExpired(assignment) && !allProblemsCompleted;
                         
                         let status: 'completed' | 'in-progress' | 'missed' | 'locked' = 'locked';
                         if (allProblemsCompleted) {
                           status = 'completed';
                         } else if (isExpired) {
                           status = 'missed';
                         } else {
                           status = 'in-progress';
                         }

                         const statusInfo = {
                          'completed': { text: 'Completed', icon: <Check className="h-10 w-10 text-green-500" />, color: 'border-green-500/50 bg-green-500/10' },
                          'in-progress': { text: 'In Progress', icon: <Circle className="h-10 w-10 text-blue-500" />, color: 'border-blue-500/50 bg-blue-500/10' },
                          'missed': { text: 'Missed', icon: <X className="h-10 w-10 text-red-500" />, color: 'border-red-500/50 bg-red-500/10' },
                          'locked': { text: 'Locked', icon: <AlertTriangle className="h-10 w-10 text-yellow-500" />, color: 'border-yellow-500/50 bg-yellow-500/10' },
                         };
                         
                         return (
                           <Card 
                              key={assignment.id} 
                              className={cn("overflow-hidden hover:shadow-lg transition-shadow flex flex-col cursor-pointer", statusInfo[status].color)}
                              onClick={() => openProblemsDialog(assignment, challenge, lab)}
                           >
                             <CardHeader className="p-3 pb-2 flex-grow">
                                <div className="aspect-video bg-muted/50 rounded-md mb-2 flex items-center justify-center">
                                    {statusInfo[status].icon}
                                </div>
                               <CardTitle className="text-md leading-tight">{getLocalizedText(challenge.title)}</CardTitle>
                               {assignment.expiryDate && (
                                <p className={cn("text-xs flex items-center gap-1", isExpired ? "text-destructive" : "text-muted-foreground")}>
                                  <Clock size={12}/> {isExpired ? "Expired" : "Due"}: {format(new Date(assignment.expiryDate), "PP", { locale: language === 'th' ? th : enUS })}</p>
                               )}
                             </CardHeader>
                             <CardContent className="p-3 pt-0">
                                <p className="text-xs text-muted-foreground line-clamp-2">{getLocalizedText(challenge.description)}</p>
                              </CardContent>
                             <CardFooter className="p-3 pt-0 mt-auto">
                                <Badge variant="outline" className={statusInfo[status].color}>{statusInfo[status].text}</Badge>
                             </CardFooter>
                           </Card>
                         )
                       })}
                    </div>
                  </div>
                ))}
              </CardContent>
          </Card>
      ))}

      <Dialog open={showProblemsDialog} onOpenChange={setShowProblemsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{getLocalizedText(selectedWeek?.challenge.title)}</DialogTitle>
            <DialogDescription>{getLocalizedText(selectedWeek?.challenge.description)}</DialogDescription>
          </DialogHeader>
          <div className="py-4">
              <h4 className="text-sm font-semibold mb-2 text-muted-foreground">{t('problemsInWeek')}</h4>
              {selectedWeek && selectedWeek.challenge.targetCodes.length > 0 ? (
                  <ul className="space-y-2">
                  {selectedWeek.challenge.targetCodes.map(tc => {
                      const attempt = getProblemStatus(selectedWeek.assignment.id, tc.id);
                      const isProblemExpiredAndIncomplete = isLabAssignmentExpired(selectedWeek.assignment) && (!attempt || !attempt.completed);
                      const maxScore = attempt?.lateSubmissionMaxScore ?? tc.points;

                      return (
                          <li key={tc.id} className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                              <div className="flex items-center gap-2">
                                  {attempt?.completed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <FolderKanban className="h-4 w-4 text-primary/70" />}
                                  <div className='flex flex-col'>
                                  <span className="font-mono text-sm">{getLocalizedText(tc.description)}</span>
                                  <span className="text-xs font-semibold text-primary/80">
                                      {typeof attempt?.score === 'number' ? `${t('yourScore')}: ${attempt.score.toFixed(2)} / ` : ''}{maxScore} pts
                                  </span>
                                  </div>
                              </div>
                          <Button size="sm" onClick={() => { selectChallenge(selectedWeek.assignment.id, selectedWeek.challenge, tc); setShowProblemsDialog(false); }} disabled={isProblemExpiredAndIncomplete && attempt?.lateRequestStatus !== 'approved'}>
                              {attempt?.completed ? t('viewSubmission') : (isProblemExpiredAndIncomplete ? t('expired') : t('startCoding'))}
                          </Button>
                          </li>
                      );
                  })}
                  </ul>
              ) : (
                  <div className="text-center p-2 border-dashed border rounded-md">
                      <p className="text-xs italic text-muted-foreground">{t('noProblemsInWeek')}</p>
                  </div>
              )}
          </div>
           <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
