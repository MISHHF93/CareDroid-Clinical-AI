import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

export function registerEMSWebSocketSupport(app: Express, server: HttpServer): Server {
  const io = new Server(server, { cors: { origin: '*' } });
  const connections = new Map<string, string>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-whiteboard', (userId: string) => {
      connections.set(userId, socket.id);
      socket.join('whiteboard');
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      for (const [userId, socketId] of connections.entries()) {
        if (socketId === socket.id) connections.delete(userId);
      }
    });
  });

  app.set('io', io);
  return io;
}
