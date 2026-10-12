/**
 * Proctoring & Anti-Cheat Model for Voice AI Interview Platform
 * Tracks camera, audio, tab-blur, and eye-tracking events to guarantee test integrity.
 */

import { logger } from '../utils/logger';
import type {
  ProctoringEventType,
  ProctoringSeverity,
  IVoiceProctoringEvent,
  IVoiceProctoringData,
} from './voice.types';

export interface ProctoringRulesConfig {
  maxWarningsBeforeTermination: number;
  maxCriticalBeforeTermination: number;
  maxTotalPointDeduction: number;
  penaltyWeights: Record<ProctoringEventType, { severity: ProctoringSeverity; points: number }>;
}

export const DEFAULT_PROCTORING_RULES: ProctoringRulesConfig = {
  maxWarningsBeforeTermination: 5,
  maxCriticalBeforeTermination: 2,
  maxTotalPointDeduction: 30, // Max penalty on final interview score
  penaltyWeights: {
    head_turn: { severity: 'warning', points: 2 },
    looking_away: { severity: 'warning', points: 2 },
    no_face: { severity: 'warning', points: 4 },
    multiple_faces: { severity: 'critical', points: 10 },
    object_detected: { severity: 'critical', points: 10 }, // e.g. Phone, second screen
    background_voice: { severity: 'warning', points: 4 }, // Proxy interviewee detection
    tab_switch: { severity: 'warning', points: 5 },
    window_blur: { severity: 'warning', points: 3 },
  },
};

export class ProctoringModel {
  /**
   * Initialize a fresh proctoring session structure
   */
  static createInitialProctoringData(): IVoiceProctoringData {
    return {
      events: [],
      warningsCount: 0,
      criticalCount: 0,
      pointDeduction: 0,
      integrityScore: 100,
      isDisqualified: false,
    };
  }

  /**
   * Record a new proctoring event and compute updated metrics & termination state
   */
  static processEvent(
    currentData: IVoiceProctoringData,
    eventType: ProctoringEventType,
    customDescription?: string,
    metadata?: Record<string, any>,
    rules: ProctoringRulesConfig = DEFAULT_PROCTORING_RULES
  ): {
    updatedData: IVoiceProctoringData;
    shouldTerminate: boolean;
    terminationReason?: string;
  } {
    const rule = rules.penaltyWeights[eventType] || { severity: 'warning' as ProctoringSeverity, points: 2 };
    const eventDescription = customDescription || this.getDefaultDescription(eventType);

    const newEvent: IVoiceProctoringEvent = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      severity: rule.severity,
      description: eventDescription,
      penaltyPoints: rule.points,
      metadata,
    };

    const events = [...(currentData.events || []), newEvent];
    const warningsCount = events.filter((e) => e.severity === 'warning').length;
    const criticalCount = events.filter((e) => e.severity === 'critical').length;

    // Cumulative raw deduction capped at maximum rule limit
    const rawDeduction = events.reduce((sum, e) => sum + (e.penaltyPoints || 0), 0);
    const pointDeduction = Math.min(rules.maxTotalPointDeduction, rawDeduction);

    // Integrity score from 100 down to 0
    const integrityScore = Math.max(0, 100 - rawDeduction * 2);

    // Termination checks
    let isDisqualified = currentData.isDisqualified;
    let disqualificationReason = currentData.disqualificationReason;
    let shouldTerminate = false;

    if (criticalCount >= rules.maxCriticalBeforeTermination) {
      isDisqualified = true;
      disqualificationReason = `Severe integrity violation: ${criticalCount} critical anti-cheat incidents detected.`;
      shouldTerminate = true;
    } else if (warningsCount >= rules.maxWarningsBeforeTermination) {
      isDisqualified = true;
      disqualificationReason = `Exceeded warning threshold: ${warningsCount} warnings accumulated during voice interview.`;
      shouldTerminate = true;
    }

    if (shouldTerminate) {
      logger.warn(`Proctoring violation triggered termination: ${disqualificationReason}`);
    }

    const updatedData: IVoiceProctoringData = {
      events,
      warningsCount,
      criticalCount,
      pointDeduction,
      integrityScore,
      isDisqualified,
      disqualificationReason,
    };

    return {
      updatedData,
      shouldTerminate,
      terminationReason: disqualificationReason,
    };
  }

  /**
   * Produce a human-readable proctoring summary for the candidate feedback report
   */
  static generateReportSummary(proctoringData: IVoiceProctoringData): {
    status: 'clean' | 'minor_warnings' | 'flagged' | 'disqualified';
    integrityScore: number;
    summaryNotes: string[];
  } {
    const { warningsCount, criticalCount, isDisqualified, integrityScore } = proctoringData;

    let status: 'clean' | 'minor_warnings' | 'flagged' | 'disqualified' = 'clean';
    const notes: string[] = [];

    if (isDisqualified) {
      status = 'disqualified';
      notes.push('Interview flagged for critical integrity failure.');
    } else if (criticalCount > 0 || warningsCount >= 3) {
      status = 'flagged';
      notes.push('Multiple behavioral anomalies were logged during the session.');
    } else if (warningsCount > 0) {
      status = 'minor_warnings';
      notes.push('A few minor warnings occurred (e.g. momentary camera occlusion).');
    } else {
      notes.push('Candidate maintained spotless focus throughout the entire voice session.');
    }

    return {
      status,
      integrityScore,
      summaryNotes: notes,
    };
  }

  /**
   * Default user-facing explanation for each violation type
   */
  private static getDefaultDescription(type: ProctoringEventType): string {
    switch (type) {
      case 'head_turn':
        return 'Head turned away from camera';
      case 'looking_away':
        return 'Prolonged gaze deviation detected';
      case 'no_face':
        return 'No face visible in camera frame';
      case 'multiple_faces':
        return 'Multiple persons detected in candidate camera';
      case 'object_detected':
        return 'Unauthorized device or mobile phone detected';
      case 'background_voice':
        return 'Secondary voice or proxy speech detected';
      case 'tab_switch':
        return 'Candidate switched away from interview browser tab';
      case 'window_blur':
        return 'Interview window lost focus';
      default:
        return 'Proctoring alert';
    }
  }
}
