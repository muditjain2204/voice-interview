/**
 * Interview Model for Voice AI Interview Platform
 * Manages the end-to-end lifecycle of real-time voice interviews, LiveKit session binding,
 * transcript persistence, proctoring events, and evaluation feedback.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type {
  IInterview,
  UserRole,
  InterviewLevel,
  Company,
  InterviewStatus,
} from '../types';
import type {
  IVoiceMessage,
  IVoiceProctoringData,
  IVoiceEvaluationFeedback,
  IInterviewerPersona,
  ProctoringEventType,
} from './voice.types';
import { VoiceSessionModel } from './voice-session.model';
import { ProctoringModel } from './proctoring.model';
import { FeedbackModel } from './feedback.model';
import { getRecommendedPersonaForRole } from './ai-models.config';

export interface StartInterviewData {
  userId: string;
  role: UserRole;
  level: InterviewLevel;
  company?: Company;
  persona?: IInterviewerPersona;
  livekitRoom?: string;
  livekitToken?: string;
  greetingText: string;
  openingQuestionText: string;
}

export interface ScheduleInterviewData {
  userId: string;
  role: UserRole;
  level: InterviewLevel;
  company?: Company;
  scheduledAt: Date;
}

export class InterviewModel {
  /**
   * Schedule an upcoming interview session
   */
  static async schedule(data: ScheduleInterviewData): Promise<IInterview> {
    const interview = await prisma.interview.create({
      data: {
        userId: data.userId,
        role: data.role as any,
        company: data.company as any,
        level: data.level as any,
        status: 'scheduled',
        scheduledAt: data.scheduledAt,
        transcript: [],
        proctoringData: ProctoringModel.createInitialProctoringData() as any,
      },
    });

    logger.info(`Scheduled interview ${interview.id} for user ${data.userId} on ${data.scheduledAt}`);
    return this.toClientInterview(interview);
  }

  /**
   * Initialize and start a live voice interview session
   */
  static async start(data: StartInterviewData): Promise<{
    interview: IInterview;
    voiceSession: VoiceSessionModel;
  }> {
    const interviewId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const persona = data.persona || getRecommendedPersonaForRole(data.role);

    // Initial transcript seeded with AI interviewer introduction and opening question
    const initialTranscript: IVoiceMessage[] = [
      {
        role: 'interviewer',
        text: data.greetingText,
        timestamp: new Date().toISOString(),
        audioDurationMs: 6000,
      },
      {
        role: 'interviewer',
        text: data.openingQuestionText,
        timestamp: new Date().toISOString(),
        isFollowUp: false,
        audioDurationMs: 5000,
      },
    ];

    const initialProctoring = ProctoringModel.createInitialProctoringData();

    const dbRecord = await prisma.interview.create({
      data: {
        id: interviewId,
        userId: data.userId,
        role: data.role as any,
        company: data.company as any,
        level: data.level as any,
        status: 'in_progress',
        startedAt: new Date(),
        transcript: initialTranscript as any,
        proctoringData: initialProctoring as any,
      },
    });

    const voiceSession = new VoiceSessionModel(interviewId, data.role, persona);

    logger.info(`Started live voice interview ${interviewId} with persona ${persona.name}`);
    return {
      interview: this.toClientInterview(dbRecord),
      voiceSession,
    };
  }

  /**
   * Find interview by ID
   */
  static async findById(id: string): Promise<IInterview | null> {
    try {
      const interview = await prisma.interview.findUnique({
        where: { id },
      });
      return interview ? this.toClientInterview(interview) : null;
    } catch (error) {
      logger.error(`InterviewModel.findById error for ${id}:`, error);
      return null;
    }
  }

  /**
   * Append a voice message turn to the interview transcript
   */
  static async appendMessage(
    interviewId: string,
    message: IVoiceMessage
  ): Promise<IInterview | null> {
    const existing = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!existing) return null;

    const transcript = Array.isArray(existing.transcript)
      ? [...(existing.transcript as any[]), message]
      : [message];

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: { transcript: transcript as any },
    });

    return this.toClientInterview(updated);
  }

  /**
   * Record a proctoring incident during voice interview
   */
  static async recordProctoringEvent(
    interviewId: string,
    eventType: ProctoringEventType,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<{
    interview: IInterview;
    shouldTerminate: boolean;
    terminationReason?: string;
  }> {
    const existing = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!existing) throw new Error('Interview not found');

    const currentProctoring: IVoiceProctoringData =
      (existing.proctoringData as any) || ProctoringModel.createInitialProctoringData();

    const result = ProctoringModel.processEvent(
      currentProctoring,
      eventType,
      description,
      metadata
    );

    const updateData: any = {
      proctoringData: result.updatedData as any,
    };

    if (result.shouldTerminate) {
      updateData.status = 'completed';
      updateData.completedAt = new Date();
      updateData.durationSeconds = this.calculateDurationSeconds(existing.startedAt);
    }

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: updateData,
    });

    return {
      interview: this.toClientInterview(updated),
      shouldTerminate: result.shouldTerminate,
      terminationReason: result.terminationReason,
    };
  }

  /**
   * Finalize interview session and store evaluation feedback
   */
  static async completeInterview(
    interviewId: string,
    feedback: IVoiceEvaluationFeedback
  ): Promise<IInterview> {
    const existing = await prisma.interview.findUnique({
      where: { id: interviewId },
    });
    if (!existing) throw new Error('Interview not found');

    const completedAt = new Date();
    const durationSeconds = this.calculateDurationSeconds(existing.startedAt);

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'completed',
        completedAt,
        durationSeconds,
        feedback: feedback as any,
      },
    });

    logger.info(`Completed interview ${interviewId}. Duration: ${durationSeconds}s. Score: ${feedback.overallScore}/100`);
    return this.toClientInterview(updated);
  }

  /**
   * List interviews for candidate dashboard
   */
  static async listUserInterviews(
    userId: string,
    status?: InterviewStatus
  ): Promise<IInterview[]> {
    const interviews = await prisma.interview.findMany({
      where: {
        userId,
        ...(status ? { status: status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    return interviews.map((i) => this.toClientInterview(i));
  }

  /**
   * Helper: Calculate elapsed duration in seconds
   */
  private static calculateDurationSeconds(startedAt?: Date | null): number {
    if (!startedAt) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
  }

  /**
   * Transform DB representation to client IInterview interface
   */
  static toClientInterview(raw: any): IInterview {
    return {
      id: raw.id,
      userId: raw.userId,
      role: raw.role as UserRole,
      company: raw.company ? (raw.company as Company) : undefined,
      level: raw.level as InterviewLevel,
      status: raw.status as InterviewStatus,
      scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt).toISOString() : undefined,
      startedAt: raw.startedAt ? new Date(raw.startedAt).toISOString() : undefined,
      completedAt: raw.completedAt ? new Date(raw.completedAt).toISOString() : undefined,
      durationSeconds: raw.durationSeconds ?? undefined,
      transcript: Array.isArray(raw.transcript) ? raw.transcript : [],
      proctoringData: raw.proctoringData && typeof raw.proctoringData === 'object'
        ? raw.proctoringData
        : { events: [], warningsCount: 0, pointDeduction: 0 },
      feedback: raw.feedback ?? undefined,
      createdAt: raw.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    };
  }
}
