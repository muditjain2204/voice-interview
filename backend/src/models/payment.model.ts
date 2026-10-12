/**
 * Payment & Subscription Model for Voice AI Interview Platform
 * Manages interview credit purchases, Stripe transactions, and tier subscriptions.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { SubscriptionTier } from '../types';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface CreatePaymentData {
  userId: string;
  stripePaymentId: string;
  amount: number;
  currency?: string;
  subscriptionTier: SubscriptionTier;
  status?: PaymentStatus;
}

export class PaymentModel {
  /**
   * Record a new Stripe payment
   */
  static async create(data: CreatePaymentData) {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId: data.userId,
          stripePaymentId: data.stripePaymentId,
          amount: data.amount,
          currency: data.currency || 'usd',
          subscriptionTier: data.subscriptionTier as any,
          status: (data.status || 'pending') as any,
        },
      });

      logger.info(`Recorded payment ${payment.id} for user ${data.userId}: $${data.amount / 100}`);
      return payment;
    } catch (error) {
      logger.error('PaymentModel.create error:', error);
      throw error;
    }
  }

  /**
   * Update payment status upon Stripe webhook confirmation
   */
  static async updateStatus(stripePaymentId: string, status: PaymentStatus) {
    try {
      return await prisma.payment.update({
        where: { stripePaymentId },
        data: { status: status as any },
      });
    } catch (error) {
      logger.error(`PaymentModel.updateStatus error for ${stripePaymentId}:`, error);
      throw error;
    }
  }

  /**
   * Get user payment history
   */
  static async listUserPayments(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
