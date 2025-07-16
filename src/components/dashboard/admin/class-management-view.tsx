
"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { DashboardState, DashboardActions } from "../types";
import type { ClassGroup, Exercise, User, AssignedExerciseInfo, Institution, Coupon, BillingTransaction, Lab, LabChallenge, StudentLabAttempt, SkillAssessmentOutput, AssignedChallengeInfo, StudentProgress, ProblemAssistantRequest, AssistantChatMessage, AdminSupportRequest, AdminChatMessage, LocalizedString, PublicChatMessage } from "@/types";
import { PlusCircle, Edit3, Trash2, Users, UserCheck, ChevronDown, ChevronUp, Save, Check, X, BookOpen, UserCog, ShieldAlert, KeyRound, ShieldCheck, Calendar as CalendarIcon, ExternalLink, Gem, CheckSquare, UserMinus, GraduationCap, PlayCircle, StopCircle, Eye, Download, ListFilter, Pencil, RotateCcw, Building, UserPlus, AlertCircle, Banknote, QrCode, Settings, Ticket, Copy, HelpCircle, Bot, ListTree, DollarSign, CalendarDays, BrainCircuit, Lightbulb, TrendingUp, Info, Send, History, Merge, MessageSquare, Star, Trophy, BookOpenText, Bell } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as ModalDescription, DialogFooter as ModalDialogFooter, DialogClose } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isValid, isPast, getYear, getMonth } from "date-fns";
import { th, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Image from "next/image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription as UIDialogAlertDescription, AlertTitle as UIDialogAlertTitle } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PromptPayQRDownload } from "@/components/dashboard/admin/PromptPayQRDownload";
import { Separator } from "@/components/ui/separator";
import Editor from "@monaco-editor/react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/language-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SkillAssessmentView } from "../skill-assessment-view";


type ClassManagementViewProps = Pick<DashboardState, "allUsers" | "classGroups" | "currentUser" | "exercises" | "institutions" | "coupons" | "promptPayNumber" | "transactions" | "labs" | "adminSupportRequests"> &
  Pick<DashboardActions,
    "handleCreateClassGroup" | "handleDeleteClassGroup" |
    "handleApproveJoinRequest" | "handleDenyJoinRequest" | "handleUpdateClassGroup" | "handleUpdateClassExercises" |
    "handleUpdateUserRole" | "handleAdminResetPassword" | "handleToggleAdminStatus" | "handleRemoveStudentFromClass" | "handleAdminDeleteUser" |
    "handleUpdateClassStatus" | "handleRenameStudentAlias" | "handleReactivateStudentInClass" |
    "handleAddInstitution" | "handleUpdateInstitution" | "handleDeleteInstitution" | "handleAssignInstitutionAdmin" |
    "handleCreateCoupon" | "handleUpdateCoupon" | "handleDeleteCoupon" | "handleSimulatePayment" | "setPromptPayNumber" | "handleAssignWeeksToClass" |
    "handleUnassignWeekFromClass" | "handleUpdateAssignedWeekExpiry" | "handleApproveLateSubmission" | "setAllUsers" | "setInstitutions" |
    "handleSendAssistanceMessage" | "handleCloseAssistanceRequest" | "handleCreateAdminSupportRequest" | "handleSendAdminChatMessage" | "handleUpdateAdminSupportRequestStatus" |
    "handleSendPublicChatMessage" | "handleCloneWeekToCourse"
  >;

export function ClassManagementView({
  allUsers, classGroups, currentUser, exercises, institutions, coupons, promptPayNumber, transactions, labs, adminSupportRequests,
  handleCreateClassGroup, handleDeleteClassGroup,
  handleApproveJoinRequest, handleDenyJoinRequest, handleUpdateClassGroup, handleUpdateClassExercises,
  handleUpdateUserRole, handleAdminResetPassword, handleToggleAdminStatus, handleRemoveStudentFromClass, handleAdminDeleteUser,
  handleUpdateClassStatus, handleRenameStudentAlias, handleReactivateStudentInClass,
  handleAddInstitution, handleUpdateInstitution, handleDeleteInstitution, handleAssignInstitutionAdmin,
  handleCreateCoupon, handleUpdateCoupon, handleDeleteCoupon,
  handleSimulatePayment, setPromptPayNumber, handleAssignWeeksToClass,
  handleUnassignWeekFromClass, handleUpdateAssignedWeekExpiry, handleApproveLateSubmission,
  setAllUsers, setInstitutions, handleSendAssistanceMessage, handleCloseAssistanceRequest,
  handleCreateAdminSupportRequest, handleSendAdminChatMessage, handleUpdateAdminSupportRequestStatus, handleSendPublicChatMessage, handleCloneWeekToCourse
}: ClassManagementViewProps) {
  const { toast } = useToast();
  const { language, t } = useLanguage();
  const [activeLecturerTab, setActiveLecturerTab] = useState('classes');
  const [newClassName, setNewClassName] = useState("");
  const [editingClass, setEditingClass] = useState<ClassGroup | null>(null);
  const [tempClassName, setTempClassName] = useState("");
  
  const [explicitlyToggledClass, setExplicitlyToggledClass] = useState<string | null>(null);
  const [pendingRequestAliases, setPendingRequestAliases] = useState<Record<string, string>>({});

  const [showManageExercisesModal, setShowManageExercisesModal] = useState(false);
  const [classToManageExercises, setClassToManageExercises] = useState<ClassGroup | null>(null);
  const [tempAssignedExercises, setTempAssignedExercises] = useState<Array<AssignedExerciseInfo & { isAssigned: boolean }>>([]);
  const [summarySelectedClassId, setSummarySelectedClassId] = useState<string | 'all'>('all');


  // Unified Lab Management State
  const [classIdForLabManagement, setClassIdForLabManagement] = useState<string | null>(null);
  const classForLabManagement = useMemo(() => {
    if (!classIdForLabManagement) return null;
    return classGroups.find(cg => cg.id === classIdForLabManagement) || null;
  }, [classIdForLabManagement, classGroups]);

  const [selectedChallengesToAssign, setSelectedChallengesToAssign] = useState<Record<string, { labId: string; challengeId: string; isChecked: boolean }>>({});
  const [assignmentExpiryDate, setAssignmentExpiryDate] = useState<Date | undefined>(undefined);

  const [userRoleChanges, setUserRoleChanges] = useState<Record<string, User['role']>>({});
  const [confirmUserDeleteName, setConfirmUserDeleteName] = useState("");

  const [editingAliasStudentId, setEditingAliasStudentId] = useState<string | null>(null);
  const [editingAliasClassId, setEditingAliasClassId] = useState<string | null>(null);
  const [currentEditAliasValue, setCurrentEditAliasValue] = useState<string>("");

  const [newInstitutionName, setNewInstitutionName] = useState("");
  const [newInstitutionPrice, setNewInstitutionPrice] = useState<number>(5);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [tempInstitutionName, setTempInstitutionName] = useState("");
  const [tempInstitutionPrice, setTempInstitutionPrice] = useState<number>(5);

  const [userToAssignAsInstAdmin, setUserToAssignAsInstAdmin] = useState("");
  
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [targetMergeInstitution, setTargetMergeInstitution] = useState<string>("");
  const [sourceMergeInstitutions, setSourceMergeInstitutions] = useState<string[]>([]);

  const [showCouponDialog, setShowCouponDialog] = useState(false);
  const [couponForm, setCouponForm] = useState<Partial<Omit<Coupon, 'id' | 'timesUsed'>>>({});
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  const [editingCapacityClassId, setEditingCapacityClassId] = useState<string | null>(null);
  const [tempCapacity, setTempCapacity] = useState<number>(100);

  // --- STATE for My Billing, Payment, Coupons, etc. ---
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showPaypalDialog, setShowPaypalDialog] = useState(false);
  const [paymentCouponCode, setPaymentCouponCode] = useState("");
  const [appliedCouponInfo, setAppliedCouponInfo] = useState<{ code: string; discountAmount: number } | null>(null);
  const [tempPromptPayNumber, setTempPromptPayNumber] = useState(promptPayNumber);
  const [selectedClassesForPayment, setSelectedClassesForPayment] = useState<string[]>([]);
  const [finalPaymentAmount, setFinalPaymentAmount] = useState(0);

  // --- State for viewing student submissions ---
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<{ student: User; attempt: StudentLabAttempt; challenge: LabChallenge } | null>(null);

  // --- State for editing lab assignment expiry ---
  const [editingAssignedChallenge, setEditingAssignedChallenge] = useState<AssignedChallengeInfo | null>(null);
  const [tempExpiryDateForEdit, setTempExpiryDateForEdit] = useState<Date | undefined>(undefined);

  // State for late submission score adjustment
  const [lateScoreOverrides, setLateScoreOverrides] = useState<Record<string, number>>({});

  // State for assistance chat
  const [viewingAssistanceRequest, setViewingAssistanceRequest] = useState<ProblemAssistantRequest | null>(null);
  const [assistanceChatMessage, setAssistanceChatMessage] = useState("");
  const assistanceChatContainerRef = useRef<HTMLDivElement>(null);
  
  // State for admin support chat
  const [showAdminSupportDialog, setShowAdminSupportDialog] = useState(false);
  const [viewingAdminSupportRequest, setViewingAdminSupportRequest] = useState<AdminSupportRequest | null>(null);
  const [adminSupportSubject, setAdminSupportSubject] = useState("");
  const [adminSupportMessage, setAdminSupportMessage] = useState("");
  const [adminSupportChatMessage, setAdminSupportChatMessage] = useState("");
  const [publicChatMessage, setPublicChatMessage] = useState("");
  const adminChatContainerRef = useRef<HTMLDivElement>(null);

  const lecturerTabs = useMemo(() => [
      { value: 'classes', label: t('manageClassesTitle'), Icon: Users },
      { value: 'users', label: t('manageUsersTitle'), Icon: UserCog },
      { value: 'billing', label: t('myBillingsTitle'), Icon: Banknote },
      { value: 'system', label: t('adminSupport.title'), Icon: Settings },
  ], [t]);

  const activeLecturerTabInfo = useMemo(() => {
    return lecturerTabs.find(tab => tab.value === activeLecturerTab) || lecturerTabs[0];
  }, [activeLecturerTab, lecturerTabs]);

  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en;
    }
    return '';
  };

  const scrollChatToEnd = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
        setTimeout(() => {
            const scrollAreaViewport = ref.current?.querySelector('div[data-radix-scroll-area-viewport]');
            if (scrollAreaViewport) {
                scrollAreaViewport.scrollTop = scrollAreaViewport.scrollHeight;
            }
        }, 50);
    }
  };

  useEffect(() => {
    if (viewingAssistanceRequest?.messages?.length) {
      scrollChatToEnd(assistanceChatContainerRef);
    }
  }, [viewingAssistanceRequest?.messages]);

  useEffect(() => {
    if (viewingAdminSupportRequest?.messages?.length) {
      scrollChatToEnd(adminChatContainerRef);
    }
  }, [viewingAdminSupportRequest?.messages]);

  useEffect(() => {
    if (viewingAssistanceRequest) {
      const updatedRequest = classGroups
        .flatMap(cg => cg.assistanceRequests || [])
        .find(req => req.id === viewingAssistanceRequest.id);
      setViewingAssistanceRequest(updatedRequest || null);
    }
  }, [classGroups, viewingAssistanceRequest]);
  
  useEffect(() => {
    if (viewingAdminSupportRequest) {
      const updatedRequest = adminSupportRequests.find(req => req.id === viewingAdminSupportRequest.id);
      setViewingAdminSupportRequest(updatedRequest || null);
    }
  }, [adminSupportRequests, viewingAdminSupportRequest]);

  const openLabManagementDialog = (classId: string) => {
    setClassIdForLabManagement(classId);
    setSelectedChallengesToAssign({});
    setAssignmentExpiryDate(undefined);
  };

  const startEditExpiry = (assignedChallenge: AssignedChallengeInfo) => {
    setEditingAssignedChallenge(assignedChallenge);
    setTempExpiryDateForEdit(assignedChallenge.expiryDate ? new Date(assignedChallenge.expiryDate) : undefined);
  };
  
  const submitEditExpiry = () => {
    if (editingAssignedChallenge) {
      handleUpdateAssignedWeekExpiry(editingAssignedChallenge.classId, editingAssignedChallenge.assignmentId, tempExpiryDateForEdit ? tempExpiryDateForEdit.toISOString() : undefined); 
    }
    setEditingAssignedChallenge(null);
    setTempExpiryDateForEdit(undefined);
  };


  const handleCreateClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      toast({ title: t('errorToast'), description: t('classNameError'), variant: "destructive" });
      return;
    }
    if (!currentUser?.institutionId) {
      toast({ title: t('errorToast'), description: t('noInstitutionError'), variant: "destructive" });
      return;
    }
    handleCreateClassGroup({ name: newClassName });
    setNewClassName("");
  };

  const startEditClassName = (classGroup: ClassGroup) => {
    setEditingClass(classGroup);
    setTempClassName(classGroup.name);
  };
  const cancelEditClassName = () => {
    setEditingClass(null);
    setTempClassName("");
  };
  const submitEditClassName = (classId: string) => {
    if (!tempClassName.trim()) {
        toast({ title: t('errorToast'), description: t('classNameError'), variant: "destructive" });
        return;
    }
    const classToUpdate = classGroups.find(cg => cg.id === classId);
    if (classToUpdate) {
        handleUpdateClassGroup({ ...classToUpdate, name: tempClassName });
    }
    cancelEditClassName();
  };

  const toggleExpandClass = (classId: string) => {
    setExplicitlyToggledClass(prevId => (prevId === classId ? null : classId));
  };


  const openManageExercisesModal = (classGroup: ClassGroup) => {
    setClassToManageExercises(classGroup);
    const currentAssignments = classGroup.assignedExercises || [];
    const initialTempAssignments = exercises.map(ex => {
        const existingAssignment = currentAssignments.find(ae => ae.exerciseId === ex.id);
        return {
            exerciseId: ex.id,
            isAssigned: !!existingAssignment,
            addedAt: existingAssignment?.addedAt || new Date().toISOString(),
            expiryDate: existingAssignment?.expiryDate,
        };
    });
    setTempAssignedExercises(initialTempAssignments);
    setShowManageExercisesModal(true);
  };

  const handleTempExerciseAssignmentChange = (exerciseId: number, checked: boolean | string) => {
    setTempAssignedExercises(prev => prev.map(item =>
        item.exerciseId === exerciseId ? { ...item, isAssigned: !!checked } : item
    ));
  };

  const handleTempExerciseExpiryChange = (exerciseId: number, date: Date | undefined, time?: string) => {
    setTempAssignedExercises(prev => prev.map(item => {
        if (item.exerciseId === exerciseId) {
            let newExpiryDateTime: string | undefined = undefined;
            if (date) {
                const tempDate = new Date(date); 
                if (time) {
                    const [hours, minutes] = time.split(':').map(Number);
                    tempDate.setHours(hours, minutes, 0, 0);
                } else if (item.expiryDate && isValid(new Date(item.expiryDate))) {
                    const existingDateObj = new Date(item.expiryDate);
                    tempDate.setHours(existingDateObj.getHours(), existingDateObj.getMinutes(), 0, 0);
                } else {
                    tempDate.setHours(23,59,59,999);
                }
                newExpiryDateTime = tempDate.toISOString();
            }
            return { ...item, expiryDate: newExpiryDateTime };
        }
        return item;
    }));
  };


  const confirmManageExercises = () => {
    if (classToManageExercises) {
      const newAssignedExercises: AssignedExerciseInfo[] = tempAssignedExercises
        .filter(item => item.isAssigned)
        .map(item => ({
          exerciseId: item.exerciseId,
          addedAt: (classToManageExercises.assignedExercises || []).find(ae => ae.exerciseId === item.exerciseId)?.addedAt || new Date().toISOString(),
          expiryDate: item.expiryDate,
        }));
      handleUpdateClassExercises(classToManageExercises.id, newAssignedExercises);
      setShowManageExercisesModal(false);
      setClassToManageExercises(null);
    }
  };

  const handleToggleChallengeSelectionForModal = (labId: string, challengeId: string) => {
    const key = `${labId}_${challengeId}`;
    setSelectedChallengesToAssign(prev => {
        const newState = { ...prev };
        if (newState[key]) {
            delete newState[key];
        } else {
            newState[key] = { labId, challengeId, isChecked: true };
        }
        return newState;
    });
  };

  const handleConfirmAssignChallenges = () => {
    if (!classForLabManagement) {
        toast({ title: t('errorToast'), description: t('noClassSelectedError'), variant: "destructive" });
        return;
    }
    const challengesToAssign = Object.values(selectedChallengesToAssign)
      .filter(sc => sc.isChecked)
      .map(sc => ({ labId: sc.labId, challengeId: sc.challengeId }));
    
    if (challengesToAssign.length === 0) {
        toast({ title: t('noChallengeSelectedErrorTitle'), description: t('noChallengeSelectedErrorDesc'), variant: "destructive" });
        return;
    }

    handleAssignWeeksToClass(classForLabManagement.id, challengesToAssign, assignmentExpiryDate?.toISOString());
    // Reset selection for next time
    setSelectedChallengesToAssign({});
    // Switch to the 'assigned' tab to show the result
  };


  const handleRoleSelectionChange = (userId: string, newRoleValue: User['role']) => {
    setUserRoleChanges(prev => ({ ...prev, [userId]: newRoleValue }));
  };

  const submitUserRoleChange = (userId: string) => {
    const newRole = userRoleChanges[userId];
    if (newRole) {
      handleUpdateUserRole(userId, newRole);
      setUserRoleChanges(prev => {
        const newState = {...prev};
        delete newState[userId];
        return newState;
      });
    } else {
      toast({ title: "Info", description: t('noRoleChangeInfo'), variant: "default" });
    }
  };

  const confirmAdminPasswordReset = (userId: string) => {
    handleAdminResetPassword(userId);
  };

  const confirmAdminDeleteUser = (userId: string) => {
    handleAdminDeleteUser(userId);
    setConfirmUserDeleteName("");
  };

  const startEditAlias = (classId: string, studentUserId: string, currentAlias: string) => {
    setEditingAliasClassId(classId);
    setEditingAliasStudentId(studentUserId);
    setCurrentEditAliasValue(currentAlias);
  };

  const cancelEditAlias = () => {
    setEditingAliasClassId(null);
    setEditingAliasStudentId(null);
    setCurrentEditAliasValue("");
  };

  const submitEditAlias = () => {
    if (editingAliasClassId && editingAliasStudentId && currentEditAliasValue.trim()) {
      handleRenameStudentAlias(editingAliasClassId, editingAliasStudentId, currentEditAliasValue.trim());
      cancelEditAlias();
    } else {
      toast({ title: t('errorToast'), description: t('aliasEmptyError'), variant: "destructive" });
    }
  };

  const openCouponDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCouponForm({
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiryDate: coupon.expiryDate,
        classId: coupon.classId,
        maxUses: coupon.maxUses,
        isActive: coupon.isActive,
      });
    } else {
      setEditingCoupon(null);
      setCouponForm({
        code: `SAVE${Math.floor(10 + Math.random() * 90)}`,
        discountType: 'percentage',
        discountValue: 10,
        isActive: true,
      });
    }
    setShowCouponDialog(true);
  };
  
  const handleConfirmMerge = () => {
    if (!targetMergeInstitution || sourceMergeInstitutions.length === 0) {
      toast({ title: "Error", description: "Please select a target and at least one source institution to merge.", variant: "destructive" });
      return;
    }

    const sourceIds = new Set(sourceMergeInstitutions);
    
    // Update all users belonging to source institutions
    const updatedUsers = allUsers.map(user => {
        if (user.institutionId && sourceIds.has(user.institutionId)) {
            return { ...user, institutionId: targetMergeInstitution };
        }
        return user;
    });
    setAllUsers(updatedUsers);

    // Remove the source institutions from the list
    const updatedInstitutions = institutions.filter(inst => !sourceIds.has(inst.id));
    setInstitutions(updatedInstitutions);
    
    toast({ title: "Merge Successful", description: `Merged ${sourceMergeInstitutions.length} institution(s).` });
    setShowMergeDialog(false);
    setTargetMergeInstitution("");
    setSourceMergeInstitutions([]);
  };

  const handleCouponFormSubmit = () => {
    if (!couponForm.code || !couponForm.discountType || !couponForm.discountValue) {
      toast({ title: t('couponFieldsError'), description: t('couponFieldsError'), variant: "destructive" });
      return;
    }
    if (!currentUser?.isAdmin) {
       toast({ title: t('couponAdminOnlyError'), description: t('couponAdminOnlyError'), variant: "destructive" });
       return;
    }

    if (editingCoupon) {
      handleUpdateCoupon({ ...editingCoupon, ...couponForm } as Coupon);
    } else {
      handleCreateCoupon({
        ...couponForm,
        code: couponForm.code,
        discountType: couponForm.discountType,
        discountValue: couponForm.discountValue,
        isActive: couponForm.isActive === undefined ? true : couponForm.isActive,
        institutionId: 'global'
      } as Omit<Coupon, 'id' | 'timesUsed' | 'creatorId'>);
    }
    setShowCouponDialog(false);
  };

  const handleCopyClassCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({title: t('copiedTitle'), description: t('classCodeCopied')});
  }
  
  const handleViewSubmission = (student: User, attempt: StudentLabAttempt, challenge: LabChallenge) => {
    setViewingSubmission({ student, attempt, challenge });
    setShowSubmissionDialog(true);
  };

  const globalAdmins = useMemo(() => allUsers.filter(u => u.isAdmin), [allUsers]);
  
  const lecturerUnpaidClasses = useMemo(() => {
    if (!currentUser || !transactions) return [];
    const unpaidClassIds = new Set(
      transactions
        .filter(t => t.lecturerId === currentUser.id && !t.paid)
        .map(t => t.classId)
    );
    return classGroups.filter(cg => unpaidClassIds.has(cg.id));
  }, [currentUser, transactions, classGroups]);

  const unpaidClassesCount = lecturerUnpaidClasses.length;

  const paymentAmount = useMemo(() => {
    if (selectedClassesForPayment.length === 0) return 0;
    return transactions
      .filter(t => t.lecturerId === currentUser?.id && !t.paid && selectedClassesForPayment.includes(t.classId))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [selectedClassesForPayment, transactions, currentUser]);
  
  const handleApplyCoupon = () => {
    if (!paymentCouponCode) {
      setAppliedCouponInfo(null);
      toast({ title: t('noCouponInfo'), description: t('noCouponInfo'), variant: "default" });
      return;
    }
    const coupon = coupons.find(c =>
      c.code.toLowerCase() === paymentCouponCode.toLowerCase() &&
      c.isActive &&
      (!c.expiryDate || !isPast(new Date(c.expiryDate))) &&
      (c.maxUses === undefined || c.timesUsed < c.maxUses)
    );
    if (coupon) {
      let discountAmount = 0;
      if (coupon.discountType === 'fixed') {
        discountAmount = Math.min(paymentAmount, coupon.discountValue);
      } else { // percentage
        discountAmount = paymentAmount * (coupon.discountValue / 100);
      }
      setAppliedCouponInfo({ code: coupon.code, discountAmount });
      toast({ title: t('couponAppliedTitle'), description: t('couponAppliedDesc', { discount: discountAmount.toFixed(2) }) });
    } else {
      setAppliedCouponInfo(null);
      toast({ title: t('invalidCouponTitle'), description: t('invalidCouponDesc'), variant: "destructive" });
    }
  };

  useEffect(() => {
    let finalAmountCalc = paymentAmount - (appliedCouponInfo?.discountAmount || 0);
    setFinalPaymentAmount(Math.max(0, finalAmountCalc));
  }, [paymentAmount, appliedCouponInfo]);

  const handlePaymentSimulation = (method: 'promptpay' | 'paypal') => {
    const couponCodeToUse = appliedCouponInfo?.code;
    const isFullyDiscounted = finalPaymentAmount <= 0.009 && paymentAmount > 0;
  
    if (method === 'paypal') {
        if (isFullyDiscounted) {
            handleSimulatePayment(selectedClassesForPayment, couponCodeToUse);
            toast({ title: t('paymentWaivedTitle'), description: t('paymentWaivedDesc', { amount: paymentAmount.toFixed(2) }) });
            resetPaymentState();
        } else {
            const description = selectedClassesForPayment
                .map(id => classGroups.find(cg => cg.id === id)?.name || `Class ID ${id}`)
                .join(', ');
            
            const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent('binahmad.habib@gmail.com')}&item_name=${encodeURIComponent(`CodeCampus Payment for: ${description}`)}&amount=${finalPaymentAmount.toFixed(2)}&currency_code=THB`;
            
            window.open(paypalUrl, '_blank');
            confirmSimulatedPayment('PayPal');
        }
    } else if (method === 'promptpay') {
        if (isFullyDiscounted) {
            handleSimulatePayment(selectedClassesForPayment, couponCodeToUse);
            toast({ title: t('paymentWaivedTitle'), description: t('paymentWaivedDesc', { amount: paymentAmount.toFixed(2) }) });
            resetPaymentState();
        } else {
            setShowPaymentDialog(true);
        }
    }
  };

  const confirmSimulatedPayment = (method: string) => {
    const couponCodeToUse = appliedCouponInfo?.code;
    handleSimulatePayment(selectedClassesForPayment, couponCodeToUse);
    toast({ title: "Payment Confirmed", description: `Simulated payment of ฿${finalPaymentAmount.toFixed(2)} via ${method}.` });
    resetPaymentState();
  };
  
  const resetPaymentState = () => {
    setShowPaymentDialog(false);
    setShowPaypalDialog(false);
    setSelectedClassesForPayment([]);
    setPaymentCouponCode("");
    setAppliedCouponInfo(null);
  }

  const handlePaymentClassSelection = (classId: string, isChecked: boolean | string) => {
    setSelectedClassesForPayment(prev => {
        if (isChecked) {
            return [...prev, classId];
        } else {
            return prev.filter(id => id !== classId);
        }
    });
     setAppliedCouponInfo(null);
  };
  
  const selectedClassObjectsForPayment = useMemo(() => {
    return lecturerUnpaidClasses.filter(cg => selectedClassesForPayment.includes(cg.id));
  }, [selectedClassesForPayment, lecturerUnpaidClasses]);

  const transactionSummary = useMemo(() => {
    const now = new Date();
    const currentYear = getYear(now);
    const currentMonth = getMonth(now);

    let currentMonthRevenue = 0;
    let currentYearRevenue = 0;

    transactions.forEach(t => {
      if (t.paid) { // Only count paid transactions for revenue
        const transactionDate = new Date(t.timestamp);
        if(isValid(transactionDate)) {
          const revenueAmount = t.finalAmountPaid ?? t.amount; // Use final paid amount if available

          if (getYear(transactionDate) === currentYear) {
            currentYearRevenue += revenueAmount;
            if (getMonth(transactionDate) === currentMonth) {
              currentMonthRevenue += revenueAmount;
            }
          }
        }
      }
    });
    return { currentMonth: currentMonthRevenue, currentYear: currentYearRevenue };
  }, [transactions]);


  useEffect(() => {
    const defaultAliases: Record<string, string> = {};
    classGroups.forEach(cg => {
      if (cg.pendingJoinRequests) {
        cg.pendingJoinRequests.forEach(req => {
          if (!pendingRequestAliases[req.userId]) {
            defaultAliases[req.userId] = req.username; 
          }
        });
      }
    });
    if (Object.keys(defaultAliases).length > 0) {
      setPendingRequestAliases(prev => ({...prev, ...defaultAliases}));
    }
  }, [classGroups]);


  if (!currentUser || (currentUser.role !== 'lecturer' && !currentUser.isAdmin && currentUser.role !== 'institution_admin')) {
    return <Card><CardContent className="p-4"><p>{t('accessDenied')}</p></CardContent></Card>;
  }

  const managedClasses = classGroups.filter(cg => {
    if (currentUser.isAdmin) return true; 
    if (currentUser.institutionId === cg.institutionId) {
      if ((institutions.find(i=>i.id === currentUser.institutionId)?.adminUserIds || []).includes(currentUser.id)) return true;
      if (currentUser.role === 'lecturer' && cg.adminId === currentUser.id) return true;
    }
    return false;
  });

  const lecturerStats = useMemo(() => {
    if (!currentUser) return { totalStudents: 0, avgLearnScore: 0, avgLabScore: 0, totalExercisesCompleted: 0 };
    
    // Filter to get only classes owned by the current user
    const ownedClasses = managedClasses.filter(cg => cg.adminId === currentUser.id);

    let classesToSummarize = ownedClasses.filter(cg => cg.status === 'active');
    
    if (summarySelectedClassId !== 'all') {
      // If a specific class is selected, it must be an owned class to be considered.
      const selectedClass = ownedClasses.find(cg => cg.id === summarySelectedClassId);
      classesToSummarize = selectedClass ? [selectedClass] : [];
    }
    
    const studentSet = new Set<string>();
    classesToSummarize.forEach(cg => {
        (cg.members || []).forEach(member => {
            if(member.status === 'active') studentSet.add(member.userId)
        });
    });
    
    const students = Array.from(studentSet).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[];
    
    if (students.length === 0) {
        return { totalStudents: 0, avgLearnScore: 0, avgLabScore: 0, totalExercisesCompleted: 0 };
    }

    const viewableExercises = exercises.filter(ex => {
        if (!currentUser || !allUsers) return false;
        if (ex.scope === 'global') return true;
        if (ex.creatorId === currentUser.id) return true;
        if (ex.scope === 'institutional') {
            const creator = allUsers.find(u => u.id === ex.creatorId);
            return creator?.institutionId === currentUser.institutionId;
        }
        return false;
    });

    let totalLearnPoints = 0;
    let totalLabScore = 0;
    let totalExercisesCompleted = 0;

    students.forEach(student => {
        const studentLearnScore = (student.completedExercises || [])
            .filter(ce => viewableExercises.some(ve => ve.id === ce.exerciseId))
            .reduce((sum, ce) => {
                const exercise = viewableExercises.find(ve => ve.id === ce.exerciseId);
                return sum + (exercise?.points || 0);
            }, 0);
        
        totalLearnPoints += studentLearnScore;
        totalExercisesCompleted += (student.completedExercises || []).length;
      
        classesToSummarize.forEach(cg => {
            if ((cg.members || []).some(m => m.userId === student.id)) {
                (cg.assignedChallenges || []).forEach(ac => {
                    const progress = ac.studentProgress?.[student.id];
                    if (progress) {
                        totalLabScore += Object.values(progress).reduce((sum, attempt) => sum + (attempt.score || 0), 0);
                    }
                });
            }
        });
    });

    return {
      totalStudents: students.length,
      avgLearnScore: students.length > 0 ? totalLearnPoints / students.length : 0,
      avgLabScore: students.length > 0 ? totalLabScore / students.length : 0,
      totalExercisesCompleted,
    };
  }, [managedClasses, allUsers, currentUser, exercises, summarySelectedClassId]);

  const managedClassesSorted = [...managedClasses].sort((a, b) => {
    const statusOrder: Record<ClassGroup['status'], number> = { active: 0, pending: 1, finished: 2 };
    const aStatus = a.status || 'pending';
    const bStatus = b.status || 'pending';
    if (statusOrder[aStatus] !== statusOrder[bStatus]) {
      return (statusOrder[aStatus] ?? 3) - (statusOrder[bStatus] ?? 3);
    }
    return (b.startedAt || b.id).localeCompare(a.startedAt || a.id);
  });
  
  const activeAndPendingClasses = managedClassesSorted.filter(cg => cg.status !== 'finished');
  const finishedClasses = managedClassesSorted.filter(cg => cg.status === 'finished');

  const usersToDisplay = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.isAdmin) {
        return allUsers; // Global admin sees everyone
    }
    // Inst admin sees everyone in their institution, except global admins
    if (currentUser.role === 'institution_admin') {
        return allUsers.filter(u => u.institutionId === currentUser.institutionId && !u.isAdmin);
    }
    // For a regular lecturer, only show users in the classes they administer.
    if(currentUser.role === 'lecturer') {
        const studentIdsInManagedClasses = new Set<string>();
        classGroups
            .filter(cg => cg.adminId === currentUser.id)
            .forEach(cg => {
                (cg.members || []).forEach(m => studentIdsInManagedClasses.add(m.userId));
                (cg.pendingJoinRequests || []).forEach(req => studentIdsInManagedClasses.add(req.userId));
            });
        return allUsers.filter(u => studentIdsInManagedClasses.has(u.id));
    }
    return []; 
  }, [currentUser, allUsers, classGroups]);

  const renderClassCard = (cg: ClassGroup, isFinished: boolean) => {
    const institution = institutions.find(i => i.id === cg.institutionId);
    const instName = institution?.name || t('unknownInstitution');
    const pricePerStudent = institution?.pricePerStudent || 0;
    const canManageClass = currentUser.isAdmin || (currentUser.institutionId === cg.institutionId && (institutions.find(i=>i.id === currentUser.institutionId)?.adminUserIds || []).includes(currentUser.id)) || cg.adminId === currentUser.id;
    const isOwner = currentUser.id === cg.adminId;
    const classAdmin = allUsers.find(u => u.id === cg.adminId);
    
    const allStudentsForClass = (cg.members || []).map(m => {
        const user = allUsers.find(u => u.id === m.userId);
        return user ? { ...user, classMemberInfo: m } : null;
    }).filter(Boolean) as (User & { classMemberInfo: ClassGroup['members'][0] })[];

    const activeStudents = allStudentsForClass.filter(s => s.classMemberInfo.status === 'active');
    const removedStudents = allStudentsForClass.filter(s => s.classMemberInfo.status === 'removed');

    const isExpanded = explicitlyToggledClass === cg.id || (explicitlyToggledClass === null && cg.status === 'active');
    const hasUnpaidTransactions = transactions.some(t => t.classId === cg.id && !t.paid);
    const isEditingCapacity = editingCapacityClassId === cg.id;
    
    const assistanceRequestsForClassOpen = (cg.assistanceRequests || []).filter(r => r.status === 'open');
    const assistanceRequestsForClassClosed = (cg.assistanceRequests || []).filter(r => r.status === 'closed');
    const pendingJoinRequestCount = (cg.pendingJoinRequests || []).length;


    return (
      <Card key={cg.id} className={cn("overflow-hidden", cg.isHalted && "border-destructive/50 bg-destructive/5", isFinished && 'bg-muted/30')}>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/50 p-3 md:p-4 gap-2">
          <div className="flex-1 cursor-pointer" onClick={() => toggleExpandClass(cg.id)}>
            {editingClass?.id === cg.id ? (
               <div className="flex items-center gap-2">
                    <Input value={tempClassName} onChange={e => setTempClassName(e.target.value)} className="h-9" autoFocus />
                    <Button size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); submitEditClassName(cg.id); }}><Save size={16}/></Button>
                    <Button size="icon" variant="ghost" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); cancelEditClassName(); }}><X size={16}/></Button>
               </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-semibold">{cg.name}</h3>
                    {canManageClass && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); startEditClassName(cg); }}>
                            <Pencil size={14} />
                        </Button>
                    )}
                    <span className="text-sm font-normal text-muted-foreground ml-2">(฿{pricePerStudent.toFixed(2)}/{t('student')})</span>
                </div>
            )}
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="flex items-center gap-1">
                    {t('classCodeLabel')}: <strong className="text-primary select-all">{cg.classCode}</strong>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => {e.stopPropagation(); handleCopyClassCode(cg.classCode)}}><Copy size={12}/></Button>
                </span>
              <span>{t('institutionLabel')}: {instName}</span>
              {currentUser.isAdmin && (
                <span>{t('owner')}: <span className="font-semibold">{classAdmin ? classAdmin.fullName : t('unknownUser')}</span></span>
              )}
               <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t('capacity')}:</span>
                    {currentUser.isAdmin && isEditingCapacity ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={tempCapacity}
                          onChange={(e) => setTempCapacity(Number(e.target.value))}
                          className="h-7 w-20 text-xs"
                          autoFocus
                          onClick={e => e.stopPropagation()}
                        />
                        <Button size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleUpdateClassGroup({ ...cg, capacity: tempCapacity }); setEditingCapacityClassId(null); }}>
                            <Save size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditingCapacityClassId(null); }}>
                            <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold">{(cg.members || []).length} / {cg.capacity || 100}</span>
                    )}
                    {currentUser.isAdmin && !isEditingCapacity && (
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); setEditingCapacityClassId(cg.id); setTempCapacity(cg.capacity || 100); }}>
                            <Pencil size={12}/>
                        </Button>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={cg.status === 'active' ? 'default' : cg.status === 'finished' ? 'secondary' : 'outline'} className="capitalize text-xs">
                {t('statusLabel')}: {getLocalizedText(cg.status)}
              </Badge>
              {assistanceRequestsForClassOpen.length > 0 && (
                <Badge variant="destructive" className="relative">
                  <MessageSquare size={12} className="mr-1"/>
                  {assistanceRequestsForClassOpen.length} {t('assistanceRequests.openRequestsShort')}
                </Badge>
              )}
               {pendingJoinRequestCount > 0 && (
                <Badge variant="info" className="relative bg-blue-500 text-white hover:bg-blue-500/80">
                  <Bell size={12} className="mr-1"/>
                  {pendingJoinRequestCount} Pending Request(s)
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap self-start sm:self-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <Settings size={16}/>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleUpdateClassStatus(cg.id, 'active')} disabled={cg.status === 'active'}>{t('setToActive')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateClassStatus(cg.id, 'pending')} disabled={cg.status === 'pending'}>{t('setToPending')}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleUpdateClassStatus(cg.id, 'finished')} disabled={cg.status === 'finished'}>{t('setToFinished')}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-9 w-9" onClick={(e) => { e.stopPropagation(); toggleExpandClass(cg.id); }}>
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
              </Button>
          </div>
        </CardHeader>
        {isExpanded && (
        <CardContent className="p-3 pt-2 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
                 {canManageClass && (
                    <>
                        <Button size="sm" variant="outline" onClick={() => openManageExercisesModal(cg)}><BookOpen size={14} className="mr-1"/> {t('manageExercises')}</Button>
                        <Button size="sm" variant="outline" onClick={() => openLabManagementDialog(cg.id)}>
                            <ListTree size={14} className="mr-1"/> {t('manageLabs')}
                        </Button>
                        <div className="flex items-center gap-2 ml-auto">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div tabIndex={0} className={cn(hasUnpaidTransactions && "cursor-not-allowed")}>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm" disabled={hasUnpaidTransactions} >
                                                        <Trash2 size={14} className="mr-1" /> {t('delete')}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>{t('areYouSure')}</AlertDialogTitle><ModalDescription>{t('deleteClassDesc', { class: cg.name })}</ModalDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeleteClassGroup(cg.id)}>{t('confirmDelete')}</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TooltipTrigger>
                                    {hasUnpaidTransactions && (
                                    <TooltipContent>
                                        <p>{t('deleteClassWithUnpaidError')}</p>
                                    </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </>
                 )}
            </div>
             <div className="mt-4 p-3 border rounded-md">
                <h4 className="font-semibold text-base mb-2 flex items-center gap-2"><MessageSquare className="h-5 w-5 text-primary"/> Public Class Chat</h4>
                <div className="space-y-2">
                    <ScrollArea className="h-40 w-full rounded-md border p-2">
                        {(cg.publicChatMessages || []).length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center italic">No messages yet. Be the first to say something!</p>
                        ) : (
                            (cg.publicChatMessages || []).map(msg => (
                                <div key={msg.id} className={cn("mb-2 flex", msg.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                    <div className="flex flex-col max-w-[80%]">
                                        <span className={cn("text-[10px] text-muted-foreground px-1", msg.senderId === currentUser.id ? "text-right" : "text-left")}>{msg.senderName}</span>
                                        <div className={cn("rounded-lg px-3 py-2 text-sm", msg.senderId === currentUser.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                            {msg.text}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </ScrollArea>
                    <div className="flex items-center gap-2">
                        <Input 
                            placeholder="Type a public message..."
                            value={publicChatMessage}
                            onChange={(e) => setPublicChatMessage(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && publicChatMessage.trim()) {
                                    handleSendPublicChatMessage(cg.id, publicChatMessage.trim());
                                    setPublicChatMessage('');
                                }
                            }}/>
                        <Button 
                            onClick={() => {
                                if (publicChatMessage.trim()) {
                                    handleSendPublicChatMessage(cg.id, publicChatMessage.trim());
                                    setPublicChatMessage('');
                                }
                            }}
                            disabled={!publicChatMessage.trim()}
                        >
                            <Send size={16}/>
                        </Button>
                    </div>
                </div>
            </div>
            {(assistanceRequestsForClassOpen.length > 0 || assistanceRequestsForClassClosed.length > 0) && (
              <Accordion type="single" collapsible className="w-full mt-2" defaultValue="open-requests">
                  {assistanceRequestsForClassOpen.length > 0 && (
                      <AccordionItem value="open-requests">
                          <AccordionTrigger className="text-sm font-semibold text-destructive">
                             <div className="flex items-center gap-2">
                                  <MessageSquare size={14} /> {t('assistanceRequests.openRequests', {count: assistanceRequestsForClassOpen.length})}
                             </div>
                          </AccordionTrigger>
                          <AccordionContent>
                             <div className="space-y-2">
                              {assistanceRequestsForClassOpen.map(req => (
                                  <div key={req.id} className="p-2 border rounded-md flex justify-between items-center">
                                      <p className="text-sm">{req.studentName}: "{req.problemContext.substring(0, 50)}..."</p>
                                      <Button size="sm" variant="outline" onClick={() => setViewingAssistanceRequest(req)}>
                                          {t('assistanceRequests.openChat')}
                                      </Button>
                                  </div>
                              ))}
                             </div>
                          </AccordionContent>
                      </AccordionItem>
                  )}
                  {assistanceRequestsForClassClosed.length > 0 && (
                      <AccordionItem value="closed-requests">
                          <AccordionTrigger className="text-sm font-semibold text-muted-foreground">
                              <div className="flex items-center gap-2">
                                  <History size={14} /> {t('assistanceRequests.closedRequests', {count: assistanceRequestsForClassClosed.length})}
                              </div>
                          </AccordionTrigger>
                          <AccordionContent>
                             <div className="space-y-2">
                              {assistanceRequestsForClassClosed.map(req => (
                                  <div key={req.id} className="p-2 border rounded-md flex justify-between items-center bg-muted/50">
                                      <p className="text-sm text-muted-foreground">{req.studentName}: "{req.problemContext.substring(0, 50)}..."</p>
                                      <Button size="sm" variant="secondary" onClick={() => setViewingAssistanceRequest(req)}>
                                          {t('assistanceRequests.viewHistory')}
                                      </Button>
                                  </div>
                              ))}
                             </div>
                          </AccordionContent>
                      </AccordionItem>
                  )}
              </Accordion>
            )}

            {isOwner && (cg.pendingJoinRequests || []).length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h4 className="font-semibold mb-2 text-md">{t('pendingJoinRequests')} ({(cg.pendingJoinRequests || []).length})</h4>
              <ul className="divide-y divide-border rounded-md border bg-background">
                {cg.pendingJoinRequests.map(req => (
                  <li key={req.userId} className="p-2 gap-2 hover:bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{req.fullName} <span className="text-xs text-muted-foreground">(Username: {req.username} / No: {req.no} / SID: {req.studentId} / Email: {req.userEmail})</span></p>
                      <div className="flex flex-col sm:flex-row gap-2 mt-1">
                        <Input
                          value={pendingRequestAliases[req.userId] || req.username}
                          onChange={(e) => setPendingRequestAliases(prev => ({...prev, [req.userId]: e.target.value}))}
                          placeholder={t('setAliasPlaceholder')}
                          className="h-8 text-sm flex-grow"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center mt-1 sm:mt-0">
                      <Button size="sm" variant="outline" onClick={() => handleApproveJoinRequest(cg.id, req.userId, pendingRequestAliases[req.userId] || req.username)} disabled={(!isOwner) || (!(pendingRequestAliases[req.userId] || req.username).trim()) || cg.status !== 'active' || (cg.members || []).length >= (cg.capacity || 100)} className="h-9">
                        <UserCheck className="md:hidden h-4 w-4"/>
                        <span className="hidden md:inline"><UserCheck className="mr-1 h-4 w-4"/>{t('approve')}</span>
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDenyJoinRequest(cg.id, req.userId)} disabled={!isOwner} className="h-9">
                        <X className="md:hidden h-4 w-4"/>
                        <span className="hidden md:inline"><X className="mr-1 h-4 w-4"/>{t('deny')}</span>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            )}
             
            {activeStudents.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-md">{t('enrolledStudents')} ({activeStudents.length})</h4>
                    <ScrollArea className="h-48">
                    <ul className="divide-y divide-border rounded-md border">
                        {activeStudents.map(student => (
                        <li key={student.id} className="p-2 gap-2 hover:bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                            <div className="flex-1">
                                {editingAliasClassId === cg.id && editingAliasStudentId === student.id ? (
                                    <div className="flex items-center gap-2">
                                        <Input value={currentEditAliasValue} onChange={e => setCurrentEditAliasValue(e.target.value)} autoFocus className="h-8"/>
                                        <Button size="icon" variant="ghost" onClick={submitEditAlias} className="h-8 w-8"><Save size={14}/></Button>
                                        <Button size="icon" variant="ghost" onClick={cancelEditAlias} className="h-8 w-8"><X size={14}/></Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <p className="font-medium text-sm">{(cg.members || []).find(m => m.userId === student.id)?.alias}</p>
                                        {cg.status !== 'finished' && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEditAlias(cg.id, student.id, (cg.members || []).find(m => m.userId === student.id)?.alias || '')}><Pencil size={12}/></Button>
                                        )}
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">(Username: {student.username} / SID: {student.studentId})</p>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-center mt-1 sm:mt-0">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild><Button size="sm" variant="destructive_outline" className="h-9"><UserMinus className="md:hidden h-4 w-4"/><span className="hidden md:inline"><UserMinus className="mr-1 h-4 w-4"/>{t('remove')}</span></Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>{t('removeStudentConfirmTitle', { student: student.fullName })}</AlertDialogTitle><ModalDescription>{t('removeStudentConfirmDesc', { class: cg.name })}</ModalDescription></AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveStudentFromClass(cg.id, student.id)}>{t('confirmRemove')}</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </li>
                        ))}
                    </ul>
                    </ScrollArea>
                </div>
            )}
            
            {removedStudents.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-2">
                    <AccordionItem value="removed-students">
                        <AccordionTrigger className="text-sm font-semibold">{t('removedStudents')} ({removedStudents.length})</AccordionTrigger>
                        <AccordionContent>
                           <ScrollArea className="h-40">
                            <ul className="divide-y divide-border rounded-md border">
                                {removedStudents.map(student => (
                                <li key={student.id} className="p-2 gap-2 hover:bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center justify-between">
                                    <p className="font-medium text-sm text-muted-foreground">{(cg.members || []).find(m => m.userId === student.id)?.alias} <span className="text-xs">({student.username})</span></p>
                                    <Button size="sm" variant="outline" onClick={() => handleReactivateStudentInClass(cg.id, student.id)}>{t('reactivate')}</Button>
                                </li>
                                ))}
                            </ul>
                           </ScrollArea>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </CardContent>
        )}
      </Card>
    );
  }

  const assignableLabs = useMemo(() => {
    return labs.filter(l => {
        if (!l.isTemplate || !currentUser || !allUsers) return false;
        const creator = allUsers.find(u => u.id === l.creatorId);
        // Rule: A lab is assignable if it's global, or if it's institutional and the current user is in that institution, or if the user created it.
        if (l.scope === 'global') return true;
        if (l.scope === 'institutional' && creator?.institutionId === currentUser.institutionId) return true;
        if (l.creatorId === currentUser.id) return true;
        return false;
    });
  }, [labs, currentUser, allUsers]);
  
  const openSupportRequests = (adminSupportRequests || []).filter(req => req.status === 'open');
  const closedSupportRequests = (adminSupportRequests || []).filter(req => req.status === 'closed');

  const allPendingRequests = useMemo(() => {
    return managedClasses.flatMap(cg => 
        (cg.pendingJoinRequests || []).map(req => ({...req, className: cg.name}))
    );
  }, [managedClasses]);


  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
                <CardTitle className="text-2xl flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> {t('lecturerGlobalSummaryTitle')}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-1">{t('lecturerGlobalSummaryDesc')}</CardDescription>
            </div>
            <div className="w-full sm:w-auto mt-2 sm:mt-0">
                <Select value={summarySelectedClassId} onValueChange={setSummarySelectedClassId}>
                    <SelectTrigger className="w-full sm:w-[280px]">
                        <SelectValue placeholder="Select a class to summarize..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Active Classes</SelectItem>
                        {managedClasses.filter(cg => cg.adminId === currentUser?.id).map(cg => (
                            <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Card className="p-3">
                    <h3 className="text-xs font-medium text-muted-foreground">{t('totalStudentsTaught')}</h3>
                    <p className="text-lg font-bold text-foreground">{lecturerStats.totalStudents}</p>
                </Card>
                <Card className="p-3">
                    <h3 className="text-xs font-medium text-muted-foreground">{t('overallAvgScore')}</h3>
                    <p className="text-lg font-bold text-foreground">{lecturerStats.avgLearnScore.toFixed(2)} pts</p>
                </Card>
                 <Card className="p-3">
                    <h3 className="text-xs font-medium text-muted-foreground">{t('overallAvgLabScore')}</h3>
                    <p className="text-lg font-bold text-foreground">{lecturerStats.avgLabScore.toFixed(2)} pts</p>
                </Card>
                <Card className="p-3">
                    <h3 className="text-xs font-medium text-muted-foreground">{t('totalExercisesDone')}</h3>
                    <p className="text-lg font-bold text-foreground">{lecturerStats.totalExercisesCompleted}</p>
                </Card>
            </div>
        </CardContent>
      </Card>
      
      <div className="md:hidden mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full flex items-center justify-between h-10 py-0 text-base">
              <div className="flex items-center">
                {activeLecturerTabInfo && <activeLecturerTabInfo.Icon className="mr-2 h-5 w-5" />}
                <span>{activeLecturerTabInfo?.label}</span>
              </div>
              <ChevronDown className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width]">
            {lecturerTabs.map((tab) => (
              <DropdownMenuItem key={tab.value} onClick={() => setActiveLecturerTab(tab.value)} className="h-10 py-0 items-center text-base">
                <tab.Icon className="mr-2 h-5 w-5" /> {tab.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Tabs value={activeLecturerTab} onValueChange={setActiveLecturerTab} className="w-full">
        <TabsList className="hidden md:grid w-full grid-cols-4">
          {lecturerTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.Icon className="mr-2 h-4 w-4"/> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="classes" className="mt-6 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><PlusCircle className="h-6 w-6 text-primary" /> {t('createNewClassTitle')}</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">{t('createNewClassDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {unpaidClassesCount >= 3 ? (
                        <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <UIDialogAlertTitle>{t('classCreationDisabledTitle')}</UIDialogAlertTitle>
                        <UIDialogAlertDescription>
                            {t('classCreationDisabledDesc', { count: unpaidClassesCount })}
                        </UIDialogAlertDescription>
                        </Alert>
                    ) : (
                    <form onSubmit={handleCreateClassSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="flex-grow w-full sm:w-auto">
                        <Label htmlFor="new-class-name">{t('classNameLabel')}</Label>
                        <Input id="new-class-name" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder={t('classNamePlaceholder')} />
                        </div>
                        <Button type="submit" size="sm" className="w-full sm:w-auto">
                        <PlusCircle className="md:hidden h-4 w-4" />
                        <span className="hidden md:inline">{t('createClassButton')}</span>
                        </Button>
                    </form>
                    )}
                </CardContent>
            </Card>

            {allPendingRequests.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2"><Bell className="h-6 w-6 text-primary" /> {t('pendingJoinRequests')}</CardTitle>
                        <CardDescription>{t('approveStudentsPrompt')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('student')}</TableHead>
                                    <TableHead>{t('class')}</TableHead>
                                    <TableHead>{t('alias')}</TableHead>
                                    <TableHead className="text-right">{t('actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allPendingRequests.map(req => {
                                    const classGroup = managedClasses.find(cg => cg.id === req.classId);
                                    if (!classGroup) return null;
                                    const isOwner = currentUser.id === classGroup.adminId;
                                    return (
                                        <TableRow key={`${req.classId}-${req.userId}`}>
                                            <TableCell>
                                                <div className="font-medium">{req.fullName}</div>
                                                <div className="text-xs text-muted-foreground">ID: {req.studentId}</div>
                                            </TableCell>
                                            <TableCell>{req.className}</TableCell>
                                            <TableCell>
                                                <Input
                                                  value={pendingRequestAliases[req.userId] || req.username}
                                                  onChange={(e) => setPendingRequestAliases(prev => ({...prev, [req.userId]: e.target.value}))}
                                                  placeholder={t('setAliasPlaceholder')}
                                                  className="h-8 text-sm"
                                                  disabled={!isOwner}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isOwner ? (
                                                <>
                                                <Button size="xs" variant="outline" className="mr-1" onClick={() => handleApproveJoinRequest(req.classId, req.userId, pendingRequestAliases[req.userId] || req.username)} disabled={(!(pendingRequestAliases[req.userId] || req.username).trim()) || classGroup.status !== 'active' || (classGroup.members || []).length >= (classGroup.capacity || 100)}>
                                                    {t('approve')}
                                                </Button>
                                                <Button size="xs" variant="destructive_outline" onClick={() => handleDenyJoinRequest(req.classId, req.userId)}>
                                                    {t('deny')}
                                                </Button>
                                                </>
                                                ) : (
                                                    <Badge variant="outline">Owner Only</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                 </Card>
            )}

            {activeAndPendingClasses.length === 0 && finishedClasses.length === 0 && allPendingRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">{t('noClassesYet')}</p>
            ) : (
                <div className="space-y-4">
                {activeAndPendingClasses.map((cg) => renderClassCard(cg, false))}
                </div>
            )}

            {finishedClasses.length > 0 && (
                <Card>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="finished-classes" className="border-b-0">
                    <AccordionTrigger className="p-4 hover:no-underline">
                        <CardTitle className="text-xl flex items-center gap-2 text-muted-foreground">
                            <CheckSquare className="h-6 w-6" /> {t('finishedClasses')} ({finishedClasses.length})
                        </CardTitle>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 pt-0">
                        <div className="space-y-4">
                            {finishedClasses.map((cg) => renderClassCard(cg, true))}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>
                </Card>
            )}
        </TabsContent>
        
        <TabsContent value="users" className="mt-6">
            <Card>
                <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" /> {t('manageUsersTitle')}</CardTitle>
                <CardDescription>{t('manageUsersDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                {usersToDisplay.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">{t('noUsersToDisplay')}</p>
                ) : (
                    <Accordion type="multiple" className="w-full space-y-2">
                    {institutions.map(inst => {
                        const institutionUsers = usersToDisplay.filter(u => u.institutionId === inst.id);
                        if (institutionUsers.length === 0) return null;
                        return (
                        <AccordionItem value={inst.id} key={inst.id} className="border rounded-md px-2">
                            <AccordionTrigger className="hover:no-underline">
                            <div className="flex flex-col items-start text-left">
                                <p className="font-semibold text-primary">{inst.name}</p>
                                <p className="text-xs text-muted-foreground">{t('userCount', { count: institutionUsers.length })}</p>
                            </div>
                            </AccordionTrigger>
                            <AccordionContent>
                            <ScrollArea className="h-96">
                                <Table>
                                <TableHeader>
                                    <TableRow>
                                    <TableHead>{t('fullNameLabel')}</TableHead>
                                    <TableHead>{t('role')}</TableHead>
                                    <TableHead>{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {institutionUsers.map(user => {
                                    const availableRoles = ['normal', 'student', 'lecturer', 'institution_admin'];
                                    const canEditUser = currentUser.isAdmin || (currentUser.role === 'institution_admin' && !user.isAdmin && user.institutionId === currentUser.institutionId);
                                    return (
                                        <TableRow key={user.id}>
                                        <TableCell>
                                            <p className="font-medium">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{user.username}</p>
                                        </TableCell>
                                        <TableCell>
                                            <Select onValueChange={(newRole) => handleRoleSelectionChange(user.id, newRole as User['role'])} defaultValue={user.role} disabled={!canEditUser}>
                                            <SelectTrigger className="w-[180px]"><SelectValue placeholder={t('selectRolePlaceholder')} /></SelectTrigger>
                                            <SelectContent>
                                                {availableRoles.map(role => <SelectItem key={role} value={role} className="capitalize">{getLocalizedText(role)}</SelectItem>)}
                                            </SelectContent>
                                            </Select>
                                            {user.isAdmin && <Badge variant="destructive" className="mt-1">{t('globalAdmin')}</Badge>}
                                        </TableCell>
                                        <TableCell className="space-x-1">
                                            <Button size="sm" variant="secondary" onClick={() => submitUserRoleChange(user.id)} disabled={!userRoleChanges[user.id] || userRoleChanges[user.id] === user.role || !canEditUser}>{t('save')}</Button>
                                            <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="sm" variant="outline" disabled={!canEditUser}><KeyRound size={14} /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>{t('resetPasswordTitle')}</AlertDialogTitle><ModalDescription>{t('resetPasswordDesc', { user: user.fullName })}</ModalDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => confirmAdminPasswordReset(user.id)}>{t('confirmReset')}</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                            <AlertDialog>
                                            <AlertDialogTrigger asChild><Button size="sm" variant="destructive" disabled={!canEditUser}><Trash2 size={14} /></Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader><AlertDialogTitle>{t('deleteUserTitle')}</AlertDialogTitle><ModalDescription>{t('deleteUserDesc', { user: user.fullName, username: user.username })}</ModalDescription></AlertDialogHeader>
                                                <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => confirmAdminDeleteUser(user.id)}>{t('confirmDelete')}</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                            </AlertDialog>
                                            {currentUser.isAdmin && user.username.toLowerCase() !== 'admin' && (user.role === 'lecturer' || user.role === 'institution_admin') && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button variant={user.isAdmin ? 'default' : 'outline'} size="sm" onClick={() => handleToggleAdminStatus(user.id)}><ShieldCheck size={14} /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent><p>{t('toggleGlobalAdmin')}</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            )}
                                        </TableCell>
                                        </TableRow>
                                    );
                                    })}
                                </TableBody>
                                </Table>
                            </ScrollArea>
                            </AccordionContent>
                        </AccordionItem>
                        );
                    })}
                    </Accordion>
                )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6 space-y-6">
             {!currentUser.isAdmin && (
                <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Banknote className="h-6 w-6 text-primary"/>{t('myBillingsTitle')}</CardTitle>
                    <CardDescription>{t('myBillingsDesc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                    <Label>{t('outstandingBalance')}</Label>
                    <p className="text-3xl font-bold">฿{(currentUser.billingBalance || 0).toFixed(2)}</p>
                    </div>
                    <div>
                    <Label className="mb-2 block">{t('selectClassesToPay')}</Label>
                    <ScrollArea className="h-40 border rounded-md p-2">
                        {lecturerUnpaidClasses.length > 0 ? lecturerUnpaidClasses.map(cg => {
                            const unpaidAmount = transactions
                            .filter(t => t.classId === cg.id && !t.paid)
                            .reduce((sum, t) => sum + t.amount, 0);
                            return (
                            <div key={cg.id} className="flex items-center space-x-2 p-1">
                                <Checkbox id={`pay-class-${cg.id}`} onCheckedChange={(checked) => handlePaymentClassSelection(cg.id, String(checked))} />
                                <label htmlFor={`pay-class-${cg.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                                {cg.name} <span className="text-muted-foreground">(฿{unpaidAmount.toFixed(2)})</span>
                                </label>
                            </div>
                            );
                        }) : (
                        <p className="text-sm text-muted-foreground text-center p-4">{t('noUnpaidClasses')}</p>
                        )}
                    </ScrollArea>
                    </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <div className="w-full space-y-2">
                        <Label htmlFor="payment-coupon-input">{t('applyCoupon')}</Label>
                        <div className="flex gap-2">
                        <Input
                            id="payment-coupon-input"
                            value={paymentCouponCode}
                            onChange={(e) => {
                            setPaymentCouponCode(e.target.value.toUpperCase());
                            setAppliedCouponInfo(null);
                            }}
                            placeholder={t('enterCodePlaceholder')}
                            disabled={paymentAmount <= 0}
                        />
                        <Button onClick={handleApplyCoupon} disabled={paymentAmount <= 0 || !paymentCouponCode}>{t('apply')}</Button>
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <div className="w-full space-y-1 text-sm">
                        <div className="flex justify-between">
                        <span>{t('subtotal')}:</span>
                        <span>฿{paymentAmount.toFixed(2)}</span>
                        </div>
                        {appliedCouponInfo && (
                        <div className="flex justify-between text-destructive">
                            <span>{t('discount')} ({appliedCouponInfo.code}):</span>
                            <span>-฿{appliedCouponInfo.discountAmount.toFixed(2)}</span>
                        </div>
                        )}
                        <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                        <span>{t('total')}:</span>
                        <span>฿{finalPaymentAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                        <Button onClick={() => handlePaymentSimulation('promptpay')} disabled={paymentAmount <= 0} className="w-full">
                           <QrCode className="mr-2 h-4 w-4"/> Pay with PromptPay
                        </Button>
                         <Button onClick={() => handlePaymentSimulation('paypal')} disabled={paymentAmount <= 0} className="w-full bg-[#00457C] hover:bg-[#003057]">
                            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#009cde" d="M3.3,13.8L3.3,13.8c0.1-0.2,0.1-0.3,0.2-0.5c0.1-0.1,0.1-0.2,0.2-0.3l0.1-0.1c0.1-0.1,0.1-0.2,0.2-0.3c0-0.1,0.1-0.1,0.1-0.2c0.2-0.2,0.3-0.3,0.5-0.5l0.1-0.1c0.1-0.1,0.2-0.2,0.3-0.2c0.3-0.3,0.5-0.5,0.8-0.7c0.1-0.1,0.1-0.1,0.2-0.2c0.1-0.1,0.2-0.1,0.2-0.2c0.1-0.1,0.2-0.2,0.3-0.2l0.2-0.2c0.2-0.1,0.3-0.2,0.5-0.3c0-0.1,0.1-0.1,0.1-0.2c0.1-0.1,0.1-0.1,0.2-0.1l0,0c0.1-0.1,0.2-0.1,0.3-0.2c0.1-0.1,0.2-0.1,0.3-0.2C9.5,8.1,10.1,8,10.7,8h6.8c1.3,0,2.5,0.4,3.4,1.1c0.5,0.4,0.8,0.8,1.1,1.4c0.2,0.4,0.3,0.8,0.4,1.2c0,0.4-0.1,0.9-0.2,1.3c-0.1,0.4-0.3,0.8-0.5,1.1c-0.2,0.3-0.5,0.6-0.8,0.8c-0.3,0.2-0.7,0.4-1.1,0.5c-0.4,0.1-0.8,0.2-1.2,0.2h-1.6l-1,6.5l-0.2,1.3c0,0,0,0.1,0,0.1c0,0.1-0.1,0.2-0.2,0.2h-2c-0.1,0-0.2-0.1-0.2-0.2l1.6-10.4h-2l-2.1,8.9c0,0.1,0,0.2-0.1,0.3c0,0.1-0.1,0.1-0.2,0.1h-2c-0.2,0-0.3-0.1-0.3-0.3c-0.2-0.7-0.3-1.4-0.5-2C6.9,19.2,6,17.4,5.4,16c-0.1-0.2-0.2-0.5-0.3-0.7c-0.1-0.2-0.2-0.4-0.2-0.6C4.6,14.4,3.3,13.8,3.3,13.8z M11,10.3l1.9-8C13,2.2,12.9,2.1,12.8,2H6.3C6.2,2,6.1,2.1,6.1,2.1C6,2.2,6,2.3,6,2.4l3.1,12.8c0,0.1,0.1,0.2,0.2,0.2h2.2c0.1,0,0.2-0.1,0.2-0.2L11,10.3z M21.4,12.4c-0.2-1-0.8-1.8-1.6-2.4c-0.8-0.5-1.7-0.8-2.7-0.8h-4.9l1.4-5.8c0-0.1,0.1-0.1,0.2-0.1h4.9c1.4,0,2.7,0.5,3.6,1.4c0.9,0.9,1.4,2.2,1.4,3.5c0,1-0.3,2-0.8,2.9C22.4,11.5,21.9,12,21.4,12.4z"></path></svg>
                           Pay with PayPal
                        </Button>
                    </div>
                </CardFooter>
                </Card>
            )}

            {currentUser.isAdmin && (
                <>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2"><Gem className="h-6 w-6 text-primary" /> {t('allBillsTitle')}</CardTitle>
                        <CardDescription>{t('allBillsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 mb-6">
                        <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('thisMonthRevenue')}</CardTitle>
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">฿{transactionSummary.currentMonth.toFixed(2)}</div>
                        </CardContent>
                        </Card>
                        <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{t('thisYearRevenue')}</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">฿{transactionSummary.currentYear.toFixed(2)}</div>
                        </CardContent>
                        </Card>
                    </div>
                    {transactions.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">{t('noTransactions')}</p>
                    ) : (
                        <ScrollArea className="h-96">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead>{t('date')}</TableHead>
                                <TableHead>{t('lecturer')}</TableHead>
                                <TableHead>{t('student')}</TableHead>
                                <TableHead>{t('class')}</TableHead>
                                <TableHead>{t('amountPaid')}</TableHead>
                                <TableHead>{t('coupon')}</TableHead>
                                <TableHead>{t('statusLabel')}</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {transactions.map(transaction => {
                                const lecturer = allUsers.find(u => u.id === transaction.lecturerId);
                                const student = allUsers.find(u => u.id === transaction.studentId);
                                const classGroup = classGroups.find(c => c.id === transaction.classId);
                                return (
                                <TableRow key={transaction.id}>
                                    <TableCell className="text-xs">{format(new Date(transaction.timestamp), 'PPp', { locale: language === 'th' ? th : enUS })}</TableCell>
                                    <TableCell>{lecturer?.fullName || transaction.lecturerId}</TableCell>
                                    <TableCell>{student?.fullName || transaction.studentId}</TableCell>
                                    <TableCell>{classGroup?.name || transaction.classId}</TableCell>
                                    <TableCell>
                                    {transaction.paid && typeof transaction.finalAmountPaid === 'number' && transaction.finalAmountPaid !== transaction.amount ? (
                                        <span>
                                        ฿{transaction.finalAmountPaid.toFixed(2)}
                                        <span className="text-xs text-muted-foreground ml-1">({t('was')} ฿{transaction.amount.toFixed(2)})</span>
                                        </span>
                                    ) : (
                                        `฿${transaction.amount.toFixed(2)}`
                                    )}
                                    </TableCell>
                                    <TableCell>{transaction.couponUsed || 'N/A'}</TableCell>
                                    <TableCell>
                                    <Badge variant={transaction.paid ? 'default' : 'destructive'} className={transaction.paid ? 'bg-green-600' : ''}>
                                        {transaction.paid ? t('paid') : t('unpaid')}
                                    </Badge>
                                    </TableCell>
                                </TableRow>
                                );
                            })}
                            </TableBody>
                        </Table>
                        </ScrollArea>
                    )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2"><Ticket className="h-6 w-6 text-primary" /> {t('manageCouponsTitle')}</CardTitle>
                        <CardDescription>{t('manageCouponsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button size="sm" onClick={() => openCouponDialog()}>{t('createCouponButton')}</Button>
                        <div className="mt-4 space-y-2">
                            {coupons.map(coupon => (
                            <div key={coupon.id} className="p-2 border rounded-md flex justify-between items-center">
                                <div>
                                <p className="font-semibold">{coupon.code} <Badge variant={coupon.isActive ? 'default' : 'outline'}>{coupon.isActive ? t('active') : t('inactive')}</Badge></p>
                                <p className="text-xs text-muted-foreground">
                                    {coupon.discountType === 'percentage' ? `${coupon.discountValue}% off` : `฿${coupon.discountValue} off`}
                                    {coupon.maxUses && ` | ${t('used')} ${coupon.timesUsed}/${coupon.maxUses}`}
                                </p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => openCouponDialog(coupon)}>{t('edit')}</Button>
                            </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
                </>
            )}
        </TabsContent>

        <TabsContent value="system" className="mt-6 space-y-6">
             {currentUser.isAdmin && (
                <Card>
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2"><Building className="h-6 w-6 text-primary"/>{t('manageInstitutionsTitle')}</CardTitle>
                    <CardDescription>{t('manageInstitutionsDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Form to add new institution */}
                    <form onSubmit={(e) => { e.preventDefault(); handleAddInstitution(newInstitutionName, newInstitutionPrice); setNewInstitutionName(''); setNewInstitutionPrice(5); }} className="flex flex-col sm:flex-row gap-4 mb-4 p-4 border rounded-lg">
                        <div className="flex-grow">
                            <Label htmlFor="new-inst-name">{t('newInstitutionName')}</Label>
                            <Input id="new-inst-name" value={newInstitutionName} onChange={e => setNewInstitutionName(e.target.value)} required />
                        </div>
                        <div className="w-full sm:w-40">
                            <Label htmlFor="new-inst-price">{t('pricePerStudent')}</Label>
                            <Input id="new-inst-price" type="number" value={newInstitutionPrice} onChange={e => setNewInstitutionPrice(Number(e.target.value))} required />
                        </div>
                        <div className="self-end flex gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowMergeDialog(true)}><Merge className="mr-2 h-4 w-4"/> Merge</Button>
                            <Button type="submit">{t('addInstitutionButton')}</Button>
                        </div>
                    </form>
                    <Accordion type="multiple" className="w-full space-y-2">
                    {institutions.map(inst => (
                        <AccordionItem value={inst.id} key={inst.id} className="border rounded-md px-2">
                            <AccordionTrigger>
                                <div>
                                <p className="font-semibold text-left">{inst.name}</p>
                                <p className="text-xs text-muted-foreground text-left">{t('pricePerStudent')}: ฿{inst.pricePerStudent.toFixed(2)} | {t('admins')}: {(inst.adminUserIds || []).length}</p>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                            <div className="flex flex-col gap-4">
                                {/* Edit Institution Name/Price */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="flex-grow">
                                    <Label>{t('name')}</Label>
                                    <Input value={editingInstitution?.id === inst.id ? tempInstitutionName : inst.name} onChange={e => setTempInstitutionName(e.target.value)} onFocus={() => {if(editingInstitution?.id !== inst.id){setEditingInstitution(inst); setTempInstitutionName(inst.name); setTempInstitutionPrice(inst.pricePerStudent)}}} />
                                    </div>
                                    <div className="w-full sm:w-32">
                                    <Label>{t('price')}</Label>
                                    <Input type="number" value={editingInstitution?.id === inst.id ? tempInstitutionPrice : inst.pricePerStudent} onChange={e => setTempInstitutionPrice(Number(e.target.value))} onFocus={() => {if(editingInstitution?.id !== inst.id){setEditingInstitution(inst); setTempInstitutionName(inst.name); setTempInstitutionPrice(inst.pricePerStudent)}}} />
                                    </div>
                                    {editingInstitution?.id === inst.id && (
                                    <div className="flex self-end gap-1">
                                        <Button size="sm" onClick={() => { if(editingInstitution) handleUpdateInstitution({ ...editingInstitution, name: tempInstitutionName, pricePerStudent: tempInstitutionPrice }); setEditingInstitution(null); }}>{t('save')}</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingInstitution(null)}>{t('cancelButton')}</Button>
                                    </div>
                                    )}
                                </div>
                                <Separator />
                                {/* Manage Admins */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">{t('institutionAdmins')}</h4>
                                    <div className="space-y-2">
                                    {(inst.adminUserIds || []).length > 0 ? inst.adminUserIds.map(adminId => {
                                        const adminUser = allUsers.find(u => u.id === adminId);
                                        return (
                                        <div key={adminId} className="flex justify-between items-center p-1.5 bg-muted/50 rounded-md text-sm">
                                            <span>{adminUser?.fullName || t('unknownUser')} ({adminUser?.username})</span>
                                            <Button size="xs" variant="destructive_outline" onClick={() => handleAssignInstitutionAdmin(inst.id, adminId, false)}>{t('remove')}</Button>
                                        </div>
                                        )
                                    }) : <p className="text-xs text-muted-foreground italic">{t('noAdminsAssigned')}</p>}
                                    </div>
                                    <div className="mt-4 flex gap-2 items-end">
                                        <div className="flex-grow">
                                        <Label>{t('assignNewAdmin')}</Label>
                                        <Select onValueChange={setUserToAssignAsInstAdmin}>
                                            <SelectTrigger><SelectValue placeholder={t('selectUserPlaceholder')} /></SelectTrigger>
                                            <SelectContent>
                                            {allUsers
                                                .filter(u => (u.role === 'lecturer' || u.role === 'institution_admin') && !(inst.adminUserIds || []).includes(u.id))
                                                .map(user => <SelectItem key={user.id} value={user.id}>{user.fullName} ({user.username})</SelectItem>)
                                            }
                                            </SelectContent>
                                        </Select>
                                        </div>
                                        <Button onClick={() => userToAssignAsInstAdmin && handleAssignInstitutionAdmin(inst.id, userToAssignAsInstAdmin, true)} disabled={!userToAssignAsInstAdmin}>{t('assign')}</Button>
                                    </div>
                                </div>
                            </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    </Accordion>
                </CardContent>
                </Card>
             )}
            <Card>
                <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><HelpCircle className="h-6 w-6 text-primary" /> {t('adminSupport.title')}</CardTitle>
                <CardDescription>{t('adminSupport.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                <Button onClick={() => setShowAdminSupportDialog(true)} >{t('adminSupport.newRequestButton')}</Button>
                {(openSupportRequests.length > 0 || closedSupportRequests.length > 0) && (
                    <Accordion type="single" collapsible className="w-full mt-4" defaultValue="open-support">
                    {openSupportRequests.length > 0 && (
                        <AccordionItem value="open-support">
                        <AccordionTrigger className="text-destructive">{t('adminSupport.openRequests', {count: openSupportRequests.length})}</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-2">
                            {openSupportRequests.map(req => (
                                <Card key={req.id} className="p-3">
                                <div className="flex justify-between items-center">
                                    <div>
                                    <p className="font-semibold">{req.subject}</p>
                                    <p className="text-xs text-muted-foreground">{t('adminSupport.from', {name: req.requesterName})}</p>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => setViewingAdminSupportRequest(req)}>{t('adminSupport.viewChat')}</Button>
                                </div>
                                </Card>
                            ))}
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                    )}
                    {closedSupportRequests.length > 0 && (
                        <AccordionItem value="closed-support">
                        <AccordionTrigger>{t('adminSupport.closedRequests', {count: closedSupportRequests.length})}</AccordionTrigger>
                        <AccordionContent>
                            <div className="space-y-2">
                            {closedSupportRequests.map(req => (
                                <Card key={req.id} className="p-3 bg-muted/50">
                                <div className="flex justify-between items-center">
                                    <div>
                                    <p className="font-semibold text-muted-foreground">{req.subject}</p>
                                    <p className="text-xs text-muted-foreground">{t('adminSupport.from', {name: req.requesterName})}</p>
                                    </div>
                                    <Button variant="secondary" size="sm" onClick={() => setViewingAdminSupportRequest(req)}>{t('adminSupport.viewHistory')}</Button>
                                </div>
                                </Card>
                            ))}
                            </div>
                        </AccordionContent>
                        </AccordionItem>
                    )}
                    </Accordion>
                )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      
      <Dialog open={showManageExercisesModal} onOpenChange={setShowManageExercisesModal}>
        <DialogContent className="sm:max-w-2xl">
          <ScrollArea className="max-h-[80vh]">
            <div className="p-1">
              <DialogHeader className="p-6 pt-0">
                <DialogTitle>{t('manageExercisesFor', { class: classToManageExercises?.name })}</DialogTitle>
                <ModalDescription>{t('manageExercisesDesc')}</ModalDescription>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-6">
                {tempAssignedExercises.map((item) => {
                  const exercise = exercises.find(ex => ex.id === item.exerciseId);
                  if (!exercise) return null;
                  const expiryTime = item.expiryDate ? format(new Date(item.expiryDate), "HH:mm") : "23:59";

                  return (
                    <div key={item.exerciseId} className="flex items-center justify-between p-3 border rounded-md">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`assign-ex-${item.exerciseId}`}
                          checked={item.isAssigned}
                          onCheckedChange={(checked) => handleTempExerciseAssignmentChange(item.exerciseId, checked)}
                        />
                        <div>
                          <Label htmlFor={`assign-ex-${item.exerciseId}`} className="font-medium">{getLocalizedText(exercise.title)}</Label>
                          <p className="text-xs text-muted-foreground">{t(exercise.difficulty)} - {exercise.points} {t('points')}</p>
                        </div>
                      </div>
                      {item.isAssigned && (
                        <div className="flex items-center gap-2">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" size="sm" className="w-[180px] justify-start text-left font-normal text-xs">
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                {item.expiryDate ? format(new Date(item.expiryDate), "PP HH:mm") : <span>{t('setExpiry')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={item.expiryDate ? new Date(item.expiryDate) : undefined}
                                onSelect={(date) => handleTempExerciseExpiryChange(item.exerciseId, date, expiryTime)}
                                initialFocus
                              />
                              <div className="p-2 border-t">
                                  <Input
                                      type="time"
                                      value={expiryTime}
                                      onChange={(e) => handleTempExerciseExpiryChange(item.exerciseId, item.expiryDate ? new Date(item.expiryDate) : undefined, e.target.value)}
                                  />
                              </div>
                            </PopoverContent>
                          </Popover>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleTempExerciseExpiryChange(item.exerciseId, undefined)}
                          >
                              <X size={14} />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
           <ModalDialogFooter className="p-6 pt-0">
            <DialogClose asChild>
              <Button variant="outline">{t('cancelButton')}</Button>
            </DialogClose>
            <Button onClick={confirmManageExercises}>{t('saveChangesButton')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingAssignedChallenge} onOpenChange={() => setEditingAssignedChallenge(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('updateExpiryTitle')}</DialogTitle>
            <ModalDescription>{t('updateExpiryDesc')}</ModalDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>{t('setNewExpiry')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempExpiryDateForEdit ? format(tempExpiryDateForEdit, "PPp HH:mm", { locale: language === 'th' ? th : enUS }) : <span>{t('setDateTime')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={tempExpiryDateForEdit} onSelect={setTempExpiryDateForEdit} initialFocus locale={language === 'th' ? th : enUS} />
                <div className="p-2 border-t border-border">
                  <Input type="time"
                           value={tempExpiryDateForEdit ? format(tempExpiryDateForEdit, "HH:mm") : ""}
                           onChange={(e) => {
                             const time = e.target.value;
                             const [hours, minutes] = time.split(':').map(Number);
                             setTempExpiryDateForEdit(prev => {
                               const newDate = prev ? new Date(prev) : new Date();
                               newDate.setHours(hours, minutes, 0, 0);
                               return newDate;
                             });
                           }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <ModalDialogFooter>
            <Button variant="ghost" onClick={() => setEditingAssignedChallenge(null)}>{t('cancelButton')}</Button>
            <Button onClick={submitEditExpiry}>{t('saveChangesButton')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!classIdForLabManagement} onOpenChange={(isOpen) => !isOpen && setClassIdForLabManagement(null)}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('manageLabsFor', { class: classForLabManagement?.name })}</DialogTitle>
            <ModalDescription>{t('manageLabsDesc')}</ModalDescription>
          </DialogHeader>
            {classForLabManagement && (
            <Tabs defaultValue="assigned" className="flex-1 flex flex-col overflow-y-hidden">
                <TabsList className="shrink-0">
                    <TabsTrigger value="assigned">{t('currentlyAssigned')}</TabsTrigger>
                    <TabsTrigger value="late-requests">{t('lateRequests')}</TabsTrigger>
                    <TabsTrigger value="assign-new">{t('assignNewWeek')}</TabsTrigger>
                </TabsList>
                <TabsContent value="assigned" className="flex-1 overflow-y-auto mt-2 pr-2">
                     {(classForLabManagement.assignedChallenges || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2 text-center">{t('noLabsAssignedToClass')}</p>
                    ) : (
                        <ScrollArea className="h-full">
                        <div className="space-y-3">
                        {(classForLabManagement.assignedChallenges || []).map(assignedChallenge => {
                            const labTemplate = labs.find(lab => lab.id === assignedChallenge.labId);
                            const challengeDetails = labTemplate?.challenges.find(c => c.id === assignedChallenge.challengeId);
                            if (!labTemplate || !challengeDetails) return null;

                            const studentAttempts = Object.keys(assignedChallenge.studentProgress);
                            const isExpired = assignedChallenge.expiryDate ? isPast(new Date(assignedChallenge.expiryDate)) : false;
                            
                            return (
                            <Card key={assignedChallenge.assignmentId} className={cn("p-3 bg-background shadow-sm list-none", isExpired && "border-destructive/30")}>
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-lg">{getLocalizedText(challengeDetails.title)}</span>
                                            {isExpired && <Badge variant="destructive" className="text-xs">{t('expired')}</Badge>}
                                        </div>
                                        {assignedChallenge.expiryDate && isValid(new Date(assignedChallenge.expiryDate)) ? (
                                        <p className={cn("text-xs", isExpired ? "text-destructive" : "text-muted-foreground")}>
                                          {isExpired ? t('expiredOn') : t('expiresOn')} {format(new Date(assignedChallenge.expiryDate), "PPp", { locale: language === 'th' ? th : enUS })}
                                        </p>
                                        ) : (
                                        <p className="text-xs text-muted-foreground italic">{t('noExpirySet')}</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2 mt-2 sm:mt-0">
                                        <Button variant="outline" size="sm" onClick={() => startEditExpiry(assignedChallenge)} disabled={(classForLabManagement.status || 'pending') === 'finished'}><Edit3 className="mr-1 h-4 w-4" />{t('expiry')}</Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button variant="destructive_outline" size="sm" disabled={(classForLabManagement.status || 'pending') === 'finished'}><Trash2 className="mr-1 h-4 w-4" />{t('unassign')}</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>{t('unassignChallengeTitle', { challenge: getLocalizedText(challengeDetails.title), class: classForLabManagement.name })}</AlertDialogTitle><ModalDescription>{t('unassignChallengeDesc')}</ModalDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel><AlertDialogAction onClick={() => handleUnassignWeekFromClass(classForLabManagement!.id, assignedChallenge.assignmentId)}>{t('confirmUnassign')}</AlertDialogAction></AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <Accordion type="single" collapsible className="w-full mt-2">
                                    <AccordionItem value="progress" className="border-none">
                                    <AccordionTrigger className="text-xs font-semibold py-1 hover:no-underline">
                                        <Info size={14} className="mr-1"/> {t('studentProgressOverview')} ({studentAttempts.length} {t('students')})
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2">
                                        {studentAttempts.length === 0 ? <p className="text-xs italic text-muted-foreground">{t('noSubmissionsYet')}</p> :
                                            <Table>
                                                <TableHeader><TableRow><TableHead>{t('student')}</TableHead><TableHead>{t('statusLabel')}</TableHead><TableHead>{t('avgOutputSim')}</TableHead><TableHead>{t('actions')}</TableHead></TableRow></TableHeader>
                                                <TableBody>
                                                    {studentAttempts.map(studentId => {
                                                        const student = allUsers.find(u => u.id === studentId);
                                                        const studentProgress = assignedChallenge.studentProgress?.[studentId];
                                                        if (!student || !studentProgress) return null;
                                                        
                                                        const totalProblems = Object.keys(studentProgress).length;
                                                        const completedProblems = Object.values(studentProgress).filter(a => a.completed).length;
                                                        const totalScore = Object.values(studentProgress).reduce((sum, a) => sum + (a.score || 0), 0);
                                                        const overallStatus = completedProblems === totalProblems && totalProblems > 0 ? "well-done" : completedProblems > 0 ? "good" : "fail";

                                                        return (
                                                            <TableRow key={studentId}>
                                                                <TableCell>{student.fullName}</TableCell>
                                                                <TableCell><Badge variant={overallStatus === 'well-done' ? 'default' : overallStatus === 'good' ? 'secondary' : 'destructive'}>{`${completedProblems}/${totalProblems} ${t('complete')}`}</Badge></TableCell>
                                                                <TableCell>{totalScore.toFixed(2)} pts</TableCell>
                                                                <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewSubmission(student, studentProgress[Object.keys(studentProgress)[0]], challengeDetails)}><Eye className="mr-1 h-4 w-4" /> {t('view')}</Button></TableCell>
                                                            </TableRow>
                                                        )
                                                    })}
                                                </TableBody>
                                            </Table>
                                        }
                                    </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </Card>
                            )
                        })}
                        </div>
                        </ScrollArea>
                    )}
                </TabsContent>
                <TabsContent value="late-requests" className="flex-1 overflow-y-auto mt-2 pr-2">
                    <LateRequestManager 
                        classGroup={classForLabManagement} 
                        labs={labs} 
                        allUsers={allUsers}
                        lateScoreOverrides={lateScoreOverrides}
                        setLateScoreOverrides={setLateScoreOverrides}
                        handleApproveLateSubmission={handleApproveLateSubmission}
                    />
                </TabsContent>
                <TabsContent value="assign-new" className="flex-1 flex flex-col overflow-y-hidden mt-2">
                    <ScrollArea className="flex-1 space-y-4 py-2 pr-2">
                        <Label>1. {t('selectWeeksFromCourses')}</Label>
                        {assignableLabs.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2 border rounded-md text-center">{t('noLabCourses')}</p>
                        ) : (
                        <Accordion type="multiple" className="w-full space-y-1 mt-1">
                          {assignableLabs.map(lab => {
                            const assignedChallengeIdsInLab = new Set((classForLabManagement.assignedChallenges || []).filter(ac => ac.labId === lab.id).map(ac => ac.challengeId));
                            return (
                            <AccordionItem key={lab.id} value={lab.id} className="border rounded-md">
                              <AccordionTrigger className="px-3 py-2 hover:bg-muted/50 text-left">
                                <span className="font-medium text-primary">{getLocalizedText(lab.title)}</span>
                              </AccordionTrigger>
                              <AccordionContent className="p-3 border-t">
                                {lab.challenges.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic">{t('noWeeksInCourse')}</p>
                                ) : (
                                  <div className="space-y-2">
                                    {lab.challenges.map(challenge => {
                                      const key = `${lab.id}_${challenge.id}`;
                                      const isAssigned = assignedChallengeIdsInLab.has(challenge.id);
                                      const assignmentInfo = isAssigned ? classForLabManagement.assignedChallenges.find(ac => ac.challengeId === challenge.id) : null;
                                      const isExpired = assignmentInfo?.expiryDate ? isPast(new Date(assignmentInfo.expiryDate)) : false;

                                      return (
                                        <div key={key} className={cn("flex items-center space-x-2 p-2 border-b last:border-b-0", isAssigned && "bg-muted/40")}>
                                          <Checkbox
                                            id={key}
                                            checked={!!selectedChallengesToAssign[key]}
                                            onCheckedChange={() => handleToggleChallengeSelectionForModal(lab.id, challenge.id)}
                                            disabled={isAssigned}
                                          />
                                          <label htmlFor={key} className={cn("text-sm font-medium leading-none flex-1", isAssigned ? "cursor-not-allowed text-muted-foreground" : "cursor-pointer")}>
                                            {getLocalizedText(challenge.title)}
                                             {isAssigned && (
                                                <Badge variant={isExpired ? "destructive" : "secondary"} className="ml-2 text-xs">
                                                  {isExpired ? t('expired') : t('assigned')}
                                                </Badge>
                                             )}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          )})}
                        </Accordion>
                        )}
                        <div>
                          <Label>2. {t('setExpiryOptional')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !assignmentExpiryDate && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {assignmentExpiryDate ? format(assignmentExpiryDate, "PPP", { locale: language === 'th' ? th : enUS }) : <span>{t('pickDate')}</span>}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={assignmentExpiryDate} onSelect={setAssignmentExpiryDate} initialFocus locale={language === 'th' ? th : enUS} />
                            </PopoverContent>
                          </Popover>
                        </div>
                    </ScrollArea>
                    <div className="shrink-0 pt-4 border-t">
                        <Button onClick={handleConfirmAssignChallenges} className="w-full">{t('assignSelectedWeeks')}</Button>
                    </div>
                </TabsContent>
            </Tabs>
            )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={showCouponDialog} onOpenChange={setShowCouponDialog}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{editingCoupon ? t('editCouponTitle') : t('createCouponTitle')}</DialogTitle>
                <ModalDescription>{t('couponDialogDesc')}</ModalDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div><Label>{t('couponCode')}</Label><Input value={couponForm.code || ""} onChange={e => setCouponForm(p => ({...p, code: e.target.value.toUpperCase()}))}/></div>
                <div><Label>{t('discountType')}</Label><Select value={couponForm.discountType} onValueChange={(v: 'fixed'|'percentage') => setCouponForm(p=>({...p, discountType: v}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">{t('percentage')}</SelectItem><SelectItem value="fixed">{t('fixedAmount')}</SelectItem></SelectContent></Select></div>
                <div><Label>{t('discountValue')}</Label><Input type="number" value={couponForm.discountValue || ""} onChange={e => setCouponForm(p => ({...p, discountValue: Number(e.target.value)}))}/></div>
                <div><Label>{t('maxUses')}</Label><Input type="number" value={couponForm.maxUses || ""} onChange={e => setCouponForm(p => ({...p, maxUses: Number(e.target.value)}))}/></div>
                <div>
                  <Label>{t('expiryDate')}</Label>
                  <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left font-normal">{couponForm.expiryDate ? format(new Date(couponForm.expiryDate), "PPP", { locale: language === 'th' ? th : enUS }) : t('setDate')}</Button></PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={couponForm.expiryDate ? new Date(couponForm.expiryDate) : undefined} onSelect={date => setCouponForm(p => ({...p, expiryDate: date?.toISOString()}))} initialFocus locale={language === 'th' ? th : enUS}/></PopoverContent>
                  </Popover>
                </div>
                <div className="flex items-center space-x-2"><Checkbox id="coupon-active" checked={couponForm.isActive} onCheckedChange={c => setCouponForm(p=>({...p, isActive: !!c}))} /><Label htmlFor="coupon-active">{t('isActive')}</Label></div>
            </div>
            <ModalDialogFooter>
                <DialogClose asChild><Button variant="outline">{t('cancelButton')}</Button></DialogClose>
                <Button onClick={handleCouponFormSubmit}>{t('saveCoupon')}</Button>
            </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('payOutstandingBalance')}</DialogTitle>
            <ModalDescription>{t('finalAmountIs')} ฿{finalPaymentAmount.toFixed(2)}. {t('scanToPay')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <PromptPayQRDownload
              promptPayNumber={promptPayNumber}
              amount={finalPaymentAmount}
              selectedClasses={selectedClassObjectsForPayment}
            />
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancelButton')}</Button></DialogClose>
            <Button onClick={() => confirmSimulatedPayment('PromptPay')}>{t('iHavePaid')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showPaypalDialog} onOpenChange={setShowPaypalDialog}>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Pay with PayPal</DialogTitle>
                  <ModalDescription>You are being redirected to PayPal to complete your payment of ฿{finalPaymentAmount.toFixed(2)}.</ModalDescription>
              </DialogHeader>
              <div className="py-4 text-center">
                  <p className="text-sm font-semibold mb-2">Payable to:</p>
                  <p className="text-lg font-mono p-2 rounded bg-muted">binahmad.habib@gmail.com</p>
                  <p className="text-xs text-muted-foreground mt-4">This is a simulated process. In a real application, you would be redirected to the PayPal website.</p>
              </div>
              <ModalDialogFooter>
                  <Button variant="outline" onClick={() => setShowPaypalDialog(false)}>Cancel Payment</Button>
                  <Button onClick={() => confirmSimulatedPayment('PayPal')} className="bg-[#0070ba] hover:bg-[#005ea6]">Confirm Payment</Button>
              </ModalDialogFooter>
          </DialogContent>
      </Dialog>
      
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge Institutions</DialogTitle>
            <ModalDescription>Select a target institution and one or more source institutions to merge. All users from source institutions will be moved to the target.</ModalDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>Target Institution (Keep this one)</Label>
              <Select value={targetMergeInstitution} onValueChange={setTargetMergeInstitution}>
                  <SelectTrigger><SelectValue placeholder="Select target..."/></SelectTrigger>
                  <SelectContent>
                      {institutions.map(inst => (
                          <SelectItem key={inst.id} value={inst.id} disabled={sourceMergeInstitutions.includes(inst.id)}>{inst.name}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source Institutions (These will be deleted)</Label>
              <div className="max-h-60 overflow-y-auto space-y-2 border rounded-md p-2">
                {institutions.filter(inst => inst.id !== targetMergeInstitution).map(inst => (
                    <div key={inst.id} className="flex items-center gap-2">
                        <Checkbox
                            id={`merge-${inst.id}`}
                            checked={sourceMergeInstitutions.includes(inst.id)}
                            onCheckedChange={(checked) => {
                                setSourceMergeInstitutions(prev => checked ? [...prev, inst.id] : prev.filter(id => id !== inst.id));
                            }}
                        />
                        <Label htmlFor={`merge-${inst.id}`}>{inst.name}</Label>
                    </div>
                ))}
              </div>
            </div>
          </div>
          <ModalDialogFooter>
            <Button variant="ghost" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmMerge} disabled={!targetMergeInstitution || sourceMergeInstitutions.length === 0}>Merge Institutions</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!viewingAssistanceRequest} onOpenChange={(open) => !open && setViewingAssistanceRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('assistanceRequests.chatTitle', { studentName: viewingAssistanceRequest?.studentName || '' })}</DialogTitle>
            <ModalDescription>
              {t('assistanceRequests.problemContext')}: "{viewingAssistanceRequest?.problemContext}"
            </ModalDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
              <ScrollArea className="h-64 w-full rounded-md border p-4" ref={assistanceChatContainerRef}>
                  {(viewingAssistanceRequest?.messages || []).map((msg, index) => (
                      <div key={index} className={cn("mb-2 flex", msg.senderId === currentUser?.id ? "justify-end" : "justify-start")}>
                          <div className={cn("rounded-lg px-3 py-2 text-sm", msg.senderId === currentUser?.id ? "bg-primary text-primary-foreground" : "bg-muted")}>
                              {msg.text}
                          </div>
                      </div>
                  ))}
              </ScrollArea>
              {viewingAssistanceRequest?.status === 'open' && (
                <div className="flex items-center gap-2">
                  <Input value={assistanceChatMessage} onChange={e => setAssistanceChatMessage(e.target.value)} placeholder={t('assistanceRequests.responsePlaceholder')} onKeyDown={(e) => {
                      if (e.key === 'Enter' && viewingAssistanceRequest) {
                          handleSendAssistanceMessage(viewingAssistanceRequest.classId, viewingAssistanceRequest.id, assistanceChatMessage);
                          setAssistanceChatMessage("");
                      }
                  }} />
                  <Button onClick={() => {
                      if (viewingAssistanceRequest) {
                          handleSendAssistanceMessage(viewingAssistanceRequest.classId, viewingAssistanceRequest.id, assistanceChatMessage);
                          setAssistanceChatMessage("");
                      }
                  }}><Send size={16}/></Button>
                </div>
              )}
          </div>
          <ModalDialogFooter className="justify-between">
              <Button variant="outline" onClick={() => setViewingAssistanceRequest(null)}>{t('assistanceRequests.closeChat')}</Button>
              {viewingAssistanceRequest?.status === 'open' && (
                <Button variant="destructive" onClick={() => viewingAssistanceRequest && handleCloseAssistanceRequest(viewingAssistanceRequest.classId, viewingAssistanceRequest.id)}>{t('assistanceRequests.endRequest')}</Button>
              )}
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showAdminSupportDialog} onOpenChange={setShowAdminSupportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminSupport.newRequestTitle')}</DialogTitle>
            <ModalDescription>{t('adminSupport.newRequestDesc')}</ModalDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="support-subject">{t('adminSupport.subjectLabel')}</Label>
              <Input id="support-subject" value={adminSupportSubject} onChange={(e) => setAdminSupportSubject(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="support-message">{t('adminSupport.messageLabel')}</Label>
              <Textarea id="support-message" value={adminSupportMessage} onChange={(e) => setAdminSupportMessage(e.target.value)} />
            </div>
          </div>
          <ModalDialogFooter>
            <DialogClose asChild><Button variant="outline">{t('cancelButton')}</Button></DialogClose>
            <Button onClick={() => { handleCreateAdminSupportRequest(adminSupportSubject, adminSupportMessage); setShowAdminSupportDialog(false); setAdminSupportSubject(''); setAdminSupportMessage(''); }}>{t('adminSupport.submitButton')}</Button>
          </ModalDialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!viewingAdminSupportRequest} onOpenChange={(open) => !open && setViewingAdminSupportRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminSupport.chatTitle')}</DialogTitle>
            <ModalDescription>{t('adminSupport.chatDesc', {subject: viewingAdminSupportRequest?.subject || ''})}</ModalDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <ScrollArea className="h-64 w-full rounded-md border p-4" ref={adminChatContainerRef}>
                {(viewingAdminSupportRequest?.messages || []).map((msg, index) => {
                    const sender = allUsers.find(u => u.id === msg.senderId);
                    const isCurrentUser = msg.senderId === currentUser?.id;
                    return (
                        <div key={index} className={cn("mb-2 flex flex-col", isCurrentUser ? "items-end" : "items-start")}>
                            <span className="text-xs text-muted-foreground px-1">{sender?.fullName || 'User'}</span>
                            <div className={cn("rounded-lg px-3 py-2 text-sm", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                {msg.text}
                            </div>
                        </div>
                    );
                })}
              </ScrollArea>
               {viewingAdminSupportRequest?.status === 'open' && (
                  <div className="flex items-center gap-2">
                    <Input value={adminSupportChatMessage} onChange={e => setAdminSupportChatMessage(e.target.value)} placeholder={t('adminSupport.responsePlaceholder')} onKeyDown={(e) => {
                        if (e.key === 'Enter' && viewingAdminSupportRequest) {
                            handleSendAdminChatMessage(viewingAdminSupportRequest.id, adminSupportChatMessage);
                            setAdminSupportChatMessage("");
                        }
                    }} />
                    <Button onClick={() => {
                        if (viewingAdminSupportRequest) {
                            handleSendAdminChatMessage(viewingAdminSupportRequest.id, adminSupportChatMessage);
                            setAdminSupportChatMessage("");
                        }
                    }}><Send size={16}/></Button>
                  </div>
                )}
                {viewingAdminSupportRequest?.status === 'closed' && viewingAdminSupportRequest.requesterId === currentUser?.id && (
                  <div className="flex items-center gap-2">
                    <Input value={adminSupportChatMessage} onChange={e => setAdminSupportChatMessage(e.target.value)} placeholder={t('adminSupport.reopenPlaceholder')} onKeyDown={(e) => {
                        if (e.key === 'Enter' && viewingAdminSupportRequest) {
                            handleSendAdminChatMessage(viewingAdminSupportRequest.id, adminSupportChatMessage);
                            setAdminSupportChatMessage("");
                        }
                    }} />
                    <Button onClick={() => {
                        if (viewingAdminSupportRequest) {
                            handleSendAdminChatMessage(viewingAdminSupportRequest.id, adminSupportChatMessage);
                            setAdminSupportChatMessage("");
                        }
                    }}><Send size={16}/></Button>
                  </div>
                )}
          </div>
           <ModalDialogFooter className="justify-between">
                <div>
                  {currentUser?.isAdmin && viewingAdminSupportRequest?.status === 'open' && (
                    <Button variant="secondary" onClick={() => { viewingAdminSupportRequest && handleUpdateAdminSupportRequestStatus(viewingAdminSupportRequest.id, 'closed'); }}>{t('adminSupport.markAsClosedButton')}</Button>
                  )}
                  {viewingAdminSupportRequest?.requesterId === currentUser?.id && viewingAdminSupportRequest.status === 'closed' && (
                    <p className='text-xs text-muted-foreground'>{t('adminSupport.reopenInfo')}</p>
                  )}
                </div>
                <Button variant="outline" onClick={() => setViewingAdminSupportRequest(null)}>{t('adminSupport.closeButton')}</Button>
           </ModalDialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubmissionDialog} onOpenChange={setShowSubmissionDialog}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('submissionDetails')}</DialogTitle>
            <ModalDescription>
              {t('student')}: {viewingSubmission?.student.fullName} ({viewingSubmission?.student.username})
              <br/>
              {t('challengeLabel')}: {getLocalizedText(viewingSubmission?.challenge.title)}
            </ModalDescription>
          </DialogHeader>
          {viewingSubmission && (
            <ScrollArea className="flex-1 pr-4 -mr-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('submittedCode')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 border rounded-md overflow-hidden">
                      <Editor
                        height="100%"
                        language={viewingSubmission.attempt.language}
                        theme="vs-dark"
                        value={viewingSubmission.attempt.studentCode}
                        options={{ readOnly: true, fontSize: 12, minimap: { enabled: false } }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-col gap-4">
                <SkillAssessmentView assessment={viewingSubmission.attempt.assessment}/>
              </div>
            </div>
          </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


interface LateRequestManagerProps {
    classGroup: ClassGroup;
    labs: Lab[];
    allUsers: User[];
    lateScoreOverrides: Record<string, number>;
    setLateScoreOverrides: React.Dispatch<React.SetStateAction<Record<string, number>>>;
    handleApproveLateSubmission: (classId: string, assignmentId: string, studentId: string, targetCodeId: string, newMaxScore?: number) => void;
}

const LateRequestManager: React.FC<LateRequestManagerProps> = ({ classGroup, labs, allUsers, lateScoreOverrides, setLateScoreOverrides, handleApproveLateSubmission }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const { t, language } = useLanguage();

  const getLocalizedText = (text: string | LocalizedString | undefined): string => {
    if (!text) return '';
    if (typeof text === 'string') return text;
    if (text) {
      return text[language] || text.en || '';
    }
    return '';
  };

  const requests = useMemo(() => {
    const allRequests: any[] = [];
    (classGroup.assignedChallenges || []).forEach(ac => {
      const labTemplate = labs.find(lab => lab.id === ac.labId);
      const challengeDetails = labTemplate?.challenges.find(c => c.id === ac.challengeId);
      if (!labTemplate || !challengeDetails) return;

      Object.entries(ac.studentProgress).forEach(([studentId, studentProgress]) => {
        Object.entries(studentProgress).forEach(([targetCodeId, attempt]) => {
          if (attempt.lateRequestStatus) {
            const student = allUsers.find(u => u.id === studentId);
            const targetCode = challengeDetails?.targetCodes.find(tc => tc.id === targetCodeId);
            if (student && targetCode) {
              allRequests.push({
                student,
                labTitle: getLocalizedText(labTemplate.title),
                challengeTitle: getLocalizedText(challengeDetails.title),
                targetCodeDesc: getLocalizedText(targetCode.description),
                classId: classGroup.id,
                assignmentId: ac.assignmentId,
                targetCodeId: targetCode.id,
                originalPoints: targetCode.points,
                status: attempt.lateRequestStatus,
                attempt: attempt,
              });
            }
          }
        });
      });
    });
    return allRequests;
  }, [classGroup, labs, allUsers, getLocalizedText]);

  const pendingRequests = requests.filter(r => r.status === 'requested');
  const historyRequests = requests.filter(r => r.status !== 'requested');

  const renderRequestList = (requestList: any[]) => {
    if (requestList.length === 0) {
      return <p className="text-sm text-muted-foreground p-2 text-center">{t('noRequestsInCategory')}</p>;
    }

    return (
      <ScrollArea className="h-full">
        <div className="space-y-2">
          {requestList.map((req, index) => {
            const reqKey = `${req.assignmentId}-${req.student.id}-${req.targetCodeId}`;
            return (
              <Card key={index} className="p-3">
                <p className="font-semibold">{req.student.fullName}</p>
                <p className="text-sm text-muted-foreground">{req.labTitle} > {req.challengeTitle} > {req.targetCodeDesc}</p>
                {req.status === 'requested' ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Label htmlFor={`late-score-${reqKey}`} className="text-sm">{t('newMaxScore')}:</Label>
                    <Input
                      id={`late-score-${reqKey}`}
                      type="number"
                      className="h-8 w-24"
                      placeholder={String(req.originalPoints)}
                      value={lateScoreOverrides[reqKey] ?? ''}
                      onChange={(e) => setLateScoreOverrides(prev => ({ ...prev, [reqKey]: Number(e.target.value) }))}
                    />
                    <Button size="sm" className="h-8" onClick={() => {
                      const newMaxScore = lateScoreOverrides[reqKey] ?? req.originalPoints;
                      handleApproveLateSubmission(req.classId, req.assignmentId, req.student.id, req.targetCodeId, newMaxScore);
                    }}>
                      <CheckSquare className="mr-2 h-4 w-4" /> {t('approve')}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant={req.status === 'approved' ? 'default' : 'secondary'} className="capitalize">{t(req.status)}</Badge>
                    {req.attempt && typeof req.attempt.score === 'number' && (
                       <span className="text-sm font-semibold">{t('score')}: {req.attempt.score.toFixed(2)} / {req.attempt.lateSubmissionMaxScore || req.originalPoints}</span>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="pending"><Send className="mr-2 h-4 w-4" />{t('pending')} ({pendingRequests.length})</TabsTrigger>
        <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />{t('history')} ({historyRequests.length})</TabsTrigger>
      </TabsList>
      <TabsContent value="pending" className="flex-1 overflow-y-auto mt-2">
        {renderRequestList(pendingRequests)}
      </TabsContent>
      <TabsContent value="history" className="flex-1 overflow-y-auto mt-2">
        {renderRequestList(historyRequests)}
      </TabsContent>
    </Tabs>
  );
};
