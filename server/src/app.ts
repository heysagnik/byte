import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import threadRoutes from './routes/threads.routes';
import webhookRoutes from './routes/webhooks.routes';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  // Parse raw body for Twilio webhooks (they send url-encoded form data)
  app.use('/api/webhooks/twilio', express.urlencoded({ extended: true }));

  // JSON for everything else
  app.use(express.json({ limit: '10mb' }));

  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/threads', threadRoutes);
  app.use('/api/webhooks', webhookRoutes);

  // Global error handler
  app.use(errorMiddleware);

  return app;
}
