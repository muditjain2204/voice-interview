import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { prisma } from '../prisma/client';
import { UserRole } from '@prisma/client';

const router = Router();

/**
 * GET /api/v1/questions
 * Get all questions for a role
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { role, level, limit = 50 } = req.query;

    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const questions = await prisma.question.findMany({
      where: {
        role: role as UserRole,
        ...(level ? { level: level as any } : {}),
      },
      take: parseInt(limit as string, 10),
      orderBy: { difficulty: 'asc' },
    });

    res.json({
      success: true,
      count: questions.length,
      questions,
    });
  })
);

/**
 * GET /api/v1/questions/:id
 * Get a specific question
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const question = await prisma.question.findUnique({
      where: { id },
    });

    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({ success: true, question });
  })
);

export default router;
