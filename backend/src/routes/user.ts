import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { Prisma } from '@prisma/client';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

/**
 * GET /api/v1/user/me
 * Get current user
 */
router.get(
  '/me',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      user: req.user,
    });
  })
);

/**
 * GET /api/v1/user/interviews
 * Get user's interview history
 */
router.get(
  '/interviews',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const interviews = await prisma.interview.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      count: interviews.length,
      interviews,
    });
  })
);

/**
 * GET /api/v1/user/stats
 * Get user's statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const totalInterviews = await prisma.interview.count({
      where: { userId: req.userId },
    });

    const completedInterviews = await prisma.interview.count({
      where: { userId: req.userId, status: 'completed' },
    });

    const scheduledInterviews = await prisma.interview.count({
      where: { userId: req.userId, status: 'scheduled' },
    });

    // Calculate average score from completed interviews with feedback
    const completedWithFeedback = await prisma.interview.findMany({
      where: {
        userId: req.userId,
        status: 'completed',
        feedback: { not: Prisma.DbNull },
      },
      select: { feedback: true },
    });

    const averageScore = calculateAverageScore(completedWithFeedback);

    res.json({
      success: true,
      stats: {
        totalInterviews,
        completedInterviews,
        scheduledInterviews,
        averageScore,
        credits: req.user.credits,
        subscriptionTier: req.user.subscriptionTier,
      },
    });
  })
);

/**
 * PATCH /api/v1/user/profile
 * Update user profile
 */
router.patch(
  '/profile',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, companyTarget, defaultLevel } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (companyTarget) updateData.companyTarget = companyTarget;
    if (defaultLevel) updateData.defaultLevel = defaultLevel;

    const updatedUser = await prisma.user.update({
      where: { id: req.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyTarget: true,
        defaultLevel: true,
        credits: true,
        subscriptionTier: true,
      },
    });

    res.json({ success: true, user: updatedUser });
  })
);

function calculateAverageScore(interviews: any[]): number {
  if (interviews.length === 0) return 0;

  const total = interviews.reduce((sum, interview) => {
    const feedback = interview.feedback as any;
    return sum + (feedback?.overallScore || 0);
  }, 0);

  return Math.round(total / interviews.length);
}

export default router;
