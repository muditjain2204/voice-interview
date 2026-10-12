import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import path from 'path';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './prisma/client';
import authRoutes from './routes/auth';
import interviewRoutes from './routes/interviews';
import questionRoutes from './routes/questions';
import paymentRoutes from './routes/payments';
import userRoutes from './routes/user';
import { errorHandler, notFoundHandler } from './middleware/error';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
}));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// !! IMPORTANT: Webhooks MUST receive raw body BEFORE express.json() !!
app.use(
  ['/api/v1/payments/webhook', '/api/v1/payments/razorpay/webhook'],
  express.raw({ type: 'application/json' })
);

// Body parsing with size limits (for all other routes)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'voice-interview-api',
  });
});

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/user', userRoutes);

// Company info route (public)
app.get('/api/v1/companies', async (req, res) => {
  try {
    const companies = await prisma.companyInfo.findMany({
      orderBy: { displayName: 'asc' },
    });
    res.json({
      success: true,
      count: companies.length,
      companies,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
});

// Serve frontend static files in production
if (config.nodeEnv === 'production') {
  const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendBuildPath));

  // SPA fallback — serve index.html for any non-API route
  app.get('*', (req: Request, res: Response, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// HTTP server creation for future WebSocket needs
const httpServer = createServer(app);

export { app, httpServer };

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await prisma.$disconnect();
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });
});

// Start server
const PORT = config.port;
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  logger.info(`Frontend URL: ${config.frontendUrl}`);
});

export default app;