/**
 * Payment & Subscription Model for Voice AI Interview Platform
 * Manages interview credit purchases, Razorpay/Stripe transactions, and tier subscriptions.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { SubscriptionTier } from '../types';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface CreatePaymentData {
  userId: string;
  stripePaymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  gateway?: string;
  amount: number;
  currency?: string;
  subscriptionTier: SubscriptionTier;
  status?: PaymentStatus;
}

export class PaymentModel {
  /**
   * Record a new payment (Razorpay or Stripe)
   */
  static async create(data: CreatePaymentData) {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId: data.userId,
          stripePaymentId: data.stripePaymentId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          gateway: data.gateway || 'razorpay',
          amount: data.amount,
          currency: data.currency || 'inr',
          subscriptionTier: data.subscriptionTier as any,
          status: (data.status || 'pending') as any,
        },
      });

      logger.info(`Recorded payment ${payment.id} for user ${data.userId}: ${data.amount / 100} ${data.currency || 'inr'}`);
      return payment;
    } catch (error) {
      logger.error('PaymentModel.create error:', error);
      throw error;
    }
  }

  /**
   * Update payment status upon gateway confirmation
   */
  static async updateStatus(paymentId: string, status: PaymentStatus) {
    try {
      return await prisma.payment.update({
        where: { id: paymentId },
        data: { status: status as any },
      });
    } catch (error) {
      logger.error(`PaymentModel.updateStatus error for ${paymentId}:`, error);
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
