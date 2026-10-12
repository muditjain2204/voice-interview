import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),

  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    expiresIn: '7d',
  },

  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/voice_interview',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
  },

  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    url: process.env.LIVEKIT_URL || 'wss://your-livekit-server.livekit.cloud',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  },

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },

  // Frontend URL for CORS, Stripe redirects, and email links
  frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:5173',

  cors: {
    origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  },
};

// Validate critical config in production
if (config.nodeEnv === 'production') {
  const required: [string, string][] = [
    ['JWT_SECRET', config.jwt.secret],
    ['DATABASE_URL', config.database.url],
  ];

  const defaults = [
    'your-super-secret-jwt-key-change-in-production',
    'postgresql://user:password@localhost:5432/voice_interview',
  ];

  for (const [name, value] of required) {
    if (!value || defaults.includes(value)) {
      console.error(`❌ FATAL: ${name} environment variable must be set in production`);
      process.exit(1);
    }
  }

  // Warn about optional but important config
  if (!config.razorpay.keyId && !config.stripe.secretKey) {
    console.warn('⚠️ No payment keys configured (RAZORPAY_KEY_ID or STRIPE_SECRET_KEY) — payments disabled');
  }
  if (!config.openai.apiKey && !config.anthropic.apiKey) {
    console.warn('⚠️ No AI API keys set — interview engine will use fallback responses');
  }
}

export type Config = typeof config;
