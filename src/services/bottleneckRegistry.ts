import type { Alert, CapacitySnapshot } from '../types/emergency';

export type BottleneckCategory =
  | 'clinical_workflow'
  | 'operational'
  | 'saas_backend'
  | 'interoperability'
  | 'frontend';

export type BottleneckSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BottleneckStatus = 'active' | 'acknowledged' | 'mitigated' | 'resolved';
export type ServiceHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export type BottleneckEvent = {
  id: string;
  category: BottleneckCategory;
  serviceName: string;
  source: string;
  severity: BottleneckSeverity;
  title: string;
  description: string;
  affectedWorkflow: string;
  affectedPatientId?: string;
  affectedDepartment?: string;
  detectedAt: string;
  resolvedAt?: string;
  ownerRole: string;
  ownerUserId?: string;
  responseDeadline?: string;
  impactsThreeMinuteTarget: boolean;
  fallbackAction: string;
  recommendedFix: string;
  status: BottleneckStatus;
};

export type ServiceHealth = {
  serviceName: string;
  status: ServiceHealthStatus;
  latencyMs?: number;
  errorRate?: number;
  lastCheckedAt: string;
  dependencies: string[];
  affectsCriticalWorkflow: boolean;
  fallbackAvailable: boolean;
  currentBottlenecks: BottleneckEvent[];
};

export type CurrentServiceMapEntry = {
  serviceName: string;
  filePath: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  dependencies: string[];
  consumers: string[];
  failureModes: string[];
  latencyRisks: string[];
  duplicationConflicts: string[];
  affectsThreeMinuteLoop: boolean;
};

export type ThreeMinuteRiskProjection = {
  status: 'on_track' | 'at_risk' | 'breach_likely';
  criticalBottlenecks: number;
  highRiskPatientsAffected: number;
  nextOwnerRole: string;
  fallbackAction: string;
  summary: string;
};

export type BottleneckRegistrySnapshot = {
  generatedAt: string;
  currentServiceMap: CurrentServiceMapEntry[];
  activeBottlenecks: BottleneckEvent[];
  serviceHealth: ServiceHealth[];
  threeMinuteRiskProjection: ThreeMinuteRiskProjection;
  rootCauseSummary: string;
  analytics: {
    activeCount: number;
    criticalCount: number;
    averageServiceLatencyMs: number;
    threeMinuteTargetBreachesByCause: Record<string, number>;
  };
};

type QueueHealthInput = {
  id: string;
  label: string;
  count: number;
  oldestWaitMinutes: number;
  targetMinutes: number;
  breached: boolean;
};

type PatientReferenceInput = {
  id: string;
  priority: string | number;
  waitMinutes: number;
  flags?: string[];
};

type BuildBottleneckRegistryInput = {
  generatedAt?: string;
  queueHealth?: QueueHealthInput[];
  capacityStatus?: Partial<CapacitySnapshot> | Record<string, unknown>;
  operationalAlerts?: Alert[];
  criticalPatients?: PatientReferenceInput[];
  activePatients?: PatientReferenceInput[];
  sync?: {
    status?: string;
    source?: string;
    stale?: boolean;
    message?: string;
  };
  aiCopilotContext?: {
    enabled?: boolean;
    recentMessages?: number;
  };
  reassessmentStatus?: {
    due?: number;
    overdue?: number;
  };
  referralStatus?: {
    pending?: number;
  };
};

export const CURRENT_SERVICE_MAP: readonly CurrentServiceMapEntry[] = Object.freeze([
  {
    serviceName: 'CareDroid Central Node',
    filePath: 'src/central-node/careDroidCentralNode.ts',
    purpose: 'Aggregates store/backend ED state into one command snapshot.',
    inputs: ['patients', 'capacity', 'alerts', 'EMS', 'referrals', 'settings', 'backend snapshot'],
    outputs: ['department status', 'queue health', 'operational alerts', 'AI copilot context'],
    dependencies: ['emergencyStore', 'arrivalControlLayer', 'triageBreachTimer', 'providerWaitBreachTimer'],
    consumers: ['useCareDroidCentralNode', 'useOperationalIntelligence', 'CommandDashboard', 'EmergencyAnalytics', 'CopilotPanel'],
    failureModes: ['backend snapshot malformed', 'stale websocket sync', 'missing store data'],
    latencyRisks: ['backend central-node polling', 'large local patient list aggregation'],
    duplicationConflicts: ['local store snapshot and optional backend snapshot can disagree'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'API Client',
    filePath: 'src/services/apiClient.ts',
    purpose: 'Shared fetch/axios wrapper with auth, tenant headers, timeout, and dev fallback behavior.',
    inputs: ['API path', 'headers', 'timeoutMs', 'local auth token'],
    outputs: ['Response', 'parsed JSON', 'user-facing error message'],
    dependencies: ['appConfig', 'api.config', 'auth.config', 'tenantContextStore', 'backendReachability'],
    consumers: ['all frontend API clients'],
    failureModes: ['timeout', 'network offline', 'HTML instead of JSON', '401/403', 'malformed JSON'],
    latencyRisks: ['default timeout budget', 'backend reachability probing'],
    duplicationConflicts: ['direct fetch/axios calls outside apiClient remain a risk'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Alert Engine',
    filePath: 'src/engine/alertEngineDerived.ts',
    purpose: 'Derives operational alerts from reassessment, capacity, EMS, referrals, long waits, and queues.',
    inputs: ['patients', 'capacity', 'EMS arrivals', 'referrals', 'queues', 'bottleneck events'],
    outputs: ['deduplicated Alert[]'],
    dependencies: ['longWaitRescue', 'alertClassificationModel'],
    consumers: ['emergencyStore.updateAlerts', 'alertEngine.dispatch'],
    failureModes: ['invalid queue payload', 'stale previous alert state', 'over-filtered alert triage'],
    latencyRisks: ['large patient list alert derivation'],
    duplicationConflicts: ['manual alerts and derived alerts can overlap by title/source'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Operational Intelligence',
    filePath: 'src/operational-intelligence/careDroidOperationalIntelligence.ts',
    purpose: 'Builds rule-based operational anomaly, recommendation, and model-health snapshots.',
    inputs: ['central node snapshot', 'settings', 'patients', 'referrals', 'workflow logs'],
    outputs: ['anomalies', 'recommendations', 'model health', 'alerts'],
    dependencies: ['central node', 'emergencyOsApi'],
    consumers: ['useOperationalIntelligence', 'EmergencyAnalytics', 'CopilotPanel'],
    failureModes: ['backend intelligence unavailable', 'stale data freshness', 'disabled auto-alerting'],
    latencyRisks: ['polling interval', 'backend operational-intelligence endpoint'],
    duplicationConflicts: ['overlaps with queue and capacity intelligence services'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Queue Intelligence Service',
    filePath: 'src/services/queueIntelligenceService.ts',
    purpose: 'Normalizes ED queues and detects queue bottlenecks before downstream degradation.',
    inputs: ['queue state', 'wait time', 'throughput', 'risk level'],
    outputs: ['queues', 'bottlenecks', 'queue metrics', 'recommendations'],
    dependencies: ['default emergency queue definitions'],
    consumers: ['QueueIntelligencePanel', 'EmergencyPatientPathService', 'workspaceDataPipelineService'],
    failureModes: ['missing queue state', 'demo defaults mistaken for live data'],
    latencyRisks: ['none significant; local synchronous scoring'],
    duplicationConflicts: ['store queue summaries and queue service dashboard use different schemas'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Emergency Capacity Intelligence Service',
    filePath: 'src/services/emergencyCapacityIntelligenceService.ts',
    purpose: 'Scores ED capacity from occupancy, boarding, admissions, EMS pressure, and discharges.',
    inputs: ['capacity state'],
    outputs: ['capacity score', 'risk level', 'signals', 'recommendations'],
    dependencies: ['capacity thresholds'],
    consumers: ['capacity routes', 'workspaceDataPipelineService', 'analytics'],
    failureModes: ['missing live capacity feed', 'demo defaults used as live context'],
    latencyRisks: ['none significant; local synchronous scoring'],
    duplicationConflicts: ['capacity model overlaps with central node capacityStatus'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'ED Copilot / AI Chief Panel',
    filePath: 'src/components/CopilotPanel.tsx',
    purpose: 'Builds AI Chief prompt context and calls the AI client with operational safeguards.',
    inputs: ['prompt', 'central snapshot', 'operational intelligence', 'patient context'],
    outputs: ['copilot response', 'workflow action log', 'persisted interaction'],
    dependencies: ['callAI', 'promptRegistry', 'useOperationalIntelligence', 'emergencyOsApi'],
    consumers: ['AppShell', 'Emergency Copilot route'],
    failureModes: ['AI service unavailable', 'backend copilot context degraded', 'promise rejection'],
    latencyRisks: ['AI request latency', 'prompt size', 'stream simulation delay'],
    duplicationConflicts: ['optional backend copilot route differs from active AI client path'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'SaaS Health API',
    filePath: 'src/services/saasHealthApi.ts',
    purpose: 'Reads platform health and provides critical fallback when health endpoint is unavailable.',
    inputs: ['/api/saas-health'],
    outputs: ['health checks', 'summary', 'fallback source'],
    dependencies: ['apiClient'],
    consumers: ['SaaS Health Center and platform health surfaces'],
    failureModes: ['health endpoint unavailable', 'all checks fallback critical'],
    latencyRisks: ['health endpoint timeout'],
    duplicationConflicts: ['systemHealthService also probes system health'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Clinical Alerts API',
    filePath: 'src/services/clinicalAlertsApi.ts',
    purpose: 'Loads and acknowledges clinical alerts with local sample fallback in the alerts page.',
    inputs: ['/api/clinical/alerts', 'acknowledgement audit metadata'],
    outputs: ['ClinicalAlert[]', 'acknowledgement result'],
    dependencies: ['apiClient', 'backendApiCapabilities'],
    consumers: ['ClinicalAlertsPage'],
    failureModes: ['backend unsupported', 'acknowledge fails', 'sample alerts used locally'],
    latencyRisks: ['clinical alerts fetch and acknowledge round trip'],
    duplicationConflicts: ['store operational alerts are separate from clinical alert API payloads'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Interoperability API',
    filePath: 'src/services/interoperabilityApi.ts',
    purpose: 'Represents EHR/FHIR/HL7 readiness and source-provenance integration surfaces.',
    inputs: ['integration route requests', 'patient/source identifiers'],
    outputs: ['integration capability payloads'],
    dependencies: ['apiClient'],
    consumers: ['governance/interoperability pages and readiness panels'],
    failureModes: ['FHIR mapping unavailable', 'missing patient identifier', 'external API timeout'],
    latencyRisks: ['external EHR/lab/radiology sync waits'],
    duplicationConflicts: ['platform systems demo contracts overlap with interoperability readiness'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Notification Service',
    filePath: 'src/services/NotificationService.ts',
    purpose: 'Frontend notification helper for emergency, cost, and recommendation alerts.',
    inputs: ['notification payloads', 'alert metadata'],
    outputs: ['queued notifications', 'listener callbacks'],
    dependencies: ['browser runtime'],
    consumers: ['notification tests and alert-related UI'],
    failureModes: ['delivery failure', 'listener queue stale', 'permission denied'],
    latencyRisks: ['notification delivery and acknowledgement delay'],
    duplicationConflicts: ['backend Firebase notification service also manages notifications'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Backend Notifications / Firebase Service',
    filePath: 'backend/src/modules/notifications/services/firebase.service.ts',
    purpose: 'Sends push notifications through Firebase Admin when configured.',
    inputs: ['device token', 'topic', 'notification payload'],
    outputs: ['Firebase message id or multicast result'],
    dependencies: ['Firebase Admin', 'device-token service', 'notification preferences'],
    consumers: ['backend notification module'],
    failureModes: ['Firebase unavailable', 'invalid token', 'partial multicast failure'],
    latencyRisks: ['provider API latency', 'retry/backoff not visible to ED UI'],
    duplicationConflicts: ['frontend notification queue can diverge from backend push state'],
    affectsThreeMinuteLoop: true,
  },
]);

const SERVICE_DEPENDENCIES: Record<string, string[]> = Object.freeze({
  'AI Chief': ['API Client', 'CareDroid Central Node', 'Operational Intelligence'],
  'API Client': ['Backend API', 'Auth/session', 'Tenant context'],
  'CareDroid Central Node': ['Emergency store', 'Backend snapshot', 'Websocket sync'],
  'Clinical Alerts API': ['API Client', 'Backend alerts'],
  'EHR/FHIR Sync': ['API Client', 'Interoperability API', 'External EHR'],
  'Lab Integration': ['API Client', 'External lab system'],
  'Notification Service': ['API Client', 'Firebase/browser notifications'],
  'Operational Intelligence': ['CareDroid Central Node', 'Emergency OS API'],
  'Queue Intelligence Service': ['Emergency queues', 'Patient flow'],
});

function plusMinutes(iso: string, minutes: number): string {
  const base = new Date(iso).getTime();
  const safeBase = Number.isFinite(base) ? base : Date.now();
  return new Date(safeBase + minutes * 60000).toISOString();
}

function severityRank(severity: BottleneckSeverity): number {
  return { critical: 4, high: 3, medium: 2, low: 1 }[severity];
}

function alertSeverityFromBottleneck(severity: BottleneckSeverity): Alert['severity'] {
  if (severity === 'critical') return 'Critical';
  if (severity === 'high') return 'Warning';
  return 'Info';
}

function normalizeCapacityBand(capacity?: Partial<CapacitySnapshot> | Record<string, unknown>): string {
  return String(capacity?.band || capacity?.riskLevel || '').toLowerCase();
}

function isCriticalPatient(patient?: PatientReferenceInput): boolean {
  if (!patient) return false;
  const flags = patient.flags || [];
  return (
    String(patient.priority) === 'P1' ||
    String(patient.priority) === 'P2' ||
    flags.includes('HighRisk') ||
    flags.includes('DeteriorationRisk') ||
    flags.includes('SepsisAlert') ||
    flags.includes('StrokeCode')
  );
}

function bottleneck(input: Omit<BottleneckEvent, 'detectedAt' | 'status'>, detectedAt: string): BottleneckEvent {
  return {
    ...input,
    detectedAt,
    status: 'active',
  };
}

export function detectBottleneckEvents(input: BuildBottleneckRegistryInput): BottleneckEvent[] {
  const detectedAt = input.generatedAt || new Date().toISOString();
  const criticalPatients = input.criticalPatients || [];
  const queueHealth = input.queueHealth || [];
  const activeAlerts = (input.operationalAlerts || []).filter((alert) => !alert.dismissed);
  const capacityBand = normalizeCapacityBand(input.capacityStatus);
  const events: BottleneckEvent[] = [];

  queueHealth
    .filter((queue) => queue.breached || queue.oldestWaitMinutes > queue.targetMinutes)
    .forEach((queue) => {
      const criticalQueue =
        queue.oldestWaitMinutes >= Math.max(queue.targetMinutes * 2, queue.targetMinutes + 20);
      const affectedPatient = criticalPatients[0];
      events.push(
        bottleneck(
          {
            id: `bn-workflow-${queue.id}`,
            category: queue.id.includes('results') ? 'interoperability' : 'clinical_workflow',
            serviceName:
              queue.id.includes('results') ? 'Lab Integration' : 'Queue Intelligence Service',
            source: 'CareDroidCentralNode.queueHealth',
            severity: criticalQueue ? 'critical' : 'high',
            title: `${queue.label} delay`,
            description: `${queue.label} oldest wait is ${queue.oldestWaitMinutes}m against a ${queue.targetMinutes}m target.`,
            affectedWorkflow: queue.label,
            affectedPatientId: affectedPatient?.id,
            affectedDepartment: 'Emergency Department',
            ownerRole: queue.id.includes('triage') ? 'triage_nurse' : 'charge_nurse',
            responseDeadline: plusMinutes(detectedAt, criticalQueue || affectedPatient ? 3 : 10),
            impactsThreeMinuteTarget: criticalQueue || Boolean(affectedPatient),
            fallbackAction: queue.id.includes('results')
              ? 'Show pending result status, call the lab owner, and continue clinical reassessment with available data.'
              : 'Assign a human queue owner, pull the oldest/highest-risk patient forward, and document manual triage.',
            recommendedFix: 'Review queue staffing, blocked handoffs, and downstream capacity before new arrivals stack.',
          },
          detectedAt,
        ),
      );
    });

  if (capacityBand === 'red' || capacityBand === 'orange') {
    events.push(
      bottleneck(
        {
          id: `bn-operational-capacity-${capacityBand}`,
          category: 'operational',
          serviceName: 'Emergency Capacity Intelligence Service',
          source: 'CareDroidCentralNode.capacityStatus',
          severity: capacityBand === 'red' ? 'critical' : 'high',
          title: 'Capacity pressure delaying care',
          description: `Capacity is ${input.capacityStatus?.band || input.capacityStatus?.riskLevel || 'degraded'} with score ${input.capacityStatus?.score ?? 'unknown'}.`,
          affectedWorkflow: 'Bed assignment and provider throughput',
          affectedDepartment: 'Emergency Department',
          ownerRole: 'patient_flow_coordinator',
          responseDeadline: plusMinutes(detectedAt, 3),
          impactsThreeMinuteTarget: criticalPatients.length > 0 || capacityBand === 'red',
          fallbackAction: 'Open command huddle, use hallway/rapid-review contingency per site policy, and protect emergency read-only visibility.',
          recommendedFix: 'Escalate bed management, discharge acceleration, and inpatient handoff blockers.',
        },
        detectedAt,
      ),
    );
  }

  if (input.sync?.stale || /offline|error|degraded|local/i.test(String(input.sync?.status || input.sync?.message || ''))) {
    events.push(
      bottleneck(
        {
          id: 'bn-saas-central-node-sync',
          category: 'saas_backend',
          serviceName: 'CareDroid Central Node',
          source: 'CareDroidCentralNode.sync',
          severity: criticalPatients.length ? 'critical' : 'high',
          title: 'Central node sync degraded',
          description: input.sync?.message || 'Central operational snapshot is stale or running locally.',
          affectedWorkflow: 'Command center situational awareness',
          affectedPatientId: criticalPatients[0]?.id,
          affectedDepartment: 'Emergency Department',
          ownerRole: 'platform_admin',
          responseDeadline: plusMinutes(detectedAt, 3),
          impactsThreeMinuteTarget: criticalPatients.length > 0,
          fallbackAction: 'Use the local intake snapshot and persistent in-app critical banner; do not block emergency read-only workflow.',
          recommendedFix: 'Check backend central-node route, websocket/event sync, API base URL, and authentication token health.',
        },
        detectedAt,
      ),
    );
  }

  if (input.aiCopilotContext && input.aiCopilotContext.enabled === false) {
    events.push(
      bottleneck(
        {
          id: 'bn-saas-ai-chief-disabled',
          category: 'saas_backend',
          serviceName: 'AI Chief',
          source: 'CareDroidCentralNode.aiCopilotContext',
          severity: 'medium',
          title: 'AI Chief unavailable',
          description: 'AI Chief is disabled or unavailable for this department snapshot.',
          affectedWorkflow: 'Operational root cause summary',
          affectedDepartment: 'Emergency Department',
          ownerRole: 'charge_nurse',
          impactsThreeMinuteTarget: false,
          fallbackAction: 'Continue standard clinical workflow and manual triage; require clinician review for all decisions.',
          recommendedFix: 'Verify AI feature flag, provider configuration, and backend chat route health.',
        },
        detectedAt,
      ),
    );
  }

  if ((input.reassessmentStatus?.overdue || 0) > 0) {
    const overdue = input.reassessmentStatus?.overdue || 0;
    events.push(
      bottleneck(
        {
          id: 'bn-clinical-reassessment-overdue',
          category: 'clinical_workflow',
          serviceName: 'Alert Engine',
          source: 'CareDroidCentralNode.reassessmentStatus',
          severity: overdue >= 2 ? 'critical' : 'high',
          title: 'Reassessment overdue',
          description: `${overdue} reassessment${overdue === 1 ? ' is' : 's are'} overdue.`,
          affectedWorkflow: 'Reassessment',
          affectedPatientId: criticalPatients[0]?.id,
          affectedDepartment: 'Emergency Department',
          ownerRole: 'registered_nurse',
          responseDeadline: plusMinutes(detectedAt, 3),
          impactsThreeMinuteTarget: true,
          fallbackAction: 'Assign bedside reassessment manually and document vitals before relying on automated reminders.',
          recommendedFix: 'Audit reassessment reminder acknowledgement and nurse coverage for the waiting/provider queues.',
        },
        detectedAt,
      ),
    );
  }

  const unacknowledgedCritical = activeAlerts.find(
    (alert) => alert.severity === 'Critical' && !alert.acknowledged,
  );
  if (unacknowledgedCritical) {
    events.push(
      bottleneck(
        {
          id: `bn-alert-unacknowledged-${unacknowledgedCritical.id}`,
          category: 'clinical_workflow',
          serviceName: 'Clinical Alerts API',
          source: unacknowledgedCritical.source || 'operationalAlerts',
          severity: 'critical',
          title: 'Critical alert unacknowledged',
          description: `${unacknowledgedCritical.title}: ${unacknowledgedCritical.message}`,
          affectedWorkflow: 'Critical alert acknowledgement',
          affectedPatientId: unacknowledgedCritical.patientId,
          affectedDepartment: 'Emergency Department',
          ownerRole: 'charge_nurse',
          responseDeadline: plusMinutes(detectedAt, 3),
          impactsThreeMinuteTarget: true,
          fallbackAction: 'Show persistent in-app banner and require manual call/page if notification delivery is uncertain.',
          recommendedFix: 'Check notification delivery, role assignment, and alert acknowledgement workflow.',
        },
        detectedAt,
      ),
    );
  }

  if ((input.referralStatus?.pending || 0) >= 3) {
    events.push(
      bottleneck(
        {
          id: 'bn-interoperability-referral-backlog',
          category: 'interoperability',
          serviceName: 'EHR/FHIR Sync',
          source: 'CareDroidCentralNode.referralStatus',
          severity: 'high',
          title: 'Referral handoff backlog',
          description: `${input.referralStatus?.pending || 0} referrals are pending acknowledgement or closure.`,
          affectedWorkflow: 'Referral and external handoff',
          affectedDepartment: 'Emergency Department',
          ownerRole: 'specialist',
          responseDeadline: plusMinutes(detectedAt, 10),
          impactsThreeMinuteTarget: criticalPatients.length > 0,
          fallbackAction: 'Use local referral snapshot, call receiving service, and mark external data unavailable if sync is delayed.',
          recommendedFix: 'Review referral acknowledgement route, patient identifiers, and receiving-service integration status.',
        },
        detectedAt,
      ),
    );
  }

  return events.sort(
    (a, b) =>
      Number(b.impactsThreeMinuteTarget) - Number(a.impactsThreeMinuteTarget) ||
      severityRank(b.severity) - severityRank(a.severity) ||
      a.title.localeCompare(b.title),
  );
}

export function buildServiceHealth(events: BottleneckEvent[], generatedAt: string): ServiceHealth[] {
  const serviceNames = new Set([
    ...CURRENT_SERVICE_MAP.map((entry) => entry.serviceName),
    ...events.map((event) => event.serviceName),
  ]);

  return Array.from(serviceNames).map((serviceName) => {
    const currentBottlenecks = events.filter((event) => event.serviceName === serviceName);
    const worst = currentBottlenecks[0]?.severity;
    const status: ServiceHealthStatus =
      worst === 'critical' ? 'down' : worst === 'high' || worst === 'medium' ? 'degraded' : 'healthy';
    const serviceMapEntry = CURRENT_SERVICE_MAP.find((entry) => entry.serviceName === serviceName);
    return {
      serviceName,
      status,
      latencyMs: currentBottlenecks.length ? (worst === 'critical' ? 5000 : 1800) : 120,
      errorRate: currentBottlenecks.length ? (worst === 'critical' ? 0.4 : 0.12) : 0.01,
      lastCheckedAt: generatedAt,
      dependencies: SERVICE_DEPENDENCIES[serviceName] || serviceMapEntry?.dependencies || [],
      affectsCriticalWorkflow:
        Boolean(serviceMapEntry?.affectsThreeMinuteLoop) ||
        currentBottlenecks.some((event) => event.impactsThreeMinuteTarget),
      fallbackAvailable: currentBottlenecks.every((event) => Boolean(event.fallbackAction)),
      currentBottlenecks,
    };
  });
}

export function buildThreeMinuteRiskProjection(events: BottleneckEvent[]): ThreeMinuteRiskProjection {
  const impacting = events.filter((event) => event.impactsThreeMinuteTarget);
  const critical = impacting.filter((event) => event.severity === 'critical');
  const high = impacting.filter((event) => event.severity === 'high');
  const primary = critical[0] || high[0] || impacting[0] || events[0];
  const status =
    critical.length > 0 ? 'breach_likely' : high.length > 0 || impacting.length > 0 ? 'at_risk' : 'on_track';

  return {
    status,
    criticalBottlenecks: critical.length,
    highRiskPatientsAffected: new Set(impacting.map((event) => event.affectedPatientId).filter(Boolean)).size,
    nextOwnerRole: primary?.ownerRole || 'charge_nurse',
    fallbackAction: primary?.fallbackAction || 'Continue standard clinical workflow and monitor service health.',
    summary:
      status === 'on_track'
        ? 'No active bottleneck is projected to breach the three-minute response target.'
        : `${primary?.title || 'Bottleneck'} is ${status === 'breach_likely' ? 'likely to breach' : 'putting'} the three-minute target at risk.`,
  };
}

export function buildBottleneckRegistrySnapshot(
  input: BuildBottleneckRegistryInput = {},
): BottleneckRegistrySnapshot {
  const generatedAt = input.generatedAt || new Date().toISOString();
  const activeBottlenecks = detectBottleneckEvents({ ...input, generatedAt });
  const serviceHealth = buildServiceHealth(activeBottlenecks, generatedAt);
  const threeMinuteRiskProjection = buildThreeMinuteRiskProjection(activeBottlenecks);
  const criticalCount = activeBottlenecks.filter((event) => event.severity === 'critical').length;
  const latencyValues = serviceHealth
    .map((service) => service.latencyMs || 0)
    .filter((value) => value > 0);

  return {
    generatedAt,
    currentServiceMap: [...CURRENT_SERVICE_MAP],
    activeBottlenecks,
    serviceHealth,
    threeMinuteRiskProjection,
    rootCauseSummary: activeBottlenecks.length
      ? activeBottlenecks
          .slice(0, 3)
          .map((event) => `${event.serviceName}: ${event.title}`)
          .join(' | ')
      : 'No active service or workflow bottlenecks detected.',
    analytics: {
      activeCount: activeBottlenecks.length,
      criticalCount,
      averageServiceLatencyMs: latencyValues.length
        ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
        : 0,
      threeMinuteTargetBreachesByCause: activeBottlenecks.reduce<Record<string, number>>((acc, event) => {
        if (event.impactsThreeMinuteTarget) {
          acc[event.category] = (acc[event.category] || 0) + 1;
        }
        return acc;
      }, {}),
    },
  };
}

export function bottleneckEventsToAlerts(events: BottleneckEvent[], previousAlerts: Alert[] = []): Alert[] {
  return events
    .filter((event) => event.impactsThreeMinuteTarget || event.severity === 'critical' || event.severity === 'high')
    .map((event): Alert => {
      const previous = previousAlerts.find((alert) => alert.id === `alert-bottleneck-event-${event.id}`);
      return {
        id: `alert-bottleneck-event-${event.id}`,
        type: 'Bottleneck',
        severity: alertSeverityFromBottleneck(event.severity),
        title: event.title,
        message: `${event.description} Fallback: ${event.fallbackAction}`,
        patientId: event.affectedPatientId,
        actionLabel: 'Review Bottleneck',
        actionType: 'OPEN_BOTTLENECK',
        createdAt: previous?.createdAt || event.detectedAt,
        dismissed: previous?.dismissed ?? false,
        dismissedAt: previous?.dismissedAt,
        acknowledged: previous?.acknowledged,
        acknowledgedAt: previous?.acknowledgedAt,
        source: event.source,
        autoDismissAfter: event.severity === 'critical' ? undefined : 10,
        metadata: {
          bottleneckId: event.id,
          category: event.category,
          serviceName: event.serviceName,
          ownerRole: event.ownerRole,
          responseDeadline: event.responseDeadline,
          impactsThreeMinuteTarget: event.impactsThreeMinuteTarget,
        },
      };
    });
}
