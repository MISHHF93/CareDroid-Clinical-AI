import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { Product } from '../product-catalog/entities/product.entity';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UsageEventType } from '../subscriptions/subscription-plans.config';
import { AssetPack } from './entities/asset-pack.entity';
import { OrganizationEntitlement } from './entities/organization-entitlement.entity';
import { PlatformAsset } from './entities/platform-asset.entity';
import { EntitlementStatus } from './enums/platform-asset.enums';

type CustomerSuccessPeriod = {
  key: string;
  start: Date;
  end: Date;
};

@Injectable()
export class CustomerSuccessService {
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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getCustomerSuccessDashboard(organizationId: string, periodKey = 'month') {
    const period = this.resolvePeriod(periodKey);
    const [entitlements, usageEvents, auditLogs, assets, packs, products] = await Promise.all([
      this.entitlementRepository.find({
        where: { organizationId, status: EntitlementStatus.ENABLED },
      }),
      this.usageEventRepository.find({
        where: { organizationId, occurredAt: Between(period.start, period.end) },
        order: { occurredAt: 'DESC' },
      }),
      this.auditRepository.find({
        where: { organizationId, timestamp: Between(period.start, period.end) },
        order: { timestamp: 'DESC' },
        take: 1000,
      }),
      this.assetRepository.find(),
      this.packRepository.find({ order: { name: 'ASC' } }),
      this.productRepository.find({ order: { sortOrder: 'ASC' } }),
    ]);

    const packById = new Map(packs.map((pack) => [pack.id, pack]));
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    const enabledPackIds = new Set(entitlements.map((entitlement) => entitlement.packId));
    const enabledAssetIds = this.resolveEnabledAssetIds(enabledPackIds, packs);
    const assetUsage = this.assetUsage(usageEvents, auditLogs, assetById);
    const activeUsers = this.activeUserCount(usageEvents, auditLogs);
    const aiUsage =
      this.sumUsage(usageEvents, UsageEventType.AI_CALL) + this.aiAuditCount(auditLogs);
    const simulationsCompleted = this.simulationsCompleted(usageEvents, auditLogs);
    const workflowsCompleted = this.workflowsCompleted(usageEvents, auditLogs);
    const underusedProducts = this.underusedProducts(
      products,
      packById,
      assetUsage,
      enabledPackIds,
    );
    const adoptionScore = assets.length
      ? Math.round((enabledAssetIds.size / Math.max(assets.length, 1)) * 100)
      : 0;
    const totalAssetUsage = [...assetUsage.values()].reduce((total, count) => total + count, 0);
    const healthScore = this.healthScore({
      adoptionScore,
      activeUsers,
      totalAssetUsage,
      aiUsage,
      simulationsCompleted,
      workflowsCompleted,
      underusedProducts,
    });

    const onboardingProgress = this.buildOnboardingProgress(entitlements, products);
    const featureUtilization = this.buildFeatureUtilization(
      assetUsage,
      assetById,
      aiUsage,
      simulationsCompleted,
      workflowsCompleted,
    );
    const supportTracking = this.buildSupportTracking(
      underusedProducts,
      this.customerSignals({
        adoptionScore,
        activeUsers,
        totalAssetUsage,
        aiUsage,
        simulationsCompleted,
        workflowsCompleted,
        underusedProducts,
      }),
      healthScore,
    );
    const renewalReadiness = this.buildRenewalReadiness({
      healthScore,
      adoptionScore,
      onboardingPercent: onboardingProgress.percent,
      featureUtilizationRate: featureUtilization.utilizationRate,
      openSupportCount: supportTracking.openCount,
    });
    const kpis = this.evaluateCustomerSuccessKpis({
      onboardingPercent: onboardingProgress.percent,
      adoptionScore,
      activeUsers,
      featureUtilizationRate: featureUtilization.utilizationRate,
      healthScore,
      openSupportCount: supportTracking.openCount,
      renewalReadinessScore: renewalReadiness.score,
    });

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      period: {
        key: period.key,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      health: {
        score: healthScore,
        status: healthScore >= 75 ? 'healthy' : healthScore >= 50 ? 'watch' : 'at-risk',
        retentionRisk: healthScore >= 75 ? 'low' : healthScore >= 50 ? 'medium' : 'high',
      },
      metrics: {
        adoption: {
          value: adoptionScore,
          enabledPackCount: entitlements.length,
          enabledAssetCount: enabledAssetIds.size,
          totalAssetCount: assets.length,
        },
        activeUsers: { value: activeUsers },
        assetUsage: { value: totalAssetUsage, topAssets: this.topAssets(assetUsage, assetById) },
        aiUsage: { value: aiUsage },
        simulationsCompleted: { value: simulationsCompleted },
        workflowsCompleted: { value: workflowsCompleted },
        underusedProducts,
      },
      signals: this.customerSignals({
        adoptionScore,
        activeUsers,
        totalAssetUsage,
        aiUsage,
        simulationsCompleted,
        workflowsCompleted,
        underusedProducts,
      }),
      onboardingProgress,
      featureUtilization,
      supportTracking,
      renewalReadiness,
      kpis,
      sources: {
        usageEvents: usageEvents.length,
        auditEvents: auditLogs.length,
        enabledEntitlements: entitlements.length,
        products: products.length,
      },
    };
  }

  private resolveEnabledAssetIds(enabledPackIds: Set<string>, packs: AssetPack[]) {
    const assetIds = new Set<string>();
    packs
      .filter((pack) => enabledPackIds.has(pack.id))
      .forEach((pack) => (pack.assetIds || []).forEach((assetId) => assetIds.add(assetId)));
    return assetIds;
  }

  private assetUsage(
    usageEvents: UsageEvent[],
    auditLogs: AuditLog[],
    assetById: Map<string, PlatformAsset>,
  ) {
    const usage = new Map<string, number>();
    for (const event of usageEvents) {
      if (!event.assetId) continue;
      usage.set(event.assetId, (usage.get(event.assetId) || 0) + Number(event.quantity || 0));
    }
    for (const log of auditLogs) {
      const resource = `${log.resource || ''} ${log.action || ''}`.toLowerCase();
      const asset = [...assetById.values()].find((candidate) =>
        [candidate.id, candidate.route]
          .filter(Boolean)
          .some((token) => resource.includes(String(token).toLowerCase())),
      );
      if (asset) usage.set(asset.id, (usage.get(asset.id) || 0) + 1);
    }
    return usage;
  }

  private topAssets(assetUsage: Map<string, number>, assetById: Map<string, PlatformAsset>) {
    return [...assetUsage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([assetId, count]) => {
        const asset = assetById.get(assetId);
        return {
          id: assetId,
          label: asset?.title || assetId,
          count,
          assetType: asset?.assetType || null,
          route: asset?.route || null,
        };
      });
  }

  private underusedProducts(
    products: Product[],
    packById: Map<string, AssetPack>,
    assetUsage: Map<string, number>,
    enabledPackIds: Set<string>,
  ) {
    return products
      .map((product) => {
        const enabledPackIdsForProduct = (product.packIds || []).filter((packId) =>
          enabledPackIds.has(packId),
        );
        const assetIds = new Set<string>();
        enabledPackIdsForProduct.forEach((packId) =>
          (packById.get(packId)?.assetIds || []).forEach((assetId) => assetIds.add(assetId)),
        );
        const usageCount = [...assetIds].reduce(
          (total, assetId) => total + (assetUsage.get(assetId) || 0),
          0,
        );
        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          enabledPackIds: enabledPackIdsForProduct,
          enabledAssetCount: assetIds.size,
          usageCount,
          expectedOutcomes: product.expectedOutcomes || product.outcomes || [],
        };
      })
      .filter((product) => product.enabledPackIds.length > 0)
      .sort((a, b) => a.usageCount - b.usageCount || b.enabledAssetCount - a.enabledAssetCount)
      .slice(0, 8);
  }

  private activeUserCount(usageEvents: UsageEvent[], auditLogs: AuditLog[]) {
    const userIds = new Set<string>();
    usageEvents.forEach((event) => {
      if (event.userId) userIds.add(event.userId);
      if (event.eventType === UsageEventType.ACTIVE_USER) {
        const syntheticCount = Number(event.quantity || 0);
        for (let index = 0; index < syntheticCount; index += 1) {
          userIds.add(`metered-active-user-${index}`);
        }
      }
    });
    auditLogs.forEach((log) => {
      if (log.userId) userIds.add(log.userId);
    });
    return userIds.size;
  }

  private simulationsCompleted(usageEvents: UsageEvent[], auditLogs: AuditLog[]) {
    return (
      usageEvents
        .filter((event) => event.eventType === UsageEventType.SIMULATION)
        .filter(
          (event) =>
            this.metadataText(event, ['status', 'eventType']).includes('complete') ||
            !this.metadataText(event, ['status']),
        )
        .reduce((total, event) => total + Number(event.quantity || 0), 0) +
      auditLogs.filter(
        (log) =>
          this.matchesLog(log, ['simulation']) &&
          this.matchesLog(log, ['complete', 'completion', 'finish']),
      ).length
    );
  }

  private workflowsCompleted(usageEvents: UsageEvent[], auditLogs: AuditLog[]) {
    return (
      usageEvents
        .filter((event) =>
          this.metadataText(event, ['surface', 'eventType', 'workflowId']).includes('workflow'),
        )
        .filter((event) => this.metadataText(event, ['status', 'eventType']).includes('complete'))
        .reduce((total, event) => total + Number(event.quantity || 0), 0) +
      auditLogs.filter(
        (log) =>
          this.matchesLog(log, ['workflow']) &&
          this.matchesLog(log, ['complete', 'completion', 'finish']),
      ).length
    );
  }

  private aiAuditCount(logs: AuditLog[]) {
    return logs.filter((log) => {
      const haystack = `${log.resource || ''} ${log.action || ''}`.toLowerCase();
      return (
        haystack.includes('assistant') || haystack.includes('chat') || haystack.includes('ai_call')
      );
    }).length;
  }

  private sumUsage(events: UsageEvent[], eventType: UsageEventType) {
    return events
      .filter((event) => event.eventType === eventType)
      .reduce((total, event) => total + Number(event.quantity || 0), 0);
  }

  private healthScore(input: {
    adoptionScore: number;
    activeUsers: number;
    totalAssetUsage: number;
    aiUsage: number;
    simulationsCompleted: number;
    workflowsCompleted: number;
    underusedProducts: Array<{ usageCount: number }>;
  }) {
    const usageSignals = [
      input.activeUsers > 0 ? 100 : 0,
      input.totalAssetUsage > 0 ? 100 : 0,
      input.aiUsage > 0 ? 100 : 0,
      input.simulationsCompleted > 0 ? 100 : 50,
      input.workflowsCompleted > 0 ? 100 : 50,
    ];
    const engagementScore = Math.round(
      usageSignals.reduce((total, score) => total + score, 0) / usageSignals.length,
    );
    const underusePenalty = Math.min(
      25,
      input.underusedProducts.filter((product) => product.usageCount === 0).length * 5,
    );
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(input.adoptionScore * 0.4 + engagementScore * 0.6 - underusePenalty),
      ),
    );
  }

  private customerSignals(input: {
    adoptionScore: number;
    activeUsers: number;
    totalAssetUsage: number;
    aiUsage: number;
    simulationsCompleted: number;
    workflowsCompleted: number;
    underusedProducts: Array<{ usageCount: number }>;
  }) {
    return [
      {
        id: 'adoption',
        label: 'Adoption',
        status:
          input.adoptionScore >= 70 ? 'healthy' : input.adoptionScore >= 35 ? 'watch' : 'at-risk',
        message: `${input.adoptionScore}% of platform assets are enabled through current packs.`,
      },
      {
        id: 'engagement',
        label: 'Engagement',
        status: input.activeUsers > 0 && input.totalAssetUsage > 0 ? 'healthy' : 'at-risk',
        message: `${input.activeUsers} active users generated ${input.totalAssetUsage} asset usage events.`,
      },
      {
        id: 'ai-usage',
        label: 'AI usage',
        status: input.aiUsage > 0 ? 'healthy' : 'watch',
        message: `${input.aiUsage} AI usage events observed this period.`,
      },
      {
        id: 'enablement',
        label: 'Enablement',
        status:
          input.simulationsCompleted > 0 || input.workflowsCompleted > 0 ? 'healthy' : 'watch',
        message: `${input.simulationsCompleted} simulations and ${input.workflowsCompleted} workflows completed.`,
      },
      {
        id: 'underused-products',
        label: 'Underused products',
        status: input.underusedProducts.some((product) => product.usageCount === 0)
          ? 'watch'
          : 'healthy',
        message: `${input.underusedProducts.length} enabled products need customer success review.`,
      },
    ];
  }

  private metadataText(row: { metadata?: Record<string, any> | string | null }, keys: string[]) {
    const metadata = this.metadata(row);
    return keys
      .map((key) => metadata?.[key])
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
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

  private matchesLog(log: AuditLog, keywords: string[]) {
    const haystack = `${log.resource || ''} ${log.action || ''} ${JSON.stringify(
      this.metadata(log),
    )}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }

  private resolvePeriod(periodKey: string, anchor = new Date()): CustomerSuccessPeriod {
    if (periodKey === 'day') {
      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { key: 'day', start, end };
    }
    if (periodKey === 'week') {
      const start = new Date(anchor);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { key: 'week', start, end };
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return { key: 'month', start, end };
  }

  private buildOnboardingProgress(entitlements: OrganizationEntitlement[], products: Product[]) {
    const steps = [
      {
        id: 'asset-packs',
        label: 'Asset packs enabled',
        complete: entitlements.length > 0,
      },
      {
        id: 'products',
        label: 'Products entitled',
        complete: products.some((product) =>
          (product.packIds || []).some((packId) =>
            entitlements.some((entitlement) => entitlement.packId === packId),
          ),
        ),
      },
      {
        id: 'usage-telemetry',
        label: 'Usage telemetry observed',
        complete: entitlements.length > 0,
      },
    ];
    const completeCount = steps.filter((step) => step.complete).length;
    return {
      percent: steps.length ? Math.round((completeCount / steps.length) * 100) : 0,
      steps,
      completeCount,
      totalCount: steps.length,
    };
  }

  private buildFeatureUtilization(
    assetUsage: Map<string, number>,
    assetById: Map<string, PlatformAsset>,
    aiUsage: number,
    simulationsCompleted: number,
    workflowsCompleted: number,
  ) {
    const registry = [
      { id: 'whiteboard', label: 'Emergency whiteboard', match: ['whiteboard'] },
      { id: 'copilot', label: 'ED Copilot', match: ['copilot', 'assistant', 'agent'] },
      { id: 'simulation', label: 'Simulation training', match: ['simulation'] },
      { id: 'workflow', label: 'Workflow completion', match: ['workflow'] },
      { id: 'calculator', label: 'Clinical calculators', match: ['calculator', 'qsofa', 'news'] },
    ];
    const haystack = [...assetUsage.keys()]
      .map((assetId) => {
        const asset = assetById.get(assetId);
        return `${assetId} ${asset?.title || ''} ${asset?.route || ''}`.toLowerCase();
      })
      .join(' ');
    const features = registry.map((feature) => {
      const utilized =
        feature.match.some((token) => haystack.includes(token)) ||
        (feature.id === 'copilot' && aiUsage > 0) ||
        (feature.id === 'simulation' && simulationsCompleted > 0) ||
        (feature.id === 'workflow' && workflowsCompleted > 0);
      return { ...feature, utilized };
    });
    const utilizedCount = features.filter((feature) => feature.utilized).length;
    return {
      features,
      utilizedCount,
      totalFeatures: registry.length,
      utilizationRate: registry.length ? Math.round((utilizedCount / registry.length) * 100) : 0,
    };
  }

  private buildSupportTracking(
    underusedProducts: Array<{ name: string; usageCount: number; enabledAssetCount: number }>,
    signals: Array<{ id: string; label: string; status: string; message: string }>,
    healthScore: number,
  ) {
    const items: Array<{
      id: string;
      type: string;
      priority: string;
      status: string;
      subject: string;
      summary: string;
    }> = [];
    let counter = 1;
    underusedProducts
      .filter((product) => product.usageCount === 0)
      .slice(0, 4)
      .forEach((product) => {
        items.push({
          id: `CS-${String(counter++).padStart(3, '0')}`,
          type: 'enablement',
          priority: 'medium',
          status: 'open',
          subject: `Enable ${product.name}`,
          summary: `${product.enabledAssetCount} entitled assets with zero usage this period.`,
        });
      });
    signals
      .filter((signal) => signal.status !== 'healthy')
      .forEach((signal) => {
        items.push({
          id: `CS-${String(counter++).padStart(3, '0')}`,
          type: 'health-follow-up',
          priority: signal.status === 'at-risk' ? 'high' : 'medium',
          status: 'open',
          subject: signal.label,
          summary: signal.message,
        });
      });
    if (healthScore < 50) {
      items.push({
        id: `CS-${String(counter++).padStart(3, '0')}`,
        type: 'retention',
        priority: 'critical',
        status: 'escalated',
        subject: 'Retention risk review',
        summary: 'Customer health score indicates high retention risk.',
      });
    }
    const openItems = items.filter((item) => item.status === 'open' || item.status === 'escalated');
    return {
      items,
      openCount: openItems.length,
      escalatedCount: items.filter((item) => item.status === 'escalated').length,
      openItems,
    };
  }

  private buildRenewalReadiness(input: {
    healthScore: number;
    adoptionScore: number;
    onboardingPercent: number;
    featureUtilizationRate: number;
    openSupportCount: number;
  }) {
    const factors = [
      { id: 'health', score: input.healthScore, weight: 30 },
      { id: 'adoption', score: input.adoptionScore, weight: 25 },
      { id: 'onboarding', score: input.onboardingPercent, weight: 20 },
      { id: 'utilization', score: input.featureUtilizationRate, weight: 15 },
      { id: 'support', score: Math.max(0, 100 - input.openSupportCount * 12), weight: 10 },
    ];
    const score = Math.round(
      factors.reduce((total, factor) => total + factor.score * factor.weight, 0) / 100,
    );
    return {
      score,
      status:
        score >= 80 ? 'ready' : score >= 60 ? 'preparing' : score >= 40 ? 'at-risk' : 'critical',
      factors,
    };
  }

  private evaluateCustomerSuccessKpis(input: {
    onboardingPercent: number;
    adoptionScore: number;
    activeUsers: number;
    featureUtilizationRate: number;
    healthScore: number;
    openSupportCount: number;
    renewalReadinessScore: number;
  }) {
    const rows = [
      { id: 'onboardingCompletePercent', value: input.onboardingPercent, target: 80, max: false },
      { id: 'adoptionScore', value: input.adoptionScore, target: 70, max: false },
      { id: 'activeUsers', value: input.activeUsers, target: 5, max: false },
      { id: 'featureUtilizationRate', value: input.featureUtilizationRate, target: 60, max: false },
      { id: 'healthScore', value: input.healthScore, target: 75, max: false },
      { id: 'supportOpenItems', value: input.openSupportCount, target: 3, max: true },
      { id: 'renewalReadiness', value: input.renewalReadinessScore, target: 70, max: false },
    ];
    const kpis = rows.map((row) => ({
      ...row,
      passes: row.max ? row.value <= row.target : row.value >= row.target,
    }));
    const passedCount = kpis.filter((kpi) => kpi.passes).length;
    return {
      kpis,
      passedCount,
      totalCount: kpis.length,
      passesAll: passedCount === kpis.length,
    };
  }
}
