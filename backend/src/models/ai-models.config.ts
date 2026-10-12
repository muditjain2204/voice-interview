/**
 * AI Model Configurations & Presets for Voice AI Interview Platform
 * Defines supported LLMs, Speech-to-Text (STT), Text-to-Speech (TTS), and Interviewer Personas.
 */

import { IInterviewerPersona, InterviewerPersonaId } from './voice.types';

export interface ILLMModelConfig {
  provider: 'openai' | 'anthropic';
  modelId: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface ISTTModelConfig {
  provider: 'openai' | 'deepgram' | 'livekit';
  modelId: string;
  language: string;
  sampleRate: number;
  punctuate: boolean;
  smartFormatting: boolean;
  detectFillerWords: boolean;
}

export interface ITTSModelConfig {
  provider: 'openai' | 'elevenlabs';
  modelId: string;
  defaultVoice: string;
  format: 'mp3' | 'opus' | 'pcm';
  speed: number;
}

export const AI_MODELS_REGISTRY = {
  llm: {
    openaiGpt4o: {
      provider: 'openai',
      modelId: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 350, // Keep turns conversational & concise for voice
      presencePenalty: 0.1,
      frequencyPenalty: 0.1,
    } as ILLMModelConfig,
    openaiGpt4oMini: {
      provider: 'openai',
      modelId: 'gpt-4o-mini',
      temperature: 0.5,
      maxTokens: 250,
    } as ILLMModelConfig,
    anthropicClaudeSonnet: {
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20241022',
      temperature: 0.6,
      maxTokens: 350,
    } as ILLMModelConfig,
  },
  stt: {
    whisper: {
      provider: 'openai',
      modelId: 'whisper-1',
      language: 'en',
      sampleRate: 24000,
      punctuate: true,
      smartFormatting: true,
      detectFillerWords: true,
    } as ISTTModelConfig,
    deepgramNova2: {
      provider: 'deepgram',
      modelId: 'nova-2-general',
      language: 'en-US',
      sampleRate: 48000,
      punctuate: true,
      smartFormatting: true,
      detectFillerWords: true,
    } as ISTTModelConfig,
  },
  tts: {
    openaiTts1: {
      provider: 'openai',
      modelId: 'tts-1',
      defaultVoice: 'alloy',
      format: 'opus',
      speed: 1.0,
    } as ITTSModelConfig,
    openaiTtsHd: {
      provider: 'openai',
      modelId: 'tts-1-hd',
      defaultVoice: 'nova',
      format: 'opus',
      speed: 1.02,
    } as ITTSModelConfig,
  },
};

/**
 * Pre-configured AI Interviewer Personas
 */
export const INTERVIEWER_PERSONAS: Record<InterviewerPersonaId, IInterviewerPersona> = {
  alex_staff_eng: {
    id: 'alex_staff_eng',
    name: 'Alex Vance',
    title: 'Staff Software Engineer & Technical Bar Raiser',
    avatarUrl: '/avatars/interviewer-alex.png',
    voiceId: 'alloy',
    ttsModel: 'tts-1',
    speakingRate: 1.0,
    pitch: 1.0,
    tone: 'probing',
    interviewerStyle:
      'Probing, analytical, and focused on system scalability, edge cases, trade-offs, and deep technical comprehension. Pushes the candidate gently when answers are superficial.',
    specialization: ['distributed_systems', 'system_design', 'backend', 'performance'],
  },
  sarah_eng_director: {
    id: 'sarah_eng_director',
    name: 'Sarah Chen',
    title: 'Director of Engineering',
    avatarUrl: '/avatars/interviewer-sarah.png',
    voiceId: 'nova',
    ttsModel: 'tts-1-hd',
    speakingRate: 1.02,
    pitch: 1.0,
    tone: 'supportive',
    interviewerStyle:
      'Warm, professional, articulate, and structured. Focuses on architectural clarity, business impact, pragmatic decision-making, and communication skills.',
    specialization: ['frontend', 'fullstack', 'architecture', 'engineering_leadership'],
  },
  david_tech_lead: {
    id: 'david_tech_lead',
    name: 'David Miller',
    title: 'Principal Algorithms & Data Lead',
    avatarUrl: '/avatars/interviewer-david.png',
    voiceId: 'echo',
    ttsModel: 'tts-1',
    speakingRate: 0.98,
    pitch: 0.95,
    tone: 'direct',
    interviewerStyle:
      'Direct, methodical, and data-driven. Emphasizes Big-O time and space complexity, algorithmic correctness, data structure choices, and clean code principles.',
    specialization: ['data_structures_algorithms', 'data_science', 'ai_engineering'],
  },
  elena_behavioral: {
    id: 'elena_behavioral',
    name: 'Elena Rostova',
    title: 'Senior People Partner & Behavioral Interview Specialist',
    avatarUrl: '/avatars/interviewer-elena.png',
    voiceId: 'shimmer',
    ttsModel: 'tts-1',
    speakingRate: 1.0,
    pitch: 1.05,
    tone: 'supportive',
    interviewerStyle:
      'Empathetic, engaging, and structured around the STAR method (Situation, Task, Action, Result). Evaluates cross-functional conflict resolution, ownership, and values alignment.',
    specialization: ['hr_round', 'behavioral', 'leadership_principles'],
  },
  marcus_architect: {
    id: 'marcus_architect',
    name: 'Marcus Brody',
    title: 'Cloud & Infrastructure Solutions Architect',
    avatarUrl: '/avatars/interviewer-marcus.png',
    voiceId: 'onyx',
    ttsModel: 'tts-1',
    speakingRate: 0.95,
    pitch: 0.9,
    tone: 'formal',
    interviewerStyle:
      'Methodical, enterprise-focused, and thorough. Evaluates resilience, CAP theorem tradeoffs, fault tolerance, security, and cloud scalability.',
    specialization: ['cloud_infrastructure', 'devops', 'system_design'],
  },
};

/**
 * Helper to select the optimal interviewer persona based on target role
 */
export function getRecommendedPersonaForRole(role: string): IInterviewerPersona {
  switch (role) {
    case 'data_structures_algorithms':
    case 'data_analyst':
    case 'data_scientist':
    case 'ai_engineer':
      return INTERVIEWER_PERSONAS.david_tech_lead;

    case 'system_design':
    case 'forward_deploy_engineer':
      return INTERVIEWER_PERSONAS.alex_staff_eng;

    case 'hr_round':
    case 'consultant':
    case 'tax_analyst':
      return INTERVIEWER_PERSONAS.elena_behavioral;

    case 'frontend_developer':
    case 'react_native_developer':
    case 'node_js_developer':
    case 'backend_developer':
    case 'software_engineer':
    case 'product_manager':
    default:
      return INTERVIEWER_PERSONAS.sarah_eng_director;
  }
}
