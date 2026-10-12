import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/error';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma/client';
import { config } from '../config';
import Stripe from 'stripe';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { validateRequest } from '../middleware/validation';

const stripe = new Stripe(config.stripe.secretKey || 'sk_test_placeholder', {
  apiVersion: '2024-04-10',
});

const router = Router();

const checkoutSchema = z.object({
  plan: z.enum(['pro', 'enterprise']),
});

// Plan details with correct credit amounts
const PLAN_DETAILS: Record<string, { price: number; name: string; credits: number }> = {
  pro: { price: 2900, name: 'Pro Plan', credits: 20 },
  enterprise: { price: 9900, name: 'Enterprise Plan', credits: 100 },
};

/**
 * GET /api/v1/payments/plans
 * Get available subscription plans
 */
router.get(
  '/plans',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interviewsPerMonth: 2,
          features: [
            '2 free interviews per month',
            'Basic feedback',
            'Limited roles',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 29,
          interviewsPerMonth: 20,
          features: [
            '20 interviews per month',
            'Advanced feedback',
            'All roles & companies',
            'Proctoring analytics',
            'Custom difficulty',
          ],
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: 99,
          interviewsPerMonth: 100,
          features: [
            'Unlimited interviews',
            'Premium AI feedback',
            'All roles & companies',
            'Advanced proctoring',
            'Priority support',
            'Custom integrations',
          ],
        },
      ],
    });
  })
);

/**
 * POST /api/v1/payments/create-checkout
 * Create Stripe checkout session
 * Requires authentication
 */
router.post(
  '/create-checkout',
  authenticateToken,
  validateRequest(checkoutSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { plan } = req.body;

    if (!config.stripe.secretKey) {
      return res.status(503).json({ error: 'Payment service not configured' });
    }

    const planDetails = PLAN_DETAILS[plan];
    if (!planDetails) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    try {
      // Create Stripe checkout session
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
              unit_amount: planDetails.price,
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

      logger.info(`Checkout session created: ${session.id} for user ${req.userId}`);

      res.json({ sessionId: session.id, url: session.url });
    } catch (err) {
      logger.error('Stripe checkout error:', err);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  })
);

/**
 * POST /api/v1/payments/webhook
 * Stripe webhook for payment events
 * NOTE: This route MUST receive raw body, not parsed JSON.
 * The raw body middleware is configured in index.ts before express.json().
 */
router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'Missing signature' });
    }

    if (!config.stripe.webhookSecret) {
      return res.status(503).json({ error: 'Webhook secret not configured' });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        config.stripe.webhookSecret
      );

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan;
          const credits = parseInt(session.metadata?.credits || '20', 10);

          if (userId && plan) {
            // Update user subscription
            await prisma.user.update({
              where: { id: userId },
              data: {
                subscriptionTier: plan as any,
                credits: { increment: credits },
              },
            });

            // Record payment
            await prisma.payment.create({
              data: {
                userId,
                stripePaymentId: session.id,
                amount: session.amount_total || 0,
                currency: session.currency || 'usd',
                status: 'succeeded',
                subscriptionTier: plan as any,
              },
            });

            logger.info(`Subscription activated for user ${userId}, plan: ${plan}, credits: ${credits}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          // Downgrade user
          if (subscription.metadata?.userId) {
            await prisma.user.update({
              where: { id: subscription.metadata.userId },
              data: { subscriptionTier: 'free' },
            });
            logger.info(`Subscription cancelled for user ${subscription.metadata.userId}`);
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      logger.error('Webhook error:', err.message);
      res.status(400).json({ error: `Webhook error: ${err.message}` });
    }
  })
);

export default router;
