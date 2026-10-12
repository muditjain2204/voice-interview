import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { config } from '../config';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';
import { PaymentModel } from '../models/payment.model';

const router = Router();

// Razorpay SDK initialization
let razorpay: Razorpay | null = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

const createOrderSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(['pro', 'enterprise']),
});

// Subscription plan details (prices in paise: ₹1 = 100 paise)
export const PLAN_DETAILS: Record<
  string,
  { priceInr: number; name: string; credits: number; displayPrice: string }
> = {
  pro: {
    priceInr: 199900, // ₹1,999
    name: 'Pro Plan',
    credits: 20,
    displayPrice: '₹1,999',
  },
  enterprise: {
    priceInr: 499900, // ₹4,999
    name: 'Enterprise Plan',
    credits: 100,
    displayPrice: '₹4,999',
  },
};

/**
 * GET /api/v1/payments/plans
 * Get available subscription plans and gateway status
 */
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      gateway: 'razorpay',
      razorpayKeyId: config.razorpay.keyId || null,
      plans: [
        {
          id: 'free',
          name: 'Free',
          priceInr: 0,
          displayPrice: '₹0',
          interviewsPerMonth: 2,
          features: [
            '2 free interviews per month',
            'Basic AI feedback & score',
            'Standard interview roles',
            'Community support',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          priceInr: 1999,
          displayPrice: '₹1,999',
          interviewsPerMonth: 20,
          features: [
            '20 interviews per month',
            'Detailed AI feedback & tips',
            'All 15+ tech roles & company simulations',
            'Webcam AI proctoring analytics',
            'Custom difficulty levels',
            'Priority response time',
          ],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          priceInr: 4999,
          displayPrice: '₹4,999',
          interviewsPerMonth: 100,
          features: [
            '100 interviews per month',
            'Premium Deep AI analysis & metrics',
            'All roles & company simulations',
            'Comprehensive integrity & proctoring report',
            'Unlimited retakes & scheduling',
            'Priority 24/7 support',
          ],
        },
      ],
    });
  })
);

/**
 * POST /api/v1/payments/create-order
 * Creates a Razorpay order for the chosen subscription plan
 */
router.post(
  ['/create-order', '/razorpay/create-order'],
  authenticateToken,
  validateRequest(createOrderSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;
    const planDetails = PLAN_DETAILS[plan];

    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    if (!razorpay) {
      logger.error('Razorpay gateway is not configured (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)');
      return res.status(503).json({
        error: 'Razorpay payment gateway is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env',
      });
    }

    try {
      const orderReceipt = `rcpt_${req.userId?.substring(0, 8)}_${Date.now()}`;
      const order = await razorpay.orders.create({
        amount: planDetails.priceInr,
        currency: 'INR',
        receipt: orderReceipt,
        notes: {
          userId: req.userId || '',
          plan,
          credits: String(planDetails.credits),
        },
      });

      logger.info(`Created Razorpay order ${order.id} for user ${req.userId} (Plan: ${plan})`);

      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: config.razorpay.keyId,
        plan,
        name: planDetails.name,
        credits: planDetails.credits,
      });
    } catch (err: any) {
      logger.error('Razorpay order creation error:', err);
      res.status(500).json({
        error: err.error?.description || err.message || 'Failed to initialize payment order',
      });
    }
  })
);

/**
 * POST /api/v1/payments/verify-payment
 * Cryptographically verifies Razorpay signature via HMAC SHA-256 and activates user subscription
 */
router.post(
  ['/verify-payment', '/razorpay/verify-payment'],
  authenticateToken,
  validateRequest(verifyPaymentSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const userId = req.userId;

    if (!config.razorpay.keySecret) {
      return res.status(503).json({ error: 'Razorpay secret key is not configured' });
    }

    // Verify HMAC SHA-256 signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      logger.warn(`Invalid Razorpay signature for order ${razorpay_order_id} by user ${userId}`);
      return res.status(400).json({ error: 'Payment verification failed: signature mismatch' });
    }

    const planDetails = PLAN_DETAILS[plan];
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Check if payment was already recorded
    const existing = await PaymentModel.findByRazorpayPaymentId(razorpay_payment_id);
    if (existing) {
      return res.json({
        success: true,
        message: 'Payment already verified',
        creditsAdded: planDetails.credits,
        tier: plan,
      });
    }

    // Grant user credits & upgrade tier
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan as any,
        credits: { increment: planDetails.credits },
      },
    });

    // Record payment in database
    await PaymentModel.create({
      userId: userId!,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: planDetails.priceInr,
      currency: 'inr',
      subscriptionTier: plan as any,
      status: 'succeeded',
    });

    logger.info(
      `Payment verified: ${razorpay_payment_id} for user ${userId}. Granted ${planDetails.credits} credits. Tier: ${plan}`
    );

    res.json({
      success: true,
      message: 'Payment verified and plan activated successfully!',
      creditsAdded: planDetails.credits,
      tier: plan,
    });
  })
);

/**
 * POST /api/v1/payments/webhook
 * Razorpay Webhook handler for async capture events
 */
router.post(
  ['/webhook', '/razorpay/webhook'],
  asyncHandler(async (req: Request, res: Response) => {
    const signature = req.headers['x-razorpay-signature'] as string;

    if (config.razorpay.webhookSecret && signature) {
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature) {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = payload?.event;

    if (event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity;
      const notes = paymentEntity?.notes || {};
      const userId = notes.userId;
      const plan = notes.plan;
      const credits = parseInt(notes.credits || '20', 10);

      if (userId && plan) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: plan as any,
            credits: { increment: credits },
          },
        });
        logger.info(`Razorpay webhook: activated plan ${plan} with ${credits} credits for user ${userId}`);
      }
    }

    res.json({ status: 'ok' });
  })
);

/**
 * GET /api/v1/payments/history
 * Fetch authenticated user payment history
 */
router.get(
  '/history',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const payments = await PaymentModel.listUserPayments(req.userId!);
    res.json({
      success: true,
      count: payments.length,
      payments,
    });
  })
);

export default router;
