import appConfig from '../config/appConfig';
import {
  OBSERVABILITY_CONTRACT,
  OBSERVABILITY_EVENT_BUFFER_LIMIT,
  OBSERVABILITY_FLUSH_INTERVAL_MS,
  OBSERVABILITY_SLOW_API_THRESHOLD_MS,
  type ApiPerformanceSample,
  type ObservabilityDiagnosticsSnapshot,
  type ObservabilityEventCategory,
  type ObservabilityEventSeverity,
  type ObservabilityStructuredEvent,
  type WorkflowTelemetrySpan,
} from '../config/observabilityModel';
import { apiFetch } from './apiClient';
import { isBackendKnownOffline } from './backendReachability';
import logger from '../utils/logger';

const SESSION_KEY = 'caredroid.observability.session';
const CORRELATION_KEY = 'caredroid.observability.correlation';

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readStorage(key: string): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    // Expected when sessionStorage is unavailable (SSR, privacy mode, quota).
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Expected when sessionStorage is full or unavailable — safe to ignore.
  }
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

class ObservabilityService {
  private sessionId = readStorage(SESSION_KEY) || createId('session');
  private correlationId = readStorage(CORRELATION_KEY) || createId('corr');
  private initialized = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private pendingEvents: ObservabilityStructuredEvent[] = [];
  private recentErrors: ObservabilityStructuredEvent[] = [];
  private slowApiCalls: ApiPerformanceSample[] = [];
  private workflowSpans: WorkflowTelemetrySpan[] = [];
  private performanceSamples = new Map<string, number[]>();
  private eventCounts: Partial<Record<ObservabilityEventCategory, number>> = {};

  initialize(): void {
    if (this.initialized) return;
    writeStorage(SESSION_KEY, this.sessionId);
    writeStorage(CORRELATION_KEY, this.correlationId);
    this.initialized = true;

    void import('../../lib/ai/auditLogger').then(({ registerAIAuditSink }) => {
      registerAIAuditSink((event) => {
        this.recordAuditEvent({
          module: event.module,
          action: event.action,
          result: event.result,
          patientId: event.patientId,
          purpose: event.purpose,
          requestType: event.requestType,
          blocked: event.safety.blocked,
          requiresHumanReview: event.safety.requiresHumanReview,
        });
      });
    });

    this.flushTimer = setInterval(() => {
      void this.flush();
    }, OBSERVABILITY_FLUSH_INTERVAL_MS);

    this.recordEvent({
      category: 'health',
      name: 'observability_initialized',
      severity: 'info',
      metadata: {
        appVersion: appConfig.app.version,
        environment: appConfig.app.environment,
      },
    });
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  rotateCorrelationId(): string {
    this.correlationId = createId('corr');
    writeStorage(CORRELATION_KEY, this.correlationId);
    return this.correlationId;
  }

  buildTraceHeaders(workflowTraceId?: string): Record<string, string> {
    const headers: Record<string, string> = {
      [OBSERVABILITY_CONTRACT.correlationHeader]: this.correlationId,
      [OBSERVABILITY_CONTRACT.requestIdHeader]: createId('req'),
    };
    if (workflowTraceId) {
      headers[OBSERVABILITY_CONTRACT.workflowTraceHeader] = workflowTraceId;
    }
    return headers;
  }

  recordEvent(input: {
    category: ObservabilityEventCategory;
    name: string;
    severity?: ObservabilityEventSeverity;
    durationMs?: number;
    patientId?: string;
    workflowType?: string;
    source?: string;
    statusCode?: number;
    path?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }): ObservabilityStructuredEvent {
    const event = Object.freeze({
      id: createId('obs'),
      category: input.category,
      name: input.name,
      severity: input.severity || 'info',
      timestamp: new Date().toISOString(),
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      durationMs: input.durationMs,
      patientId: input.patientId,
      workflowType: input.workflowType,
      source: input.source,
      statusCode: input.statusCode,
      path: input.path,
      message: input.message,
      metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
    });

    this.eventCounts[event.category] = (this.eventCounts[event.category] || 0) + 1;
    this.pendingEvents.push(event);
    if (this.pendingEvents.length > OBSERVABILITY_EVENT_BUFFER_LIMIT) {
      this.pendingEvents = this.pendingEvents.slice(-OBSERVABILITY_EVENT_BUFFER_LIMIT);
    }

    if (event.severity === 'error' || event.severity === 'critical') {
      this.recentErrors = [event, ...this.recentErrors].slice(0, 25);
    }

    return event;
  }

  recordApiTiming(input: {
    path: string;
    method: string;
    durationMs: number;
    status: number;
  }): void {
    const slow = input.durationMs >= OBSERVABILITY_SLOW_API_THRESHOLD_MS;
    const sample: ApiPerformanceSample = Object.freeze({
      path: input.path,
      method: input.method,
      durationMs: input.durationMs,
      status: input.status,
      timestamp: new Date().toISOString(),
      slow,
    });

    if (slow) {
      this.slowApiCalls = [sample, ...this.slowApiCalls].slice(0, 25);
      logger.warn('Slow API call detected', sample);
    }

    const markKey = `api:${input.method}:${input.path}`;
    const samples = this.performanceSamples.get(markKey) || [];
    samples.push(input.durationMs);
    this.performanceSamples.set(markKey, samples.slice(-100));

    this.recordEvent({
      category: 'api',
      name: slow ? 'api_slow_request' : 'api_request',
      severity: input.status >= 500 ? 'error' : slow ? 'warn' : 'info',
      durationMs: input.durationMs,
      path: input.path,
      statusCode: input.status,
      metadata: { method: input.method, slow },
    });
  }

  recordWorkflowTelemetry(input: {
    id: string;
    type: string;
    summary: string;
    patientId?: string;
    source?: string;
    severity?: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
  }): WorkflowTelemetrySpan {
    const span = Object.freeze({
      spanId: input.id,
      traceId: this.correlationId,
      workflowType: input.type,
      patientId: input.patientId,
      summary: input.summary,
      source: input.source || 'emergency-store',
      severity: input.severity || 'Info',
      timestamp: input.timestamp,
      metadata: input.metadata ? Object.freeze({ ...input.metadata }) : undefined,
    });

    this.workflowSpans = [span, ...this.workflowSpans].slice(0, 50);
    this.recordEvent({
      category: 'workflow',
      name: input.type,
      severity:
        input.severity === 'Critical' ? 'critical' : input.severity === 'Warning' ? 'warn' : 'info',
      patientId: input.patientId,
      workflowType: input.type,
      source: span.source,
      message: input.summary,
      metadata: input.metadata,
    });

    return span;
  }

  recordPerformanceMark(name: string, durationMs: number): void {
    const samples = this.performanceSamples.get(name) || [];
    samples.push(durationMs);
    this.performanceSamples.set(name, samples.slice(-100));

    this.recordEvent({
      category: 'performance',
      name,
      severity: durationMs >= OBSERVABILITY_SLOW_API_THRESHOLD_MS ? 'warn' : 'info',
      durationMs,
    });
  }

  recordAuditEvent(input: {
    module: string;
    action: string;
    result: string;
    patientId?: string;
    purpose: string;
    requestType: string;
    blocked: boolean;
    requiresHumanReview: boolean;
  }): void {
    this.recordEvent({
      category: 'audit',
      name: `ai_${input.action}`,
      severity: input.blocked || input.result === 'error' ? 'warn' : 'info',
      patientId: input.patientId,
      source: input.module,
      message: input.purpose,
      metadata: {
        result: input.result,
        requestType: input.requestType,
        blocked: input.blocked,
        requiresHumanReview: input.requiresHumanReview,
        workflow: 'ai-audit-decision',
      },
    });
  }

  recordError(input: {
    name: string;
    message: string;
    source?: string;
    metadata?: Record<string, unknown>;
  }): void {
    this.recordEvent({
      category: 'error',
      name: input.name,
      severity: 'error',
      message: input.message,
      source: input.source,
      metadata: input.metadata,
    });
  }

  recordHealthSignal(input: {
    name: string;
    status: 'ok' | 'degraded' | 'offline' | 'reconnecting';
    source: string;
    message?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const severity =
      input.status === 'offline' ? 'critical' : input.status === 'degraded' ? 'warn' : 'info';
    this.recordEvent({
      category: 'health',
      name: input.name,
      severity,
      source: input.source,
      message: input.message,
      metadata: Object.freeze({
        status: input.status,
        ...input.metadata,
      }),
    });
  }

  buildDiagnosticsSnapshot(): ObservabilityDiagnosticsSnapshot {
    const performanceMarks: Record<string, { count: number; p95Ms: number; avgMs: number }> = {};
    for (const [name, samples] of this.performanceSamples.entries()) {
      const total = samples.reduce((sum, value) => sum + value, 0);
      performanceMarks[name] = {
        count: samples.length,
        p95Ms: percentile(samples, 95),
        avgMs: samples.length ? Math.round(total / samples.length) : 0,
      };
    }

    return Object.freeze({
      engineId: 'caredroid-observability',
      generatedAt: new Date().toISOString(),
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      backendReachable: !isBackendKnownOffline(),
      eventCounts: Object.freeze({ ...this.eventCounts }),
      recentErrors: Object.freeze([...this.recentErrors]),
      slowApiCalls: Object.freeze([...this.slowApiCalls]),
      recentWorkflowSpans: Object.freeze([...this.workflowSpans]),
      performanceMarks: Object.freeze(performanceMarks),
    });
  }

  async flush(): Promise<void> {
    if (!this.pendingEvents.length || isBackendKnownOffline()) return;

    const batch = this.pendingEvents.splice(0, 50);
    try {
      await apiFetch(OBSERVABILITY_CONTRACT.ingestEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.sessionId,
          correlationId: this.correlationId,
          events: batch,
        }),
      });
    } catch (error: unknown) {
      this.pendingEvents = [...batch, ...this.pendingEvents].slice(-OBSERVABILITY_EVENT_BUFFER_LIMIT);
      logger.debug('Observability flush deferred', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  startDiagnosticsHeartbeat(intervalMs = 60_000): () => void {
    const timer = setInterval(() => {
      this.recordEvent({
        category: 'diagnostic',
        name: 'heartbeat',
        severity: 'debug',
        metadata: {
          pendingEvents: this.pendingEvents.length,
          workflowSpans: this.workflowSpans.length,
          slowApiCalls: this.slowApiCalls.length,
        },
      });
      void this.flush();
    }, intervalMs);

    return () => clearInterval(timer);
  }
}

const observabilityService = new ObservabilityService();
export default observabilityService;
export {
  observabilityService,
  ObservabilityService,
};