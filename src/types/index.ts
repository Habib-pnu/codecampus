

import { ReactNode } from "react";
import type { SkillAssessmentOutput } from "@/ai/types";

export interface User {
  id: string;
  username: string; // ชื่อผู้ใช้
  no: string; // No. (เลขที่)
  studentId: string; // Student ID (รหัสนักศึกษา) - New primary identifier for login
  fullName: string; // ชื่อ สกุล
  email: string;
  role: 'normal' | 'student' | 'lecturer' | 'institution_admin'; // Added institution_admin
  isAdmin: boolean; // Global Admin
  mustChangePassword?: boolean;
  completedExercises: { exerciseId: number; completedAt: string; }[];
  totalScore: number;
  enrolledClassIds: string[];
  institutionId?: string; // Associated institution
  billingBalance?: number;
  lastBillingCycleDate?: string;
}

export interface AssistantChatMessage {
  id: string;
  senderId: string;
  sender: 'student' | 'teacher';
  text: string;
  timestamp: string;
}

export interface ProblemAssistantRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  problemContext: string; // e.g., "Exercise: 'Hello, World!'", or a copy of the code/description
  status: 'open' | 'closed';
  createdAt: string;
  messages: AssistantChatMessage[];
}

export interface AdminChatMessage {
  id: string;
  senderId: string; // User ID of sender
  text: string;
  timestamp: string;
}

export interface AdminSupportRequest {
  id: string;
  requesterId: string; // User ID of lecturer/inst_admin
  requesterName: string;
  subject: string;
  status: 'open' | 'closed';
  createdAt: string;
  messages: AdminChatMessage[];
}


export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate?: string;
  classId?: string; 
  institutionId: string;
  maxUses?: number;
  timesUsed: number;
  creatorId: string;
  isActive: boolean;
}

export interface BillingTransaction {
  id: string;
  lecturerId: string;
  studentId: string;
  classId: string;
  amount: number;
  couponUsed?: string;
  timestamp: string;
  paid: boolean;
  finalAmountPaid?: number;
}

export interface Institution {
  id: string;
  name: string;
  pricePerStudent: number;
  adminUserIds: string[]; // User IDs of institution admins
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export type SupportedLanguage = 'cpp' | 'python' | 'html' | 'javascript' | 'react';

export interface LocalizedString {
  en: string;
  th?: string;
}

export interface Exercise {
  id: number;
  title: LocalizedString;
  description: LocalizedString;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  startingCode: string;
  points: number;
  language: SupportedLanguage;
  creatorId: string;
  scope: 'personal' | 'institutional' | 'global';
}

export interface CodeSnippet {
  id: string;
  title: string;
  code: string;
  userId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProgressDataPoint {
  name: string;
  exercises: number;
  problems?: number;
  [key: string]: any;
}

export interface ClassMember {
  userId: string;
  alias: string;
  joinedAt: string;
  status: 'active' | 'removed';
}

export interface AssignedExerciseInfo {
  exerciseId: number;
  addedAt: string;
  expiryDate?: string;
}

export type EnforcedStatement = 'if' | 'if-else' | 'switch' | 'for' | 'while' | 'do-while' | 'array' | 'pointer';

// Represents an assigned Week for a class
export interface AssignedChallengeInfo {
    assignmentId: string;
    labId: string; // The ID of the semester this week belongs to
    challengeId: string; // The ID of the week
    classId: string;
    assignedByLecturerId: string;
    expiryDate?: string;
    studentProgress: {
        [studentUserId: string]: StudentProgress;
    };
}

export interface StudentProgress {
  [targetCodeId: string]: StudentLabAttempt;
}

export interface PublicChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}


export interface ClassGroup {
  id: string;
  name: string;
  adminId: string; // User ID of the lecturer who created/administers the class
  classCode: string;
  assignedExercises: AssignedExerciseInfo[];
  members: ClassMember[];
  assignedChallenges: AssignedChallengeInfo[]; // This is now for assigned weeks
  status: 'pending' | 'active' | 'finished';
  startedAt?: string;
  finishedAt?: string;
  institutionId: string;
  isHalted?: boolean;
  capacity?: number;
  assistanceRequests: ProblemAssistantRequest[];
  publicChatMessages: PublicChatMessage[];
}

export interface LabTargetCode {
  id: string;
  code: string;
  description: string;
  sourceSnippetId?: string;
  enforcedStatement?: EnforcedStatement;
  requiredOutputSimilarity: number;
  points: number;
  testCases?: { input: string }[];
}

// Represents a Week within a Semester
export interface LabChallenge {
  id:string;
  labId: string;
  title: string;
  description: string;
  language: SupportedLanguage;
  targetCodes: LabTargetCode[];
}

// Represents a Semester
export interface Lab {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  creatorId: string;
  challenges: LabChallenge[]; // Represents the Weeks within a Semester
  isTemplate?: boolean; // If true, this is a semester that can be assigned
  scope: 'personal' | 'institutional' | 'global';
}

export interface StudentLabAttempt {
  studentCode: string;
  statementCheck: { required: EnforcedStatement; found: boolean } | null;
  outputComparisons: { input: string; studentOutput: string | null; targetOutput: string | null; passed: boolean, similarity: number }[];
  status: 'well-done' | 'good' | 'fail';
  lastCheckedAt: string;
  completed: boolean;
  language: SupportedLanguage;
  averageOutputSimilarity: number;
  score: number;
  assessment?: SkillAssessmentOutput;
  lateRequestStatus?: 'requested' | 'approved';
  lateSubmissionMaxScore?: number;
}

// Represents a single assignment of a Week to a Class
export interface LabAssignment {
  id: string;
  labId: string;
  challengeId: string;
  classId: string;
  assignedByLecturerId: string;
  expiryDate?: string;
  studentProgress: {
        [studentUserId: string]: StudentProgress;
  };
}
