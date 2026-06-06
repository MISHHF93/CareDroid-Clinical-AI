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

    const underusedAssets = [...entitledAssetIds]
      .map((assetId) => {
        const asset = assetById.get(assetId);
        const usage = assetUsage.find((metric) => metric.id === assetId);
        return {
          id: assetId,
          label: asset?.title || assetId,
          count: usage?.count || 0,
          events: usage?.events || 0,
          metadata: {
            assetType: asset?.assetType,
            category: asset?.category,
            route: asset?.route,
          },
        };
      })
      .sort((a, b) => a.count - b.count)
      .slice(0, 10);

    const topAssets = assetUsage.slice(0, 10);
    const adoptionScore = assets.length
      ? Math.round((entitledAssetIds.size / Math.max(assets.length, 1)) * 100)
      : 0;
    const totalUsageEvents = this.sumUsage(usageEvents);

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
        },
        underusedAssets,
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
