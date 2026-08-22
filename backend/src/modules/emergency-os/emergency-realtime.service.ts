import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { EventEmitter } from 'events';

export type EmergencyRealtimeEvent = {
  type: string;
  payload?: unknown;
  receivedAt?: string;
  // Absent on events with no tenant boundary (heartbeat, and legacy callers not
  // yet updated to pass one -- see HEAL-347.91). Present events are delivered
  // ONLY to subscribers connected under that same organization; absent-org
  // events are broadcast to everyone, so an unmigrated call site fails open
  // to the pre-fix (unscoped) behavior rather than silently going dark.
  organizationId?: string;
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
  private readonly logger = new Logger(EmergencyRealtimeService.name);
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

  publish(event: { type: string; payload?: unknown }, organizationId?: string): void {
    const normalized: EmergencyRealtimeEvent = {
      type: normalizeEventType(event.type),
      payload: event.payload,
      receivedAt: new Date().toISOString(),
      organizationId,
    };
    if (normalized.type && normalized.type !== 'heartbeat') {
      this.externalWriterActive = true;
    }
    this.bus.emit('event', normalized);
  }

  // HEAL-347.91: this bus is a single process-wide EventEmitter shared by every
  // connected SSE client regardless of hospital tenant. Before this fix, subscribe()
  // forwarded every event to every handler unconditionally -- any authenticated user
  // at any org holding ordinary READ_PHI could open the stream and receive every
  // other org's live whiteboard/EMS/collaboration-message events. Now a subscriber
  // only receives events stamped with its own organizationId, plus events with no
  // organizationId at all (heartbeat, and any not-yet-migrated publisher -- see the
  // EmergencyRealtimeEvent.organizationId doc comment above for why those still
  // broadcast rather than going dark).
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

  // organizationId here scopes the burst to the CONNECTING subscriber's own tenant
  // (this is the initial-snapshot half of the HEAL-347.91 fix -- see subscribe()'s
  // doc comment for the ongoing-broadcast half).
  buildInitialBurst(organizationId?: string): EmergencyRealtimeEvent[] {
    const events: EmergencyRealtimeEvent[] = [
      {
        type: 'connected',
        payload: { mode: 'sse' },
        receivedAt: new Date().toISOString(),
      },
    ];

    try {
      // Deferred require avoids circular Nest module graph at bootstrap.
      const { EmergencyWhiteboardService, CareDroidCentralNodeService } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular Nest graph
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const whiteboard = this.moduleRef.get(EmergencyWhiteboardService, { strict: false });
      const centralNode = this.moduleRef.get(CareDroidCentralNodeService, { strict: false });
      if (whiteboard) {
        events.push({
          type: 'whiteboard_snapshot',
          payload: whiteboard.getWhiteboard(organizationId),
          receivedAt: new Date().toISOString(),
        });
      }
      if (centralNode) {
        events.push({
          type: 'central_node_snapshot',
          payload: centralNode.getSnapshot(organizationId),
          receivedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.logger.warn(
        `[EmergencyRealtime] Snapshot collection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return events;
  }

  publishBoardMutations(organizationId?: string): void {
    try {
      const { EmergencyWhiteboardService, CareDroidCentralNodeService } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular Nest graph
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const whiteboard = this.moduleRef.get(EmergencyWhiteboardService, { strict: false });
      const centralNode = this.moduleRef.get(CareDroidCentralNodeService, { strict: false });
      if (whiteboard) {
        this.publish(
          { type: 'whiteboard_snapshot', payload: whiteboard.getWhiteboard(organizationId) },
          organizationId,
        );
      }
      if (centralNode) {
        this.publish(
          { type: 'central_node_snapshot', payload: centralNode.getSnapshot(organizationId) },
          organizationId,
        );
      }
      const { OperationalIntelligenceService } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular Nest graph
        require('./emergency-os.operational-intelligence.service') as typeof import('./emergency-os.operational-intelligence.service');
      const operationalIntelligence = this.moduleRef.get(OperationalIntelligenceService, {
        strict: false,
      });
      operationalIntelligence?.publishRealtimeSignals('central_node_snapshot');
    } catch (error) {
      this.logger.warn(
        `[EmergencyRealtime] publishBoardMutations failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  publishEmsUpdate(organizationId?: string): void {
    try {
      const { EMSIntakeService } =
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- circular Nest graph
        require('./emergency-os.services') as typeof import('./emergency-os.services');
      const ems = this.moduleRef.get(EMSIntakeService, { strict: false });
      if (ems) {
        this.publish(
          { type: 'ems_updated', payload: ems.getEMSIntake(organizationId) },
          organizationId,
        );
      }
    } catch (error) {
      this.logger.warn(
        `[EmergencyRealtime] publishEmsUpdate failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
