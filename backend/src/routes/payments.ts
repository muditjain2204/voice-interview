import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { config } from '../config';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Lazy/safe initialization for Razorpay
let razorpay: Razorpay | null = null;
if (config.razorpay.keyId && config.razorpay.keySecret) {
  razorpay = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
}

// Optional Stripe instance (fallback only)
let stripe: Stripe | null = null;
if (config.stripe.secretKey) {
  stripe = new Stripe(config.stripe.secretKey, {
    apiVersion: '2024-04-10',
  });
}

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  plan: z.enum(['pro', 'enterprise']),
});

// Plan details: amounts in smallest currency unit (paise for INR, cents for USD)
export const PLAN_DETAILS: Record<
  string,
  { priceInr: number; priceUsd: number; name: string; credits: number; displayInr: string; displayUsd: string }
> = {
  pro: {
    priceInr: 199900, // ₹1,999
    priceUsd: 2900,   // $29
    name: 'Pro Plan',
    credits: 20,
    displayInr: '₹1,999',
    displayUsd: '$29',
  },
  enterprise: {
    priceInr: 499900, // ₹4,999
    priceUsd: 9900,   // $99
    name: 'Enterprise Plan',
    credits: 100,
    displayInr: '₹4,999',
    displayUsd: '$99',
  },
};

/**
 * GET /api/v1/payments/plans
 * Get available subscription plans and active payment gateway info
 */
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      gateway: razorpay ? 'razorpay' : stripe ? 'stripe' : 'none',
      razorpayKeyId: config.razorpay.keyId || null,
      plans: [
        {
          id: 'free',
          name: 'Free',
          priceInr: 0,
          priceUsd: 0,
          displayPrice: '₹0',
          interviewsPerMonth: 2,
          features: [
            '2 free interviews per month',
            'Basic feedback & score',
            'Standard AI interview models',
            'Limited roles',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          priceInr: 1999,
          priceUsd: 29,
          displayPrice: '₹1,999',
          interviewsPerMonth: 20,
          features: [
            '20 interviews per month',
            'Advanced AI feedback & analytics',
            'All roles & company simulations',
            'Webcam AI proctoring analytics',
            'Custom difficulty levels',
            'Priority response time',
          ],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          priceInr: 4999,
          priceUsd: 99,
          displayPrice: '₹4,999',
          interviewsPerMonth: 100,
          features: [
            '100 interviews per month',
            'Premium AI feedback & breakdown',
            'All roles & companies',
            'Advanced proctoring & integrity report',
            'Custom role interview generation',
            'Priority 24/7 support',
          ],
        },
      ],
    });
  })
);

/**
 * POST /api/v1/payments/create-order (Razorpay)
 * Creates a Razorpay order for the selected plan
 */
router.post(
  ['/create-order', '/razorpay/create-order'],
  authenticateToken,
  validateRequest(checkoutSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;
    const planDetails = PLAN_DETAILS[plan];

    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    if (!razorpay) {
      logger.error('Razorpay is not configured (missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET)');
      return res.status(503).json({
        error: 'Razorpay payment gateway is not configured on the server. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env',
      });
    }

    try {
      const orderReceipt = `rcpt_${req.userId?.substring(0, 10)}_${Date.now()}`;
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

      logger.info(`Razorpay order created: ${order.id} for user ${req.userId}, plan: ${plan}`);

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
      res.status(500).json({ error: err.error?.description || err.message || 'Failed to create payment order' });
    }
  })
);

/**
 * POST /api/v1/payments/verify-payment (Razorpay)
 * Verifies Razorpay signature and activates credits/plan for the user
 */
router.post(
  ['/verify-payment', '/razorpay/verify-payment'],
  authenticateToken,
  validateRequest(verifyPaymentSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const userId = req.userId;

    if (!config.razorpay.keySecret) {
      return res.status(503).json({ error: 'Razorpay key secret is not configured' });
    }

    // Verify cryptographic signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      logger.warn(`Invalid Razorpay signature for order ${razorpay_order_id} by user ${userId}`);
      return res.status(400).json({ error: 'Payment verification failed: invalid signature' });
    }

    const planDetails = PLAN_DETAILS[plan];
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    // Check if payment was already processed
    const existing = await prisma.payment.findUnique({
      where: { razorpayPaymentId: razorpay_payment_id },
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Payment already processed',
        creditsAdded: planDetails.credits,
        tier: plan,
      });
    }

    // Upgrade user credits and tier
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: plan as any,
        credits: { increment: planDetails.credits },
      },
    });

    // Record payment in database
    await prisma.payment.create({
      data: {
        userId: userId!,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        gateway: 'razorpay',
        amount: planDetails.priceInr,
        currency: 'inr',
        status: 'succeeded',
        subscriptionTier: plan as any,
      },
    });

    logger.info(`Payment verified: ${razorpay_payment_id} for user ${userId}. Added ${planDetails.credits} credits. Tier: ${plan}`);

    res.json({
      success: true,
      message: 'Payment verified and plan activated successfully!',
      creditsAdded: planDetails.credits,
      tier: plan,
    });
  })
);

/**
 * POST /api/v1/payments/razorpay/webhook
 * Razorpay Webhook handler
 */
router.post(
  '/razorpay/webhook',
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
      const payment = payload.payload?.payment?.entity;
      const notes = payment?.notes || {};
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
        logger.info(`Razorpay webhook: activated ${plan} (${credits} credits) for user ${userId}`);
      }
    }

    res.json({ status: 'ok' });
  })
);

/**
 * POST /api/v1/payments/create-checkout (Stripe Fallback)
 * Retained so Stripe works if configured, but does NOT disturb Razorpay
 */
router.post(
  '/create-checkout',
  authenticateToken,
  validateRequest(checkoutSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;

    if (!stripe) {
      return res.status(503).json({ error: 'Stripe is not configured. Please use Razorpay checkout.' });
    }

    const planDetails = PLAN_DETAILS[plan];
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: planDetails.name,
                description: `Monthly subscription with ${planDetails.credits} interviews`,
              },
              unit_amount: planDetails.priceUsd,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        success_url: `${config.frontendUrl}/dashboard?payment=success`,
        cancel_url: `${config.frontendUrl}/pricing?payment=cancelled`,
        customer_email: req.user?.email,
        metadata: {
          userId: req.userId!,
          plan,
          credits: String(planDetails.credits),
        },
      });

      res.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
      logger.error('Stripe checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  })
);

/**
 * POST /api/v1/payments/webhook (Stripe Webhook Fallback)
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    if (!stripe || !config.stripe.webhookSecret) {
      return res.status(200).json({ received: true });
    }

    const sig = req.headers['stripe-signature'];
    if (!sig) return res.status(400).json({ error: 'Missing signature' });

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const credits = parseInt(session.metadata?.credits || '20', 10);

        if (userId && plan) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: plan as any,
              credits: { increment: credits },
            },
          });

          await prisma.payment.create({
            data: {
              userId,
              stripePaymentId: session.id,
              gateway: 'stripe',
              amount: session.amount_total || 0,
              currency: session.currency || 'usd',
              status: 'succeeded',
              subscriptionTier: plan as any,
            },
          });
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error('Stripe webhook error:', err.message);
      res.status(400).json({ error: `Webhook error: ${err.message}` });
    }
  })
);

export default router;
