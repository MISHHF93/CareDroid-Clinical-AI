import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';

export type CollaborationRealtimeEvent = {
  type: string;
  payload?: unknown;
  receivedAt?: string;
  // See EmergencyRealtimeService's identical field for the full rationale
  // (HEAL-347.91): absent means broadcast to everyone (heartbeat, or a
  // not-yet-migrated caller failing open to the pre-fix behavior); present
  // means deliver only to subscribers connected under that same organization.
  organizationId?: string;
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

  publish(event: { type: string; payload?: unknown }, organizationId?: string): void {
    const normalized: CollaborationRealtimeEvent = {
      type: normalizeEventType(event.type),
      payload: event.payload,
      receivedAt: new Date().toISOString(),
      organizationId,
    };
    this.bus.emit('event', normalized);
  }

  // HEAL-347.91: this bus is a single process-wide EventEmitter shared by every
  // connected SSE client regardless of hospital tenant -- see
  // EmergencyRealtimeService.subscribe()'s doc comment for the full incident
  // account (found via the same audit). Before this fix every collaboration
  // message, reaction, pin, and typing indicator from any org was broadcast to
  // every other org's connected clients.
  subscribe(handler: RealtimeSubscriber, organizationId?: string): () => void {
    this.subscriberCount += 1;
    const scopedHandler: RealtimeSubscriber = (event) => {
      if (event.organizationId && event.organizationId !== organizationId) return;
      handler(event);
    };
    this.bus.on('event', scopedHandler);
    return () => {
      this.bus.off('event', scopedHandler);
      this.subscriberCount = Math.max(0, this.subscriberCount - 1);
    };
  }
}
