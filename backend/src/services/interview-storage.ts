import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { IInterview, IInterviewMessage, IProctoringData, IFeedback } from '../types';

// In-memory fallback for when DB is not available
const inMemoryInterviews: Map<string, any> = new Map();

export class InterviewStorage {
  private useDb: boolean = true;

  constructor() {
    this.useDb = !!process.env.DATABASE_URL;
  }

  async createInterview(data: {
    userId: string;
    role: string;
    company?: string;
    level: string;
    scheduledAt?: Date;
  }): Promise<IInterview> {
    if (this.useDb) {
      try {
        const interview = await prisma.interview.create({
          data: {
            userId: data.userId,
            role: data.role as any,
            company: (data.company as any) || null,
            level: data.level as any,
            scheduledAt: data.scheduledAt,
            status: 'scheduled',
            transcript: [],
            proctoringData: { events: [], warningsCount: 0, pointDeduction: 0 },
          },
        });
        return interview as unknown as IInterview;
      } catch (error) {
        logger.error('DB createInterview failed, using in-memory:', error);
        this.useDb = false;
      }
    }

    const interview: IInterview = {
      id: `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: data.userId,
      role: data.role as any,
      company: data.company as any,
      level: data.level as any,
      status: 'scheduled',
      scheduledAt: data.scheduledAt?.toISOString(),
      transcript: [],
      proctoringData: { events: [], warningsCount: 0, pointDeduction: 0 },
      createdAt: new Date().toISOString(),
    };
    inMemoryInterviews.set(interview.id, interview);
    return interview;
  }

  async getInterview(id: string): Promise<IInterview | null> {
    if (this.useDb) {
      try {
        const interview = await prisma.interview.findUnique({
          where: { id },
        });
        return interview ? (interview as unknown as IInterview) : null;
      } catch (error) {
        logger.error('DB getInterview failed, using in-memory:', error);
        this.useDb = false;
      }
    }
    return inMemoryInterviews.get(id) || null;
  }

  async updateInterview(
    id: string,
    updates: Partial<IInterview>
  ): Promise<IInterview | null> {
    if (this.useDb) {
      try {
        const interview = await prisma.interview.update({
          where: { id },
          data: updates as any,
        });
        return interview as unknown as IInterview;
      } catch (error) {
        logger.error('DB updateInterview failed, using in-memory:', error);
        this.useDb = false;
      }
    }
    const existing = inMemoryInterviews.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates };
    inMemoryInterviews.set(id, updated);
    return updated;
  }

  async addMessage(
    interviewId: string,
    message: IInterviewMessage
  ): Promise<IInterview | null> {
    const interview = await this.getInterview(interviewId);
    if (!interview) return null;

    const updatedTranscript = [...(interview.transcript || []), message];
    return this.updateInterview(interviewId, { transcript: updatedTranscript });
  }

  async addProctoringEvent(
    interviewId: string,
    event: IProctoringData['events'][0]
  ): Promise<IInterview | null> {
    const interview = await this.getInterview(interviewId);
    if (!interview) return null;

    const events = [...(interview.proctoringData?.events || []), event];
    const warningsCount = events.filter(
      (e) => e.severity === 'warning'
    ).length;
    const pointDeduction = Math.min(
      20,
      warningsCount * 5
    );

    return this.updateInterview(interviewId, {
      proctoringData: {
        events,
        warningsCount,
        pointDeduction,
      },
    });
  }

  async setFeedback(
    interviewId: string,
    feedback: IFeedback
  ): Promise<IInterview | null> {
    return this.updateInterview(interviewId, { feedback });
  }

  async listUserInterviews(userId: string): Promise<IInterview[]> {
    if (this.useDb) {
      try {
        const interviews = await prisma.interview.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });
        return interviews as unknown as IInterview[];
      } catch (error) {
        logger.error('DB listUserInterviews failed, using in-memory:', error);
        this.useDb = false;
      }
    }
    return Array.from(inMemoryInterviews.values()).filter(
      (i) => i.userId === userId
    );
  }
}

export const interviewStorage = new InterviewStorage();