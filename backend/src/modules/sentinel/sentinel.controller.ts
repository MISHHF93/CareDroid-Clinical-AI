import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AnyPermission } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { normalizeWebhookPayload } from './adapters/cad-avl.adapter';
import { SentinelAlarmService } from './sentinel-alarm.service';
import { SentinelInboundService } from './sentinel-inbound.service';
import { SentinelOutboxService } from './sentinel-outbox.service';
import { SentinelTrackingService } from './sentinel-tracking.service';
import { getSentinelRuntimeConfig } from './sentinel.config';
import type { SentinelAlarmStatus } from '../../../../lib/sentinel/types';

function envelope<T>(data: T, message: string) {
  const config = getSentinelRuntimeConfig();
  return {
    success: true,
    generatedAt: new Date().toISOString(),
    sentinelEnabled: config.enabled,
    message,
    data,
  };
}

@ApiTags('sentinel')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), AuthorizationGuard)
@Controller('sentinel')
export class SentinelController {
  constructor(
    private readonly tracking: SentinelTrackingService,
    private readonly alarms: SentinelAlarmService,
    private readonly inbound: SentinelInboundService,
    private readonly outbox: SentinelOutboxService,
  ) {}

  @Get('health')
  @AnyPermission(
    Permission.VIEW_SENTINEL_COMMAND,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_OBSERVABILITY,
    Permission.READ_PHI,
  )
  @ApiOperation({ summary: 'Sentinel subsystem health (adapters, outbox, flags)' })
  async health() {
    const [trackingHealth, outboxHealth, alarmPerf, analytics] = await Promise.all([
      this.tracking.health(),
      this.outbox.getHealth(),
      this.alarms.performanceSnapshot(),
      this.inbound.analyticsSnapshot(),
    ]);
    return envelope(
      {
        ...trackingHealth,
        outbox: outboxHealth,
        alarms: alarmPerf,
        analytics,
      },
      trackingHealth.enabled
        ? 'Sentinel is enabled'
        : 'Sentinel is disabled (set SENTINEL_ENABLED=true to activate ingest)',
    );
  }

  @Get('command-snapshot')
  @AnyPermission(Permission.VIEW_SENTINEL_COMMAND, Permission.READ_PHI, Permission.VIEW_OPERATIONS)
  @ApiOperation({ summary: 'Command center snapshot: units, ETAs, inbound, open alarms' })
  async commandSnapshot() {
    const [units, fences, episodes, inboundPatients, openAlarms, recommendations] =
      await Promise.all([
        this.tracking.listUnits(),
        this.tracking.listGeofences(),
        this.tracking.listEpisodes(),
        this.inbound.listInbound(),
        this.alarms.listOpen(),
        this.inbound.listRecommendations(),
      ]);

    const unitsWithEta = await Promise.all(
      units.map(async (unit) => {
        const eta = await this.tracking.latestEta(unit.id);
        return {
          id: unit.id,
          externalId: unit.externalId,
          label: unit.label,
          status: unit.status,
          freshness: unit.freshness,
          coordinates:
            unit.latitude != null && unit.longitude != null
              ? { latitude: unit.latitude, longitude: unit.longitude }
              : null,
          heading: unit.heading,
          speedKmh: unit.speedKmh,
          lastSeenAt: unit.lastSeenAt,
          eta: eta
            ? {
                etaPointMin: eta.etaPointMin,
                etaLowMin: eta.etaLowMin,
                etaHighMin: eta.etaHighMin,
                confidence: eta.confidence,
                stale: eta.stale,
                method: eta.method,
              }
            : null,
        };
      }),
    );

    return envelope(
      {
        units: unitsWithEta,
        geofences: fences.map((f) => ({
          id: f.id,
          name: f.name,
          kind: f.kind,
          ring: f.ring,
        })),
        episodes,
        inboundPatients,
        openAlarms,
        aiRecommendations: recommendations.filter((r) => r.humanReviewStatus === 'pending'),
      },
      'Sentinel command snapshot',
    );
  }

  @Get('units')
  @AnyPermission(
    Permission.VIEW_SENTINEL_COMMAND,
    Permission.MANAGE_SENTINEL_UNITS,
    Permission.READ_PHI,
  )
  async listUnits() {
    return envelope(await this.tracking.listUnits(), 'Sentinel units');
  }

  @Get('units/:unitId/positions')
  @AnyPermission(Permission.VIEW_SENTINEL_COMMAND, Permission.MANAGE_SENTINEL_UNITS)
  async unitPositions(@Param('unitId') unitId: string, @Query('limit') limit?: string) {
    const n = limit ? Math.min(200, Math.max(1, Number(limit) || 50)) : 50;
    return envelope(await this.tracking.listPositions(unitId, n), 'Unit positions');
  }

  @Get('geofences')
  @AnyPermission(Permission.VIEW_SENTINEL_COMMAND, Permission.MANAGE_SENTINEL_GEOFENCES)
  async listGeofences() {
    return envelope(await this.tracking.listGeofences(), 'Active geofences');
  }

  @Post('ingest/cad')
  @AnyPermission(
    Permission.INGEST_SENTINEL_CAD,
    Permission.MANAGE_INTEGRATIONS,
    Permission.MANAGE_SENTINEL_UNITS,
  )
  @ApiOperation({ summary: 'Vendor-agnostic CAD/AVL webhook ingest' })
  async ingestCad(@Body() body: Record<string, unknown>) {
    const events = normalizeWebhookPayload(body || {});
    this.tracking.getWebhookAdapter().enqueue(events);
    const result = await this.tracking.ingestCadEvents(events);

    // If payload includes clinical fields, upsert inbound patient
    const clinicalKeys = [
      'chiefComplaint',
      'chief_complaint',
      'eSituation.11',
      'vitals',
      'priority',
    ];
    const hasClinical = clinicalKeys.some((k) => body && body[k] != null);
    let inbound: {
      id: string;
      missingFields: readonly string[];
      validation: Awaited<
        ReturnType<SentinelInboundService['upsertFromCadOrNemsis']>
      >['validation'];
    } | null = null;
    if (hasClinical || body?.patient) {
      const payload =
        body.patient && typeof body.patient === 'object'
          ? { ...(body as object), ...(body.patient as object) }
          : body;
      const unitExternalId = String(
        body.unitExternalId || body.unitId || body.ems_unit_id || events[0]?.unitExternalId || '',
      );
      const upserted = await this.inbound.upsertFromCadOrNemsis({
        payload: payload as Record<string, unknown>,
        unitId: unitExternalId || undefined,
      });
      inbound = {
        id: upserted.inbound.id,
        missingFields: upserted.missingFields,
        validation: upserted.validation,
      };
    }

    return envelope({ ...result, eventCount: events.length, inbound }, 'CAD/AVL events ingested');
  }

  @Post('poll')
  @AnyPermission(Permission.MANAGE_SENTINEL_UNITS, Permission.INGEST_SENTINEL_CAD)
  @ApiOperation({ summary: 'Force adapter poll (mock/fleet/webhook queues)' })
  async forcePoll() {
    await this.tracking.pollAdapters();
    return envelope(await this.tracking.listUnits(), 'Adapters polled');
  }

  @Get('inbound')
  @AnyPermission(Permission.VIEW_SENTINEL_COMMAND, Permission.READ_PHI)
  async listInbound() {
    return envelope(await this.inbound.listInbound(), 'Inbound pre-arrival patients');
  }

  @Post('inbound')
  @AnyPermission(
    Permission.MANAGE_SENTINEL_UNITS,
    Permission.WRITE_PHI,
    Permission.INGEST_SENTINEL_CAD,
  )
  async upsertInbound(@Body() body: Record<string, unknown>) {
    const result = await this.inbound.upsertFromCadOrNemsis({
      payload: body || {},
      unitId: body.unitId != null ? String(body.unitId) : undefined,
      organizationId: body.organizationId != null ? String(body.organizationId) : null,
      etaPointMin: body.etaPointMin != null ? Number(body.etaPointMin) : null,
      etaLowMin: body.etaLowMin != null ? Number(body.etaLowMin) : null,
      etaHighMin: body.etaHighMin != null ? Number(body.etaHighMin) : null,
    });
    return envelope(
      {
        inbound: result.inbound,
        validation: result.validation,
        missingFields: result.missingFields,
        fhirBundle: result.fhirBundle,
      },
      'Inbound patient upserted (NEMSIS-mapped + FHIR bundle)',
    );
  }

  @Post('inbound/:id/prep-recommendation')
  @AnyPermission(
    Permission.REVIEW_SENTINEL_AI,
    Permission.USE_AI_CHAT,
    Permission.VIEW_SENTINEL_COMMAND,
  )
  async prepRecommendation(@Param('id') id: string, @Body() body: { preferAi?: boolean }) {
    const rec = await this.inbound.producePrepRecommendation(id, {
      preferAi: body?.preferAi !== false,
    });
    return envelope(rec, 'Human-reviewable prep recommendation generated');
  }

  @Get('alarms')
  @AnyPermission(
    Permission.ACK_SENTINEL_ALARMS,
    Permission.VIEW_SENTINEL_COMMAND,
    Permission.READ_PHI,
  )
  async listAlarms() {
    return envelope(await this.alarms.listOpen(), 'Open Sentinel alarms');
  }

  @Post('alarms')
  @AnyPermission(Permission.ACK_SENTINEL_ALARMS, Permission.MANAGE_SENTINEL_UNITS)
  async raiseAlarm(
    @Body()
    body: {
      source: string;
      category: string;
      ruleId: string;
      subjectId: string;
      severity: 'critical' | 'warning' | 'info';
      urgency: 'immediate' | 'soon' | 'routine';
      title: string;
      message: string;
    },
  ) {
    const result = await this.alarms.raise({
      source: body.source,
      category: body.category,
      ruleId: body.ruleId,
      subjectId: body.subjectId,
      severity: body.severity,
      urgency: body.urgency,
      title: body.title,
      message: body.message,
    });
    return envelope(
      result,
      result.suppressed ? 'Alarm suppressed (dedupe/fatigue)' : 'Alarm raised',
    );
  }

  @Post('alarms/:id/:action')
  @AnyPermission(Permission.ACK_SENTINEL_ALARMS, Permission.VIEW_SENTINEL_COMMAND)
  async alarmAction(
    @Param('id') id: string,
    @Param('action') action: string,
    @Req() req: { user?: { id?: string; userId?: string; role?: string } },
    @Body() body: { reason?: string },
  ) {
    const allowed = new Set([
      'acknowledged',
      'escalated',
      'resolved',
      'dismissed',
      'suppressed',
      'expired',
    ]);
    // Accept short verbs
    const map: Record<string, SentinelAlarmStatus> = {
      acknowledge: 'acknowledged',
      ack: 'acknowledged',
      acknowledged: 'acknowledged',
      escalate: 'escalated',
      escalated: 'escalated',
      resolve: 'resolved',
      resolved: 'resolved',
      dismiss: 'dismissed',
      dismissed: 'dismissed',
      suppress: 'suppressed',
      suppressed: 'suppressed',
      expire: 'expired',
      expired: 'expired',
    };
    const to = map[action];
    if (!to || !allowed.has(to)) {
      return {
        success: false,
        message: `Unknown action ${action}`,
      };
    }
    const actorId = req.user?.id || req.user?.userId || 'unknown';
    const alarm = await this.alarms.transition(id, to, {
      actorId,
      actorRole: req.user?.role || null,
      reason: body?.reason || null,
    });
    return envelope(alarm, `Alarm ${to}`);
  }

  @Get('alarms/:id/events')
  @AnyPermission(Permission.ACK_SENTINEL_ALARMS, Permission.VIEW_AUDIT_LOGS)
  async alarmEvents(@Param('id') id: string) {
    return envelope(await this.alarms.listEvents(id), 'Alarm audit trail');
  }

  @Get('ai/recommendations')
  @AnyPermission(Permission.REVIEW_SENTINEL_AI, Permission.VIEW_SENTINEL_COMMAND)
  async listAi() {
    return envelope(await this.inbound.listRecommendations(), 'AI recommendations');
  }

  @Post('ai/recommendations/:id/review')
  @AnyPermission(Permission.REVIEW_SENTINEL_AI)
  async reviewAi(
    @Param('id') id: string,
    @Body() body: { status: 'accepted' | 'rejected' | 'modified' },
    @Req() req: { user?: { id?: string; userId?: string } },
  ) {
    const reviewerId = req.user?.id || req.user?.userId || 'unknown';
    const row = await this.inbound.reviewRecommendation(id, body.status, reviewerId);
    return envelope(row, `Recommendation ${body.status}`);
  }

  @Get('analytics')
  @AnyPermission(
    Permission.VIEW_SENTINEL_ANALYTICS,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_SENTINEL_COMMAND,
  )
  async analytics() {
    const [alarmPerf, inboundAnalytics, episodes, outboxHealth] = await Promise.all([
      this.alarms.performanceSnapshot(),
      this.inbound.analyticsSnapshot(),
      this.tracking.listEpisodes(),
      this.outbox.getHealth(),
    ]);

    const completed = episodes.filter((e) => e.arrivedAt && e.dispatchedAt);
    const dispatchToArrival = completed
      .map(
        (e) => (Date.parse(e.arrivedAt as string) - Date.parse(e.dispatchedAt as string)) / 60000,
      )
      .filter((n) => Number.isFinite(n) && n >= 0);
    const avgDispatchToArrival =
      dispatchToArrival.length === 0
        ? null
        : Math.round(
            (dispatchToArrival.reduce((a, b) => a + b, 0) / dispatchToArrival.length) * 10,
          ) / 10;

    const withActual = episodes.filter(
      (e) => e.actualTravelMin != null && e.predictedEtaMin != null,
    );
    const etaErrors = withActual.map((e) =>
      Math.abs((e.actualTravelMin as number) - (e.predictedEtaMin as number)),
    );
    const avgEtaErrorMin =
      etaErrors.length === 0
        ? null
        : Math.round((etaErrors.reduce((a, b) => a + b, 0) / etaErrors.length) * 10) / 10;

    return envelope(
      {
        dispatchToArrivalAvgMin: avgDispatchToArrival,
        etaAccuracyMaeMin: avgEtaErrorMin,
        alarms: alarmPerf,
        dataQuality: {
          missingDataRate: inboundAnalytics.missingDataRate,
          inboundCount: inboundAnalytics.inboundCount,
        },
        ai: {
          acceptanceRate: inboundAnalytics.aiAcceptanceRate,
          pendingReviews: inboundAnalytics.pendingReviews,
        },
        outbox: outboxHealth,
        episodeCount: episodes.length,
      },
      'Sentinel analytics KPIs',
    );
  }
}
