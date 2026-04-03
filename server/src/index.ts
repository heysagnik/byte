import http from 'http';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { initIO } from './services/socket.service';

async function start() {
  // Connect to MongoDB
  await mongoose.connect(env.MONGODB_URI);
  console.log('[db] Connected to MongoDB');

  const app = createApp();
  const httpServer = http.createServer(app);

  // Attach Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    },
  });

  initIO(io);

  // Clients join a room per thread so we can target updates
  io.on('connection', (socket) => {
    socket.on('join:thread', (threadId: string) => {
      socket.join(`thread:${threadId}`);
    });
    socket.on('leave:thread', (threadId: string) => {
      socket.leave(`thread:${threadId}`);
    });
  });

  const port = parseInt(env.PORT, 10);
  httpServer.listen(port, () => {
    console.log(`[server] byte API running on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
