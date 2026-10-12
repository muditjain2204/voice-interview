import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Async handler wrapper
export const asyncHandler = (fn: Function) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

// Global error handler
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      statusCode: err.statusCode,
    });
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    if (prismaError.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate entry',
        statusCode: 409,
      });
    }
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const zodErr = err as any;
    return res.status(400).json({
      error: 'Validation failed',
      details: zodErr.issues || zodErr.errors,
      statusCode: 400,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token',
      statusCode: 401,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired',
      statusCode: 401,
    });
  }

  // Default error
  return res.status(500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    statusCode: 500,
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    statusCode: 404,
    path: req.path,
  });
};