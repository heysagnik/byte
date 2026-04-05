import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import threadRoutes from './routes/threads.routes';
import userRoutes from './routes/user.routes';
import { errorMiddleware } from './middleware/error.middleware';

export function createApp() {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env['ALLOWED_ORIGINS']?.split(',').map(o => o.trim()) ?? []),
  ];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  const healthHandler = (_req: express.Request, res: express.Response) =>
    res.json({ status: 'ok', uptime: process.uptime() });
  app.get('/', healthHandler);
  app.get('/health', healthHandler);

  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/threads', threadRoutes);

  app.use(errorMiddleware);

  return app;
}
