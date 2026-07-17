import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter } from 'events';
import type { CigDomainEvent } from '../../../../lib/cig';

export const CIG_BUS_EVENT = 'cig.domain_event' as const;
export const CIG_BUS_GRAPH_UPDATED = 'cig.graph.updated' as const;

export type CigGraphUpdatedPayload = {
  tenantId: string;
  snapshotVersion: number;
  projectorGeneration: string;
  durability: string;
  degraded: boolean;
  nodeCount: number;
  edgeCount: number;
  nodeIds?: string[];
  sourceEventName?: string;
  emittedAt: string;
};

type DomainHandler = (event: CigDomainEvent) => void;
type GraphUpdatedHandler = (payload: CigGraphUpdatedPayload) => void;

/**
 * In-process CIG event bus (PR-5a).
 * Same family as EmergencyRealtimeService — no BullMQ until lag requires it.
 */
@Injectable()
export class CigEventBus implements OnModuleDestroy {
  private readonly logger = new Logger(CigEventBus.name);
  private readonly bus = new EventEmitter();
  private domainSubscribers = 0;
  private graphSubscribers = 0;

  constructor() {
    this.bus.setMaxListeners(100);
  }

  onModuleDestroy(): void {
    this.bus.removeAllListeners();
  }

  emitDomainEvent(event: CigDomainEvent): void {
    this.bus.emit(CIG_BUS_EVENT, event);
  }

  emitGraphUpdated(payload: CigGraphUpdatedPayload): void {
    this.bus.emit(CIG_BUS_GRAPH_UPDATED, payload);
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        `cig.graph.updated tenant=${payload.tenantId} v=${payload.snapshotVersion} nodes=${payload.nodeCount}`,
      );
    }
  }

  onDomainEvent(handler: DomainHandler): () => void {
    this.domainSubscribers += 1;
    this.bus.on(CIG_BUS_EVENT, handler);
    return () => {
      this.bus.off(CIG_BUS_EVENT, handler);
      this.domainSubscribers = Math.max(0, this.domainSubscribers - 1);
    };
  }

  onGraphUpdated(handler: GraphUpdatedHandler): () => void {
    this.graphSubscribers += 1;
    this.bus.on(CIG_BUS_GRAPH_UPDATED, handler);
    return () => {
      this.bus.off(CIG_BUS_GRAPH_UPDATED, handler);
      this.graphSubscribers = Math.max(0, this.graphSubscribers - 1);
    };
  }

  get subscriberCounts(): { domain: number; graph: number } {
    return { domain: this.domainSubscribers, graph: this.graphSubscribers };
  }
}
