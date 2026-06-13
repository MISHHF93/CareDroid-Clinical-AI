import type { Express } from 'express';
import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import {
  edgeAIAmbulanceService,
  type VitalSignStream,
} from '../services/edge-ai-ambulance.service';

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

export function registerEdgeAIAmbulanceWebSocketSupport(
  app: Express,
  server: HttpServer,
  service = edgeAIAmbulanceService,
): Server {
  const io = new Server(server, {
    path: '/ws/edge-ai/ambulance',
    cors: { origin: '*' },
  });

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
