/**
 * Feedback Model for Voice AI Interview Platform
 * Manages scoring rubrics, speech pacing analysis, hiring recommendations, and post-interview feedback.
 */

import { logger } from '../utils/logger';
import type {
  IVoiceEvaluationFeedback,
  HiringRecommendation,
  ISpeechMetricsSummary,
  IVoiceProctoringData,
  IVoiceMessage,
} from './voice.types';
import type { IFeedback } from '../types';

export class FeedbackModel {
  /**
   * Weights for overall composite score calculation (sum to 1.0)
   */
  public static readonly WEIGHTS = {
    technicalAccuracy: 0.35,
    problemSolving: 0.25,
    communication: 0.20,
    confidence: 0.10,
    integrity: 0.10,
  };

  /**
   * Compute final weighted overall score (0 - 100) incorporating proctoring integrity
   */
  static computeOverallScore(
    scores: {
      technicalAccuracy: number; // 0-10
      problemSolving: number;    // 0-10
      communication: number;     // 0-10
      confidence: number;        // 0-10
    },
    integrityScore: number = 100, // 0-100
    proctoringDeductions: number = 0
  ): number {
    const techWeighted = (scores.technicalAccuracy / 10) * 100 * this.WEIGHTS.technicalAccuracy;
    const psWeighted = (scores.problemSolving / 10) * 100 * this.WEIGHTS.problemSolving;
    const commWeighted = (scores.communication / 10) * 100 * this.WEIGHTS.communication;
    const confWeighted = (scores.confidence / 10) * 100 * this.WEIGHTS.confidence;
    const integrityWeighted = integrityScore * this.WEIGHTS.integrity;

    let total = techWeighted + psWeighted + commWeighted + confWeighted + integrityWeighted;
    total = total - proctoringDeductions;

    return Math.max(0, Math.min(100, Math.round(total)));
  }

  /**
   * Determine standardized hiring recommendation based on score and integrity
   */
  static determineHiringRecommendation(
    overallScore: number,
    isDisqualified: boolean = false
  ): HiringRecommendation {
    if (isDisqualified || overallScore < 50) {
      return 'no_hire';
    }
    if (overallScore >= 85) {
      return 'strong_hire';
    }
    if (overallScore >= 75) {
      return 'hire';
    }
    if (overallScore >= 65) {
      return 'lean_hire';
    }
    return 'lean_no_hire';
  }

  /**
   * Produce qualitative voice fluency feedback from speech metrics
   */
  static analyzeVoiceFluency(speechMetrics?: ISpeechMetricsSummary): {
    pacingFeedback: string;
    fillerWordsFeedback: string;
    fluencySuggestions: string[];
  } {
    if (!speechMetrics) {
      return {
        pacingFeedback: 'Speech pacing was within the standard conversational range.',
        fillerWordsFeedback: 'Filler word usage was normal.',
        fluencySuggestions: [],
      };
    }

    const { averageWpm, fillerWordDensity } = speechMetrics;
    const fluencySuggestions: string[] = [];

    // Pacing evaluation
    let pacingFeedback = '';
    if (averageWpm < 110) {
      pacingFeedback = `Pacing was slightly deliberate (${averageWpm} WPM). Strive for a brisk, confident rhythm (125-155 WPM).`;
      fluencySuggestions.push('Practice answering technical questions at a steady 130-150 words per minute.');
    } else if (averageWpm > 175) {
      pacingFeedback = `Pacing was fast (${averageWpm} WPM). Slowing down will give you more breathing room to organize complex thoughts.`;
      fluencySuggestions.push('Take a 2-second pause before tackling complex architectural questions to avoid rushing.');
    } else {
      pacingFeedback = `Excellent speech pacing (${averageWpm} WPM), well-suited for professional technical communication.`;
    }

    // Filler word density evaluation
    let fillerWordsFeedback = '';
    if (fillerWordDensity > 5.0) {
      fillerWordsFeedback = `High frequency of filler words (${fillerWordDensity}% of words spoken). Replace "um" or "like" with silent pauses.`;
      fluencySuggestions.push('Embrace deliberate silence instead of vocalized fillers while thinking.');
    } else if (fillerWordDensity > 2.5) {
      fillerWordsFeedback = `Moderate filler words (${fillerWordDensity}%). Natural, but can be polished for leadership rounds.`;
    } else {
      fillerWordsFeedback = `Very low filler word frequency (${fillerWordDensity}%). Clear, articulate, and poised delivery.`;
    }

    return {
      pacingFeedback,
      fillerWordsFeedback,
      fluencySuggestions,
    };
  }

  /**
   * Format structured feedback object conforming to both IVoiceEvaluationFeedback and IFeedback
   */
  static formatFeedback(
    raw: Partial<IVoiceEvaluationFeedback>,
    speechMetrics?: ISpeechMetricsSummary,
    proctoringData?: IVoiceProctoringData
  ): IVoiceEvaluationFeedback {
    const comm = Math.max(0, Math.min(10, raw.communication ?? 7));
    const tech = Math.max(0, Math.min(10, raw.technicalAccuracy ?? 7));
    const ps = Math.max(0, Math.min(10, raw.problemSolving ?? 7));
    const conf = Math.max(0, Math.min(10, raw.confidence ?? 7));

    const integrityScore = proctoringData?.integrityScore ?? 100;
    const proctoringDeductions = proctoringData?.pointDeduction ?? 0;

    const overallScore = raw.overallScore !== undefined
      ? raw.overallScore
      : this.computeOverallScore(
          { communication: comm, technicalAccuracy: tech, problemSolving: ps, confidence: conf },
          integrityScore,
          proctoringDeductions
        );

    const hireRecommendation = raw.hireRecommendation ||
      this.determineHiringRecommendation(overallScore, proctoringData?.isDisqualified);

    const fluency = this.analyzeVoiceFluency(speechMetrics);

    const improvementSuggestions = [
      ...(raw.improvementSuggestions || []),
      ...fluency.fluencySuggestions,
    ];

    return {
      communication: comm,
      technicalAccuracy: tech,
      problemSolving: ps,
      confidence: conf,
      overallScore,
      hireRecommendation,
      speechMetrics,
      strengths: raw.strengths && raw.strengths.length > 0
        ? raw.strengths
        : ['Demonstrated clear problem engagement', 'Maintained professional composure during questions'],
      weaknesses: raw.weaknesses && raw.weaknesses.length > 0
        ? raw.weaknesses
        : ['Could expand further on failure recovery and edge cases'],
      recommendations: raw.recommendations && raw.recommendations.length > 0
        ? raw.recommendations
        : ['Review distributed caching and consistency models', 'Practice structuring responses with the STAR framework'],
      missedConcepts: raw.missedConcepts || [],
      strongPoints: raw.strongPoints || ['Good foundational grasp of the core concepts'],
      improvementSuggestions: improvementSuggestions.slice(0, 5),
      detailedAnalysis: raw.detailedAnalysis ||
        `The candidate demonstrated solid baseline competency with an overall score of ${overallScore}/100. ${fluency.pacingFeedback} ${fluency.fillerWordsFeedback}`,
    };
  }

  /**
   * Rule-based fallback feedback generator when AI APIs are unreachable
   */
  static generateFallback(
    transcript: IVoiceMessage[],
    proctoringData?: IVoiceProctoringData,
    role?: string,
    level?: string
  ): IVoiceEvaluationFeedback {
    const candidateMessages = transcript.filter((m) => m.role === 'candidate');
    const totalWords = candidateMessages.reduce((sum, m) => sum + m.text.split(/\s+/).length, 0);

    // Heuristics based on response length and turn count
    const communicationScore = totalWords > 250 ? 8 : totalWords > 100 ? 7 : 5;
    const technicalScore = candidateMessages.length >= 3 ? 7 : 6;
    const problemSolvingScore = totalWords > 200 ? 7 : 6;
    const confidenceScore = candidateMessages.length >= 2 ? 8 : 6;

    const overallScore = this.computeOverallScore(
      {
        communication: communicationScore,
        technicalAccuracy: technicalScore,
        problemSolving: problemSolvingScore,
        confidence: confidenceScore,
      },
      proctoringData?.integrityScore ?? 100,
      proctoringData?.pointDeduction ?? 0
    );

    return this.formatFeedback(
      {
        communication: communicationScore,
        technicalAccuracy: technicalScore,
        problemSolving: problemSolvingScore,
        confidence: confidenceScore,
        overallScore,
        strengths: [
          'Communicated reasoning clearly during voice dialogue',
          'Demonstrated good fundamental understanding of core domain principles',
          'Maintained composure and answered in complete thoughts',
        ],
        weaknesses: [
          'Could elaborate more thoroughly on distributed scale considerations',
          'Could provide deeper quantitative trade-off metrics',
        ],
        recommendations: [
          'Practice system design walk-throughs under real-time voice constraints',
          'Deepen familiarity with high-availability architectures',
        ],
        missedConcepts: ['Idempotency handling', 'Data replication tradeoffs'],
        strongPoints: ['Professional tone', 'Structured explanations'],
        improvementSuggestions: [
          'Structure architectural explanations starting from high-level topology before diving into component internals.',
        ],
        detailedAnalysis: `In this ${role || 'software engineering'} interview (${level || 'medium'} level), the candidate completed ${candidateMessages.length} spoken responses totaling approximately ${totalWords} words. Overall communication was clear with an evaluation score of ${overallScore}/100.`,
      },
      undefined,
      proctoringData
    );
  }
}
