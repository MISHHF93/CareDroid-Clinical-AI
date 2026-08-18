import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { IntegrationAutomationRouter } from './integration-automation-router.service';
import {
  IntegrationEvent,
  IntegrationEventFamily,
  NormalizedClinicalEvent,
} from './normalized-clinical-event.model';
import {
  IntegrationEventProcessingStatus,
  IntegrationEventRecordEntity,
  IntegrationSourceEntity,
  IntegrationSourceStatus,
  NormalizedIntegrationEventEntity,
} from './entities/integration-hub.entity';

export interface IntegrationHubIngestRequest extends IntegrationEvent {
  idempotencyKey?: string;
  event?: IntegrationEvent;
}

export interface IntegrationHubRequestMeta {
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function dateFrom(value: unknown): Date {
  const parsed = optionalString(value) ? new Date(String(value)) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function normalizeFamily(value: string | undefined): IntegrationEventFamily {
  if (value === 'fhir' || value === 'hl7' || value === 'lis' || value === 'device_telemetry') {
    return value;
  }
  return 'unknown';
}

function clampLimit(value: number | undefined, fallback = 25, max = 100) {
  if (!Number.isFinite(value || NaN)) return fallback;
  return Math.max(1, Math.min(max, Number(value)));
}

@Injectable()
export class IntegrationHubService {
  constructor(
    @InjectRepository(IntegrationSourceEntity)
    private readonly sourceRepository: Repository<IntegrationSourceEntity>,
    @InjectRepository(IntegrationEventRecordEntity)
    private readonly eventRepository: Repository<IntegrationEventRecordEntity>,
    @InjectRepository(NormalizedIntegrationEventEntity)
    private readonly normalizedRepository: Repository<NormalizedIntegrationEventEntity>,
    private readonly router: IntegrationAutomationRouter,
    private readonly auditService: AuditService,
  ) {}

  async ingest(input: IntegrationHubIngestRequest, meta: IntegrationHubRequestMeta = {}) {
    const event = this.normalizeRequest(input);
    // HEAL-337: the caller's own resolved tenant always wins over a
    // client-supplied event.organizationId (an ADMIN-tier, org-scoped
    // permission gates this route -- MANAGE_INTEGRATIONS is never
    // platform-wide -- so an admin must only ever be able to ingest/attribute
    // integration events to their own organization, never fabricate one for
    // a different hospital).
    if (meta.organizationId) {
      event.organizationId = meta.organizationId;
    }
    const idempotencyKey = this.resolveIdempotencyKey(input, event);

    if (idempotencyKey) {
      const existing = await this.eventRepository.findOne({
        where: {
          idempotencyKey,
          organizationId: event.organizationId || IsNull(),
          sourceSystem: event.sourceSystem || 'unknown-source',
        },
      });
      if (existing) {
        return this.serializeEventTrace(existing, true);
      }
    }

    const source = await this.findOrCreateSource(event);
    const receivedAt = dateFrom(event.receivedAt);
    const rawRecord = await this.eventRepository.save(
      this.eventRepository.create({
        sourceId: source.id,
        organizationId: event.organizationId || null,
        workspaceId: event.workspaceId || null,
        sourceSystem: event.sourceSystem || source.sourceSystem,
        family: event.family,
        eventType: event.eventType,
        vendor: event.vendor || null,
        idempotencyKey: idempotencyKey || null,
        processingStatus: IntegrationEventProcessingStatus.RECEIVED,
        rawEvent: { ...event, receivedAt: receivedAt.toISOString() },
        routeResult: null,
        normalizedEventId: null,
        error: null,
        receivedAt,
      }),
    );

    try {
      const routeResult = this.router.routeIntegrationEvent({
        ...event,
        id: event.id || rawRecord.id,
        receivedAt: receivedAt.toISOString(),
      });
      const normalizedEvent = routeResult.normalizedEvent;
      const normalizedRecord = normalizedEvent
        ? await this.persistNormalizedEvent(rawRecord, normalizedEvent, routeResult)
        : null;

      rawRecord.routeResult = routeResult;
      rawRecord.normalizedEventId = normalizedRecord?.id || null;
      rawRecord.processingStatus =
        routeResult.status === 'unsupported'
          ? IntegrationEventProcessingStatus.UNSUPPORTED
          : routeResult.status === 'routed'
            ? IntegrationEventProcessingStatus.ROUTED
            : IntegrationEventProcessingStatus.NORMALIZED;
      await this.eventRepository.save(rawRecord);

      await this.auditIngestion(rawRecord, normalizedRecord, meta);
      return this.serializeEventTrace(rawRecord, false, normalizedRecord);
    } catch (error) {
      rawRecord.processingStatus = IntegrationEventProcessingStatus.FAILED;
      rawRecord.error = error instanceof Error ? error.message : 'Integration event failed';
      await this.eventRepository.save(rawRecord);
      await this.auditIngestion(rawRecord, null, meta);
      throw error;
    }
  }

  async listRecent(limit?: number, organizationId?: string) {
    const events = await this.eventRepository.find({
      where: organizationId ? { organizationId } : undefined,
      order: { receivedAt: 'DESC' },
      take: clampLimit(limit),
    });
    return {
      events: events.map((event) => this.serializeRawRecord(event)),
      count: events.length,
    };
  }

  // HEAL-337: was an unscoped findOne({where:{id}}) -- any admin could walk
  // event ids and read another hospital's real FHIR/HL7/lab/medication
  // payload. NotFoundException on a cross-org id mirrors a genuinely missing
  // id (no existence leak), matching AiActionProposalService's
  // assertProposalOrganization pattern (HEAL-325).
  async getTrace(id: string, organizationId?: string) {
    const rawRecord = await this.eventRepository.findOne({ where: { id } });
    if (!rawRecord || (organizationId && rawRecord.organizationId && rawRecord.organizationId !== organizationId)) {
      throw new NotFoundException(`Integration event ${id} was not found`);
    }
    return this.serializeEventTrace(rawRecord);
  }

  private normalizeRequest(input: IntegrationHubIngestRequest): IntegrationEvent {
    const event = input.event || input;
    if (!event || typeof event !== 'object') {
      throw new BadRequestException('Integration event payload is required.');
    }
    if (!optionalString(event.family) || !optionalString(event.eventType)) {
      throw new BadRequestException('Integration event requires family and eventType.');
    }

    return {
      ...event,
      family: optionalString(event.family)!,
      eventType: optionalString(event.eventType)!,
      sourceSystem: optionalString(event.sourceSystem) || 'unknown-source',
      organizationId: optionalString(event.organizationId),
      workspaceId: optionalString(event.workspaceId),
      vendor: optionalString(event.vendor),
      receivedAt: optionalString(event.receivedAt) || new Date().toISOString(),
      payload: event.payload || {},
      metadata: event.metadata || {},
    };
  }

  private resolveIdempotencyKey(input: IntegrationHubIngestRequest, event: IntegrationEvent) {
    return (
      optionalString(input.idempotencyKey) ||
      optionalString(event.metadata?.idempotencyKey) ||
      optionalString(event.id)
    );
  }

  private async findOrCreateSource(event: IntegrationEvent) {
    const organizationId = event.organizationId || null;
    const workspaceId = event.workspaceId || null;
    const sourceSystem = event.sourceSystem || 'unknown-source';
    const family = normalizeFamily(event.family);

    const existing = await this.sourceRepository.findOne({
      where: {
        organizationId: organizationId ?? IsNull(),
        workspaceId: workspaceId ?? IsNull(),
        sourceSystem,
        family,
      },
    });
    if (existing) return existing;

    return this.sourceRepository.save(
      this.sourceRepository.create({
        organizationId,
        workspaceId,
        sourceSystem,
        family,
        vendor: event.vendor || null,
        status: IntegrationSourceStatus.ACTIVE,
        authMode: 'shared-secret-or-token',
        labels: ['integration-hub', `family:${event.family}`],
        metadata: event.metadata || null,
      }),
    );
  }

  private async persistNormalizedEvent(
    rawRecord: IntegrationEventRecordEntity,
    normalizedEvent: NormalizedClinicalEvent,
    routeResult: ReturnType<IntegrationAutomationRouter['routeIntegrationEvent']>,
  ) {
    return this.normalizedRepository.save(
      this.normalizedRepository.create({
        rawEventRecordId: rawRecord.id,
        organizationId: normalizedEvent.organizationId || null,
        workspaceId: normalizedEvent.workspaceId || null,
        kind: normalizedEvent.kind,
        sourceFamily: normalizedEvent.sourceFamily,
        sourceEventType: normalizedEvent.sourceEventType,
        parserStatus: normalizedEvent.parserStatus,
        severity: normalizedEvent.severity,
        normalizedEvent,
        trigger: routeResult.trigger || null,
        safeAction: routeResult.safeAction,
        labels: routeResult.labels || [],
        occurredAt: dateFrom(normalizedEvent.occurredAt),
        receivedAt: dateFrom(normalizedEvent.receivedAt),
      }),
    );
  }

  private async auditIngestion(
    rawRecord: IntegrationEventRecordEntity,
    normalizedRecord: NormalizedIntegrationEventEntity | null,
    meta: IntegrationHubRequestMeta,
  ) {
    await this.auditService.log({
      userId: meta.userId,
      organizationId: rawRecord.organizationId || undefined,
      workspaceId: rawRecord.workspaceId || undefined,
      action: AuditAction.CLINICAL_DATA_ACCESS,
      resource: `integration:event:${rawRecord.id}`,
      ipAddress: meta.ipAddress || '0.0.0.0',
      userAgent: meta.userAgent || 'integration-hub',
      phiAccessed: Boolean(normalizedRecord?.normalizedEvent?.patientId),
      metadata: {
        family: rawRecord.family,
        eventType: rawRecord.eventType,
        sourceSystem: rawRecord.sourceSystem,
        processingStatus: rawRecord.processingStatus,
        normalizedEventId: normalizedRecord?.id || null,
        safeActionType: normalizedRecord?.safeAction?.type || null,
        reviewRequired: normalizedRecord?.safeAction?.requiresHumanReview || false,
      },
    });
  }

  private async serializeEventTrace(
    rawRecord: IntegrationEventRecordEntity,
    duplicate = false,
    normalizedRecord?: NormalizedIntegrationEventEntity | null,
  ) {
    const normalized =
      normalizedRecord !== undefined
        ? normalizedRecord
        : rawRecord.normalizedEventId
          ? await this.normalizedRepository.findOne({ where: { id: rawRecord.normalizedEventId } })
          : null;

    return {
      duplicate,
      event: this.serializeRawRecord(rawRecord),
      normalizedEvent: normalized ? this.serializeNormalizedRecord(normalized) : null,
      routeResult: rawRecord.routeResult,
    };
  }

  private serializeRawRecord(rawRecord: IntegrationEventRecordEntity) {
    return {
      id: rawRecord.id,
      sourceId: rawRecord.sourceId,
      organizationId: rawRecord.organizationId,
      workspaceId: rawRecord.workspaceId,
      sourceSystem: rawRecord.sourceSystem,
      family: rawRecord.family,
      eventType: rawRecord.eventType,
      vendor: rawRecord.vendor,
      idempotencyKey: rawRecord.idempotencyKey,
      processingStatus: rawRecord.processingStatus,
      normalizedEventId: rawRecord.normalizedEventId,
      error: rawRecord.error,
      receivedAt: rawRecord.receivedAt,
      createdAt: rawRecord.createdAt,
    };
  }

  private serializeNormalizedRecord(record: NormalizedIntegrationEventEntity) {
    return {
      id: record.id,
      rawEventRecordId: record.rawEventRecordId,
      organizationId: record.organizationId,
      workspaceId: record.workspaceId,
      kind: record.kind,
      sourceFamily: record.sourceFamily,
      sourceEventType: record.sourceEventType,
      parserStatus: record.parserStatus,
      severity: record.severity,
      labels: record.labels,
      normalizedEvent: record.normalizedEvent,
      trigger: record.trigger,
      safeAction: record.safeAction,
      occurredAt: record.occurredAt,
      receivedAt: record.receivedAt,
      createdAt: record.createdAt,
    };
  }
}
