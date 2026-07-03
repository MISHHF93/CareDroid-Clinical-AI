/**
 * Unified observability contract — structured events, workflow spans, and diagnostics.
 */

export type ObservabilityEventCategory =
  | 'workflow'
  | 'api'
  | 'performance'
  | 'error'
  | 'audit'
  | 'health'
  | 'diagnostic';

export type ObservabilityEventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type ObservabilityStructuredEvent = Readonly<{
  id: string;
  category: ObservabilityEventCategory;
  name: string;
  severity: ObservabilityEventSeverity;
  timestamp: string;
  correlationId: string;
  sessionId: string;
  durationMs?: number;
  patientId?: string;
  workflowType?: string;
  source?: string;
  statusCode?: number;
  path?: string;
  message?: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type WorkflowTelemetrySpan = Readonly<{
  spanId: string;
  traceId: string;
  workflowType: string;
  patientId?: string;
  summary: string;
  source: string;
  severity: string;
  timestamp: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ApiPerformanceSample = Readonly<{
  path: string;
  method: string;
  durationMs: number;
  status: number;
  timestamp: string;
  slow: boolean;
}>;

export type ObservabilityDiagnosticsSnapshot = Readonly<{
  engineId: 'caredroid-observability';
  generatedAt: string;
  correlationId: string;
  sessionId: string;
  backendReachable: boolean;
  eventCounts: Readonly<Partial<Record<ObservabilityEventCategory, number>>>;
  recentErrors: readonly ObservabilityStructuredEvent[];
  slowApiCalls: readonly ApiPerformanceSample[];
  recentWorkflowSpans: readonly WorkflowTelemetrySpan[];
  performanceMarks: Readonly<Record<string, { count: number; p95Ms: number; avgMs: number }>>;
}>;

export const OBSERVABILITY_SLOW_API_THRESHOLD_MS = 2000;
export const OBSERVABILITY_EVENT_BUFFER_LIMIT = 200;
export const OBSERVABILITY_FLUSH_INTERVAL_MS = 30_000;

export const CRITICAL_WORKFLOW_TRACE_IDS = Object.freeze([
  'patient-intake-handoff',
  'patient-workflow-transition',
  'workflow-automation-refresh',
  'operational-intelligence-refresh',
  'knowledge-graph-refresh',
  'living-documentation-refresh',
  'administrative-automation-refresh',
  'administrative-automation-review',
  'ai-audit-decision',
  'ai-chief-request',
  'emergency-realtime-session',
  'three-minute-mission-start',
]);

/** Maps critical workflow ids to source modules validated by contract tests. */
export const CRITICAL_WORKFLOW_INSTRUMENTATION = Object.freeze({
  'patient-intake-handoff': 'src/services/receptionHandoff.ts',
  'patient-workflow-transition': 'src/services/unifiedPatientWorkflowOrchestrator.ts',
  'workflow-automation-refresh': 'src/engine/unifiedWorkflowAutomationEngine.ts',
  'operational-intelligence-refresh': 'src/engine/unifiedOperationalIntelligenceEngine.ts',
  'knowledge-graph-refresh': 'src/engine/unifiedApplicationKnowledgeGraphEngine.ts',
  'living-documentation-refresh': 'src/engine/livingDocumentationEngine.ts',
  'administrative-automation-refresh': 'src/engine/administrativeAutomationEngine.ts',
  'administrative-automation-review': 'src/store/emergencyStore.ts',
  'ai-audit-decision': 'src/services/observabilityService.ts',
  'ai-chief-request': 'src/services/aiChiefOrchestrator.ts',
  'emergency-realtime-session': 'src/services/emergencyRealtimeService.ts',
  'three-minute-mission-start': 'src/services/threeMinuteMissionService.ts',
} as const satisfies Record<(typeof CRITICAL_WORKFLOW_TRACE_IDS)[number], string>);

export const OBSERVABILITY_CONTRACT = Object.freeze({
  engineId: 'caredroid-observability',
  ingestEndpoint: '/api/observability/events',
  diagnosticsEndpoint: '/api/observability/diagnostics',
  performanceEndpoint: '/api/observability/performance',
  traceEndpoint: '/api/observability/traces',
  healthEndpoint: '/api/observability/health',
  crashEndpoint: '/api/crashes',
  healthProbeEndpoint: '/health',
  correlationHeader: 'x-correlation-id',
  requestIdHeader: 'x-request-id',
  workflowTraceHeader: 'x-workflow-trace-id',
  criticalWorkflows: CRITICAL_WORKFLOW_TRACE_IDS,
});