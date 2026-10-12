import { z } from 'zod';
import type {
  UserRole,
  Company,
  InterviewLevel,
  InterviewStatus,
  SubscriptionTier,
} from '../types';

// User roles enum matching shared types
export const userRoles: UserRole[] = [
  'frontend_developer',
  'backend_developer',
  'react_native_developer',
  'node_js_developer',
  'data_structures_algorithms',
  'system_design',
  'hr_round',
  'ai_engineer',
  'data_analyst',
  'data_scientist',
  'product_manager',
  'consultant',
  'tax_analyst',
  'forward_deploy_engineer',
  'software_engineer',
];

export const companies: Company[] = [
  'google',
  'meta',
  'amazon',
  'microsoft',
  'apple',
  'netflix',
  'uber',
  'airbnb',
  'stripe',
  'openai',
  'anthropic',
  'databricks',
  'snowflake',
  'deloitte',
  'pwc',
  'mckinsey',
  'goldman_sachs',
  'jpmorgan',
];

// Zod schemas for validation
export const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
  role: z.enum(userRoles as [UserRole, ...UserRole[]]),
  companyTarget: z.enum(companies as [Company, ...Company[]]).optional(),
  defaultLevel: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const scheduleInterviewSchema = z.object({
  role: z.enum(userRoles as [UserRole, ...UserRole[]]),
  company: z.enum(companies as [Company, ...Company[]]).optional(),
  level: z.enum(['easy', 'medium', 'hard']),
  scheduledAt: z.string().datetime({ message: 'Invalid datetime format' }),
});

export const startInterviewSchema = z.object({
  role: z.enum(userRoles as [UserRole, ...UserRole[]]),
  company: z.enum(companies as [Company, ...Company[]]).optional(),
  level: z.enum(['easy', 'medium', 'hard']),
});

export const sendMessageSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID is required'),
  text: z.string().optional(),
  audioBase64: z.string().optional(),
});

export const endInterviewSchema = z.object({
  interviewId: z.string().min(1, 'Interview ID is required'),
});

export const proctoringEventSchema = z.object({
  type: z.enum(['head_turn', 'multiple_faces', 'looking_away', 'no_face', 'object_detected']),
  severity: z.enum(['warning', 'critical']),
  description: z.string(),
});

// Type exports
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;
export type StartInterviewInput = z.infer<typeof startInterviewSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EndInterviewInput = z.infer<typeof endInterviewSchema>;
export type ProctoringEventInput = z.infer<typeof proctoringEventSchema>;

// Role display names for UI
export const roleDisplayNames: Record<UserRole, string> = {
  frontend_developer: 'Frontend Developer',
  backend_developer: 'Backend Developer',
  react_native_developer: 'React Native Developer',
  node_js_developer: 'Node.js Developer',
  data_structures_algorithms: 'Data Structures & Algorithms',
  system_design: 'System Design',
  hr_round: 'HR Round',
  ai_engineer: 'AI Engineer',
  data_analyst: 'Data Analyst',
  data_scientist: 'Data Scientist',
  product_manager: 'Product Manager',
  consultant: 'Consultant',
  tax_analyst: 'Tax Analyst',
  forward_deploy_engineer: 'Forward Deploy Engineer',
  software_engineer: 'Software Engineer',
};

// Company display names for UI
export const companyDisplayNames: Record<Company, string> = {
  google: 'Google',
  meta: 'Meta',
  amazon: 'Amazon',
  microsoft: 'Microsoft',
  apple: 'Apple',
  netflix: 'Netflix',
  uber: 'Uber',
  airbnb: 'Airbnb',
  stripe: 'Stripe',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  databricks: 'Databricks',
  snowflake: 'Snowflake',
  deloitte: 'Deloitte',
  pwc: 'PwC',
  mckinsey: 'McKinsey',
  goldman_sachs: 'Goldman Sachs',
  jpmorgan: 'JPMorgan',
};
