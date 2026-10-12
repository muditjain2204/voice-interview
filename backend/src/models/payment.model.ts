/**
 * Payment & Subscription Model for Voice AI Interview Platform
 * Manages interview credit purchases, Razorpay transactions, and tier subscriptions.
 */

import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import type { SubscriptionTier } from '../types';

export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export interface CreatePaymentData {
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency?: string;
  subscriptionTier: SubscriptionTier;
  status?: PaymentStatus;
}

export class PaymentModel {
  /**
   * Record a new Razorpay payment
   */
  static async create(data: CreatePaymentData) {
    try {
      const payment = await prisma.payment.create({
        data: {
          userId: data.userId,
          razorpayOrderId: data.razorpayOrderId,
          razorpayPaymentId: data.razorpayPaymentId,
          amount: data.amount,
          currency: data.currency || 'inr',
          subscriptionTier: data.subscriptionTier as any,
          status: (data.status || 'succeeded') as any,
        } as any,
      });

      logger.info(
        `Recorded Razorpay payment ${payment.id} for user ${data.userId}: ₹${data.amount / 100}`
      );
      return payment;
    } catch (error) {
      logger.error('PaymentModel.create error:', error);
      throw error;
    }
  }

  /**
   * Find payment by Razorpay payment ID
   */
  static async findByRazorpayPaymentId(razorpayPaymentId: string) {
    return prisma.payment.findUnique({
      where: { razorpayPaymentId } as any,
    });
  }

  /**
   * Update payment status
   */
  static async updateStatus(paymentId: string, status: PaymentStatus) {
    try {
      return await prisma.payment.update({
        where: { id: paymentId },
        data: { status: status as any } as any,
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
