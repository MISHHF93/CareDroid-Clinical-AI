import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter } from 'events';

export type EmergencyRealtimeEvent = {
  type: string;
  payload?: unknown;
  receivedAt?: string;
};

type RealtimeSubscriber = (event: EmergencyRealtimeEvent) => void;

const DEV_TICKER_MS = 60_000;

function normalizeEventType(type: string): string {
  return String(type || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.:/-]+/g, '_');
}

@Injectable()
export class EmergencyRealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly bus = new EventEmitter();
  private subscriberCount = 0;
  private devTicker: ReturnType<typeof setInterval> | null = null;
  private externalWriterActive = false;

  constructor(private readonly moduleRef: ModuleRef) {
    this.bus.setMaxListeners(100);
  }

  onModuleInit(): void {
    if (process.env.NODE_ENV !== 'development') return;
    this.devTicker = setInterval(() => {
      if (this.subscriberCount === 0 || this.externalWriterActive) return;
      this.publishBoardMutations();
    }, DEV_TICKER_MS);
  }

  onModuleDestroy(): void {
    if (this.devTicker) clearInterval(this.devTicker);
    this.bus.removeAllListeners('event');
  }

  get activeSubscribers(): number {
    return this.subscriberCount;
  }

  publish(event: { type: string; payload?: unknown }): void {
    const normalized: EmergencyRealtimeEvent = {
      type: normalizeEventType(event.type),
      payload: event.payload,
      receivedAt: new Date().toISOString(),
    };
    if (normalized.type && normalized.type !== 'heartbeat') {
      this.externalWriterActive = true;
    }
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

  buildInitialBurst(): EmergencyRealtimeEvent[] {
    const events: EmergencyRealtimeEvent[] = [
      {
        type: 'connected',
        payload: { mode: 'sse' },
        receivedAt: new Date().toISOString(),
      },
    ];

    try {
      const { EmergencyWhiteboardService, CareDroidCentralNodeService } =
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const whiteboard = this.moduleRef.get(EmergencyWhiteboardService, { strict: false });
      const centralNode = this.moduleRef.get(CareDroidCentralNodeService, { strict: false });
      if (whiteboard) {
        events.push({
          type: 'whiteboard_snapshot',
          payload: whiteboard.getWhiteboard(),
          receivedAt: new Date().toISOString(),
        });
      }
      if (centralNode) {
        events.push({
          type: 'central_node_snapshot',
          payload: centralNode.getSnapshot(),
          receivedAt: new Date().toISOString(),
        });
      }
    } catch {
      // Snapshot services may not be ready during isolated tests.
    }

    return events;
  }

  publishBoardMutations(): void {
    try {
      const { EmergencyWhiteboardService, CareDroidCentralNodeService } =
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const whiteboard = this.moduleRef.get(EmergencyWhiteboardService, { strict: false });
      const centralNode = this.moduleRef.get(CareDroidCentralNodeService, { strict: false });
      if (whiteboard) {
        this.publish({ type: 'whiteboard_snapshot', payload: whiteboard.getWhiteboard() });
      }
      if (centralNode) {
        this.publish({ type: 'central_node_snapshot', payload: centralNode.getSnapshot() });
      }
      const { OperationalIntelligenceService } =
        require('./emergency-os.operational-intelligence.service') as typeof import('./emergency-os.operational-intelligence.service');
      const operationalIntelligence = this.moduleRef.get(OperationalIntelligenceService, {
        strict: false,
      });
      operationalIntelligence?.publishRealtimeSignals('central_node_snapshot');
    } catch {
      // Ignore when services are unavailable in test harnesses.
    }
  }

  publishEmsUpdate(): void {
    try {
      const { EMSIntakeService } =
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const ems = this.moduleRef.get(EMSIntakeService, { strict: false });
      if (ems) {
        this.publish({ type: 'ems_updated', payload: ems.getEMSIntake() });
      }
    } catch {
      // Optional in partial test modules.
    }
  }
}
