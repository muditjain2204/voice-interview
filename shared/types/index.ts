/**
 * Shared types between frontend and backend
 * Used for type-safe API contracts
 */

// ============== User & Auth ==============
export type UserRole =
  | 'frontend_developer'
  | 'backend_developer'
  | 'react_native_developer'
  | 'node_js_developer'
  | 'data_structures_algorithms'
  | 'system_design'
  | 'hr_round'
  | 'ai_engineer'
  | 'data_analyst'
  | 'data_scientist'
  | 'product_manager'
  | 'consultant'
  | 'tax_analyst'
  | 'forward_deploy_engineer'
  | 'software_engineer';

export type InterviewLevel = 'easy' | 'medium' | 'hard';

export type Company =
  | 'google'
  | 'meta'
  | 'amazon'
  | 'microsoft'
  | 'apple'
  | 'netflix'
  | 'uber'
  | 'airbnb'
  | 'stripe'
  | 'openai'
  | 'anthropic'
  | 'databricks'
  | 'snowflake'
  | 'deloitte'
  | 'pwc'
  | 'mckinsey'
  | 'goldman_sachs'
  | 'jpmorgan';

export interface IUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyTarget?: Company;
  defaultLevel: InterviewLevel;
  credits: number;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface IAuthResponse {
  user: IUser;
  token: string;
}

// ============== Interview ==============
export type InterviewStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface IInterviewMessage {
  role: 'interviewer' | 'candidate';
  text: string;
  timestamp: string;
  isFollowUp?: boolean;
}

export interface IProctoringEvent {
  type: 'head_turn' | 'multiple_faces' | 'looking_away' | 'no_face' | 'object_detected';
  timestamp: string;
  severity: 'warning' | 'critical';
  description: string;
}

export interface IProctoringData {
  events: IProctoringEvent[];
  warningsCount: number;
  pointDeduction: number;
}

export interface IFeedback {
  communication: number;
  technicalAccuracy: number;
  problemSolving: number;
  confidence: number;
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missedConcepts: string[];
  strongPoints: string[];
  improvementSuggestions: string[];
  detailedAnalysis: string;
}

export interface IInterview {
  id: string;
  userId: string;
  role: UserRole;
  company?: Company;
  level: InterviewLevel;
  status: InterviewStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  transcript: IInterviewMessage[];
  proctoringData: IProctoringData;
  feedback?: IFeedback;
  createdAt: string;
}

// ============== Questions ==============
export interface IQuestion {
  id: string;
  role: UserRole;
  level: InterviewLevel;
  topic: string;
  text: string;
  followUpPatterns?: string[];
  expectedKeywords?: string[];
  difficulty: number; // 1-10
}

// ============== API Request/Response Types ==============
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyTarget?: Company;
  defaultLevel?: InterviewLevel;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ScheduleInterviewRequest {
  role: UserRole;
  company?: Company;
  level: InterviewLevel;
  scheduledAt: string;
}

export interface StartInterviewRequest {
  role: UserRole;
  company?: Company;
  level: InterviewLevel;
}

export interface StartInterviewResponse {
  interviewId: string;
  livekitToken: string;
  livekitUrl: string;
  greeting: string;
  firstQuestion: string;
}

export interface SendMessageRequest {
  interviewId: string;
  text: string;
  audioBase64?: string;
}

export interface SendMessageResponse {
  response: string;
  isFollowUp: boolean;
  shouldEnd: boolean;
  transcript: IInterviewMessage[];
}

export interface EndInterviewRequest {
  interviewId: string;
}

export interface EndInterviewResponse {
  feedback: IFeedback;
  proctoringData: IProctoringData;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
}
