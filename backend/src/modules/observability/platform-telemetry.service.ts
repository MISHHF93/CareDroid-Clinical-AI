import { Injectable, Logger } from '@nestjs/common';

const WORKFLOW_TRACE_LIMIT = 100;

export type PlatformTelemetryEvent = {
  id: string;
  category: string;
  name: string;
  severity: string;
  timestamp: string;
  correlationId?: string;
  sessionId?: string;
  durationMs?: number;
  patientId?: string;
  workflowType?: string;
  source?: string;
  statusCode?: number;
  path?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

const EVENT_BUFFER_LIMIT = 500;
const SLOW_API_THRESHOLD_MS = 2000;

function createEventId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

@Injectable()
export class PlatformTelemetryService {
  private readonly logger = new Logger(PlatformTelemetryService.name);
  private readonly events: PlatformTelemetryEvent[] = [];
  private readonly crashReports: Array<Record<string, unknown>> = [];
  private readonly categoryCounts = new Map<string, number>();
  private readonly apiDurationSamples = new Map<string, number[]>();
  private slowApiCount = 0;
  private errorCount = 0;

  ingestEvents(input: {
    sessionId?: string;
    correlationId?: string;
    events: PlatformTelemetryEvent[];
  }) {
    for (const event of input.events || []) {
      const normalized: PlatformTelemetryEvent = {
        ...event,
        sessionId: event.sessionId || input.sessionId,
        correlationId: event.correlationId || input.correlationId,
      };
      this.events.unshift(normalized);
      this.categoryCounts.set(
        normalized.category,
        (this.categoryCounts.get(normalized.category) || 0) + 1,
      );

      if (normalized.category === 'api' && (normalized.durationMs || 0) >= SLOW_API_THRESHOLD_MS) {
        this.slowApiCount += 1;
        this.logger.warn(
          `Slow client API call: ${normalized.path} (${normalized.durationMs}ms, status=${normalized.statusCode})`,
        );
      }

      if (normalized.severity === 'error' || normalized.severity === 'critical') {
        this.errorCount += 1;
        this.logger.error(
          `Client ${normalized.category} error: ${normalized.name} — ${normalized.message || 'no message'}`,
        );
      } else if (normalized.category === 'workflow') {
        this.logger.log(
          `Workflow telemetry: ${normalized.workflowType || normalized.name} patient=${normalized.patientId || 'n/a'}`,
        );
      }
    }

    if (this.events.length > EVENT_BUFFER_LIMIT) {
      this.events.length = EVENT_BUFFER_LIMIT;
    }

    return {
      accepted: input.events?.length || 0,
      buffered: this.events.length,
    };
  }

  recordBackendRequest(input: {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    correlationId?: string;
    workflowTraceId?: string;
    requestId?: string;
    userId?: string;
  }) {
    const slow = input.durationMs >= SLOW_API_THRESHOLD_MS;
    const pathKey = `${input.method} ${input.path}`;
    const samples = this.apiDurationSamples.get(pathKey) || [];
    samples.push(input.durationMs);
    this.apiDurationSamples.set(pathKey, samples.slice(-100));

    return this.ingestEvents({
      correlationId: input.correlationId,
      events: [
        {
          id: createEventId('backend-api'),
          category: 'api',
          name: slow ? 'backend_slow_request' : 'backend_request',
          severity: input.statusCode >= 500 ? 'error' : slow ? 'warn' : 'info',
          timestamp: new Date().toISOString(),
          correlationId: input.correlationId,
          durationMs: input.durationMs,
          path: input.path,
          statusCode: input.statusCode,
          source: 'backend-http',
          message: `${input.method} ${input.path}`,
          metadata: {
            method: input.method,
            requestId: input.requestId,
            workflowTraceId: input.workflowTraceId,
            userId: input.userId,
            slow,
          },
        },
      ],
    });
  }

  recordBackendWorkflow(input: {
    workflowType: string;
    name: string;
    severity?: string;
    correlationId?: string;
    durationMs?: number;
    patientId?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }) {
    const severity =
      input.severity === 'critical' || input.severity === 'error'
        ? 'error'
        : input.severity === 'warn' || input.severity === 'warning'
          ? 'warn'
          : 'info';

    return this.ingestEvents({
      correlationId: input.correlationId,
      events: [
        {
          id: createEventId('backend-workflow'),
          category: 'workflow',
          name: input.name,
          severity,
          timestamp: new Date().toISOString(),
          correlationId: input.correlationId,
          workflowType: input.workflowType,
          patientId: input.patientId,
          durationMs: input.durationMs,
          source: 'backend',
          message: input.message,
          metadata: input.metadata,
        },
      ],
    });
  }

  recordBackendAudit(input: {
    action: string;
    resource: string;
    userId?: string;
    phiAccessed?: boolean;
    organizationId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.ingestEvents({
      events: [
        {
          id: createEventId('backend-audit'),
          category: 'audit',
          name: `audit_${input.action}`,
          severity: input.phiAccessed ? 'warn' : 'info',
          timestamp: new Date().toISOString(),
          source: 'audit-service',
          message: input.resource,
          metadata: {
            action: input.action,
            resource: input.resource,
            userId: input.userId,
            phiAccessed: input.phiAccessed,
            organizationId: input.organizationId,
            ...input.metadata,
          },
        },
      ],
    });
  }

  recordBackendError(input: {
    name: string;
    message: string;
    path?: string;
    statusCode?: number;
    correlationId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.ingestEvents({
      correlationId: input.correlationId,
      events: [
        {
          id: createEventId('backend-error'),
          category: 'error',
          name: input.name,
          severity: 'error',
          timestamp: new Date().toISOString(),
          correlationId: input.correlationId,
          path: input.path,
          statusCode: input.statusCode,
          source: 'backend',
          message: input.message,
          metadata: {
            requestId: input.requestId,
            ...input.metadata,
          },
        },
      ],
    });
  }

  getTraceTimeline(correlationId: string) {
    const normalized = String(correlationId || '').trim();
    const events = this.events.filter((event) => event.correlationId === normalized);
    const workflowSpans = events
      .filter((event) => event.category === 'workflow')
      .slice(0, WORKFLOW_TRACE_LIMIT);
    const apiCalls = events
      .filter((event) => event.category === 'api')
      .slice(0, WORKFLOW_TRACE_LIMIT);
    const errors = events
      .filter((event) => event.severity === 'error' || event.severity === 'critical')
      .slice(0, WORKFLOW_TRACE_LIMIT);

    return {
      correlationId: normalized,
      generatedAt: new Date().toISOString(),
      eventCount: events.length,
      workflowSpans,
      apiCalls,
      errors,
      timeline: events.slice(0, WORKFLOW_TRACE_LIMIT),
    };
  }

  getPerformanceSummary() {
    const slowEndpoints: Array<{
      endpoint: string;
      count: number;
      p95Ms: number;
      avgMs: number;
      maxMs: number;
    }> = [];

    for (const [endpoint, samples] of this.apiDurationSamples.entries()) {
      const total = samples.reduce((sum, value) => sum + value, 0);
      slowEndpoints.push({
        endpoint,
        count: samples.length,
        p95Ms: percentile(samples, 95),
        avgMs: samples.length ? Math.round(total / samples.length) : 0,
        maxMs: samples.length ? Math.max(...samples) : 0,
      });
    }

    slowEndpoints.sort((a, b) => b.p95Ms - a.p95Ms);

    const recentSlow = this.events
      .filter((event) => event.category === 'api' && (event.durationMs || 0) >= SLOW_API_THRESHOLD_MS)
      .slice(0, 20);

    return {
      generatedAt: new Date().toISOString(),
      slowApiCount: this.slowApiCount,
      errorCount: this.errorCount,
      bufferedEvents: this.events.length,
      categoryCounts: Object.fromEntries(this.categoryCounts.entries()),
      slowEndpoints: slowEndpoints.slice(0, 15),
      recentSlow,
      regressionSignals: slowEndpoints
        .filter((entry) => entry.p95Ms >= SLOW_API_THRESHOLD_MS && entry.count >= 3)
        .slice(0, 5)
        .map((entry) => ({
          endpoint: entry.endpoint,
          p95Ms: entry.p95Ms,
          sampleCount: entry.count,
          signal: 'sustained_slow_endpoint',
        })),
    };
  }

  recordCrash(report: Record<string, unknown>) {
    this.crashReports.unshift({
      ...report,
      receivedAt: new Date().toISOString(),
    });
    if (this.crashReports.length > 100) {
      this.crashReports.length = 100;
    }
    const error = (report.error || {}) as { name?: string; message?: string };
    this.logger.error(`Client crash: ${error.name || 'Error'} — ${error.message || 'unknown'}`);
    this.errorCount += 1;
    return report.id || `crash-${Date.now()}`;
  }

  getDiagnostics() {
    const recentWorkflow = this.events
      .filter((event) => event.category === 'workflow')
      .slice(0, 20);
    const recentErrors = this.events
      .filter((event) => event.severity === 'error' || event.severity === 'critical')
      .slice(0, 20);
    const slowApiCalls = this.events
      .filter((event) => event.category === 'api' && (event.durationMs || 0) >= SLOW_API_THRESHOLD_MS)
      .slice(0, 20);

    return {
      engineId: 'platform-telemetry',
      generatedAt: new Date().toISOString(),
      totals: {
        bufferedEvents: this.events.length,
        crashReports: this.crashReports.length,
        slowApiCount: this.slowApiCount,
        errorCount: this.errorCount,
      },
      categoryCounts: Object.fromEntries(this.categoryCounts.entries()),
      recentWorkflow,
      recentErrors,
      slowApiCalls,
      recentCrashes: this.crashReports.slice(0, 10),
      performance: this.getPerformanceSummary(),
    };
  }
}