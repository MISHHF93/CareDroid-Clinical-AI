import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  adaptNestEmergencyOsToNeutralDto,
  buildCigDomainEvent,
  projectFromNeutralDto,
  type CigDomainEvent,
  type CigGraphSnapshot,
  type NeutralBoardDto,
  type NestEmergencyBoardSource,
} from '../../../../lib/cig';
import { cigSnapshotRedisKey } from './cig-schema.constants';
import { cigEdgeToEntity, cigNodeToEntity, cigSnapshotMetaToEntity } from './cig-entity-mappers';
import { CigEventBus } from './cig-event.bus';
import { CigEdgeEntity } from './entities/cig-edge.entity';
import { CigEventEntity } from './entities/cig-event.entity';
import { CigNodeEntity } from './entities/cig-node.entity';
import { CigOutboxEntity } from './entities/cig-outbox.entity';
import { CigSnapshotEntity } from './entities/cig-snapshot.entity';

export type CigProjectionMode = 'A' | 'B';

export type AfterBoardMutationInput = {
  tenantId: string;
  organizationId?: string;
  workspaceId?: string;
  /**
   * Mode B (default): session durability shadow, best-effort persist.
   * Mode A: reserved for durable SoT cutover + outbox consumer (K13/K14).
   */
  mode?: CigProjectionMode;
  /** Pre-built neutral DTO (preferred when adapter already ran). */
  dto?: NeutralBoardDto;
  /** Nest emergency-os board arrays — adapted when dto omitted. */
  board?: NestEmergencyBoardSource;
  sourceEventName?: string;
  eventId?: string;
  producer?: string;
  payload?: Record<string, unknown>;
  correlationId?: string;
  /** Force snapshot version (tests); otherwise auto-increment. */
  snapshotVersion?: number;
  generatedAt?: string;
};

export type CigProjectionResult = {
  ok: boolean;
  mode: CigProjectionMode;
  tenantId: string;
  snapshotVersion: number;
  nodeCount: number;
  edgeCount: number;
  durability: string;
  degraded: boolean;
  closedEdgeCount: number;
  upsertedNodeCount: number;
  upsertedEdgeCount: number;
  error?: string;
  snapshot?: CigGraphSnapshot;
};

/**
 * Single entry for board → CIG projection (PR-5a).
 * Mode B: project + best-effort TypeORM write; never claims multi-user durable twin.
 */
@Injectable()
export class CigProjectionFacade {
  private readonly logger = new Logger(CigProjectionFacade.name);

  constructor(
    @InjectRepository(CigNodeEntity)
    private readonly nodeRepo: Repository<CigNodeEntity>,
    @InjectRepository(CigEdgeEntity)
    private readonly edgeRepo: Repository<CigEdgeEntity>,
    @InjectRepository(CigEventEntity)
    private readonly eventRepo: Repository<CigEventEntity>,
    @InjectRepository(CigOutboxEntity)
    private readonly outboxRepo: Repository<CigOutboxEntity>,
    @InjectRepository(CigSnapshotEntity)
    private readonly snapshotRepo: Repository<CigSnapshotEntity>,
    private readonly eventBus: CigEventBus,
  ) {}

  /**
   * Project after a board mutation. Safe to call from Nest mutators (PR-5b+)
   * or tests without wiring every domain service yet.
   */
  async afterBoardMutation(input: AfterBoardMutationInput): Promise<CigProjectionResult> {
    const mode: CigProjectionMode = input.mode ?? 'B';
    const tenantId = String(input.tenantId || '').trim();
    if (!tenantId) {
      return this.fail(mode, '', 'tenantId required');
    }

    try {
      const prior = await this.snapshotRepo.findOne({ where: { tenantId } });
      const nextVersion = input.snapshotVersion ?? (prior ? Number(prior.version) + 1 : 1);

      const generatedAt = input.generatedAt || new Date().toISOString();
      const dto = this.resolveDto(input, tenantId, nextVersion, generatedAt, mode);
      const snapshot = projectFromNeutralDto(dto);

      // Mode B always forces session durability labels even if caller passed durable
      if (mode === 'B' && snapshot.durability !== 'session') {
        (snapshot as { durability: string }).durability = 'session';
        (snapshot as { degraded: boolean }).degraded = true;
        (snapshot as { degradeReason?: string }).degradeReason =
          'Mode B session projection — multi-user durable twin not claimed';
      }

      const persist = await this.persistSnapshot(snapshot, mode);

      await this.recordProjectionEvent(input, snapshot, mode);

      this.eventBus.emitGraphUpdated({
        tenantId,
        snapshotVersion: snapshot.meta.snapshotVersion,
        projectorGeneration: snapshot.meta.projectorGeneration,
        durability: snapshot.durability,
        degraded: Boolean(snapshot.degraded),
        nodeCount: snapshot.meta.nodeCount,
        edgeCount: snapshot.meta.edgeCount,
        nodeIds: snapshot.nodes.map((n) => n.id).slice(0, 50),
        sourceEventName: input.sourceEventName,
        emittedAt: new Date().toISOString(),
      });

      return {
        ok: true,
        mode,
        tenantId,
        snapshotVersion: snapshot.meta.snapshotVersion,
        nodeCount: snapshot.meta.nodeCount,
        edgeCount: snapshot.meta.edgeCount,
        durability: snapshot.durability,
        degraded: Boolean(snapshot.degraded),
        closedEdgeCount: persist.closedEdgeCount,
        upsertedNodeCount: persist.upsertedNodeCount,
        upsertedEdgeCount: persist.upsertedEdgeCount,
        snapshot,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`CIG Mode ${mode} projection failed for ${tenantId}: ${message}`);
      return this.fail(mode, tenantId, message);
    }
  }

  /** Emit a catalogue domain event onto the in-process bus (no DB write). */
  emitDomainEvent(event: CigDomainEvent): void {
    this.eventBus.emitDomainEvent(event);
  }

  private resolveDto(
    input: AfterBoardMutationInput,
    tenantId: string,
    snapshotVersion: number,
    generatedAt: string,
    mode: CigProjectionMode,
  ): NeutralBoardDto {
    if (input.dto) {
      return {
        ...input.dto,
        tenantId: input.dto.tenantId || tenantId,
        organizationId: input.dto.organizationId || input.organizationId,
        workspaceId: input.dto.workspaceId || input.workspaceId,
        snapshotVersion,
        generatedAt: input.dto.generatedAt || generatedAt,
        durability: mode === 'A' ? input.dto.durability : 'session',
      };
    }

    const board: NestEmergencyBoardSource = {
      ...(input.board || {}),
      tenantId,
      organizationId: input.organizationId ?? input.board?.organizationId,
      workspaceId: input.workspaceId ?? input.board?.workspaceId,
      generatedAt,
      snapshotVersion,
      durability: mode === 'A' ? (input.board?.durability ?? 'session') : 'session',
    };
    return adaptNestEmergencyOsToNeutralDto(board);
  }

  private async persistSnapshot(
    snapshot: CigGraphSnapshot,
    mode: CigProjectionMode,
  ): Promise<{ closedEdgeCount: number; upsertedNodeCount: number; upsertedEdgeCount: number }> {
    const tenantId = snapshot.meta.tenantId;
    const now = new Date();

    // —— Nodes: upsert ——
    const nodeEntities = snapshot.nodes.map((n) => cigNodeToEntity(n));
    // Preserve monotonic version when contentHash unchanged
    if (nodeEntities.length > 0) {
      const existing = await this.nodeRepo.find({
        where: { tenantId, id: In(nodeEntities.map((n) => n.id)) },
      });
      const byId = new Map(existing.map((e) => [e.id, e]));
      for (const entity of nodeEntities) {
        const prev = byId.get(entity.id);
        if (prev && prev.contentHash && prev.contentHash === entity.contentHash) {
          entity.version = prev.version;
          entity.createdAt = prev.createdAt;
        } else if (prev) {
          entity.version = (prev.version || 0) + 1;
          entity.createdAt = prev.createdAt;
        }
        entity.lastGraphVersion = snapshot.meta.snapshotVersion;
      }
      await this.nodeRepo.save(nodeEntities);
    }

    // Soft-archive active nodes not present in this projection (board left them)
    const projectedIds = new Set(snapshot.nodes.map((n) => n.id));
    const activeNodes = await this.nodeRepo.find({
      where: { tenantId, archivedAt: IsNull() },
    });
    const toArchive = activeNodes.filter((n) => !projectedIds.has(n.id));
    if (toArchive.length > 0) {
      for (const n of toArchive) {
        n.archivedAt = now;
        n.updatedAt = now;
      }
      await this.nodeRepo.save(toArchive);
    }

    // —— Edges: close stale current, upsert projected current ——
    const currentEdges = await this.edgeRepo.find({
      where: { tenantId, validTo: IsNull() },
    });
    const newEdgeIds = new Set(snapshot.edges.map((e) => e.id));
    const toClose = currentEdges.filter((e) => !newEdgeIds.has(e.id));
    if (toClose.length > 0) {
      for (const e of toClose) {
        e.validTo = now;
      }
      await this.edgeRepo.save(toClose);
    }

    const edgeEntities = snapshot.edges.map((e) => cigEdgeToEntity(e));
    if (edgeEntities.length > 0) {
      await this.edgeRepo.save(edgeEntities);
    }

    // —— Snapshot watermark ——
    const redisKey = cigSnapshotRedisKey(tenantId, snapshot.meta.snapshotVersion);
    const snapEntity = cigSnapshotMetaToEntity(snapshot, redisKey);
    await this.snapshotRepo.save(snapEntity);

    // Mode A would leave outbox unprocessed for a consumer; Mode B marks processed immediately
    if (mode === 'A') {
      const outbox = this.outboxRepo.create({
        tenantId,
        eventId: `proj-${tenantId}-${snapshot.meta.snapshotVersion}`,
        payloadJson: {
          snapshotVersion: snapshot.meta.snapshotVersion,
          nodeCount: snapshot.meta.nodeCount,
          edgeCount: snapshot.meta.edgeCount,
        },
        processedAt: null,
      });
      await this.outboxRepo.save(outbox);
    } else {
      const outbox = this.outboxRepo.create({
        tenantId,
        eventId: `proj-modeb-${tenantId}-${snapshot.meta.snapshotVersion}`,
        payloadJson: {
          mode: 'B',
          snapshotVersion: snapshot.meta.snapshotVersion,
          durability: 'session',
        },
        processedAt: now,
      });
      await this.outboxRepo.save(outbox);
    }

    return {
      closedEdgeCount: toClose.length,
      upsertedNodeCount: nodeEntities.length,
      upsertedEdgeCount: edgeEntities.length,
    };
  }

  private async recordProjectionEvent(
    input: AfterBoardMutationInput,
    snapshot: CigGraphSnapshot,
    mode: CigProjectionMode,
  ): Promise<void> {
    const name = input.sourceEventName || 'cig.graph.updated';
    const eventId =
      input.eventId ||
      `cig-proj-${snapshot.meta.tenantId}-${snapshot.meta.snapshotVersion}-${Date.now()}`;

    let domainEvent: CigDomainEvent;
    try {
      domainEvent = buildCigDomainEvent({
        name: name === 'cig.graph.updated' ? 'cig.graph.updated' : name,
        tenantId: snapshot.meta.tenantId,
        producer: input.producer || 'CigProjectionFacade',
        eventId,
        organizationId: input.organizationId,
        workspaceId: input.workspaceId,
        correlationId: input.correlationId,
        durability: mode === 'A' ? 'durable' : 'session',
        payload: {
          ...(input.payload || {}),
          snapshotVersion: snapshot.meta.snapshotVersion,
          nodeCount: snapshot.meta.nodeCount,
          edgeCount: snapshot.meta.edgeCount,
          mode,
        },
      });
    } catch {
      // Unknown catalogue name — still emit graph.updated shape
      domainEvent = buildCigDomainEvent({
        name: 'cig.graph.updated',
        tenantId: snapshot.meta.tenantId,
        producer: input.producer || 'CigProjectionFacade',
        eventId,
        durability: mode === 'A' ? 'durable' : 'session',
        payload: {
          snapshotVersion: snapshot.meta.snapshotVersion,
          sourceEventName: name,
          mode,
        },
      });
    }

    this.eventBus.emitDomainEvent(domainEvent);

    const entity = this.eventRepo.create({
      eventId: domainEvent.eventId,
      tenantId: domainEvent.tenantId,
      name: domainEvent.name,
      version: domainEvent.version,
      occurredAt: new Date(domainEvent.occurredAt),
      receivedAt: new Date(domainEvent.receivedAt),
      producer: domainEvent.producer,
      durability: domainEvent.durability,
      piiClass: domainEvent.piiClassification,
      payloadJson: domainEvent.payload,
      correlationId: domainEvent.correlationId ?? null,
      causationId: domainEvent.causationId ?? null,
      organizationId: domainEvent.organizationId ?? null,
      workspaceId: domainEvent.workspaceId ?? null,
    });
    await this.eventRepo.save(entity);
  }

  private fail(mode: CigProjectionMode, tenantId: string, error: string): CigProjectionResult {
    return {
      ok: false,
      mode,
      tenantId,
      snapshotVersion: 0,
      nodeCount: 0,
      edgeCount: 0,
      durability: 'session',
      degraded: true,
      closedEdgeCount: 0,
      upsertedNodeCount: 0,
      upsertedEdgeCount: 0,
      error,
    };
  }
}
