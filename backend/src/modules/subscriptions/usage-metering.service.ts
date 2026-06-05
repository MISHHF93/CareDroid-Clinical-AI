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

  getPlanForTier(tier?: string | null): SubscriptionPlanDefinition {
    return getSubscriptionPlanDefinition(tier);
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
