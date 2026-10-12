import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { validateRequest } from '../middleware/validation';
import {
  signupSchema,
  loginSchema,
  type SignupInput,
  type LoginInput,
} from '../utils/validation';
import { prisma } from '../prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { logger } from '../utils/logger';
import { sendVerificationEmail } from '../services/email';

import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const googleClient = new OAuth2Client(config.google?.clientId || undefined);

const router = Router();

// Signup endpoint
router.post(
  '/signup',
  validateRequest(signupSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, role, companyTarget, defaultLevel } =
      req.body as SignupInput;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyTarget,
        defaultLevel: defaultLevel ?? 'medium',
        credits: 2, // Give new users 2 free interviews
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    // Send verification email
    await sendVerificationEmail(user.email, user.name);

    logger.info(`New user registered: ${user.email}`);

    return res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyTarget: user.companyTarget,
        defaultLevel: user.defaultLevel,
        credits: user.credits,
        subscriptionTier: user.subscriptionTier,
      },
      token,
    });
  })
);

// Login endpoint
router.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body as LoginInput;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    logger.info(`User logged in: ${user.email}`);

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyTarget: user.companyTarget,
        defaultLevel: user.defaultLevel,
        credits: user.credits,
        subscriptionTier: user.subscriptionTier,
      },
      token,
    });
  })
);

// Google OAuth Sign In / Sign Up endpoint
router.post(
  '/google',
  asyncHandler(async (req: Request, res: Response) => {
    const { credential, role } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential token is required' });
    }

    let email: string | undefined;
    let name: string | undefined;

    try {
      // 1. Verify with google-auth-library if client ID is configured
      if (config.google?.clientId) {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: config.google.clientId,
        });
        const payload = ticket.getPayload();
        email = payload?.email;
        name = payload?.name || payload?.given_name || 'Google User';
      } else {
        // 2. Fallback verification via Google tokeninfo endpoint (works for dev/testing)
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
        if (!response.ok) {
          throw new Error('Invalid Google token');
        }
        const data: any = await response.json();
        email = data.email;
        name = data.name || data.given_name || 'Google User';
      }
    } catch (err: any) {
      logger.warn('Google token verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid Google authentication token' });
    }

    if (!email) {
      return res.status(400).json({ error: 'No email found in Google profile' });
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create new user with random hashed password
      const randomPassword = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      user = await prisma.user.create({
        data: {
          name: name || 'Google User',
          email,
          password: hashedPassword,
          role: (role as any) || 'software_engineer',
          defaultLevel: 'medium',
          credits: 2, // Give new Google users 2 free interviews
        },
      });

      logger.info(`New user registered via Google: ${user.email}`);
    } else {
      logger.info(`User logged in via Google: ${user.email}`);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
    );

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyTarget: user.companyTarget,
        defaultLevel: user.defaultLevel,
        credits: user.credits,
        subscriptionTier: user.subscriptionTier,
      },
      token,
    });
  })
);

// Refresh token endpoint
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as {
        userId: string;
      };
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
        return res.status(401).json({ error: 'Invalid token' });
      }

      const newToken = jwt.sign(
        { userId: user.id },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'] }
      );

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyTarget: user.companyTarget,
          defaultLevel: user.defaultLevel,
          credits: user.credits,
          subscriptionTier: user.subscriptionTier,
        },
        token: newToken,
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  })
);

// Logout endpoint (stateless JWT - client clears token)
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response) => {
    // JWT is stateless — nothing to invalidate server-side.
    // The frontend clears the token from localStorage.
    logger.info('User logged out');
    return res.json({ success: true, message: 'Logged out successfully' });
  })
);

export default router;