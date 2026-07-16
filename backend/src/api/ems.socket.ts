import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { Logger } from '@nestjs/common';
import { Server, type Socket } from 'socket.io';
import {
  edgeAIAmbulanceService,
  type VitalSignStream,
} from '../services/edge-ai-ambulance.service';
type CorsOrigin = string | string[] | boolean;
export type SocketAuthMiddleware = Parameters<Server['use']>[0];
const logger = new Logger('EMSWebSocket');
const denyUnauthenticatedSocket: SocketAuthMiddleware = (_socket, next) => {
  next(new Error('Authentication required.'));
};
export function registerEMSWebSocketSupport(
  app: Express,
  server: HttpServer,
  corsOrigins: CorsOrigin = false,
  authMiddleware: SocketAuthMiddleware = denyUnauthenticatedSocket,
): Server {
  const io = new Server(server, { cors: { origin: corsOrigins, credentials: true } });
  io.use(authMiddleware);
  const connections = new Map<string, string>();
  io.on('connection', (socket) => {
    logger.log(`Client connected: ${socket.id}`);
    socket.on('join-whiteboard', () => {
      const userId = typeof socket.data.user?.id === 'string' ? socket.data.user.id : null;
      if (!userId) return;
      connections.set(userId, socket.id);
      socket.join('whiteboard');
    });
    socket.on('disconnect', () => {
      logger.log(`Client disconnected: ${socket.id}`);
      for (const [userId, socketId] of connections.entries()) {
        if (socketId === socket.id) connections.delete(userId);
      }
    });
  });
  app.set('io', io);
  return io;
}
export function registerEdgeAIAmbulanceWebSocketSupport(
  app: Express,
  server: HttpServer,
  service = edgeAIAmbulanceService,
  corsOrigins: CorsOrigin = false,
  authMiddleware: SocketAuthMiddleware = denyUnauthenticatedSocket,
): Server {
  const io = new Server(server, {
    path: '/ws/edge-ai/ambulance',
    cors: { origin: corsOrigins, credentials: true },
  });
  io.use(authMiddleware);
  io.on('connection', (socket) => {
    socket.emit('edge-ai/ambulance:ready', {
      path: '/ws/edge-ai/ambulance',
      mode: 'edge-inference-demo',
      supportedEvents: ['analyze-ultrasound', 'monitor-vitals'],
    });
    socket.on('analyze-ultrasound', async (payload: any, callback?: (response: any) => void) => {
      try {
        const frames = Array.isArray(payload?.framesBase64)
          ? payload.framesBase64.map((frame: string) => Buffer.from(frame, 'base64'))
          : Array.from({ length: Math.max(1, Number(payload?.frameCount || 1)) }, (_, index) =>
              Buffer.from(`demo-ultrasound-frame-${index}`),
            );
        const result = await service.analyzeUltrasound(frames);
        emitSocketResult(socket, callback, 'edge-ai/ambulance:ultrasound-result', result);
      } catch (error: any) {
        emitSocketResult(socket, callback, 'edge-ai/ambulance:error', {
          error: error.message || 'Failed to analyze ultrasound frames',
        });
      }
    });
    socket.on(
      'monitor-vitals',
      async (payload: VitalSignStream, callback?: (response: any) => void) => {
        try {
          const result = await service.monitorVitalSignsEdge(payload);
          emitSocketResult(socket, callback, 'edge-ai/ambulance:vitals-result', result);
        } catch (error: any) {
          emitSocketResult(socket, callback, 'edge-ai/ambulance:error', {
            error: error.message || 'Failed to monitor vital signs',
          });
        }
      },
    );
  });
  app.set('edgeAIAmbulanceIo', io);
  return io;
}
/**  * High-frequency AVL position stream for CareDroid Sentinel.  * Board-level episode/alarm/ETA events remain on emergency SSE; GPS ticks use this path.  */ export function registerSentinelAvlWebSocketSupport(
  app: Express,
  server: HttpServer,
  corsOrigins: CorsOrigin = false,
  authMiddleware: SocketAuthMiddleware = denyUnauthenticatedSocket,
): Server {
  const io = new Server(server, {
    path: '/ws/sentinel/avl',
    cors: { origin: corsOrigins, credentials: true },
  });
  io.use(authMiddleware);
  io.on('connection', (socket) => {
    socket.emit('sentinel/avl:ready', {
      path: '/ws/sentinel/avl',
      mode: 'sentinel-avl',
      supportedEvents: ['subscribe', 'position', 'unsubscribe'],
    });
    socket.on('subscribe', (payload: { room?: string } | undefined) => {
      const room = payload?.room || 'sentinel-avl';
      socket.join(room);
      socket.emit('sentinel/avl:subscribed', { room });
    });
    socket.on('unsubscribe', (payload: { room?: string } | undefined) => {
      const room = payload?.room || 'sentinel-avl';
      socket.leave(room);
      socket.emit('sentinel/avl:unsubscribed', { room });
    });
  });
  app.set('sentinelAvlIo', io);
  return io;
}
/** Publish a throttled unit position to Sentinel AVL subscribers. */ export function publishSentinelAvlPosition(
  app: Express,
  position: {
    unitId: string;
    externalId?: string;
    latitude: number;
    longitude: number;
    heading?: number | null;
    speedKmh?: number | null;
    occurredAt?: string;
  },
): void {
  const io = app.get('sentinelAvlIo') as Server | undefined;
  if (!io) return;
  io.to('sentinel-avl').emit('sentinel/avl:position', {
    ...position,
    occurredAt: position.occurredAt || new Date().toISOString(),
  });
}
function emitSocketResult(
  socket: Socket,
  callback: ((response: any) => void) | undefined,
  event: string,
  payload: any,
) {
  if (typeof callback === 'function') {
    callback(payload);
    return;
  }
  socket.emit(event, payload);
}
