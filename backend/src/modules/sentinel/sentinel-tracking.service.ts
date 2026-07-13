import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { calculateEta } from '../../../../lib/sentinel/etaEngine';
import {
  buildApproachBox,
  evaluateGeofenceTransition,
  pointInPolygon,
} from '../../../../lib/sentinel/geofenceEngine';
import type { CadAvlEvent, SentinelUnitStatus } from '../../../../lib/sentinel/types';
import {
  FleetBridgeAdapter,
  MockCadAvlAdapter,
  WebhookCadAvlAdapter,
  type CadAvlAdapter,
} from './adapters/cad-avl.adapter';
import { SentinelUnitEntity } from './entities/sentinel-unit.entity';
import { SentinelPositionEntity } from './entities/sentinel-position.entity';
import { SentinelEtaEntity } from './entities/sentinel-eta.entity';
import { SentinelGeofenceEntity } from './entities/sentinel-geofence.entity';
import { SentinelGeofenceEventEntity } from './entities/sentinel-geofence-event.entity';
import { SentinelEpisodeEntity } from './entities/sentinel-episode.entity';
import { SentinelIntegrationCursorEntity } from './entities/sentinel-integration-cursor.entity';
import { SentinelAlarmService } from './sentinel-alarm.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { createId, getSentinelRuntimeConfig } from './sentinel.config';

@Injectable()
export class SentinelTrackingService implements OnModuleInit {
  private readonly logger = new Logger(SentinelTrackingService.name);
  private readonly mockAdapter = new MockCadAvlAdapter();
  private readonly webhookAdapter = new WebhookCadAvlAdapter();
  private fleetAdapter: FleetBridgeAdapter | null = null;
  private readonly unitFenceState = new Map<string, Set<string>>();

  constructor(
    @InjectRepository(SentinelUnitEntity)
    private readonly unitRepo: Repository<SentinelUnitEntity>,
    @InjectRepository(SentinelPositionEntity)
    private readonly positionRepo: Repository<SentinelPositionEntity>,
    @InjectRepository(SentinelEtaEntity)
    private readonly etaRepo: Repository<SentinelEtaEntity>,
    @InjectRepository(SentinelGeofenceEntity)
    private readonly fenceRepo: Repository<SentinelGeofenceEntity>,
    @InjectRepository(SentinelGeofenceEventEntity)
    private readonly fenceEventRepo: Repository<SentinelGeofenceEventEntity>,
    @InjectRepository(SentinelEpisodeEntity)
    private readonly episodeRepo: Repository<SentinelEpisodeEntity>,
    @InjectRepository(SentinelIntegrationCursorEntity)
    private readonly cursorRepo: Repository<SentinelIntegrationCursorEntity>,
    private readonly alarmService: SentinelAlarmService,
    private readonly outbox: SentinelOutboxService,
  ) {}

  async onModuleInit(): Promise<void> {
    const config = getSentinelRuntimeConfig();
    if (!config.enabled) {
      this.logger.log('Sentinel disabled (SENTINEL_ENABLED=false)');
      return;
    }
    await this.ensureDefaultGeofence();
    this.logger.log('Sentinel tracking service initialized');
  }

  getWebhookAdapter(): WebhookCadAvlAdapter {
    return this.webhookAdapter;
  }

  listAdapters(): CadAvlAdapter[] {
    const config = getSentinelRuntimeConfig();
    const adapters: CadAvlAdapter[] = [];
    if (config.mockAdapter) adapters.push(this.mockAdapter);
    adapters.push(this.webhookAdapter);
    if (config.fleetBridge) {
      if (!this.fleetAdapter) {
        this.fleetAdapter = new FleetBridgeAdapter(() => this.loadFleetDemoVehicles());
      }
      adapters.push(this.fleetAdapter);
    }
    return adapters;
  }

  async health(): Promise<{
    enabled: boolean;
    postgis: boolean;
    adapters: Array<{
      vendorId: string;
      healthy: boolean;
      detail: string;
      lastEventAt: string | null;
    }>;
    unitCount: number;
  }> {
    const config = getSentinelRuntimeConfig();
    const adapters = [];
    for (const adapter of this.listAdapters()) {
      const h = await adapter.health();
      adapters.push({
        vendorId: h.vendorId,
        healthy: h.healthy,
        detail: h.detail,
        lastEventAt: h.lastEventAt,
      });
    }
    const unitCount = await this.unitRepo.count();
    return {
      enabled: config.enabled,
      postgis: config.postgis,
      adapters,
      unitCount,
    };
  }

  async listUnits(): Promise<SentinelUnitEntity[]> {
    return this.unitRepo.find({ order: { updatedAt: 'DESC' }, take: 200 });
  }

  async listPositions(unitId: string, limit = 50): Promise<SentinelPositionEntity[]> {
    return this.positionRepo.find({
      where: { unitId },
      order: { receivedAt: 'DESC' },
      take: limit,
    });
  }

  async latestEta(unitId: string): Promise<SentinelEtaEntity | null> {
    const rows = await this.etaRepo.find({
      where: { unitId },
      order: { calculatedAt: 'DESC' },
      take: 1,
    });
    return rows[0] ?? null;
  }

  async listGeofences(): Promise<SentinelGeofenceEntity[]> {
    return this.fenceRepo.find({ where: { active: true } });
  }

  async listEpisodes(): Promise<SentinelEpisodeEntity[]> {
    return this.episodeRepo.find({ order: { updatedAt: 'DESC' }, take: 100 });
  }

  async ingestCadEvents(
    events: readonly CadAvlEvent[],
  ): Promise<{ accepted: number; rejected: number }> {
    let accepted = 0;
    let rejected = 0;
    for (const event of events) {
      try {
        await this.applyCadEvent(event);
        accepted += 1;
      } catch (error) {
        rejected += 1;
        this.logger.warn(
          `Rejected CAD event ${event.eventId}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { accepted, rejected };
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async pollAdapters(): Promise<void> {
    const config = getSentinelRuntimeConfig();
    if (!config.enabled) return;

    for (const adapter of this.listAdapters()) {
      try {
        for await (const event of adapter.pullOrSubscribe({})) {
          await this.applyCadEvent(event);
        }
      } catch (error) {
        this.logger.warn(
          `Adapter ${adapter.vendorId} poll failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async applyCadEvent(event: CadAvlEvent): Promise<void> {
    // Idempotent cursor: skip duplicate source event ids
    if (event.eventId) {
      const cursorId = `${event.vendorId}:${event.unitExternalId}`;
      const cursor = await this.cursorRepo.findOne({ where: { id: cursorId } });
      if (cursor?.lastEventId === event.eventId) {
        return;
      }
      // Out-of-order sequence handling
      if (
        event.sequence != null &&
        cursor &&
        Number.isFinite(cursor.lastSequence) &&
        event.sequence < cursor.lastSequence
      ) {
        this.logger.debug(
          `Out-of-order event for ${event.unitExternalId} seq ${event.sequence} < ${cursor.lastSequence}`,
        );
        // Still accept if newer timestamp; otherwise drop
        if (cursor.lastEventAt && event.occurredAt < cursor.lastEventAt) {
          return;
        }
      }
      await this.cursorRepo.save(
        this.cursorRepo.create({
          id: cursorId,
          vendorId: event.vendorId,
          lastEventId: event.eventId,
          lastSequence: event.sequence ?? cursor?.lastSequence ?? 0,
          lastEventAt: event.occurredAt,
          metadata: null,
        }),
      );
    }

    const unit = await this.upsertUnit(event);

    if (event.kind === 'position' && event.latitude != null && event.longitude != null) {
      const pos = this.positionRepo.create({
        id: createId('spos'),
        unitId: unit.id,
        latitude: event.latitude,
        longitude: event.longitude,
        heading: event.heading ?? null,
        speedKmh: event.speedKmh ?? null,
        source: event.vendorId,
        receivedAt: event.occurredAt,
        eventSeq: event.sequence ?? unit.lastEventSeq + 1,
        sourceEventId: event.eventId,
      });
      await this.positionRepo.save(pos);

      unit.latitude = event.latitude;
      unit.longitude = event.longitude;
      unit.heading = event.heading ?? unit.heading;
      unit.speedKmh = event.speedKmh ?? unit.speedKmh;
      unit.lastSeenAt = event.occurredAt;
      unit.lastEventSeq = pos.eventSeq;
      unit.freshness = this.computeFreshness(event.occurredAt);
      if (event.status) unit.status = event.status;
      await this.unitRepo.save(unit);

      const eta = await this.recalculateEta(unit);
      await this.evaluateGeofences(unit);
      await this.outbox.enqueue({
        aggregateType: 'unit',
        aggregateId: unit.id,
        eventType: 'UnitPositionReceived',
        payload: {
          unitId: unit.id,
          externalId: unit.externalId,
          latitude: unit.latitude,
          longitude: unit.longitude,
          eta: eta
            ? {
                etaPointMin: eta.etaPointMin,
                etaLowMin: eta.etaLowMin,
                etaHighMin: eta.etaHighMin,
                confidence: eta.confidence,
              }
            : null,
        },
      });
    } else if (event.status) {
      unit.status = event.status;
      unit.lastSeenAt = event.occurredAt;
      unit.freshness = this.computeFreshness(event.occurredAt);
      await this.unitRepo.save(unit);
      await this.touchEpisode(unit, event.status);
      await this.outbox.enqueue({
        aggregateType: 'unit',
        aggregateId: unit.id,
        eventType: 'UnitStatusChanged',
        payload: { unitId: unit.id, status: unit.status },
      });
    }
  }

  private async upsertUnit(event: CadAvlEvent): Promise<SentinelUnitEntity> {
    let unit = await this.unitRepo.findOne({
      where: { externalId: event.unitExternalId, vendorId: event.vendorId },
    });
    if (!unit) {
      unit = this.unitRepo.create({
        id: createId('sunit'),
        externalId: event.unitExternalId,
        vendorId: event.vendorId,
        label: event.unitExternalId,
        unitType: 'ALS',
        status: event.status || 'available',
        freshness: 'fresh',
        latitude: event.latitude ?? null,
        longitude: event.longitude ?? null,
        heading: event.heading ?? null,
        speedKmh: event.speedKmh ?? null,
        lastSeenAt: event.occurredAt,
        lastEventSeq: event.sequence ?? 0,
        organizationId: null,
        workspaceId: null,
        metadata: event.raw ? { ...event.raw } : null,
      });
      await this.unitRepo.save(unit);
      await this.ensureEpisode(unit);
    }
    return unit;
  }

  private async recalculateEta(unit: SentinelUnitEntity): Promise<SentinelEtaEntity | null> {
    if (unit.latitude == null || unit.longitude == null) return null;
    const config = getSentinelRuntimeConfig();
    const result = calculateEta({
      origin: { latitude: unit.latitude, longitude: unit.longitude },
      destination: {
        latitude: config.hospitalLatitude,
        longitude: config.hospitalLongitude,
      },
      speedKmh: unit.speedKmh,
      traffic: config.defaultTraffic,
      lastSeenAt: unit.lastSeenAt,
    });

    const row = this.etaRepo.create({
      id: createId('seta'),
      unitId: unit.id,
      etaPointMin: result.etaPointMin,
      etaLowMin: result.etaLowMin,
      etaHighMin: result.etaHighMin,
      confidence: result.confidence,
      method: result.method,
      inputsHash: result.inputsHash,
      distanceKm: result.distanceKm,
      stale: result.stale,
      calculatedAt: result.calculatedAt,
    });
    await this.etaRepo.save(row);
    await this.outbox.enqueue({
      aggregateType: 'eta',
      aggregateId: row.id,
      eventType: 'EtaRecalculated',
      payload: {
        unitId: unit.id,
        etaPointMin: row.etaPointMin,
        etaLowMin: row.etaLowMin,
        etaHighMin: row.etaHighMin,
        confidence: row.confidence,
        stale: row.stale,
      },
    });
    return row;
  }

  private async evaluateGeofences(unit: SentinelUnitEntity): Promise<void> {
    if (unit.latitude == null || unit.longitude == null) return;
    const fences = await this.fenceRepo.find({ where: { active: true } });
    const stateKey = unit.id;
    if (!this.unitFenceState.has(stateKey)) {
      this.unitFenceState.set(stateKey, new Set());
    }
    const insideSet = this.unitFenceState.get(stateKey)!;
    const point = { latitude: unit.latitude, longitude: unit.longitude };

    for (const fence of fences) {
      const previouslyInside = insideSet.has(fence.id);
      // Prefer pure engine; PostGIS path would replace pointInPolygon when SENTINEL_POSTGIS=1
      const config = getSentinelRuntimeConfig();
      if (config.postgis) {
        // Geometry column not required in v1 — fall through to ray casting with same semantics.
      }
      const transition = evaluateGeofenceTransition({
        fenceId: fence.id,
        ring: fence.ring,
        point,
        previouslyInside,
      });

      if (transition.transition === 'entered') {
        insideSet.add(fence.id);
        await this.recordFenceEvent(unit.id, fence.id, 'entered');
        await this.alarmService.raise({
          source: 'sentinel-geofence',
          category: fence.kind,
          ruleId: `enter-${fence.kind}`,
          subjectId: unit.id,
          severity: fence.kind === 'bay' ? 'warning' : 'info',
          urgency: fence.kind === 'bay' ? 'soon' : 'routine',
          title: `${unit.label} entered ${fence.name}`,
          message: `Unit ${unit.label} entered geofence ${fence.name} (${fence.kind})`,
          metadata: { fenceId: fence.id, unitExternalId: unit.externalId },
        });
        await this.outbox.enqueue({
          aggregateType: 'geofence',
          aggregateId: fence.id,
          eventType: 'GeofenceEntered',
          payload: { unitId: unit.id, fenceId: fence.id, kind: fence.kind },
        });
      } else if (transition.transition === 'exited') {
        insideSet.delete(fence.id);
        await this.recordFenceEvent(unit.id, fence.id, 'exited');
        await this.outbox.enqueue({
          aggregateType: 'geofence',
          aggregateId: fence.id,
          eventType: 'GeofenceExited',
          payload: { unitId: unit.id, fenceId: fence.id, kind: fence.kind },
        });
      } else if (transition.inside) {
        insideSet.add(fence.id);
      } else {
        // ensure consistency
        if (!pointInPolygon(point, fence.ring)) insideSet.delete(fence.id);
      }
    }
  }

  private async recordFenceEvent(
    unitId: string,
    fenceId: string,
    transition: string,
  ): Promise<void> {
    await this.fenceEventRepo.save(
      this.fenceEventRepo.create({
        id: createId('sfevt'),
        unitId,
        fenceId,
        transition,
        occurredAt: new Date().toISOString(),
      }),
    );
  }

  private async ensureDefaultGeofence(): Promise<void> {
    const existing = await this.fenceRepo.count();
    if (existing > 0) return;
    const config = getSentinelRuntimeConfig();
    const center = {
      latitude: config.hospitalLatitude,
      longitude: config.hospitalLongitude,
    };
    await this.fenceRepo.save([
      this.fenceRepo.create({
        id: createId('sfence'),
        name: 'Hospital approach',
        kind: 'hospital_approach',
        ring: [...buildApproachBox(center, 3)],
        active: true,
        organizationId: null,
      }),
      this.fenceRepo.create({
        id: createId('sfence'),
        name: 'Ambulance bay',
        kind: 'bay',
        ring: [...buildApproachBox(center, 0.35)],
        active: true,
        organizationId: null,
      }),
    ]);
  }

  private async ensureEpisode(unit: SentinelUnitEntity): Promise<void> {
    const open = await this.episodeRepo.findOne({
      where: { unitId: unit.id, status: 'transporting' as string },
    });
    if (open) return;
    await this.episodeRepo.save(
      this.episodeRepo.create({
        id: createId('sepisode'),
        unitId: unit.id,
        inboundPatientId: null,
        status: unit.status || 'dispatched',
        dispatchedAt: new Date().toISOString(),
        onSceneAt: null,
        enRouteHospitalAt: null,
        arrivedAt: null,
        handoffStartedAt: null,
        handoffCompletedAt: null,
        unitAvailableAt: null,
        predictedEtaMin: null,
        actualTravelMin: null,
        organizationId: unit.organizationId,
      }),
    );
  }

  private async touchEpisode(unit: SentinelUnitEntity, status: SentinelUnitStatus): Promise<void> {
    const episodes = await this.episodeRepo.find({
      where: { unitId: unit.id },
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    let episode = episodes[0];
    if (!episode) {
      await this.ensureEpisode(unit);
      return;
    }
    const now = new Date().toISOString();
    episode.status = status;
    if (status === 'on_scene') episode.onSceneAt = episode.onSceneAt || now;
    if (status === 'transporting') episode.enRouteHospitalAt = episode.enRouteHospitalAt || now;
    if (status === 'at_hospital' || status === 'handoff') {
      episode.arrivedAt = episode.arrivedAt || now;
    }
    if (status === 'available') {
      episode.unitAvailableAt = now;
      if (episode.arrivedAt) {
        const travel =
          (Date.parse(episode.arrivedAt) - Date.parse(episode.dispatchedAt || episode.arrivedAt)) /
          60000;
        if (Number.isFinite(travel)) episode.actualTravelMin = Math.round(travel);
      }
    }
    await this.episodeRepo.save(episode);
    await this.outbox.enqueue({
      aggregateType: 'episode',
      aggregateId: episode.id,
      eventType: 'EmsEpisodeTransitioned',
      payload: { episodeId: episode.id, unitId: unit.id, status },
    });
  }

  private computeFreshness(lastSeenAt: string): string {
    const age = Date.now() - Date.parse(lastSeenAt);
    if (!Number.isFinite(age)) return 'offline';
    if (age < 2 * 60 * 1000) return 'fresh';
    if (age < 10 * 60 * 1000) return 'stale';
    return 'offline';
  }

  private loadFleetDemoVehicles(): Array<{
    id: string;
    label: string;
    coordinates: { latitude: number; longitude: number };
    heading: number;
    speedMph: number;
    status: string;
    lastSeenAt: string;
  }> {
    // Inline minimal demo set to avoid hard dependency on fleet module bootstrap.
    return [
      {
        id: 'VH-101',
        label: 'Van 101',
        coordinates: { latitude: 40.7558, longitude: -73.9864 },
        heading: 74,
        speedMph: 22,
        status: 'occupied',
        lastSeenAt: new Date().toISOString(),
      },
    ];
  }
}
