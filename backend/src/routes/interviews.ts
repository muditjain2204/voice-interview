import { Router, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/error';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { prisma } from '../prisma/client';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sendInterviewScheduledEmail } from '../services/email';
import { generateInterviewGreetingAndQuestion } from '../services/interview-engine';

// Zod schemas for interview routes
const startInterviewSchema = z.object({
  role: z.string(),
  company: z.string().optional(),
  level: z.enum(['easy', 'medium', 'hard']),
});

export type StartInterviewInput = z.infer<typeof startInterviewSchema>;

const scheduleInterviewSchema = z.object({
  role: z.string(),
  company: z.string().optional(),
  level: z.enum(['easy', 'medium', 'hard']),
  scheduledAt: z.string().datetime(),
});

export type ScheduleInterviewInput = z.infer<typeof scheduleInterviewSchema>;

export interface InterviewResponse {
  interviewId: string;
  livekitUrl: string;
  livekitToken: string;
  greeting: string;
  firstQuestion: string;
}

const router = Router();

// All routes below require authentication
router.use(authenticateToken);

// Credit limits per subscription tier
const CREDIT_LIMITS: Record<string, number> = {
  free: 2,
  pro: 20,
  enterprise: 100,
};

/**
 * POST /api/v1/interviews/schedule
 * Schedule a new interview
 */
router.post(
  '/schedule',
  validateRequest(scheduleInterviewSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { role, company, level, scheduledAt } = req.body as ScheduleInterviewInput;

    // Validate role using enum values
    const validRoles = [
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

    if (!validRoles.includes(role)) {
      throw new AppError(400, 'Invalid role selected');
    }

    // Validate company if provided
    const validCompanies = [
      'google', 'meta', 'amazon', 'microsoft', 'apple', 'netflix',
      'uber', 'airbnb', 'stripe', 'openai', 'anthropic',
      'databricks', 'snowflake', 'deloitte', 'pwc', 'mckinsey',
      'goldman_sachs', 'jpmorgan',
    ];

    if (company && !validCompanies.includes(company)) {
      throw new AppError(400, 'Invalid company selected');
    }

    // Create interview record - use company enum string directly
    const interview = await prisma.interview.create({
      data: {
        userId: userId as string,
        role: role as any,
        company: company as any,
        level: level as any,
        scheduledAt: new Date(scheduledAt),
        status: 'scheduled',
        transcript: [],
        proctoringData: { events: [], warningsCount: 0, pointDeduction: 0 },
      },
    });

    // Send email notification
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      await sendInterviewScheduledEmail(
        user.email,
        user.name,
        role,
        scheduledAt
      );
    }

    logger.info(`Interview scheduled: ${interview.id} for role ${role}`);

    res.status(201).json({
      interviewId: interview.id,
      role,
      level,
      company,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
    });
  })
);

/**
 * POST /api/v1/interviews/start
 * Start a live interview session
 */
router.post(
  '/start',
  validateRequest(startInterviewSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { role, company, level } = req.body as StartInterviewInput;

    // Validate role
    const validRoles = [
      'frontend_developer', 'backend_developer', 'react_native_developer',
      'node_js_developer', 'data_structures_algorithms', 'system_design',
      'hr_round', 'ai_engineer', 'data_analyst', 'data_scientist',
      'product_manager', 'consultant', 'tax_analyst', 'forward_deploy_engineer',
      'software_engineer',
    ];

    if (!validRoles.includes(role)) {
      throw new AppError(400, 'Invalid role');
    }

    // Check credits
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(401, 'User not found');
    }
    if (user.credits < 1) {
      throw new AppError(402, 'Not enough credits. Please upgrade your plan.');
    }

    // Deduct 1 credit
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 1 } },
    });

    // Generate LiveKit session (gracefully skip if LiveKit credentials are not set)
    const interviewId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    let livekitUrl = '';
    let livekitToken = '';
    try {
      const session = await import('../services/livekit').then(m => m.createInterviewSession(interviewId, 'Interviewee'));
      livekitUrl = session.url;
      livekitToken = session.token;
    } catch (sessionError) {
      logger.warn('LiveKit session skipped or credentials missing:', sessionError);
    }

    // Generate greeting and first question using AI Interview Engine
    const { greeting, firstQuestion } = await generateInterviewGreetingAndQuestion({
      role,
      level,
      company,
    });

    // Create interview record in DB
    await prisma.interview.create({
      data: {
        id: interviewId,
        userId: userId as string,
        role: role as any,
        company: company as any,
        level: level as any,
        status: 'in_progress',
        startedAt: new Date(),
        transcript: [
          { role: 'interviewer', text: greeting, timestamp: new Date().toISOString() },
          { role: 'interviewer', text: firstQuestion, timestamp: new Date().toISOString(), isFollowUp: false },
        ],
        proctoringData: { events: [], warningsCount: 0, pointDeduction: 0 },
      },
    });

    logger.info(`Interview started: ${interviewId} for role ${role} (1 credit deducted from user ${userId})`);

    // Return interview session info
    res.json({
      interviewId,
      livekitUrl,
      livekitToken,
      greeting,
      firstQuestion,
      status: 'in_progress',
      role,
      level,
    });
  })
);

/**
 * POST /api/v1/interviews/messages
 * Send a message (voice transcript) during interview
 */
router.post(
  '/messages',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { interviewId, text } = req.body;

    if (!interviewId || !text) {
      throw new AppError(400, 'Interview ID and text required');
    }

    // Find the interview
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    if (interview.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    if (interview.status !== 'in_progress') {
      throw new AppError(400, 'Interview not in progress');
    }

    // Import the engine dynamically to avoid circular dependency
    const { processInterviewMessage } = await import('../services/interview-engine');

    // Get transcript history
    const transcriptHistory = interview.transcript as any[];

    // Process with AI
    const engineResponse = await processInterviewMessage(
      interviewId,
      text,
      transcriptHistory
    );

    // Update transcript
    const newTranscript = [
      ...(interview.transcript as any[]),
      { role: 'candidate', text, timestamp: new Date().toISOString() },
      { role: 'interviewer', text: engineResponse.response, timestamp: new Date().toISOString(), isFollowUp: engineResponse.isFollowUp },
    ];

    await prisma.interview.update({
      where: { id: interviewId },
      data: { transcript: newTranscript },
    });

    // Check if interview should end
    if (engineResponse.shouldEnd) {
      await prisma.interview.update({
        where: { id: interviewId },
        data: {
          status: 'completed',
          completedAt: new Date(),
          durationSeconds: calculateDuration(interview.startedAt),
        },
      });

      // Get feedback
      const { generateFeedback } = await import('../services/feedback-engine');
      const feedback = await generateFeedback(
        newTranscript.map((m: any) => ({ role: m.role, text: m.text, timestamp: m.timestamp })),
        interview.proctoringData as any,
        interview.role,
        interview.level
      );

      await prisma.interview.update({
        where: { id: interviewId },
        data: { feedback: feedback as any },
      });

      return res.json({
        ...engineResponse,
        interviewEnded: true,
        feedback,
      });
    }

    res.json({
      ...engineResponse,
      interviewEnded: false,
    });
  })
);

/**
 * POST /api/v1/interviews/end
 * End the interview and generate feedback
 */
router.post(
  '/end',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { interviewId } = req.body;

    if (!interviewId) {
      throw new AppError(400, 'Interview ID required');
    }

    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    if (interview.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    // Mark as completed
    await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        durationSeconds: calculateDuration(interview.startedAt),
      },
    });

    // Generate feedback
    const { generateFeedback } = await import('../services/feedback-engine');
    const feedback = await generateFeedback(
      interview.transcript as any,
      interview.proctoringData as any,
      interview.role,
      interview.level
    );

    await prisma.interview.update({
      where: { id: interviewId },
      data: { feedback: feedback as any },
    });

    res.json({
      interviewId,
      feedback,
      interviewEnded: true,
    });
  })
);

/**
 * GET /api/v1/interviews/user/active
 * Get user's active interview
 * NOTE: This MUST be before /:id to avoid 'active' being treated as an :id param
 */
router.get(
  '/user/active',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;

    const activeInterview = await prisma.interview.findFirst({
      where: { userId, status: 'in_progress' },
    });

    if (!activeInterview) {
      return res.json({ hasActive: false });
    }

    res.json({
      hasActive: true,
      interview: {
        id: activeInterview.id,
        role: activeInterview.role,
        level: activeInterview.level,
        status: activeInterview.status,
      },
    });
  })
);

/**
 * GET /api/v1/interviews/:id
 * Get interview status and transcript
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.userId;
    const { id } = req.params;

    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      throw new AppError(404, 'Interview not found');
    }

    if (interview.userId !== userId) {
      throw new AppError(403, 'Access denied');
    }

    res.json({
      id: interview.id,
      role: interview.role,
      level: interview.level,
      company: interview.company,
      status: interview.status,
      scheduledAt: interview.scheduledAt,
      startedAt: interview.startedAt,
      completedAt: interview.completedAt,
      durationSeconds: interview.durationSeconds,
      transcript: interview.transcript,
      proctoringData: interview.proctoringData,
      feedback: interview.feedback,
      createdAt: interview.createdAt,
    });
  })
);

/**
 * Helper: Calculate interview duration
 */
function calculateDuration(startedAt?: Date | null): number | null {
  if (!startedAt) return null;
  const duration = Math.floor(
    (new Date().getTime() - startedAt.getTime()) / 1000
  );
  return duration;
}

export default router;