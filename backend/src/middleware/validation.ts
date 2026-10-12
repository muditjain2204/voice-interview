import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError, ZodType } from 'zod';
import { logger } from '../utils/logger';

export const validateRequest = (schema: ZodType) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse req.body directly — schemas define flat objects like { email, password }
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        logger.warn('Validation failed:', formattedErrors);
        return res.status(400).json({
          error: 'Validation failed',
          details: formattedErrors,
        });
      }
      next(error);
    }
  };