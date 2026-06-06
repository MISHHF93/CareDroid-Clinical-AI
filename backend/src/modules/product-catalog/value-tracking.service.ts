import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { OrganizationEntitlement } from '../platform-assets/entities/organization-entitlement.entity';
import { EntitlementStatus } from '../platform-assets/enums/platform-asset.enums';
import { UsageEvent } from '../subscriptions/entities/usage-event.entity';
import { UsageEventType } from '../subscriptions/subscription-plans.config';

type MetricStatus = 'on-track' | 'watch' | 'needs-data';

interface ValueMetric {
  id: string;
  label: string;
  value: number | null;
  unit: 'percent' | 'count' | 'milliseconds' | 'events-per-user';
  numerator?: number | null;
  denominator?: number | null;
  status: MetricStatus;
  description: string;
}

interface ValuePeriod {
  key: string;
  start: Date;
  end: Date;
}

const TARGET_PACK_COUNT = 14;

@Injectable()
export class ValueTrackingService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(OrganizationEntitlement)
    private readonly entitlementRepository: Repository<OrganizationEntitlement>,
    @InjectRepository(UsageEvent)
    private readonly usageEventRepository: Repository<UsageEvent>,
  ) {}

  async getOrganizationValueTracking(
    organizationId: string,
    periodKey = 'month',
  ): Promise<Record<string, any>> {
    const period = this.resolvePeriod(periodKey);
    const [entitlements, logs, usageEvents] = await Promise.all([
      this.entitlementRepository.find({
        where: { organizationId, status: EntitlementStatus.ENABLED },
      }),
      this.auditRepository.find({
        where: { organizationId, timestamp: Between(period.start, period.end) },
        order: { timestamp: 'DESC' },
        take: 1000,
      }),
      this.usageEventRepository.find({
        where: { organizationId, occurredAt: Between(period.start, period.end) },
        order: { occurredAt: 'DESC' },
      }),
    ]);

    const protocolEvents = this.matchLogs(logs, ['protocol']);
    const protocolAdherenceEvents = protocolEvents.filter((log) =>
      this.matchesLog(log, ['adhere', 'adherence', 'comply', 'compliance', 'complete']),
    );
    const simulationUsage = this.sumUsage(usageEvents, UsageEventType.SIMULATION);
    const simulationAuditCompletions = this.matchLogs(logs, ['simulation']).filter((log) =>
      this.matchesLog(log, ['complete', 'completion', 'finish']),
    ).length;
    const calculatorUsage =
      this.sumUsage(usageEvents, UsageEventType.CALCULATOR_LAUNCH) +
      this.matchLogs(logs, ['calculator']).length;
    const aiUsage =
      this.sumUsage(usageEvents, UsageEventType.AI_CALL) +
      logs.filter((log) => this.isAiUsageLog(log)).length;

    const workflowEvents = this.matchLogs(logs, ['workflow']);
    const workflowCompletionEvents = workflowEvents.filter((log) =>
      this.matchesLog(log, ['complete', 'completion', 'finish']),
    );
    const responseTimeSamples = this.responseTimeSamples(logs, usageEvents);
    const activeUsers = this.countUnique([
      ...logs.map((log) => log.userId).filter(Boolean),
      ...usageEvents.map((event) => event.userId).filter(Boolean),
    ] as string[]);
    const totalEngagementEvents = logs.length + usageEvents.length;
    const outcomeSignalCount = this.outcomeSignalCount(logs);

    const clinical = [
      this.percentMetric({
        id: 'protocol-adherence',
        label: 'Protocol adherence',
        numerator: protocolAdherenceEvents.length,
        denominator: protocolEvents.length,
        description: 'Protocol events completed with adherence or compliance signals.',
      }),
      this.countMetric({
        id: 'simulation-completion',
        label: 'Simulation completion',
        value: simulationUsage + simulationAuditCompletions,
        description: 'Completed simulation runs from usage metering and audit completion events.',
      }),
      this.countMetric({
        id: 'calculator-usage',
        label: 'Calculator usage',
        value: calculatorUsage,
        description: 'Calculator launches from metered usage and calculator audit activity.',
      }),
      this.countMetric({
        id: 'ai-usage',
        label: 'AI usage',
        value: aiUsage,
        description: 'AI calls, assistant sessions, and AI-tagged audit activity.',
      }),
    ];

    const operational = [
      this.availabilityMetric({
        id: 'fleet-uptime',
        label: 'Fleet uptime',
        logs,
        keywords: ['fleet', 'ems', 'dispatch', 'vehicle'],
        description: 'Fleet availability based on uptime samples or downtime audit signals.',
      }),
      this.availabilityMetric({
        id: 'device-uptime',
        label: 'Device uptime',
        logs,
        keywords: ['device', 'iot', 'telemetry', 'biomed'],
        description: 'Device availability based on uptime samples or downtime audit signals.',
      }),
      this.percentMetric({
        id: 'workflow-completion',
        label: 'Workflow completion',
        numerator: workflowCompletionEvents.length,
        denominator: workflowEvents.length,
        description: 'Workflow audit events that reached completion.',
      }),
      this.responseTimeMetric(responseTimeSamples),
    ];

    const executive = [
      this.percentMetric({
        id: 'adoption',
        label: 'Adoption',
        numerator: entitlements.length,
        denominator: TARGET_PACK_COUNT,
        description: 'Enabled pack adoption against the current platform pack target.',
      }),
      this.countMetric({
        id: 'engagement',
        label: 'Engagement',
        value: activeUsers,
        description: 'Unique active users observed in audit and usage events.',
      }),
      this.countMetric({
        id: 'outcomes',
        label: 'Outcomes',
        value: outcomeSignalCount,
        description:
          'Outcome, improvement, completion, and adherence signals observed this period.',
      }),
    ];

    return {
      organizationId,
      generatedAt: new Date().toISOString(),
      period: {
        key: period.key,
        start: period.start.toISOString(),
        end: period.end.toISOString(),
      },
      categories: { clinical, operational, executive },
      executiveSummary: {
        enabledPackCount: entitlements.length,
        activeUsers,
        totalEngagementEvents,
        eventsPerActiveUser: activeUsers
          ? Number((totalEngagementEvents / activeUsers).toFixed(1))
          : 0,
        outcomeSignalCount,
      },
      sources: {
        auditEvents: logs.length,
        usageEvents: usageEvents.length,
        enabledEntitlements: entitlements.length,
      },
    };
  }

  private countMetric(input: {
    id: string;
    label: string;
    value: number;
    description: string;
  }): ValueMetric {
    return {
      ...input,
      unit: 'count',
      status: input.value > 0 ? 'on-track' : 'needs-data',
    };
  }

  private percentMetric(input: {
    id: string;
    label: string;
    numerator: number;
    denominator: number;
    description: string;
  }): ValueMetric {
    const value = input.denominator
      ? Math.min(100, Math.round((input.numerator / input.denominator) * 100))
      : null;
    return {
      ...input,
      value,
      unit: 'percent',
      status: value === null ? 'needs-data' : value >= 80 ? 'on-track' : 'watch',
    };
  }

  private availabilityMetric(input: {
    id: string;
    label: string;
    logs: AuditLog[];
    keywords: string[];
    description: string;
  }): ValueMetric {
    const matching = input.logs.filter((log) => this.matchesLog(log, input.keywords));
    const uptimeSamples = matching
      .map((log) => this.numericMetadata(log, ['uptimePercent', 'availabilityPercent']))
      .filter((value): value is number => typeof value === 'number');
    const downtimeEvents = matching.filter((log) =>
      this.matchesLog(log, ['down', 'downtime', 'offline', 'outage', 'failed']),
    ).length;
    const value = uptimeSamples.length
      ? Math.round(this.average(uptimeSamples))
      : matching.length
        ? Math.max(0, Math.round(((matching.length - downtimeEvents) / matching.length) * 100))
        : null;

    return {
      id: input.id,
      label: input.label,
      value,
      unit: 'percent',
      numerator: value,
      denominator: 100,
      status: value === null ? 'needs-data' : value >= 95 ? 'on-track' : 'watch',
      description: input.description,
    };
  }

  private responseTimeMetric(samples: number[]): ValueMetric {
    const value = samples.length ? Math.round(this.average(samples)) : null;
    return {
      id: 'response-times',
      label: 'Response times',
      value,
      unit: 'milliseconds',
      numerator: value,
      denominator: null,
      status: value === null ? 'needs-data' : value <= 1000 ? 'on-track' : 'watch',
      description: 'Average response time from audit and usage metadata samples.',
    };
  }

  private matchLogs(logs: AuditLog[], keywords: string[]) {
    return logs.filter((log) => this.matchesLog(log, keywords));
  }

  private matchesLog(log: AuditLog, keywords: string[]) {
    const haystack = `${log.resource || ''} ${log.action || ''} ${JSON.stringify(
      this.metadata(log),
    )}`.toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
  }

  private isAiUsageLog(log: AuditLog) {
    const resource = String(log.resource || '').toLowerCase();
    const action = String(log.action || '').toLowerCase();
    return (
      resource.includes('assistant') ||
      resource.includes('chat') ||
      resource.includes(' ai ') ||
      resource.startsWith('ai-') ||
      action === 'ai' ||
      action.includes('ai_query') ||
      action.includes('ai_call')
    );
  }

  private responseTimeSamples(logs: AuditLog[], usageEvents: UsageEvent[]) {
    return [
      ...logs
        .map((log) => this.numericMetadata(log, ['responseTimeMs', 'durationMs', 'latencyMs']))
        .filter((value): value is number => typeof value === 'number'),
      ...usageEvents
        .map((event) => this.numericMetadata(event, ['responseTimeMs', 'durationMs', 'latencyMs']))
        .filter((value): value is number => typeof value === 'number'),
    ];
  }

  private numericMetadata(
    row: { metadata?: Record<string, any> | string | null },
    keys: string[],
  ): number | null {
    const metadata = this.metadata(row);
    for (const key of keys) {
      const value = metadata?.[key];
      if (typeof value === 'number') return value;
      if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
        return Number(value);
      }
    }
    return null;
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

  private sumUsage(events: UsageEvent[], eventType: UsageEventType) {
    return events
      .filter((event) => event.eventType === eventType)
      .reduce((total, event) => total + Number(event.quantity || 0), 0);
  }

  private countUnique(values: string[]) {
    return new Set(values).size;
  }

  private average(values: number[]) {
    return values.reduce((total, value) => total + value, 0) / values.length;
  }

  private outcomeSignalCount(logs: AuditLog[]) {
    return logs.filter((log) =>
      this.matchesLog(log, [
        'outcome',
        'improvement',
        'adherence',
        'complete',
        'completion',
        'resolved',
      ]),
    ).length;
  }

  private resolvePeriod(periodKey: string, anchor = new Date()): ValuePeriod {
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
}
