import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

export type CollaborationRealtimeEvent = {
  type: string;
  payload?: unknown;
  receivedAt?: string;
};

type RealtimeSubscriber = (event: CollaborationRealtimeEvent) => void;

function normalizeEventType(type: string): string {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.:/-]+/g, '_');
}

/**
 * Server-push bus for the Collaboration Hub, mirroring the proven
 * EmergencyRealtimeService pattern (backend/src/modules/emergency-os/emergency-realtime.service.ts)
 * rather than introducing a new @nestjs/websockets gateway. Client actions
 * (send message, react, mark read, typing) are plain authenticated REST POSTs;
 * this bus only carries server -> client pushes, consumed over SSE.
 */
@Injectable()
export class CollaborationRealtimeService implements OnModuleDestroy {
  private readonly bus = new EventEmitter();
  private subscriberCount = 0;

  constructor() {
    this.bus.setMaxListeners(200);
  }

  onModuleDestroy(): void {
    this.bus.removeAllListeners('event');
  }

  get activeSubscribers(): number {
    return this.subscriberCount;
  }

  publish(event: { type: string; payload?: unknown }): void {
    const normalized: CollaborationRealtimeEvent = {
      type: normalizeEventType(event.type),
      payload: event.payload,
      receivedAt: new Date().toISOString(),
    };
    this.bus.emit('event', normalized);
  }

  subscribe(handler: RealtimeSubscriber): () => void {
    this.subscriberCount += 1;
    this.bus.on('event', handler);
    return () => {
      this.bus.off('event', handler);
      this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    };
  }
}
