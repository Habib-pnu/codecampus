
"use client";

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Editor, { useMonaco } from "@monaco-editor/react";
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

import type { DashboardState, DashboardActions } from "./types";
import type { CodeSnippet, Exercise, Lab, User, SupportedLanguage } from '@/types';
import type { CodeAssistantOutput } from '@/ai/types';
import { Play, Save, FileText, Trash2, PlusCircle, Pencil, BookOpenCheck, ChevronLeft, ChevronRight, Undo2, Redo2, RotateCw, Shield, AlertTriangle, Globe, CheckCircle, Bot, Sparkles, Bug, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadIcon } from '@/components/icons/LoadIcon';
import { Alert, AlertDescription as UIDescription } from "@/components/ui/alert";
import { useLanguage } from '@/context/language-context';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { assistWithCode } from '@/ai/flows/code-assistant-flow';

interface FilePreparationResponse {
  success: boolean;
  baseFilename?: string;
  language?: 'cpp' | 'python';
  compileError?: string | null;
  error?: string | null;
}

type EditorViewProps = Pick<DashboardState,
  "code" | "codeTitle" | "currentSnippetId" |
  "savedCodes" | "currentUser" | "labs" | "currentExercise" | "isCompiling" | "isAwaitingAIResponse"
 > &
  Pick<DashboardActions,
  "setCode" | "setCodeTitle" | "setCurrentSnippetId" |
  "handleSaveOrUpdateSnippet" | "handleNewSnippet" | "handleLoadCode" | "handleDeleteSnippet" | "handleRenameSnippetTitle" | "handleUseSnippetAsWeekTarget" | "handleSubmitExercise" | "setIsAwaitingAIResponse"
  >;

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8080';

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

const ITEMS_PER_PAGE = 5;

export function EditorView({
  code, setCode,
  codeTitle, setCodeTitle,
  currentSnippetId, setCurrentSnippetId,
  handleSaveOrUpdateSnippet, handleNewSnippet, handleLoadCode, handleDeleteSnippet, handleRenameSnippetTitle,
  savedCodes,
  currentUser,
  labs,
  handleUseSnippetAsWeekTarget,
  currentExercise,
  handleSubmitExercise,
  isCompiling,
  isAwaitingAIResponse,
  setIsAwaitingAIResponse
}: EditorViewProps) {

  const monacoEditorRef = useRef<any>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const copyTempRef = useRef<string | null>(null);

  const { toast } = useToast();
  const { t } = useLanguage();
  const monaco = useMonaco();

  // Security state
  const [typingMetrics, setTypingMetrics] = useState<TypingMetrics>({
    keystrokes: [],
    warnings: 0,
    isBlocked: false,
    lastKeystroke: 0,
  });
  const [securityAlerts, setSecurityAlerts] = useState<string[]>([]);
  const [isSecurityDialogOpen, setIsSecurityDialogOpen] = useState(false);
  const [protectedCode, setProtectedCode] = useState(code);

  const [isPreparingFile, setIsPreparingFile] = useState(false);
  const [isTerminalPopupOpen, setIsTerminalPopupOpen] = useState(false);
  const [preparedBaseFilename, setPreparedBaseFilename] = useState<string | null>(null);
  const [preparedLanguage, setPreparedLanguage] = useState<'cpp' | 'python' | null>(null);
  const [pendingTerminalMessages, setPendingTerminalMessages] = useState<string[]>([]);
  const [terminalKey, setTerminalKey] = useState(Date.now());
  const [hasAutoReExecuted, setHasAutoReExecuted] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [editorLanguage, setEditorLanguage] = useState<'cpp' | 'python' | 'html' | 'javascript' | 'react'>('cpp');
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [snippetToRename, setSnippetToRename] = React.useState<CodeSnippet | null>(null);
  const [newTitleInput, setNewTitleInput] = React.useState("");
  const [isAddToLabModalOpen, setIsAddToLabModalOpen] = React.useState(false);
  const [snippetForLabTarget, setSnippetForLabTarget] = React.useState<CodeSnippet | null>(null);
  const [selectedLabIdForSnippetTarget, setSelectedLabIdForSnippetTarget] = React.useState<string>("");
  const [selectedChallengeIdForSnippetTarget, setSelectedChallengeIdForSnippetTarget] = React.useState<string>("");
  const [descriptionForSnippetTarget, setDescriptionForSnippetTarget] = React.useState<string>("");
  const [selectedCode, setSelectedCode] = useState("");
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState<CodeAssistantOutput | null>(null);


  const [showBrowsePopup, setShowBrowsePopup] = useState(false);
  const [browseContent, setBrowseContent] = useState("");

  const userSavedSnippets = savedCodes?.filter(sc => sc.userId === currentUser?.id) || [];

  // Security Functions
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
    if (lengthDiff === 0) return true; // No change

    setTypingMetrics(prev => {
      const newMetrics = { ...prev };
      // Check minimum keystroke interval
      if (newMetrics.lastKeystroke > 0) {
        const interval = now - newMetrics.lastKeystroke;
        if (interval < SECURITY_CONFIG.MIN_KEYSTROKE_INTERVAL && lengthDiff > 0) {
          addSecurityAlert('typingTooFast', { interval });
          newMetrics.warnings++;
        }
      }
      newMetrics.lastKeystroke = now;
      // Only warn for large insertions (not deletions)
      if (lengthDiff > 0 && lengthDiff >= SECURITY_CONFIG.SUSPICIOUS_PASTE_SIZE) {
        addSecurityAlert('largePaste', { chars: lengthDiff });
        // Attempt to undo the suspicious paste
        if (monacoEditorRef.current) {
          monacoEditorRef.current.trigger('keyboard', 'undo');
        }
        newMetrics.warnings++;
        return newMetrics; // Block this change
      }
      // Do NOT warn for large deletions (including drag-removal)
      // Add keystroke to history
      newMetrics.keystrokes = [
        ...newMetrics.keystrokes.filter(k => now - k.timestamp < SECURITY_CONFIG.TYPING_WINDOW),
        { timestamp: now, length: Math.abs(lengthDiff) }
      ];
      // Calculate typing speed (characters per second)
      const totalChars = newMetrics.keystrokes.reduce((sum, k) => sum + k.length, 0);
      const timeWindow = Math.max(SECURITY_CONFIG.TYPING_WINDOW, now - (newMetrics.keystrokes[0]?.timestamp || now));
      const typingSpeed = (totalChars / timeWindow) * 1000;
      if (typingSpeed > SECURITY_CONFIG.MAX_TYPING_SPEED && newMetrics.keystrokes.length > 3) {
        addSecurityAlert('highSpeedTyping', { speed: typingSpeed.toFixed(1) });
        newMetrics.warnings++;
      }
      // Block editor if too many warnings
      if (newMetrics.warnings >= SECURITY_CONFIG.WARNING_THRESHOLD) {
        newMetrics.isBlocked = true;
        addSecurityAlert("securityBlock");
        setIsSecurityDialogOpen(true);
      }
      return newMetrics;
    });
    return true;
  }, [addSecurityAlert, t]);

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

  const handleEditorMount = (editorInstance: any, monaco: any) => {
    monacoEditorRef.current = editorInstance;

    editorInstance.onDidChangeCursorSelection((e: any) => {
      const selectedText = editorInstance.getModel().getValueInRange(e.selection);
      setSelectedCode(selectedText);
    });

    // Disable copy/paste in Monaco Editor
    if (monaco) {
      const blockAction = (alertMsgKey: string) => {
        addSecurityAlert(alertMsgKey);
        copyTempRef.current = null; // Clear copy temp on copy attempt
        return null;
      };
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => blockAction("copyBlocked"));
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => blockAction("pasteBlocked"));
      editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => blockAction("cutBlocked"));
    }
    // Block right-click context menu
    editorInstance.onContextMenu(() => addSecurityAlert("rightClickBlocked"));

    // Also block browser context menu at DOM level
    const editorDomNode = editorInstance.getDomNode();
    if (editorDomNode) {
      editorDomNode.addEventListener('contextmenu', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        addSecurityAlert("rightClickBlocked");
      });
      editorDomNode.addEventListener('paste', (e: ClipboardEvent) => {
        e.preventDefault();
        addSecurityAlert("pasteBlocked");
        copyTempRef.current = null;
      });
      editorDomNode.addEventListener('copy', (e: ClipboardEvent) => {
        e.preventDefault();
        addSecurityAlert("copyBlocked");
        copyTempRef.current = null;
      });
      editorDomNode.addEventListener('cut', (e: ClipboardEvent) => {
        e.preventDefault();
        addSecurityAlert("cutBlocked");
        copyTempRef.current = null;
      });
      // Clear copy temp and system clipboard if click in editor
      editorDomNode.addEventListener('mousedown', () => {
        copyTempRef.current = null;
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      });
    }
  };
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    
    if (typingMetrics.isBlocked) {
      addSecurityAlert("securityBlock");
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      return;
    }

    // Only check typing speed for warning, do not revert or block here
    checkTypingSpeed(newValue, protectedCode);

    setProtectedCode(newValue);
    setCode(newValue); 
  };

  const handleSaveButtonClick = () => {
    if (!codeTitle.trim()){
        toast({ title: t('filenameMissingTitle'), description: t('filenameMissingDesc'), variant: "destructive"});
        return;
    }
    if (typingMetrics.isBlocked) {
      toast({ title: t('securityBlock'), description: t('saveBlockedDesc'), variant: "destructive"});
      return;
    }
    handleSaveOrUpdateSnippet({ title: codeTitle, code: protectedCode, snippetIdToUpdate: currentSnippetId });
  };

  const triggerFilePreparationAndTerminalLaunch = useCallback(async () => {
    if (!protectedCode.trim() || !codeTitle.trim()) {
      toast({ title: t('missingInfoTitle'), description: t('missingInfoDesc'), variant: "destructive" });
      return;
    }
    if (!currentUser) {
      toast({ title: t('loginRequiredTitle'), description: t('loginRequiredDesc'), variant: "destructive" });
      return;
    }
    if (typingMetrics.isBlocked) {
      toast({ title: t('securityBlock'), description: t('executeBlockedDesc'), variant: "destructive" });
      return;
    }

    setIsPreparingFile(true);
    toast({ title: t('preparingFilesTitle'), description: t('preparingFilesDesc') });

    try {
      const apiPayload = {
        code: protectedCode,
        language: editorLanguage,
        username: currentUser.username,
        snippetName: codeTitle,
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
  }, [protectedCode, codeTitle, currentUser, typingMetrics.isBlocked, editorLanguage, toast, t, isTerminalPopupOpen]);

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
    // Auto re-execute once when terminal is open and ready
    if (
      isTerminalPopupOpen &&
      preparedBaseFilename &&
      preparedLanguage &&
      !isPreparingFile &&
      !hasAutoReExecuted
    ) {
      setHasAutoReExecuted(true);
      triggerFilePreparationAndTerminalLaunch();
    }
    // Reset auto-execute flag when closing terminal
    if (!isTerminalPopupOpen && hasAutoReExecuted) {
      setHasAutoReExecuted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTerminalPopupOpen, preparedBaseFilename, preparedLanguage, isPreparingFile]);


  const handleBrowseClick = () => {
    if (editorLanguage === 'html') {
        setBrowseContent(protectedCode);
        setShowBrowsePopup(true);
    } else if (editorLanguage === 'javascript') {
        const htmlWrapper = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>JavaScript Preview</title>
            </head>
            <body>
                <h1>JavaScript Preview</h1>
                <p>Check the browser's developer console for output.</p>
                <script>
                    try {
                        console.log('--- Executing user code ---');
                        ${protectedCode}
                        console.log('--- End of user code ---');
                    } catch (e) {
                        console.error("Error executing user code:", e);
                        const errorDiv = document.createElement('div');
                        errorDiv.style.color = 'red';
                        errorDiv.style.fontFamily = 'monospace';
                        errorDiv.textContent = 'Error: ' + e.message;
                        document.body.appendChild(errorDiv);
                    }
                </script>
            </body>
            </html>
        `;
        setBrowseContent(htmlWrapper);
        setShowBrowsePopup(true);
    } else if (editorLanguage === 'react') {
        // Sanitize code: remove imports and exports which won't work in this environment.
        const sanitizedCode = protectedCode
            .replace(/import\s+.*\s+from\s+['"].*['"];?/g, '')
            .replace(/export\s+default\s+\w+;?/g, '');

        const htmlWrapper = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>React/TSX Preview</title>
                <meta charset="UTF-8" />
                <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <style>
                    body { font-family: sans-serif; }
                    #error-container { color: #a94442; background-color: #f2dede; border: 1px solid #ebccd1; padding: 15px; border-radius: 4px; margin: 20px; font-family: monospace; white-space: pre-wrap; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <div id="error-container" style="display: none;"></div>

                <script type="text/babel" data-presets="react,typescript">
                    // Global error handler to catch runtime issues
                    window.addEventListener('error', function (event) {
                        const errorContainer = document.getElementById('error-container');
                        if (errorContainer) {
                            errorContainer.textContent = event.message;
                            errorContainer.style.display = 'block';
                        }
                    });

                    try {
                        // The user's sanitized TSX code is injected here.
                        // It is expected to define a component named 'App'.
                        ${sanitizedCode}

                        // We assume the user has defined a component called 'App'
                        const container = document.getElementById('root');
                        const root = ReactDOM.createRoot(container);
                        root.render(React.createElement(App));

                    } catch (err) {
                        // This catches Babel transpilation errors
                        const errorContainer = document.getElementById('error-container');
                        if (errorContainer) {
                            errorContainer.textContent = err.message;
                            errorContainer.style.display = 'block';
                        }
                    }
                </script>
            </body>
            </html>
        `;
        setBrowseContent(htmlWrapper);
        setShowBrowsePopup(true);
    } else {
        toast({
            title: t('previewNotAvailableTitle'),
            description: t('previewNotAvailableDesc', { lang: editorLanguage.toUpperCase() }),
            variant: "default",
        });
    }
  };

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
            fit.fit();
        }, 50);
        // Ensure terminal is interactive and cursor is visible on (re)open
        term.options.disableStdin = false;
        term.write('\x1b[?25h'); // Show cursor

        terminalInstanceRef.current = term;
        fitAddonRef.current = fit;

        pendingTerminalMessages.forEach(msg => xtermWrite(msg, 'info'));
        setPendingTerminalMessages([]);

        wsRef.current = new WebSocket(WEBSOCKET_URL);

        wsRef.current.onopen = () => {
          const command = preparedLanguage === 'cpp' 
            ? `./${preparedBaseFilename}.out` 
            : `python3 ./${preparedBaseFilename}.py`;

          console.debug("[EditorView] WebSocket open, sending execute command:", command);

          wsRef.current?.send(JSON.stringify({ 
            type: 'execute', 
            command: command,
            cols: terminalInstanceRef.current?.cols || 80,
            rows: terminalInstanceRef.current?.rows || 24,
          }));
          terminalInstanceRef.current?.focus();
        };

        wsRef.current.onmessage = (event) => {
          console.debug("[EditorView] WebSocket message received:", event.data);
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
            console.error('[EditorView] WebSocket Error: ', errorEvent);
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
          console.debug("[EditorView] xterm onData (user input):", data);
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
            }, 50)
          });
          resizeObserver.observe(terminalRef.current);
        }

      } catch (error) {
        console.error("[EditorView] Error opening terminal:", error);
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
  }, [isTerminalPopupOpen, preparedBaseFilename, preparedLanguage, terminalKey, xtermWrite, toast]);

  const openRenameModal = (snippet: CodeSnippet) => {
    setSnippetToRename(snippet);
    setNewTitleInput(snippet.title.replace(/\.(cpp|py|html|js|jsx|tsx)$/i, ""));
    setIsRenameModalOpen(true);
  };

  const confirmRename = () => {
    if (snippetToRename && newTitleInput.trim()) {
      handleRenameSnippetTitle(snippetToRename.id, newTitleInput.trim());
      setIsRenameModalOpen(false);
      setSnippetToRename(null);
    }
  };

  const openAddToLabModal = (snippet: CodeSnippet) => {
    setSnippetForLabTarget(snippet);
    setSelectedLabIdForSnippetTarget("");
    setSelectedChallengeIdForSnippetTarget("");
    setDescriptionForSnippetTarget(snippet.title.replace(/\.(cpp|py|html|js|jsx|tsx)$/, ""));
    setIsAddToLabModalOpen(true);
  };

  const handleConfirmAddToLabTarget = () => {
    if (!snippetForLabTarget || !selectedLabIdForSnippetTarget || !selectedChallengeIdForSnippetTarget) {
      toast({ title: "Error", description: "Please select a lab and a challenge.", variant: "destructive" });
      return;
    }
    
    handleUseSnippetAsWeekTarget({
      snippet: snippetForLabTarget,
      labId: selectedLabIdForSnippetTarget,
      challengeId: selectedChallengeIdForSnippetTarget,
      points: 100,
      targetDescription: descriptionForSnippetTarget.trim() || snippetForLabTarget.title.replace(/\.(cpp|py|html|js|jsx|tsx)$/, ""),
    });
    setIsAddToLabModalOpen(false);
  };

  const userSavedCodes = currentUser ? savedCodes.filter(sc => sc.userId === currentUser.id) : [];
  const totalPages = Math.ceil(userSavedCodes.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedSnippets = userSavedCodes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const availableLabTemplates = currentUser ? labs.filter(lab => lab.isTemplate && (currentUser.isAdmin || lab.creatorId === currentUser.id)) : [];
  const challengesForSelectedLab = selectedLabIdForSnippetTarget
    ? labs.find(lab => lab.id === selectedLabIdForSnippetTarget)?.challenges || []
    : [];

  useEffect(() => {
    if (codeTitle.trim().endsWith('.py')) {
      setEditorLanguage('python');
    } else if (codeTitle.trim().endsWith('.html')) {
        setEditorLanguage('html');
    } else if (codeTitle.trim().endsWith('.js') || codeTitle.trim().endsWith('.jsx')) {
        setEditorLanguage('javascript');
    } else if (codeTitle.trim().endsWith('.ts') || codeTitle.trim().endsWith('.tsx')) {
        setEditorLanguage('react');
    } else {
      setEditorLanguage('cpp');
    }
  }, [codeTitle]);

  const closeTerminalPopup = () => {
    setIsTerminalPopupOpen(false);
  };

  useEffect(() => {
    if (code !== protectedCode && !typingMetrics.isBlocked) {
      if (Math.abs((code?.length || 0) - (protectedCode?.length || 0)) > 5) {
        setProtectedCode(code);
      }
    }
  }, [code, protectedCode, typingMetrics.isBlocked]);

  // Block system-level paste (Edit -> Paste menu) when editor is focused
  useEffect(() => {
    function handleGlobalPaste(e: ClipboardEvent) {
      if (
        document.activeElement &&
        monacoEditorRef.current &&
        monacoEditorRef.current.hasTextFocus &&
        monacoEditorRef.current.hasTextFocus()
      ) {
        e.preventDefault();
        addSecurityAlert("systemPasteBlocked");
        copyTempRef.current = null;
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('').catch(() => {});
        }
      }
    }
    window.addEventListener('paste', handleGlobalPaste, true);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste, true);
    };
  }, [addSecurityAlert]);

  const isExerciseActive = currentExercise !== null;
  const isAlreadyCompleted = isExerciseActive && currentUser?.completedExercises.some(e => e.exerciseId === currentExercise.id);
  
  const handleAiRequest = async (requestType: 'explain' | 'suggest_improvement' | 'find_bugs') => {
    if (!selectedCode.trim()) {
        toast({ title: "No Code Selected", description: "Please select a piece of code in the editor first.", variant: "destructive" });
        return;
    }
    if (!currentUser) {
        toast({ title: "Login Required", description: "You must be logged in to use the AI assistant.", variant: "destructive" });
        return;
    }

    setIsAwaitingAIResponse(true);
    setAiResponse(null); // Clear previous response
    setIsAIAssistantOpen(true); // Open the dialog to show loading state

    try {
        const response = await assistWithCode({
            code: protectedCode,
            selectedCode: selectedCode,
            language: editorLanguage,
            requestType: requestType,
        });
        setAiResponse(response);
    } catch (e: any) {
        console.error("AI Assistant Error:", e);
        toast({ title: "AI Assistant Error", description: e.message || "Failed to get a response from the AI.", variant: "destructive" });
        setIsAIAssistantOpen(false); // Close dialog on error
    } finally {
        setIsAwaitingAIResponse(false);
    }
  };


  return (
    <div className="p-0 h-full flex flex-col gap-4">
      {/* Security Status Alert */}
      {(typingMetrics.warnings > 0 || securityAlerts.length > 0) && (
        <Alert className={cn(
          "mb-4",
          typingMetrics.isBlocked ? "border-red-500 bg-red-50" : "border-yellow-500 bg-yellow-50"
        )}>
          <Shield className="h-4 w-4" />
          <UIDescription>
            <div className="flex justify-between items-center">
              <div>
                <strong>{t('securityStatus')}:</strong> {t('warnings', { count: typingMetrics.warnings })}
                {typingMetrics.isBlocked && ` - ${t('editorLocked')}`}
              </div>
            </div>
            {securityAlerts.length > 0 && (
              <div className="text-xs mt-2 space-y-1">
                {[...new Set(securityAlerts.slice(-2))].map((alert, i) => (
                  <div key={i} className="font-mono">{alert}</div>
                ))}
              </div>
            )}
          </UIDescription>
        </Alert>
      )}

      <Card className="shadow-md flex flex-col flex-1 min-h-96 overflow-hidden">
        <CardHeader className="p-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-2">
              {t('codeEditorTitle', { lang: editorLanguage.toUpperCase() })}
              {typingMetrics.isBlocked && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </CardTitle>
            <div className="flex gap-2">
               <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={!selectedCode.trim() || isAwaitingAIResponse} title="AI Assistant">
                      <Bot className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-1">
                      <div className="flex flex-col gap-1">
                          <Button variant="ghost" className="justify-start" onClick={() => handleAiRequest('explain')}>
                            <MessageCircleQuestion className="mr-2 h-4 w-4" /> Explain Code
                          </Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handleAiRequest('suggest_improvement')}>
                              <Sparkles className="mr-2 h-4 w-4" /> Suggest Improvement
                          </Button>
                          <Button variant="ghost" className="justify-start" onClick={() => handleAiRequest('find_bugs')}>
                              <Bug className="mr-2 h-4 w-4" /> Find Bugs
                          </Button>
                      </div>
                  </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={() => monacoEditorRef.current?.trigger('keyboard', 'undo')}
                title={t('undo')}
                className="h-8 w-8"
                disabled={typingMetrics.isBlocked || typingMetrics.warnings > 0}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => monacoEditorRef.current?.trigger('keyboard', 'redo')}
                title={t('redo')}
                className="h-8 w-8"
                disabled={typingMetrics.isBlocked || typingMetrics.warnings > 0}
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 relative flex-1">
          <Editor
            height="390px"
            language={editorLanguage}
            theme="vs-dark"
            value={protectedCode}
            onMount={handleEditorMount}
            onChange={handleEditorChange}
            options={{ fontSize: 16, minimap: { enabled: true }, automaticLayout: true, contextmenu: false }}
          />
        </CardContent>
      </Card>

      <Card className="shadow-md shrink-0">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-2 pt-4 px-4">
          <div className="flex items-center gap-2 flex-grow min-w-0">
            <FileText className="h-6 w-6 text-primary shrink-0" />
            <Input
              type="text"
              placeholder={t('filenamePlaceholder')}
              value={codeTitle}
              onChange={(e) => setCodeTitle(e.target.value)}
              className="h-9"
              disabled={isExerciseActive}
              title={isExerciseActive ? "Filename is determined by the exercise." : "Enter a filename."}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewSnippet}
              title="New Code"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('newButton')}
            </Button>
            {['cpp', 'python'].includes(editorLanguage) ? (
                <Button
                onClick={triggerFilePreparationAndTerminalLaunch}
                disabled={!code.trim() || !codeTitle.trim() || isPreparingFile}
                >
                {isPreparingFile ? <div className="h-4 w-4 border-2 border-transparent border-t-primary-foreground rounded-full animate-spin" /> : <Play className="h-4 w-4" />}
                <span className="ml-2">{t('compileAndRun')}</span>
                </Button>
            ) : (
                <Button
                    onClick={handleBrowseClick}
                    disabled={!code.trim() || !codeTitle.trim() || !['html', 'javascript', 'react'].includes(editorLanguage)}
                    title={!['html', 'javascript', 'react'].includes(editorLanguage) ? t('previewNotAvailableDesc', { lang: editorLanguage.toUpperCase() }) : t('previewNotAvailableTitle')}
                >
                    <Globe className="h-4 w-4" />
                    <span className="ml-2">{t('browse')}</span>
                </Button>
            )}
            {isExerciseActive ? (
              <Button
                onClick={handleSubmitExercise}
                disabled={isCompiling || isAlreadyCompleted}
                size="sm"
                title={isAlreadyCompleted ? "You have already completed this exercise." : "Submit Solution"}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isCompiling ? t('submitting') : isAlreadyCompleted ? t('completed') : t('submitSolution')}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveButtonClick}
                disabled={!code.trim() || !codeTitle.trim()}
                title="Save Snippet"
              >
                <Save className="mr-2 h-4 w-4" />
                {t('saveSnippet')}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>
      
      <Dialog open={isAIAssistantOpen} onOpenChange={setIsAIAssistantOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Bot /> AI Code Assistant</DialogTitle>
            <DialogDescription>Review the AI's analysis of your selected code.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-4 -mr-2 space-y-4">
            {isAwaitingAIResponse && (
                <div className="flex items-center justify-center p-8">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="h-5 w-5 border-2 border-transparent border-t-primary rounded-full animate-spin" />
                        <span>Thinking...</span>
                    </div>
                </div>
            )}
            {aiResponse && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader><CardTitle className="text-base">Explanation</CardTitle></CardHeader>
                    <CardContent><p className="text-sm">{aiResponse.response}</p></CardContent>
                  </Card>
                  {aiResponse.suggestedCode && (
                      <Card>
                        <CardHeader><CardTitle className="text-base">Suggested Code</CardTitle></CardHeader>
                        <CardContent>
                          <div className="h-64 border rounded-md overflow-hidden bg-[#1e1e1e]">
                             <Editor
                                height="100%"
                                language={editorLanguage}
                                theme="vs-dark"
                                value={aiResponse.suggestedCode}
                                options={{ readOnly: true, fontSize: 14, minimap: { enabled: false } }}
                              />
                          </div>
                        </CardContent>
                      </Card>
                  )}
                </div>
            )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsAIAssistantOpen(false)}>Close</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={isTerminalPopupOpen} onOpenChange={(open) => { 
        if (!open) closeTerminalPopup(); 
        else setIsTerminalPopupOpen(true);
      }}>
        <DialogContent className="sm:max-w-3xl h-[70vh] flex flex-col p-0 gap-0">
          <div key={terminalKey} className="h-full flex flex-col">
            <DialogHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div>
                <DialogTitle>{t('executionTerminalTitle', { lang: preparedLanguage?.toUpperCase() || 'N/A', filename: preparedBaseFilename || '...' })}</DialogTitle>
                <DialogDescription>
                  {t('interactiveTerminal')}
                </DialogDescription>
              </div>
              <div className="flex flex-row items-center gap-2" style={{ paddingRight: 30 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reexecuteFromTmp}
                  disabled={!preparedBaseFilename || !preparedLanguage || isPreparingFile}
                  className="ml-auto"
                >
                  {isPreparingFile ? <div className="h-4 w-4 border-2 border-transparent border-t-primary rounded-full animate-spin" /> : <RotateCw className="h-4 w-4" />}
                  <span className="ml-2">{t('reExecute')}</span>
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
                <DialogTitle>{t('browserPreviewTitle', { title: codeTitle })}</DialogTitle>
                <DialogDescription>
                    {t('browserPreviewDesc')}
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


      <Dialog open={isRenameModalOpen} onOpenChange={setIsRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('renameSnippetTitle')}</DialogTitle>
            <DialogDescription>{t('renameSnippetDesc', { title: snippetToRename?.title })}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-snippet-name" className="text-right">{t('newNameLabel')}</Label>
              <Input
                id="new-snippet-name"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                className="col-span-3"
                placeholder={t('newNamePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameModalOpen(false)}>{t('cancelButton')}</Button>
            <Button onClick={confirmRename} disabled={!newTitleInput.trim()}>{t('saveName')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddToLabModalOpen} onOpenChange={setIsAddToLabModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addToLabTitle')}</DialogTitle>
            <DialogDescription>{t('addToLabDesc', { title: snippetForLabTarget?.title })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="lab-select-for-target">{t('labTemplateLabel')}</Label>
              <Select value={selectedLabIdForSnippetTarget} onValueChange={setSelectedLabIdForSnippetTarget}>
                <SelectTrigger id="lab-select-for-target"><SelectValue placeholder={t('selectLabPlaceholder')} /></SelectTrigger>
                <SelectContent>
                  {availableLabTemplates.map(lab => (
                    <SelectItem key={lab.id} value={lab.id}>{typeof lab.title === 'string' ? lab.title : lab.title.en} {lab.scope === 'global' && <span className="text-xs text-muted-foreground">(Global)</span>}</SelectItem>
                  ))}
                  {availableLabTemplates.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">{t('noLabTemplates')}</div>}
                </SelectContent>
              </Select>
            </div>

            {selectedLabIdForSnippetTarget && (
              <div>
                <Label htmlFor="challenge-select-for-target">{t('challengeLabel')}</Label>
                <Select value={selectedChallengeIdForSnippetTarget} onValueChange={setSelectedChallengeIdForSnippetTarget} disabled={!selectedLabIdForSnippetTarget}>
                  <SelectTrigger id="challenge-select-for-target"><SelectValue placeholder={t('selectChallengePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {challengesForSelectedLab.map(challenge => (
                      <SelectItem key={challenge.id} value={challenge.id}>{challenge.title} ({challenge.language.toUpperCase()})</SelectItem>
                    ))}
                    {challengesForSelectedLab.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">{t('noChallengesInLab')}</div>}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="target-description-for-snippet">{t('targetDescLabel')}</Label>
              <Input
                id="target-description-for-snippet"
                value={descriptionForSnippetTarget}
                onChange={(e) => setDescriptionForSnippetTarget(e.target.value)}
                placeholder={t('targetDescPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToLabModalOpen(false)}>{t('cancelButton')}</Button>
            <Button onClick={handleConfirmAddToLabTarget} disabled={!selectedLabIdForSnippetTarget || !selectedChallengeIdForSnippetTarget}>{t('addAsTargetButton')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {currentUser && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">{t('savedSnippetsTitle')}</CardTitle>
            <CardDescription>{t('savedSnippetsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {paginatedSnippets.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">{t('noSavedSnippets')}</p>
            ) : (
              <div className="space-y-2">
                {paginatedSnippets.map((snippet) => (
                  <div
                    key={snippet.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg border",
                      currentSnippetId === snippet.id && "bg-muted border-primary"
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-mono text-sm truncate" title={snippet.title}>{snippet.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                       {(currentUser.role === 'lecturer' || currentUser.isAdmin) && labs.some(lab => lab.isTemplate) && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openAddToLabModal(snippet)}
                            title={t('useAsLabTarget')}
                        >
                            <BookOpenCheck className="h-4 w-4" />
                        </Button>
                       )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleLoadCode(snippet)}
                        title={t('loadCode')}
                      >
                        <LoadIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openRenameModal(snippet)}
                        title={t('rename')}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:text-destructive"
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('deleteSnippetTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('deleteSnippetDesc', { title: snippet.title })}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSnippet(snippet.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {t('pageOf', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
