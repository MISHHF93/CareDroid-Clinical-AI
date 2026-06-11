import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UsageEventType } from '../subscriptions/subscription-plans.config';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { EntitlementStatus, PlatformAssetType } from './enums/platform-asset.enums';

type UsageMetric = {
  id: string;
  label: string;
  count: number;
  events: number;
  metadata?: Record<string, unknown>;
};

type AssetIntelligenceMetric = UsageMetric & {
  launches: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  repeatUsage: number;
  abandonmentCount: number;
  abandonmentRate: number;
  recommendationsAccepted: number;
  workflowCompletions: number;
  workflowCompletionRate: number;
  usefulnessScore: number;
  decision: 'promote' | 'improve' | 'hide' | 'merge' | 'monitor';
};

const ASSET_UTILIZATION_EVENTS = Object.freeze({
  ASSET_LAUNCHED: 'asset_launched',
  ASSET_DURATION: 'asset_duration',
  ASSET_ABANDONED: 'asset_abandoned',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  WORKFLOW_COMPLETED: 'workflow_completed',
});

@Injectable()
export class OrganizationAnalyticsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
    @InjectRepository(UsageEvent)
    private readonly usageEventRepository: Repository<UsageEvent>,
    @InjectRepository(PlatformAsset)
    private readonly assetRepository: Repository<PlatformAsset>,
    @InjectRepository(AssetPack)
    private readonly packRepository: Repository<AssetPack>,
  ) {}

  async getOrganizationSummary(organizationId: string) {
    const [entitlements, recentLogs, usageEvents, assets, packs] = await Promise.all([
      this.entitlementRepository.find({
        where: { organizationId, status: EntitlementStatus.ENABLED },
      }),
      this.auditRepository.find({
        where: { organizationId },
        order: { timestamp: 'DESC' },
        take: 250,
      }),
      this.usageEventRepository.find({
        where: { organizationId },
        order: { occurredAt: 'DESC' },
        take: 1000,
      }),
      this.assetRepository.find(),
      this.packRepository.find({ order: { name: 'ASC' } }),
    ]);

    const toolUsage = new Map<string, number>();
    const aiSessions = { count: 0 };
    for (const log of recentLogs) {
      const resource = log.resource || '';
      if (resource.includes('tool') || resource.includes('calculator')) {
        toolUsage.set(resource, (toolUsage.get(resource) || 0) + 1);
      }
      if (resource.includes('chat') || resource.includes('assistant')) {
        aiSessions.count += 1;
      }
    }

    const topTools = [...toolUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }));

    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const packById = new Map(packs.map((pack) => [pack.id, pack]));
    const enabledPackIds = new Set(entitlements.map((row) => row.packId));
    const entitledAssetIds = new Set<string>();
    for (const pack of packs) {
      if (enabledPackIds.has(pack.id)) {
        (pack.assetIds || []).forEach((assetId) => entitledAssetIds.add(assetId));
      }
    }

    const assetUsage = this.groupUsage(usageEvents, (event) => event.assetId || 'unknown').map(
      (metric) => this.decorateAssetMetric(metric, assetById),
    );
    const auditAssetUsage = this.auditAssetUsage(recentLogs, assetById);
    for (const metric of auditAssetUsage) {
      if (!assetUsage.some((row) => row.id === metric.id)) assetUsage.push(metric);
    }
    assetUsage.sort((a, b) => b.count - a.count);
    const assetIntelligence = this.buildAssetIntelligence(usageEvents, entitledAssetIds, assetById);

    const packUsage = packs
      .filter((pack) => enabledPackIds.has(pack.id))
      .map((pack) => {
        const count = (pack.assetIds || []).reduce(
          (total, assetId) => total + this.quantityForAsset(usageEvents, assetId),
          0,
        );
        return {
          id: pack.id,
          label: pack.name,
          count,
          events: count,
          metadata: {
            status: 'enabled',
            assetCount: pack.assetIds?.length || 0,
          },
        };
      })
      .sort((a, b) => b.count - a.count);

    const roleUsage = this.groupUsage(usageEvents, (event) => event.userRole || 'unknown');
    const workspaceUsage = this.groupUsage(usageEvents, (event) => event.workspaceId || 'unknown');
    const aiUsage = this.groupUsage(
      usageEvents.filter((event) => event.eventType === UsageEventType.AI_CALL),
      (event) => event.assetId || this.metadataString(event.metadata, 'agentId') || 'ai',
    ).map((metric) => this.decorateAssetMetric(metric, assetById));
    const searchQueries = this.groupUsage(
      usageEvents.filter((event) => this.isSearchEvent(event)),
      (event) => this.metadataString(event.metadata, 'surface') || event.assetId || 'search',
    );
    const simulationCompletion = this.groupUsage(
      usageEvents.filter((event) => this.isSimulationCompletion(event)),
      (event) =>
        event.assetId || this.metadataString(event.metadata, 'simulationId') || 'simulation',
    ).map((metric) => this.decorateAssetMetric(metric, assetById));
    const dashboardEngagement = this.groupUsage(
      usageEvents.filter((event) => this.isDashboardEvent(event, assetById)),
      (event) => event.assetId || this.metadataString(event.metadata, 'dashboardId') || 'dashboard',
    ).map((metric) => this.decorateAssetMetric(metric, assetById));

    const topAssets = assetIntelligence
      .filter((asset) => asset.usefulnessScore > 0)
      .sort(
        (a, b) =>
          b.usefulnessScore - a.usefulnessScore ||
          b.launches - a.launches ||
          a.label.localeCompare(b.label),
      )
      .slice(0, 10);
    const underusedAssets = assetIntelligence
      .filter((asset) => asset.usefulnessScore > 0 && asset.usefulnessScore < 20)
      .sort(
        (a, b) =>
          a.usefulnessScore - b.usefulnessScore ||
          a.launches - b.launches ||
          a.label.localeCompare(b.label),
      )
      .slice(0, 10);
    const unusedAssets = assetIntelligence
      .filter((asset) => asset.usefulnessScore === 0)
      .sort((a, b) => a.label.localeCompare(b.label))
      .slice(0, 10);
    const mergeCandidates = this.buildMergeCandidates(assetIntelligence).slice(0, 10);
    const adoptionScore = assets.length
      ? Math.round((entitledAssetIds.size / Math.max(assets.length, 1)) * 100)
      : 0;
    const totalUsageEvents = this.sumUsage(usageEvents);
    const utilizationSummary = this.summarizeAssetIntelligence(assetIntelligence);

    return {
      organizationId,
      enabledPackCount: entitlements.length,
      enabledPackIds: entitlements.map((row) => row.packId),
      auditEventCount: recentLogs.length,
      aiSessionCount:
        aiUsage.reduce((total, metric) => total + metric.count, 0) || aiSessions.count,
      topTools,
      packAdoption: entitlements.map((row) => ({
        packId: row.packId,
        packName: packById.get(row.packId)?.name || row.packId,
        status: row.status,
        enabledAt: row.createdAt,
      })),
      dimensions: {
        assetUsage,
        packUsage,
        roleUsage,
        workspaceUsage,
        aiUsage,
        searchQueries,
        simulationCompletion,
        dashboardEngagement,
        assetIntelligence,
      },
      dashboards: {
        adoption: {
          enabledPackCount: entitlements.length,
          enabledAssetCount: entitledAssetIds.size,
          totalAssetCount: assets.length,
          adoptionScore,
          packAdoption: entitlements.map((row) => ({
            id: row.packId,
            label: packById.get(row.packId)?.name || row.packId,
            status: row.status,
            enabledAt: row.createdAt,
          })),
        },
        engagement: {
          totalUsageEvents,
          activeRoles: roleUsage.filter((row) => row.id !== 'unknown').length,
          activeWorkspaces: workspaceUsage.filter((row) => row.id !== 'unknown').length,
          aiUsageCount: aiUsage.reduce((total, metric) => total + metric.count, 0),
          searchQueryCount: searchQueries.reduce((total, metric) => total + metric.count, 0),
          simulationCompletionCount: simulationCompletion.reduce(
            (total, metric) => total + metric.count,
            0,
          ),
          dashboardEngagementCount: dashboardEngagement.reduce(
            (total, metric) => total + metric.count,
            0,
          ),
          launchCount: utilizationSummary.launches,
          usageDurationSeconds: utilizationSummary.totalDurationSeconds,
          averageDurationSeconds: utilizationSummary.averageDurationSeconds,
          repeatUsageCount: utilizationSummary.repeatUsage,
          abandonmentCount: utilizationSummary.abandonmentCount,
          recommendationsAcceptedCount: utilizationSummary.recommendationsAccepted,
          workflowCompletionCount: utilizationSummary.workflowCompletions,
        },
        underusedAssets,
        unusedAssets,
        mergeCandidates,
        topAssets,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  private groupUsage(events: UsageEvent[], keyOf: (event: UsageEvent) => string): UsageMetric[] {
    const groups = new Map<string, UsageMetric>();
    for (const event of events) {
      const id = keyOf(event) || 'unknown';
      const current = groups.get(id) || { id, label: id, count: 0, events: 0 };
      current.count += Number(event.quantity || 0);
      current.events += 1;
      groups.set(id, current);
    }
    return [...groups.values()].sort((a, b) => b.count - a.count);
  }

  private decorateAssetMetric(
    metric: UsageMetric,
    assetById: Map<string, PlatformAsset>,
  ): UsageMetric {
    const asset = assetById.get(metric.id);
    if (!asset) return metric;
    return {
      ...metric,
      label: asset.title || metric.label,
      metadata: {
        ...(metric.metadata || {}),
        assetType: asset.assetType,
        category: asset.category,
        route: asset.route,
      },
    };
  }

  private auditAssetUsage(logs: AuditLog[], assetById: Map<string, PlatformAsset>): UsageMetric[] {
    const rows = new Map<string, UsageMetric>();
    for (const log of logs) {
      const resource = log.resource || '';
      const asset = [...assetById.values()].find(
        (candidate) => resource.includes(candidate.id) || resource.includes(candidate.route || ''),
      );
      if (!asset) continue;
      const current = rows.get(asset.id) || {
        id: asset.id,
        label: asset.title,
        count: 0,
        events: 0,
        metadata: {
          assetType: asset.assetType,
          category: asset.category,
          route: asset.route,
          source: 'audit',
        },
      };
      current.count += 1;
      current.events += 1;
      rows.set(asset.id, current);
    }
    return [...rows.values()].sort((a, b) => b.count - a.count);
  }

  private buildAssetIntelligence(
    events: UsageEvent[],
    entitledAssetIds: Set<string>,
    assetById: Map<string, PlatformAsset>,
  ): AssetIntelligenceMetric[] {
    const rows = new Map<string, AssetIntelligenceMetric>();
    const durationEventCounts = new Map<string, number>();
    const actorCounts = new Map<string, Map<string, number>>();
    const ensureRow = (assetId: string) => {
      const existing = rows.get(assetId);
      if (existing) return existing;
      const asset = assetById.get(assetId);
      const row: AssetIntelligenceMetric = {
        id: assetId,
        label: asset?.title || assetId,
        count: 0,
        events: 0,
        launches: 0,
        totalDurationSeconds: 0,
        averageDurationSeconds: 0,
        repeatUsage: 0,
        abandonmentCount: 0,
        abandonmentRate: 0,
        recommendationsAccepted: 0,
        workflowCompletions: 0,
        workflowCompletionRate: 0,
        usefulnessScore: 0,
        decision: 'monitor',
        metadata: {
          assetType: asset?.assetType,
          category: asset?.category,
          route: asset?.route,
        },
      };
      rows.set(assetId, row);
      actorCounts.set(assetId, new Map());
      return row;
    };

    for (const assetId of entitledAssetIds) ensureRow(assetId);

    for (const event of events) {
      const metadata = this.metadata(event);
      const assetId =
        event.assetId ||
        this.metadataString(metadata, 'assetId') ||
        this.metadataString(metadata, 'workflowId') ||
        this.metadataString(metadata, 'recommendationId');
      if (!assetId || assetId === 'unknown') continue;

      const row = ensureRow(assetId);
      const signal = this.metadataString(metadata, 'eventType');
      row.events += 1;

      if (this.isAssetLaunchSignal(event, signal)) {
        row.launches += Math.max(1, Number(event.quantity || 0));
      }
      if (signal === ASSET_UTILIZATION_EVENTS.ASSET_DURATION) {
        row.totalDurationSeconds += this.metadataNumber(metadata, 'durationSeconds');
        durationEventCounts.set(assetId, (durationEventCounts.get(assetId) || 0) + 1);
      }
      if (signal === ASSET_UTILIZATION_EVENTS.ASSET_ABANDONED) {
        row.abandonmentCount += 1;
      }
      if (signal === ASSET_UTILIZATION_EVENTS.RECOMMENDATION_ACCEPTED) {
        row.recommendationsAccepted += 1;
      }
      if (signal === ASSET_UTILIZATION_EVENTS.WORKFLOW_COMPLETED) {
        row.workflowCompletions += 1;
      }

      const actorKey = this.assetActorKey(event, metadata);
      if (actorKey) {
        const counts = actorCounts.get(assetId) || new Map<string, number>();
        counts.set(actorKey, (counts.get(actorKey) || 0) + 1);
        actorCounts.set(assetId, counts);
      }
    }

    for (const row of rows.values()) {
      const durationEvents = durationEventCounts.get(row.id) || 0;
      const repeatActors = [...(actorCounts.get(row.id)?.values() || [])].filter(
        (count) => count > 1,
      ).length;
      row.count = row.launches;
      row.averageDurationSeconds = durationEvents
        ? Math.round(row.totalDurationSeconds / durationEvents)
        : 0;
      row.repeatUsage = repeatActors;
      row.abandonmentRate = row.launches
        ? Number((row.abandonmentCount / row.launches).toFixed(2))
        : 0;
      row.workflowCompletionRate = row.launches
        ? Number((row.workflowCompletions / row.launches).toFixed(2))
        : 0;
      row.usefulnessScore = this.calculateUsefulnessScore(row);
      row.decision = this.decideAssetAction(row);
      row.metadata = {
        ...(row.metadata || {}),
        launches: row.launches,
        totalDurationSeconds: row.totalDurationSeconds,
        averageDurationSeconds: row.averageDurationSeconds,
        repeatUsage: row.repeatUsage,
        abandonmentCount: row.abandonmentCount,
        abandonmentRate: row.abandonmentRate,
        recommendationsAccepted: row.recommendationsAccepted,
        workflowCompletions: row.workflowCompletions,
        workflowCompletionRate: row.workflowCompletionRate,
        usefulnessScore: row.usefulnessScore,
        decision: row.decision,
      };
    }

    return [...rows.values()].sort(
      (a, b) =>
        b.usefulnessScore - a.usefulnessScore ||
        b.launches - a.launches ||
        a.label.localeCompare(b.label),
    );
  }

  private summarizeAssetIntelligence(rows: AssetIntelligenceMetric[]) {
    const totalDurationSeconds = rows.reduce((total, row) => total + row.totalDurationSeconds, 0);
    const durationEvents = rows.filter((row) => row.averageDurationSeconds > 0).length;
    return {
      launches: rows.reduce((total, row) => total + row.launches, 0),
      totalDurationSeconds,
      averageDurationSeconds: durationEvents
        ? Math.round(totalDurationSeconds / durationEvents)
        : 0,
      repeatUsage: rows.reduce((total, row) => total + row.repeatUsage, 0),
      abandonmentCount: rows.reduce((total, row) => total + row.abandonmentCount, 0),
      recommendationsAccepted: rows.reduce((total, row) => total + row.recommendationsAccepted, 0),
      workflowCompletions: rows.reduce((total, row) => total + row.workflowCompletions, 0),
    };
  }

  private buildMergeCandidates(rows: AssetIntelligenceMetric[]): AssetIntelligenceMetric[] {
    const candidates: AssetIntelligenceMetric[] = [];
    for (const row of rows.filter(
      (item) => item.usefulnessScore > 0 && item.usefulnessScore < 20,
    )) {
      const target = rows.find(
        (candidate) =>
          candidate.id !== row.id &&
          candidate.usefulnessScore >= Math.max(20, row.usefulnessScore + 8) &&
          this.assetsOverlap(row, candidate),
      );
      if (!target) continue;
      candidates.push({
        ...row,
        decision: 'merge',
        metadata: {
          ...(row.metadata || {}),
          decision: 'merge',
          mergeTargetId: target.id,
          mergeTargetLabel: target.label,
          reason: `Low usefulness overlaps with stronger asset ${target.label}.`,
        },
      });
    }
    return candidates.sort(
      (a, b) => a.usefulnessScore - b.usefulnessScore || a.label.localeCompare(b.label),
    );
  }

  private calculateUsefulnessScore(row: AssetIntelligenceMetric): number {
    const durationScore = Math.min(10, row.averageDurationSeconds / 30);
    const score =
      row.launches * 5 +
      row.repeatUsage * 4 +
      row.workflowCompletions * 8 +
      row.recommendationsAccepted * 6 +
      durationScore -
      row.abandonmentRate * 20;
    return Math.max(0, Math.round(score));
  }

  private decideAssetAction(row: AssetIntelligenceMetric): AssetIntelligenceMetric['decision'] {
    if (row.usefulnessScore === 0) return 'hide';
    if (row.usefulnessScore >= 45 && row.repeatUsage > 0) return 'promote';
    if (row.usefulnessScore < 20) return 'improve';
    return 'monitor';
  }

  private assetsOverlap(a: AssetIntelligenceMetric, b: AssetIntelligenceMetric): boolean {
    const aMetadata = a.metadata || {};
    const bMetadata = b.metadata || {};
    return Boolean(
      (aMetadata.assetType && aMetadata.assetType === bMetadata.assetType) ||
        (aMetadata.category && aMetadata.category === bMetadata.category),
    );
  }

  private quantityForAsset(events: UsageEvent[], assetId: string): number {
    return events
      .filter((event) => event.assetId === assetId)
      .reduce((total, event) => total + Number(event.quantity || 0), 0);
  }

  private sumUsage(events: UsageEvent[]): number {
    return events.reduce((total, event) => total + Number(event.quantity || 0), 0);
  }

  private metadataString(
    metadata: Record<string, any> | null | undefined,
    key: string,
  ): string | null {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim() ? value : null;
  }

  private metadataNumber(metadata: Record<string, any> | null | undefined, key: string): number {
    const value = Number(metadata?.[key]);
    return Number.isFinite(value) ? value : 0;
  }

  private metadata(row: { metadata?: Record<string, any> | string | null }) {
    if (!row.metadata) return {};
    if (typeof row.metadata === 'string') {
      try {
        return JSON.parse(row.metadata);
      } catch {
        return {};
      }
    }
    return row.metadata;
  }

  private isAssetLaunchSignal(event: UsageEvent, signal: string | null): boolean {
    if (signal === ASSET_UTILIZATION_EVENTS.ASSET_LAUNCHED) return true;
    const behavioralSignals: string[] = [
      ASSET_UTILIZATION_EVENTS.ASSET_DURATION,
      ASSET_UTILIZATION_EVENTS.ASSET_ABANDONED,
      ASSET_UTILIZATION_EVENTS.RECOMMENDATION_ACCEPTED,
      ASSET_UTILIZATION_EVENTS.WORKFLOW_COMPLETED,
    ];
    if (signal && behavioralSignals.includes(signal)) {
      return false;
    }
    return (
      Number(event.quantity || 0) > 0 &&
      [
        UsageEventType.TOOL_LAUNCH,
        UsageEventType.CALCULATOR_LAUNCH,
        UsageEventType.SIMULATION,
        UsageEventType.MAP_USAGE,
        UsageEventType.IOT_TELEMETRY,
      ].includes(event.eventType)
    );
  }

  private assetActorKey(event: UsageEvent, metadata: Record<string, any>): string | null {
    return (
      event.userId ||
      this.metadataString(metadata, 'sessionId') ||
      (event.workspaceId ? `workspace:${event.workspaceId}` : null) ||
      (event.userRole ? `role:${event.userRole}` : null)
    );
  }

  private isSearchEvent(event: UsageEvent): boolean {
    const type = this.metadataString(event.metadata, 'eventType') || '';
    const surface = this.metadataString(event.metadata, 'surface') || '';
    return (
      type.includes('search') ||
      surface.includes('search') ||
      event.assetId === 'search' ||
      event.assetId === 'tools-overview'
    );
  }

  private isSimulationCompletion(event: UsageEvent): boolean {
    const status = this.metadataString(event.metadata, 'status') || '';
    return (
      event.eventType === UsageEventType.SIMULATION && (!status || status.includes('complete'))
    );
  }

  private isDashboardEvent(event: UsageEvent, assetById: Map<string, PlatformAsset>): boolean {
    const asset = event.assetId ? assetById.get(event.assetId) : null;
    const surface = this.metadataString(event.metadata, 'surface') || '';
    return (
      asset?.assetType === PlatformAssetType.DASHBOARD ||
      surface.includes('dashboard') ||
      surface.includes('command') ||
      event.eventType === UsageEventType.MAP_USAGE
    );
  }
}
