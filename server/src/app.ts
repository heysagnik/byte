import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import threadRoutes from './routes/threads.routes';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  app.use(
    cors({
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/threads', threadRoutes);

  app.use(errorMiddleware);

  return app;
}
