/**
 * Voice Session Model for Voice AI Interview Platform
 * Manages real-time WebRTC LiveKit voice states, turn-taking, latency tracking, and speech metrics.
 */

import { logger } from '../utils/logger';
import {
  TurnState,
  IVoiceLatencyMetrics,
  ISpeechMetricsSummary,
  IVoiceMessage,
  IInterviewerPersona,
} from './voice.types';
import { getRecommendedPersonaForRole } from './ai-models.config';

export interface TurnTiming {
  speechStartMs: number;
  speechEndMs: number;
  durationMs: number;
}

export class VoiceSessionModel {
  public readonly interviewId: string;
  public readonly role: string;
  public readonly persona: IInterviewerPersona;
  
  private currentState: TurnState = 'idle';
  private latencyHistory: IVoiceLatencyMetrics[] = [];
  private totalCandidateWords: number = 0;
  private totalCandidateSpeakingMs: number = 0;
  private candidateTurnCount: number = 0;
  private interviewerTurnCount: number = 0;
  private totalFillerWords: number = 0;
  private interruptionsCount: number = 0;
  private lastSpeakerRole?: 'interviewer' | 'candidate';
  private lastTurnEndTimestamp: number = Date.now();

  constructor(interviewId: string, role: string, customPersona?: IInterviewerPersona) {
    this.interviewId = interviewId;
    this.role = role;
    this.persona = customPersona || getRecommendedPersonaForRole(role);
  }

  /**
   * Get current real-time voice turn state
   */
  getState(): TurnState {
    return this.currentState;
  }

  /**
   * Transition turn-taking state
   */
  setState(newState: TurnState): void {
    logger.debug(`[VoiceSession ${this.interviewId}] State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
  }

  /**
   * Record latency benchmark for a conversational turn
   */
  recordLatency(metrics: Omit<IVoiceLatencyMetrics, 'timestamp'>): void {
    const entry: IVoiceLatencyMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
    };
    this.latencyHistory.push(entry);
    logger.debug(`[VoiceSession ${this.interviewId}] Latency: Roundtrip=${entry.totalRoundtripMs}ms (STT=${entry.sttLatencyMs}ms, LLM=${entry.llmLatencyMs}ms, TTS=${entry.ttsLatencyMs}ms)`);
  }

  /**
   * Process and analyze candidate spoken transcript turn
   */
  processCandidateVoiceTurn(
    text: string,
    audioDurationMs?: number,
    confidence?: number
  ): IVoiceMessage {
    const now = Date.now();
    const silenceBeforeMs = Math.max(0, now - this.lastTurnEndTimestamp);

    // Analyze filler words in speech
    const fillerWords = this.detectFillerWords(text);
    this.totalFillerWords += fillerWords.length;

    // Word count & WPM estimation
    const words = text.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    this.totalCandidateWords += wordCount;

    // Speaking duration
    const durationMs = audioDurationMs || Math.max(1000, wordCount * 350); // fallback ~170 WPM
    this.totalCandidateSpeakingMs += durationMs;
    this.candidateTurnCount += 1;

    const wordsPerMinute = durationMs > 0
      ? Math.round((wordCount / (durationMs / 60000)))
      : 130;

    // Did candidate interrupt while AI was speaking?
    const bargeInInterruption = this.currentState === 'ai_speaking';
    if (bargeInInterruption) {
      this.interruptionsCount += 1;
      logger.info(`[VoiceSession ${this.interviewId}] Candidate barge-in interruption detected.`);
    }

    this.lastSpeakerRole = 'candidate';
    this.lastTurnEndTimestamp = Date.now();

    const voiceMessage: IVoiceMessage = {
      role: 'candidate',
      text,
      timestamp: new Date().toISOString(),
      audioDurationMs: durationMs,
      speechConfidence: confidence ?? 0.95,
      wordsPerMinute,
      fillerWordsCount: fillerWords.length,
      silenceBeforeMs,
      bargeInInterruption,
    };

    return voiceMessage;
  }

  /**
   * Process interviewer spoken turn
   */
  processInterviewerVoiceTurn(
    text: string,
    isFollowUp: boolean = false,
    questionId?: string
  ): IVoiceMessage {
    this.interviewerTurnCount += 1;
    this.lastSpeakerRole = 'interviewer';
    this.lastTurnEndTimestamp = Date.now();

    const words = text.trim().split(/\s+/).filter(Boolean);
    const estimatedDurationMs = Math.max(1500, words.length * 300);

    return {
      role: 'interviewer',
      text,
      timestamp: new Date().toISOString(),
      isFollowUp,
      questionId,
      audioDurationMs: estimatedDurationMs,
    };
  }

  /**
   * Calculate cumulative speech & fluency metrics for the interview
   */
  getSpeechMetricsSummary(): ISpeechMetricsSummary {
    const totalMinutes = this.totalCandidateSpeakingMs / 60000;
    const averageWpm = totalMinutes > 0
      ? Math.round(this.totalCandidateWords / totalMinutes)
      : 130;

    const fillerWordDensity = this.totalCandidateWords > 0
      ? Math.round((this.totalFillerWords / this.totalCandidateWords) * 100 * 10) / 10
      : 0;

    const avgResponseLatencyMs = this.candidateTurnCount > 0
      ? Math.round(this.totalCandidateSpeakingMs / this.candidateTurnCount)
      : 0;

    return {
      averageWpm,
      totalSpeakingDurationMs: this.totalCandidateSpeakingMs,
      candidateTurnCount: this.candidateTurnCount,
      interviewerTurnCount: this.interviewerTurnCount,
      totalFillerWords: this.totalFillerWords,
      fillerWordDensity,
      averageResponseLatencyMs: avgResponseLatencyMs,
      interruptionsCount: this.interruptionsCount,
    };
  }

  /**
   * Compute average real-time latencies across all voice turns
   */
  getAverageLatency(): {
    avgSttLatencyMs: number;
    avgLlmLatencyMs: number;
    avgTtsLatencyMs: number;
    avgTotalRoundtripMs: number;
  } {
    if (this.latencyHistory.length === 0) {
      return {
        avgSttLatencyMs: 0,
        avgLlmLatencyMs: 0,
        avgTtsLatencyMs: 0,
        avgTotalRoundtripMs: 0,
      };
    }

    const sum = this.latencyHistory.reduce(
      (acc, val) => ({
        stt: acc.stt + val.sttLatencyMs,
        llm: acc.llm + val.llmLatencyMs,
        tts: acc.tts + val.ttsLatencyMs,
        roundtrip: acc.roundtrip + val.totalRoundtripMs,
      }),
      { stt: 0, llm: 0, tts: 0, roundtrip: 0 }
    );

    const count = this.latencyHistory.length;
    return {
      avgSttLatencyMs: Math.round(sum.stt / count),
      avgLlmLatencyMs: Math.round(sum.llm / count),
      avgTtsLatencyMs: Math.round(sum.tts / count),
      avgTotalRoundtripMs: Math.round(sum.roundtrip / count),
    };
  }

  /**
   * Filler word detector (um, uh, like, you know, basically, sort of)
   */
  private detectFillerWords(text: string): string[] {
    const fillerPatterns = /\b(um|uh|er|ah|like|you know|basically|actually|sort of|kind of|i mean)\b/gi;
    const matches = text.match(fillerPatterns);
    return matches || [];
  }
}
