/**
 * User Model for Voice AI Interview Platform
 * Manages user entity, credentials, credit allocation, and practice statistics.
 */

import { prisma } from '../prisma/client';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import type {
  IUser,
  UserRole,
  InterviewLevel,
  Company,
  SubscriptionTier,
} from '../types';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  companyTarget?: Company;
  defaultLevel?: InterviewLevel;
  subscriptionTier?: SubscriptionTier;
  credits?: number;
}

export interface UpdateUserProfileData {
  name?: string;
  role?: UserRole;
  companyTarget?: Company;
  defaultLevel?: InterviewLevel;
}

export interface UserPerformanceStats {
  totalInterviews: number;
  completedInterviews: number;
  averageScore: number;
  totalPracticeTimeSeconds: number;
  remainingCredits: number;
  subscriptionTier: SubscriptionTier;
  roleBreakdown: Record<string, number>;
  latestScore?: number;
}

export class UserModel {
  /**
   * Find user by unique email
   */
  static async findByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });
    } catch (error) {
      logger.error(`UserModel.findByEmail failed for ${email}:`, error);
      throw error;
    }
  }

  /**
   * Find user by unique ID
   */
  static async findById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error(`UserModel.findById failed for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new user with hashed password and initial credits
   */
  static async create(data: CreateUserData): Promise<IUser> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Initial credits based on subscription tier (free: 2, pro: 20, enterprise: 100)
    const tier = data.subscriptionTier || 'free';
    const defaultCredits = data.credits !== undefined ? data.credits : (tier === 'free' ? 2 : tier === 'pro' ? 20 : 100);

    const user = await prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: data.role as any,
        companyTarget: data.companyTarget as any,
        defaultLevel: (data.defaultLevel || 'medium') as any,
        credits: defaultCredits,
        subscriptionTier: tier as any,
      },
    });

    return this.toClientUser(user);
  }

  /**
   * Verify candidate password against hashed password
   */
  static async verifyPassword(plainText: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plainText, hashed);
  }

  /**
   * Deduct credits when starting a voice interview session
   */
  static async deductCredits(userId: string, amount: number = 1): Promise<number> {
    const user = await this.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.credits < amount) {
      throw new Error(`Insufficient interview credits. You need ${amount} credits.`);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });

    logger.info(`Deducted ${amount} credits from user ${userId}. Remaining: ${updated.credits}`);
    return updated.credits;
  }

  /**
   * Refund credits if voice session failed to initialize
   */
  static async refundCredits(userId: string, amount: number = 1): Promise<number> {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });

    logger.info(`Refunded ${amount} credits to user ${userId}. Total: ${updated.credits}`);
    return updated.credits;
  }

  /**
   * Add credits upon successful Stripe payment
   */
  static async addCredits(
    userId: string,
    amount: number,
    tierUpgrade?: SubscriptionTier
  ): Promise<IUser> {
    const updateData: any = {
      credits: { increment: amount },
    };

    if (tierUpgrade) {
      updateData.subscriptionTier = tierUpgrade;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.toClientUser(user);
  }

  /**
   * Check if user has sufficient credits to launch voice interview
   */
  static async hasSufficientCredits(userId: string, required: number = 1): Promise<boolean> {
    const user = await this.findById(userId);
    return (user?.credits ?? 0) >= required;
  }

  /**
   * Update user target role, company, or preferences
   */
  static async updateProfile(userId: string, updates: UpdateUserProfileData): Promise<IUser> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updates.name && { name: updates.name.trim() }),
        ...(updates.role && { role: updates.role as any }),
        ...(updates.companyTarget !== undefined && { companyTarget: updates.companyTarget as any }),
        ...(updates.defaultLevel && { defaultLevel: updates.defaultLevel as any }),
      },
    });

    return this.toClientUser(user);
  }

  /**
   * Compute comprehensive performance statistics for candidate dashboard
   */
  static async getPerformanceStats(userId: string): Promise<UserPerformanceStats> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');

    const interviews = await prisma.interview.findMany({
      where: { userId },
      select: {
        id: true,
        role: true,
        status: true,
        durationSeconds: true,
        feedback: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const completed = interviews.filter((i) => i.status === 'completed');
    const totalDuration = completed.reduce((acc, i) => acc + (i.durationSeconds || 0), 0);

    const scores: number[] = [];
    const roleBreakdown: Record<string, number> = {};

    for (const item of interviews) {
      roleBreakdown[item.role] = (roleBreakdown[item.role] || 0) + 1;
      if (item.feedback && typeof item.feedback === 'object') {
        const fb = item.feedback as any;
        if (typeof fb.overallScore === 'number') {
          scores.push(fb.overallScore);
        }
      }
    }

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    return {
      totalInterviews: interviews.length,
      completedInterviews: completed.length,
      averageScore,
      totalPracticeTimeSeconds: totalDuration,
      remainingCredits: user.credits,
      subscriptionTier: user.subscriptionTier as SubscriptionTier,
      roleBreakdown,
      latestScore: scores[0],
    };
  }

  /**
   * Transform DB user record to client-safe representation
   */
  static toClientUser(dbUser: any): IUser {
    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      companyTarget: dbUser.companyTarget ? (dbUser.companyTarget as Company) : undefined,
      defaultLevel: dbUser.defaultLevel as InterviewLevel,
      credits: dbUser.credits,
      subscriptionTier: dbUser.subscriptionTier as SubscriptionTier,
      createdAt: dbUser.createdAt.toISOString ? dbUser.createdAt.toISOString() : String(dbUser.createdAt),
    };
  }
}
