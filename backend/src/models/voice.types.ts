/**
 * Voice AI Interview Platform - Domain Types and Schemas
 * Comprehensive type definitions specifically designed for real-time voice AI interviews.
 */

import type {
  UserRole,
  InterviewLevel,
  Company,
  InterviewStatus,
  SubscriptionTier,
} from '../types';

// Re-export basic shared types for convenient access from models
export type {
  UserRole,
  InterviewLevel,
  Company,
  InterviewStatus,
  SubscriptionTier,
};

// ============================================================================
// Voice & Audio Turn Types
// ============================================================================

export type SpeakerRole = 'interviewer' | 'candidate' | 'system';

export interface IVoiceMessage {
  id?: string;
  role: SpeakerRole;
  text: string;
  timestamp: string;
  isFollowUp?: boolean;
  questionId?: string;
  
  // Audio & Speech Telemetry
  audioDurationMs?: number;        // How long the speaker spoke in ms
  speechConfidence?: number;       // Speech-to-text confidence score (0.0 - 1.0)
  wordsPerMinute?: number;         // Speech tempo / pacing
  fillerWordsCount?: number;       // Count of filler words (um, uh, like, etc.)
  silenceBeforeMs?: number;        // Silence/pause latency before starting to speak
  bargeInInterruption?: boolean;   // Did candidate interrupt the interviewer?
  audioUrl?: string;               // Optional stored audio recording URL
}

// ============================================================================
// Voice Interviewer Persona
// ============================================================================

export type InterviewerPersonaId =
  | 'alex_staff_eng'
  | 'sarah_eng_director'
  | 'david_tech_lead'
  | 'elena_behavioral'
  | 'marcus_architect';

export type VoiceId =
  | 'alloy'
  | 'echo'
  | 'fable'
  | 'onyx'
  | 'nova'
  | 'shimmer';

export interface IInterviewerPersona {
  id: InterviewerPersonaId;
  name: string;
  title: string;
  avatarUrl: string;
  voiceId: VoiceId;
  ttsModel: string;
  speakingRate: number;            // 0.8 to 1.2
  pitch: number;                   // 0.8 to 1.2
  tone: 'supportive' | 'direct' | 'probing' | 'formal';
  interviewerStyle: string;        // Instructions injected into system prompt
  specialization: string[];        // Technical domains
}

// ============================================================================
// Real-time Voice Session & WebRTC State
// ============================================================================

export type TurnState =
  | 'idle'
  | 'ai_speaking'
  | 'user_speaking'
  | 'transcribing_stt'
  | 'thinking_llm'
  | 'synthesizing_tts';

export interface IVoiceLatencyMetrics {
  sttLatencyMs: number;            // Speech-to-text processing delay
  llmLatencyMs: number;            // LLM generation delay
  ttsLatencyMs: number;            // Text-to-speech audio synthesis delay
  totalRoundtripMs: number;        // Time from user silence to first AI audio packet
  timestamp: string;
}

export interface ISpeechMetricsSummary {
  averageWpm: number;              // Average candidate words per minute
  totalSpeakingDurationMs: number; // Total speaking time in ms
  candidateTurnCount: number;      // Total response turns
  interviewerTurnCount: number;    // Total questions & follow-ups
  totalFillerWords: number;        // Total "um", "uh", "you know" occurrences
  fillerWordDensity: number;       // Filler words per 100 words
  averageResponseLatencyMs: number;// Avg pause before answering
  interruptionsCount: number;      // Times candidate interrupted AI
}

export interface IVoiceSessionConfig {
  roomName: string;
  participantIdentity: string;
  token: string;
  livekitUrl: string;
  audioCodec: 'opus' | 'pcm';
  sampleRate: number;              // 16000, 24000, 48000
  enableBargeIn: boolean;          // Allow user voice to interrupt AI speech
  maxInterviewDurationMinutes: number;
}

// ============================================================================
// Proctoring & Anti-Cheat Telemetry
// ============================================================================

export type ProctoringEventType =
  | 'head_turn'
  | 'multiple_faces'
  | 'looking_away'
  | 'no_face'
  | 'object_detected'
  | 'background_voice'
  | 'tab_switch'
  | 'window_blur';

export type ProctoringSeverity = 'info' | 'warning' | 'critical';

export interface IVoiceProctoringEvent {
  id?: string;
  type: ProctoringEventType;
  timestamp: string;
  severity: ProctoringSeverity;
  description: string;
  penaltyPoints: number;
  metadata?: Record<string, any>;
}

export interface IVoiceProctoringData {
  events: IVoiceProctoringEvent[];
  warningsCount: number;
  criticalCount: number;
  pointDeduction: number;
  integrityScore: number;          // 0 to 100 (100 = spotless)
  isDisqualified: boolean;
  disqualificationReason?: string;
}

// ============================================================================
// Evaluation & Scoring Model
// ============================================================================

export type HiringRecommendation =
  | 'strong_hire'
  | 'hire'
  | 'lean_hire'
  | 'lean_no_hire'
  | 'no_hire';

export interface ICategoryScore {
  score: number;                   // 0 to 10
  feedback: string;
  highlights: string[];
  areasToImprove: string[];
}

export interface IVoiceEvaluationFeedback {
  // Primary Dimension Scores (0 - 10)
  communication: number;
  technicalAccuracy: number;
  problemSolving: number;
  confidence: number;
  
  // Overall Weighted Score (0 - 100)
  overallScore: number;
  hireRecommendation: HiringRecommendation;
  
  // Speech & Fluency Telemetry
  speechMetrics?: ISpeechMetricsSummary;
  
  // Detailed Observations
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  missedConcepts: string[];
  strongPoints: string[];
  improvementSuggestions: string[];
  detailedAnalysis: string;
  
  // Role & Company Specific Rubric
  roleCompetencyScore?: number;    // 0 - 10
  companyCultureFitScore?: number; // 0 - 10
  questionBreakdown?: {
    questionText: string;
    topic: string;
    score: number;
    feedback: string;
  }[];
}

// ============================================================================
// Adaptive Question Model Types
// ============================================================================

export interface IQuestionRubric {
  keyCriteria: string[];
  goodResponseIndicators: string[];
  poorResponseIndicators: string[];
  expectedKeywords: string[];
}

export interface IAdaptiveQuestion {
  id: string;
  role: UserRole;
  level: InterviewLevel;
  topic: string;
  text: string;
  difficulty: number;              // 1 to 10
  followUpPatterns?: string[];     // Triggers for deep-dive questions
  expectedKeywords?: string[];
  rubric?: IQuestionRubric;
  idealAnswerOutline?: string;
  companyTarget?: Company;
}
