import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer;

export function initIO(server: SocketIOServer): void {
  io = server;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO not initialized');
  return io;
}
