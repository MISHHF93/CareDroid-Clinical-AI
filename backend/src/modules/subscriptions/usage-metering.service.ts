import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { TenantContext } from '../tenant-context/tenant-context.types';
import { UsageEvent } from './entities/usage-event.entity';
import {
  BILLABLE_USAGE_METERS,
  getSubscriptionPlanDefinition,
  SubscriptionPlanDefinition,
  UsageEventType,
  UsageUnit,
} from './subscription-plans.config';

interface RecordUsageInput {
  organizationId?: string | null;
  workspaceId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  subscriptionPlan?: string | null;
  assetId?: string | null;
  eventType: UsageEventType;
  quantity?: number;
  unit?: UsageUnit;
  occurredAt?: Date | string;
  metadata?: Record<string, any>;
}

interface UsagePeriod {
  key: string;
  start: Date;
  end: Date;
}

type MeterBillingReadiness = 'operational' | 'future-billing-candidate';

type UsageMeterDefinition = {
  id: string;
  label: string;
  eventTypes: UsageEventType[];
  unit: UsageUnit;
  billingReadiness: MeterBillingReadiness;
  description: string;
};

const USAGE_METERING_FRAMEWORK: UsageMeterDefinition[] = [
  {
    id: 'active-users',
    label: 'Active users',
    eventTypes: [UsageEventType.ACTIVE_USER],
    unit: 'user',
    billingReadiness: 'future-billing-candidate',
    description: 'Unique tenant users observed through usage events plus explicit active-user meters.',
  },
  {
    id: 'ai-requests',
    label: 'AI requests',
    eventTypes: [UsageEventType.AI_CALL],
    unit: 'call',
    billingReadiness: 'future-billing-candidate',
    description: 'AI calls and model-backed assistant requests.',
  },
  {
    id: 'simulation-runs',
    label: 'Simulation runs',
    eventTypes: [UsageEventType.SIMULATION],
    unit: 'run',
    billingReadiness: 'future-billing-candidate',
    description: 'Simulation starts, completions, and scenario run meters.',
  },
  {
    id: 'workflow-executions',
    label: 'Workflow executions',
    eventTypes: [UsageEventType.API_CALL, UsageEventType.TOOL_LAUNCH],
    unit: 'execution',
    billingReadiness: 'future-billing-candidate',
    description: 'Workflow execution events identified by workflow metadata.',
  },
  {
    id: 'api-calls',
    label: 'API calls',
    eventTypes: [UsageEventType.API_CALL],
    unit: 'request',
    billingReadiness: 'operational',
    description: 'Tenant-scoped backend API requests recorded by the metering interceptor.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    eventTypes: [UsageEventType.INTEGRATION, UsageEventType.API_CALL],
    unit: 'event',
    billingReadiness: 'future-billing-candidate',
    description: 'Integration syncs, connector calls, and integration-tagged API events.',
  },
];

@Injectable()
export class UsageMeteringService {
  constructor(
    @InjectRepository(UsageEvent)
    private readonly usageEventRepository: Repository<UsageEvent>,
  ) {}

  async recordUsage(input: RecordUsageInput): Promise<UsageEvent | null> {
    if (!input.organizationId) return null;

    const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date();
    const period = this.resolvePeriod('month', occurredAt);
    const unit = input.unit || this.defaultUnitFor(input.eventType);

    const usageEvent = this.usageEventRepository.create({
      organizationId: input.organizationId,
      workspaceId: input.workspaceId || null,
      userId: input.userId || null,
      userRole: input.userRole || null,
      assetId: input.assetId || null,
      eventType: input.eventType,
      quantity: input.quantity ?? 1,
      unit,
      periodStart: period.start,
      periodEnd: period.end,
      occurredAt,
      metadata: {
        ...(input.metadata || {}),
        subscriptionPlan: input.subscriptionPlan,
      },
    });

    return this.usageEventRepository.save(usageEvent);
  }

  async recordFromTenantContext(
    tenantContext: TenantContext | undefined,
    eventType: UsageEventType,
    details: Partial<RecordUsageInput> = {},
  ) {
    return this.recordUsage({
      organizationId: tenantContext?.organizationId,
      workspaceId: details.workspaceId ?? tenantContext?.workspaceId,
      userId: details.userId ?? tenantContext?.userId,
      userRole: details.userRole ?? tenantContext?.role,
      subscriptionPlan: details.subscriptionPlan ?? tenantContext?.subscriptionPlan,
      eventType,
      assetId: details.assetId,
      quantity: details.quantity,
      unit: details.unit,
      metadata: details.metadata,
      occurredAt: details.occurredAt,
    });
  }

  async getUsageSummary(options: {
    organizationId: string;
    period?: string;
    subscriptionPlan?: string | null;
  }) {
    const period = this.resolvePeriod(options.period || 'month');
    const events = await this.usageEventRepository.find({
      where: {
        organizationId: options.organizationId,
        occurredAt: Between(period.start, period.end),
      },
      order: { occurredAt: 'DESC' },
    });
    const plan = getSubscriptionPlanDefinition(options.subscriptionPlan);
    const limitByType = new Map(plan.limits.map((limit) => [limit.eventType, limit]));
    const activeUsers = this.countUnique(
      events.map((event) => event.userId).filter(Boolean) as string[],
    );
    const totals = BILLABLE_USAGE_METERS.map((meter) => {
      const used =
        meter.eventType === UsageEventType.ACTIVE_USER
          ? activeUsers
          : this.sum(events.filter((event) => event.eventType === meter.eventType));
      const limit = limitByType.get(meter.eventType)?.limit ?? meter.limit;
      return {
        eventType: meter.eventType,
        label: meter.label,
        unit: meter.unit,
        used,
        limit,
        remaining: typeof limit === 'number' ? Math.max(limit - used, 0) : null,
      };
    });

    return {
      organizationId: options.organizationId,
      period: this.serializePeriod(period),
      plan,
      totals,
      activeUsers,
      breakdowns: {
        byWorkspace: this.groupUsage(events, (event) => event.workspaceId || 'unknown'),
        byAsset: this.groupUsage(events, (event) => event.assetId || 'unknown'),
        byRole: this.groupUsage(events, (event) => event.userRole || 'unknown'),
        byEventType: this.groupUsage(events, (event) => event.eventType),
      },
      recentEvents: events.slice(0, 25).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        quantity: Number(event.quantity || 0),
        unit: event.unit,
        organizationId: event.organizationId,
        workspaceId: event.workspaceId,
        assetId: event.assetId,
        userRole: event.userRole,
        occurredAt: event.occurredAt,
      })),
    };
  }

  async getUsageMeteringFramework(options: {
    organizationId: string;
    period?: string;
  }) {
    const period = this.resolvePeriod(options.period || 'month');
    const events = await this.usageEventRepository.find({
      where: {
        organizationId: options.organizationId,
        occurredAt: Between(period.start, period.end),
      },
      order: { occurredAt: 'DESC' },
    });

    const meters = USAGE_METERING_FRAMEWORK.map((definition) =>
      this.buildFrameworkMeter(definition, events),
    );

    return {
      organizationId: options.organizationId,
      generatedAt: new Date().toISOString(),
      period: this.serializePeriod(period),
      storage: {
        source: 'usage_events',
        billingSeparated: true,
        description:
          'Usage metrics are stored as tenant-scoped operational events and are not invoices, charges, or Stripe usage records.',
      },
      meters,
      categories: {
        engagement: meters.filter((meter) =>
          ['active-users', 'ai-requests', 'simulation-runs', 'workflow-executions'].includes(
            meter.id,
          ),
        ),
        platform: meters.filter((meter) => meter.id === 'api-calls'),
        integrations: meters.filter((meter) => meter.id === 'integrations'),
      },
      billingReadiness: {
        currentBilling: 'plan-limit summaries only; no metered charges are created from this endpoint',
        futureBillingCandidates: meters
          .filter((meter) => meter.billingReadiness === 'future-billing-candidate')
          .map((meter) => meter.id),
        retainedDimensions: ['organization', 'workspace', 'asset', 'role', 'user', 'integration'],
      },
      breakdowns: {
        byWorkspace: this.groupUsage(events, (event) => event.workspaceId || 'unknown'),
        byAsset: this.groupUsage(events, (event) => event.assetId || 'unknown'),
        byRole: this.groupUsage(events, (event) => event.userRole || 'unknown'),
        byMeter: this.groupUsage(events, (event) => this.meterIdForEvent(event)),
        byIntegration: this.groupUsage(
          events.filter((event) => this.isIntegrationEvent(event)),
          (event) => this.integrationKey(event),
        ),
      },
      recentEvents: events.slice(0, 25).map((event) => ({
        id: event.id,
        eventType: event.eventType,
        meterId: this.meterIdForEvent(event),
        quantity: Number(event.quantity || 0),
        unit: event.unit,
        workspaceId: event.workspaceId,
        assetId: event.assetId,
        userRole: event.userRole,
        integration: this.isIntegrationEvent(event) ? this.integrationKey(event) : null,
        occurredAt: event.occurredAt,
      })),
    };
  }

  getPlanForTier(tier?: string | null): SubscriptionPlanDefinition {
    return getSubscriptionPlanDefinition(tier);
  }

  private buildFrameworkMeter(definition: UsageMeterDefinition, events: UsageEvent[]) {
    const matchedEvents = events.filter((event) => this.eventMatchesMeter(definition.id, event));
    const value =
      definition.id === 'active-users'
        ? this.activeUserValue(events)
        : this.sum(matchedEvents);
    return {
      id: definition.id,
      label: definition.label,
      value,
      unit: definition.unit,
      eventTypes: definition.eventTypes,
      events: matchedEvents.length,
      billingReadiness: definition.billingReadiness,
      billingSeparated: true,
      description: definition.description,
    };
  }

  private eventMatchesMeter(meterId: string, event: UsageEvent) {
    if (meterId === 'active-users') {
      return Boolean(event.userId) || event.eventType === UsageEventType.ACTIVE_USER;
    }
    if (meterId === 'workflow-executions') return this.isWorkflowEvent(event);
    if (meterId === 'integrations') return this.isIntegrationEvent(event);
    const definition = USAGE_METERING_FRAMEWORK.find((meter) => meter.id === meterId);
    return Boolean(definition?.eventTypes.includes(event.eventType));
  }

  private meterIdForEvent(event: UsageEvent) {
    if (this.isIntegrationEvent(event)) return 'integrations';
    if (this.isWorkflowEvent(event)) return 'workflow-executions';
    if (event.eventType === UsageEventType.AI_CALL) return 'ai-requests';
    if (event.eventType === UsageEventType.SIMULATION) return 'simulation-runs';
    if (event.eventType === UsageEventType.API_CALL) return 'api-calls';
    if (event.eventType === UsageEventType.ACTIVE_USER) return 'active-users';
    return event.eventType;
  }

  private activeUserValue(events: UsageEvent[]) {
    const explicitActiveUsers = this.sum(
      events.filter((event) => event.eventType === UsageEventType.ACTIVE_USER),
    );
    const uniqueUsers = this.countUnique(
      events.map((event) => event.userId).filter(Boolean) as string[],
    );
    return Math.max(uniqueUsers, explicitActiveUsers);
  }

  private isWorkflowEvent(event: UsageEvent) {
    const text = this.metadataText(event, ['surface', 'eventType', 'workflowId', 'workflowSlug']);
    return text.includes('workflow');
  }

  private isIntegrationEvent(event: UsageEvent) {
    if (event.eventType === UsageEventType.INTEGRATION) return true;
    const text = this.metadataText(event, [
      'surface',
      'eventType',
      'integrationId',
      'integrationSlug',
      'connector',
      'path',
    ]);
    return text.includes('integration') || text.includes('/integrations/');
  }

  private integrationKey(event: UsageEvent) {
    const metadata = this.metadata(event);
    return (
      this.metadataString(metadata, 'integrationSlug') ||
      this.metadataString(metadata, 'integrationId') ||
      this.metadataString(metadata, 'connector') ||
      this.integrationKeyFromPath(this.metadataString(metadata, 'path')) ||
      event.assetId ||
      'integration'
    );
  }

  private groupUsage(events: UsageEvent[], keyOf: (event: UsageEvent) => string) {
    const groups = new Map<string, { key: string; quantity: number; events: number }>();
    for (const event of events) {
      const key = keyOf(event);
      const current = groups.get(key) || { key, quantity: 0, events: 0 };
      current.quantity += Number(event.quantity || 0);
      current.events += 1;
      groups.set(key, current);
    }
    return Array.from(groups.values()).sort((a, b) => b.quantity - a.quantity);
  }

  private sum(events: UsageEvent[]): number {
    return events.reduce((total, event) => total + Number(event.quantity || 0), 0);
  }

  private countUnique(values: string[]): number {
    return new Set(values).size;
  }

  private metadataText(row: { metadata?: Record<string, any> | string | null }, keys: string[]) {
    const metadata = this.metadata(row);
    return keys.map((key) => metadata?.[key]).filter(Boolean).join(' ').toLowerCase();
  }

  private metadataString(metadata: Record<string, any>, key: string): string | null {
    const value = metadata?.[key];
    return typeof value === 'string' && value.trim() ? value : null;
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

  private integrationKeyFromPath(path: string | null) {
    if (!path) return null;
    const segments = path.split('/').filter(Boolean);
    const index = segments.findIndex((segment) => segment === 'integrations');
    return index >= 0 && segments[index + 1] ? segments[index + 1] : null;
  }

  private defaultUnitFor(eventType: UsageEventType): UsageUnit {
    return BILLABLE_USAGE_METERS.find((meter) => meter.eventType === eventType)?.unit || 'event';
  }

  private resolvePeriod(periodKey: string, anchor = new Date()): UsagePeriod {
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

  private serializePeriod(period: UsagePeriod) {
    return {
      key: period.key,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    };
  }
}
