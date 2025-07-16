

import type { Exercise, CodeSnippet, ProgressDataPoint, User, ClassGroup, Lab, LabChallenge, StudentLabAttempt, AssignedExerciseInfo, AssignedChallengeInfo, LabAssignment, Institution, Coupon, BillingTransaction, SupportedLanguage, ProblemAssistantRequest, AdminSupportRequest } from '@/types';

export interface DashboardState {
  currentUser: User | null;
  allUsers: User[];
  code: string;
  isCompiling: boolean;
  codeTitle: string;
  savedCodes: CodeSnippet[];
  currentSnippetId: string | null;
  exercises: Exercise[];
  currentExercise: Exercise | null;
  userProgress: ProgressDataPoint[];
  classGroups: ClassGroup[];
  labs: Lab[];
  labAssignments: LabAssignment[];
  isNewSnippetModalOpen: boolean;
  newSnippetDialogInput: string;
  newSnippetLanguage: SupportedLanguage;
  activeTab: string;
  institutions: Institution[];
  promptPayNumber: string;
  coupons: Coupon[];
  transactions: BillingTransaction[];
  adminSupportRequests: AdminSupportRequest[];
  isAwaitingAIResponse: boolean;
}

export interface DashboardActions {
  setCurrentUser: (user: User | null) => void;
  setAllUsers: (users: User[]) => void;
  setCode: (code: string) => void;
  setIsCompiling: (isCompiling: boolean) => void;
  setCodeTitle: (title: string) => void;
  setSavedCodes: (codes: CodeSnippet[]) => void;
  setCurrentSnippetId: (id: string | null) => void;
  setCurrentExercise: (exercise: Exercise | null) => void;
  setExercises: (exercises: Exercise[]) => void;
  setClassGroups: (groups: ClassGroup[]) => void;
  setIsNewSnippetModalOpen: (isOpen: boolean) => void;
  setNewSnippetDialogInput: (input: string) => void;
  setNewSnippetLanguage: (language: SupportedLanguage) => void;
  setActiveTab: (tabValue: string) => void;
  setInstitutions: (institutions: Institution[]) => void;
  setPromptPayNumber: (phone: string) => void;
  setCoupons: (coupons: Coupon[]) => void;
  setTransactions: (transactions: BillingTransaction[]) => void;
  setIsAwaitingAIResponse: (isAwaiting: boolean) => void;
  setAdminSupportRequests: (requests: AdminSupportRequest[]) => void;

  handleSaveOrUpdateSnippet: (data: { title: string; code: string; snippetIdToUpdate?: string | null }) => void;
  handleLoadCode: (snippet: CodeSnippet) => void;
  handleDeleteSnippet: (snippetId: string) => void;
  handleNewSnippet: () => void;
  handleConfirmCreateNewSnippet: () => void;
  handleRenameSnippetTitle: (snippetId: string, newTitle: string) => void;
  handleSubmitExercise: () => Promise<void>;
  handleAddExercise: (data: { exerciseData: Omit<Exercise, 'id' | 'creatorId'>; classIdToAssign?: string }) => void;
  handleUpdateExercise: (exercise: Exercise) => void;
  handleDeleteExercise: (exerciseId: number) => void;


  handleCreateClassGroup: (data: { name: string; }) => void;
  handleUpdateClassGroup: (updatedClassGroup: ClassGroup) => void;
  handleDeleteClassGroup: (classId: string) => void;
  handleUpdateClassStatus: (classId: string, status: ClassGroup['status']) => void;

  handleUpdateUserRole: (userId: string, newRole: User['role']) => void;
  handleAdminResetPassword: (userId: string) => void;
  handleToggleAdminStatus: (userId: string) => void;
  handleAdminDeleteUser: (userId: string) => void;
  
  handleApproveJoinRequest: (classId: string, studentId: string) => void;
  handleDenyJoinRequest: (classId: string, studentId: string) => void;
  handleRequestToJoinClass: (classCode: string) => Promise<void>;
  handleUpdateClassExercises: (classId: string, newAssignedExercises: AssignedExerciseInfo[]) => void;
  handleLeaveClass: (classId: string) => Promise<void>;
  handleRemoveStudentFromClass: (classId: string, studentUserId: string) => void;
  handleReactivateStudentInClass: (classId: string, studentUserId: string) => void;
  handleRenameStudentAlias: (classId: string, studentUserId: string, newAlias: string) => void;

  setLabs: (labs: Lab[]) => void;
  handleAddLabSemester: (labData: Omit<Lab, 'id' | 'challenges' | 'creatorId'>) => Lab | null;
  handleUpdateLabSemester: (updatedLab: Lab) => void;
  handleDeleteLabSemester: (labId: string) => void;
  handleAddWeekToSemester: (labId: string, weekData: Omit<LabChallenge, 'id' | 'targetCodes' | 'labId'>) => LabChallenge | null;
  handleUpdateWeekInSemester: (labId: string, updatedWeek: LabChallenge) => void;
  handleDeleteWeekFromSemester: (labId: string, weekId: string) => void;
  handleCloneWeekToCourse: (sourceLabId: string, sourceChallengeId: string, targetLabId: string) => void;
  handleAddTargetCodeToWeek: (labId: string, weekId: string, codeData: Omit<LabTargetCode, 'id'>) => void;
  handleUpdateTargetCodeInWeek: (labId: string, weekId: string, updatedTargetCode: LabTargetCode) => void;
  handleDeleteTargetCodeFromWeek: (labId: string, weekId: string, targetCodeId: string) => void;
  handleUseSnippetAsWeekTarget: (data: {
    snippet: CodeSnippet;
    labId: string;
    challengeId: string;
    points: number;
    targetDescription?: string;
  }) => void;

  handleAssignWeeksToClass: (classId: string, selectedWeeksData: Array<{ labId: string; challengeId: string }>, expiryDate?: string) => void;
  handleUnassignWeekFromClass: (classId: string, assignmentId: string) => void;
  handleUpdateAssignedWeekExpiry: (classId: string, assignmentId: string, expiryDate?: string) => void;

  handleStudentSubmitLabCode: (assignmentId: string, challengeId: string, targetCodeId: string, studentCode: string) => Promise<void>;
  handleRequestLateSubmission: (assignmentId: string, challengeId: string, targetCodeId: string) => void;
  handleApproveLateSubmission: (classId: string, assignmentId: string, studentId: string, targetCodeId: string, newMaxScore?: number) => void;

  handleAddInstitution: (name: string, pricePerStudent: number) => void;
  handleUpdateInstitution: (updatedInstitution: Institution) => void;
  handleDeleteInstitution: (institutionId: string) => void;
  handleAssignInstitutionAdmin: (institutionId: string, userId: string, assign: boolean) => void;

  handleSimulatePayment: (selectedClassIds: string[], couponCode?: string) => void;

  handleCreateCoupon: (couponData: Omit<Coupon, 'id' | 'timesUsed' | 'creatorId'>) => void;
  handleUpdateCoupon: (updatedCoupon: Coupon) => void;
  handleDeleteCoupon: (couponId: string) => void;
  
  handleCreateAdminSupportRequest: (subject: string, message: string) => void;
  handleSendAdminChatMessage: (requestId: string, text: string) => void;
  handleUpdateAdminSupportRequestStatus: (requestId: string, status: 'open' | 'closed') => void;
  
  handleCreateAssistanceRequest: (classId: string, firstMessage: string) => void;
  handleSendAssistanceMessage: (classId: string, requestId: string, text: string) => void;
  handleCloseAssistanceRequest: (classId: string, requestId: string) => void;
  
  executeCodeApi: (code: string, input: string, language: SupportedLanguage, name: string) => Promise<any>;
}
