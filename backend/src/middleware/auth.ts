import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

// JWT middleware
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    req.userId = decoded.userId;

    // Fetch user from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn('JWT verification failed:', err);
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Optional auth (for public endpoints)
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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

    if (user) {
      req.userId = user.id;
      req.user = user;
    }
    next();
  } catch (err) {
    // Invalid token, continue without auth
    next();
  }
};

// Rate limiting middleware (basic, will be enhanced later)
export const rateLimit = (windowMs: number, maxRequests: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Basic implementation - will be enhanced with Redis in production
    next();
  };
};

// Role-based access control
export const authorizeRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};