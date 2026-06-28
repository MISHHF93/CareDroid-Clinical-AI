import type { Alert, CapacitySnapshot } from '../types/emergency';
import {
  getCanonicalRoleMapping,
  resolveHospitalRole,
} from '../lib/users/canonicalAccess';
import type { HospitalRole } from '../lib/users/userTypes';

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
  owningDepartment?: string;
  owningSite?: string;
  backupRole?: string;
  escalationChain?: readonly string[];
  acknowledgementAuthority?: readonly string[];
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

export type ExistingServiceBottleneckSignals = {
  emergencyOperatingSystem?: Record<string, unknown>;
  flowEngine?: {
    detections?: readonly Record<string, unknown>[];
    nextRecommendedActions?: readonly Record<string, unknown>[];
  };
  escalationDashboard?: {
    escalations?: readonly Record<string, unknown>[];
    recommendations?: readonly Record<string, unknown>[];
  };
  queueDashboard?: {
    bottlenecks?: readonly Record<string, unknown>[];
    recommendations?: readonly Record<string, unknown>[];
  };
  capacityDashboard?: {
    score?: number;
    riskLevel?: string;
    recommendations?: readonly Record<string, unknown>[];
  };
  reassessmentDashboard?: {
    queue?: {
      items?: readonly Record<string, unknown>[];
    };
    metrics?: Record<string, unknown>;
  };
  referralDashboard?: {
    delays?: readonly Record<string, unknown>[];
    metrics?: Record<string, unknown>;
  };
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
  existingServiceSignals?: ExistingServiceBottleneckSignals;
};

const ALERT_BACKUP_ROLES: Readonly<Partial<Record<HospitalRole, HospitalRole>>> = Object.freeze({
  triage_nurse: 'charge_nurse',
  registered_nurse: 'charge_nurse',
  charge_nurse: 'emergency_physician',
  emergency_physician: 'attending_physician',
  attending_physician: 'ed_director',
  patient_flow_coordinator: 'charge_nurse',
  lab_technician: 'patient_flow_coordinator',
  radiology_technician: 'patient_flow_coordinator',
  pharmacist: 'emergency_physician',
  specialist: 'emergency_physician',
  security_officer: 'charge_nurse',
  it_admin: 'hospital_admin',
});

function canonicalAlertOwnership(input: {
  ownerRole?: string;
  ownerUserId?: string;
  affectedDepartment?: string;
  owningDepartment?: string;
  owningSite?: string;
  responseDeadline?: string;
}) {
  const hospitalRole = resolveHospitalRole(input.ownerRole || 'charge_nurse');
  const mapping = getCanonicalRoleMapping(hospitalRole);
  const backupRole = ALERT_BACKUP_ROLES[hospitalRole] || mapping.hospitalRole;
  const escalationRole = ALERT_BACKUP_ROLES[backupRole] || 'ed_director';
  return {
    ownerRole: mapping.hospitalRole,
    ownerUserId: input.ownerUserId,
    owningDepartment: input.owningDepartment || input.affectedDepartment || 'Emergency Department',
    owningSite: input.owningSite || 'site-central-city',
    backupRole,
    escalationChain: Object.freeze([mapping.hospitalRole, backupRole, escalationRole]),
    acknowledgementAuthority: Object.freeze([mapping.hospitalRole, backupRole]),
    responseDeadline: input.responseDeadline,
  };
}

export const CURRENT_SERVICE_MAP: readonly CurrentServiceMapEntry[] = Object.freeze([
  {
    serviceName: 'Emergency Operating System Service',
    filePath: 'src/services/emergencyOperatingSystemService.ts',
    purpose: 'Composes the ED SaaS service backbone: intake, queue, flow, escalation, capacity, EMS, reassessment, referral, resource, analytics, automation, and copilot signals.',
    inputs: ['workspace automations', 'demo/live ED service outputs', 'patient journey state'],
    outputs: ['operating system dashboard', 'leadership summary', 'service-specific dashboards'],
    dependencies: [
      'EmergencyFlowEngineService',
      'EmergencyEscalationEngineService',
      'QueueIntelligenceService',
      'EmergencyCapacityIntelligenceService',
      'EmergencyIntakeOperatingSystemService',
    ],
    consumers: ['Emergency OS route', 'workspace dashboards', 'analytics/command surfaces'],
    failureModes: ['downstream service demo/live source mismatch', 'stale composed dashboard'],
    latencyRisks: ['composed dashboard aggregation across many services'],
    duplicationConflicts: ['must remain the composition layer instead of duplicating child service logic'],
    affectsThreeMinuteLoop: true,
  },
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
    serviceName: 'Emergency Flow Engine Service',
    filePath: 'src/services/emergencyFlowEngineService.ts',
    purpose: 'Detects stalled patients, delayed referrals, delayed reassessments, queue bottlenecks, excessive waits, and boarding pressure.',
    inputs: ['demo/live patient flow', 'queue dashboard', 'referral dashboard', 'reassessment dashboard', 'boarding dashboard', 'capacity dashboard'],
    outputs: ['flow detections', 'stage metrics', 'next recommended actions'],
    dependencies: ['QueueAssignment', 'ReferralHub', 'ReassessmentAutomationService', 'BoardingIntelligenceEngine', 'EmergencyCapacityIntelligenceService'],
    consumers: ['EmergencyOperatingSystemService', 'flow screens', 'bottleneck registry adapter'],
    failureModes: ['demo defaults mistaken for live state', 'stale patient journey stage'],
    latencyRisks: ['local synchronous patient-flow scan'],
    duplicationConflicts: ['overlaps with queue/alert derivations if not normalized'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Emergency Escalation Engine Service',
    filePath: 'src/services/emergencyEscalationEngineService.ts',
    purpose: 'Escalates capacity, boarding, EMS congestion, high-risk queue growth, and critical device outage risks.',
    inputs: ['capacity dashboard', 'boarding dashboard', 'EMS offload dashboard', 'queue dashboard', 'resource board'],
    outputs: ['active escalations', 'escalation metrics', 'recommendations'],
    dependencies: ['EmergencyCapacityIntelligenceService', 'BoardingIntelligenceEngine', 'EmsOffloadCommandCenterService', 'QueueIntelligenceService', 'EmergencyResourceBoardService'],
    consumers: ['EmergencyOperatingSystemService', 'command/escalation surfaces', 'bottleneck registry adapter'],
    failureModes: ['dependency dashboard stale', 'critical device state missing'],
    latencyRisks: ['local synchronous aggregation'],
    duplicationConflicts: ['overlaps with operational alert engine if not deduped'],
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
    serviceName: 'Emergency Intake Operating System Service',
    filePath: 'src/services/emergencyIntakeOperatingSystemService.ts',
    purpose: 'Coordinates arrival/intake automation, registration completion, smart arrival, and triage-ready handoff state.',
    inputs: ['intake artifacts', 'patient answers', 'registration state', 'automation feed'],
    outputs: ['intake command center', 'smart arrival snapshot', 'triage-ready state'],
    dependencies: ['smart intake services', 'reception intake bridge', 'arrival control layer'],
    consumers: ['EmergencyOperatingSystemService', 'intake surfaces'],
    failureModes: ['incomplete intake packet', 'triage handoff not acknowledged'],
    latencyRisks: ['manual registration completion delay'],
    duplicationConflicts: ['reception/intake bridge can overlap with central patient intake state'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Reassessment Automation Service',
    filePath: 'src/services/reassessmentAutomationService.ts',
    purpose: 'Builds reassessment queues and recommended reassessment actions.',
    inputs: ['patient wait/vitals state', 'reassessment rules'],
    outputs: ['reassessment dashboard', 'queue items', 'recommended actions'],
    dependencies: ['ReassessmentEngine'],
    consumers: ['EmergencyFlowEngineService', 'EmergencyOperatingSystemService', 'central node reassessment status'],
    failureModes: ['overdue reassessment not acknowledged', 'patient risk not updated'],
    latencyRisks: ['manual bedside reassessment delay'],
    duplicationConflicts: ['alert engine also derives reassessment alerts'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Referral Hub',
    filePath: 'src/services/referralHub.ts',
    purpose: 'Tracks referral delays, acknowledgement, and external handoff state.',
    inputs: ['referral records', 'specialty/department status'],
    outputs: ['referral dashboard', 'delayed referrals', 'handoff recommendations'],
    dependencies: ['referral workflow data'],
    consumers: ['EmergencyFlowEngineService', 'EmergencyOperatingSystemService', 'central node referral status'],
    failureModes: ['external handoff unacknowledged', 'specialty owner unavailable'],
    latencyRisks: ['external receiving-service delay'],
    duplicationConflicts: ['EHR/FHIR sync and local referral snapshot can diverge'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Boarding Intelligence Engine',
    filePath: 'src/services/boardingIntelligenceEngine.ts',
    purpose: 'Scores boarding pressure and inpatient bed-management blockers.',
    inputs: ['boarding patients', 'pending beds', 'bed pressure state'],
    outputs: ['boarding dashboard', 'boarding score', 'boarding recommendations'],
    dependencies: ['boarding signals'],
    consumers: ['EmergencyFlowEngineService', 'EmergencyEscalationEngineService', 'EmergencyOperatingSystemService'],
    failureModes: ['pending bed state stale', 'longest boarder not escalated'],
    latencyRisks: ['inpatient handoff/bed assignment delay'],
    duplicationConflicts: ['capacity service also scores boarding pressure'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'EMS Offload Command Center Service',
    filePath: 'src/services/emsOffloadCommandCenterService.ts',
    purpose: 'Tracks EMS handoff pressure, offload delays, and incoming ambulance congestion.',
    inputs: ['EMS arrivals', 'handoff state', 'room readiness'],
    outputs: ['EMS offload dashboard', 'pressure metrics', 'recommendations'],
    dependencies: ['emsOffloadTracker', 'pre-arrival services'],
    consumers: ['EmergencyEscalationEngineService', 'EmergencyOperatingSystemService'],
    failureModes: ['handoff owner missing', 'incoming ETA stale'],
    latencyRisks: ['EMS-to-bed handoff delay'],
    duplicationConflicts: ['EMS pre-arrival pipeline and offload tracker can overlap'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Emergency Resource Board Service',
    filePath: 'src/services/emergencyResourceBoardService.ts',
    purpose: 'Surfaces resource/device shortages that can block ED flow.',
    inputs: ['room/device/resource availability'],
    outputs: ['resource board', 'shortages', 'resource metrics'],
    dependencies: ['resource inventory state'],
    consumers: ['EmergencyEscalationEngineService', 'EmergencyOperatingSystemService'],
    failureModes: ['critical device shortage not visible', 'resource turnover stale'],
    latencyRisks: ['manual device/room turnover delay'],
    duplicationConflicts: ['capacity model may partially count room pressure'],
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
    serviceName: 'Patient Management API',
    filePath: 'src/services/patientManagementApi.ts',
    purpose: 'Frontend patient management API boundary.',
    inputs: ['patient API requests', 'patient identifiers'],
    outputs: ['patient records and mutations'],
    dependencies: ['apiClient'],
    consumers: ['patient management surfaces'],
    failureModes: ['patient API unavailable', 'mutation rejected'],
    latencyRisks: ['patient fetch/update round trip'],
    duplicationConflicts: ['local emergency store may temporarily diverge'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Emergency Analytics API',
    filePath: 'src/services/emergencyAnalyticsApi.ts',
    purpose: 'Reads ED analytics and reporting payloads.',
    inputs: ['analytics route requests', 'date/department filters'],
    outputs: ['operational analytics and reporting data'],
    dependencies: ['apiClient'],
    consumers: ['EmergencyAnalytics'],
    failureModes: ['analytics endpoint unavailable', 'report data stale'],
    latencyRisks: ['analytics query latency'],
    duplicationConflicts: ['local central-node analytics can differ from backend analytics'],
    affectsThreeMinuteLoop: false,
  },
  {
    serviceName: 'Emergency Staffing API',
    filePath: 'src/services/emergencyStaffingApi.ts',
    purpose: 'Provides staff routing and staffing state for emergency operations.',
    inputs: ['staffing API requests', 'department identifiers'],
    outputs: ['staff assignments and availability'],
    dependencies: ['apiClient'],
    consumers: ['emergency staffing/command surfaces'],
    failureModes: ['staff API unavailable', 'assignment state stale'],
    latencyRisks: ['staff routing round trip'],
    duplicationConflicts: ['local staff state may diverge from backend'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Config Service',
    filePath: 'src/services/configService.ts',
    purpose: 'Reads and normalizes frontend configuration.',
    inputs: ['environment/config values'],
    outputs: ['runtime config'],
    dependencies: ['env/app config'],
    consumers: ['frontend service clients and feature gates'],
    failureModes: ['bad env value', 'missing endpoint'],
    latencyRisks: ['none significant'],
    duplicationConflicts: ['multiple config files must stay consistent'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'User Identity API',
    filePath: 'src/services/userIdentityApi.ts',
    purpose: 'Frontend user identity and profile API boundary.',
    inputs: ['identity route requests', 'auth/session context'],
    outputs: ['user identity/profile payloads'],
    dependencies: ['apiClient', 'auth config'],
    consumers: ['identity/profile surfaces'],
    failureModes: ['auth failure', 'profile fetch unavailable'],
    latencyRisks: ['identity round trip'],
    duplicationConflicts: ['backend auth/users modules own source of truth'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'System Health Service',
    filePath: 'src/services/systemHealthService.ts',
    purpose: 'Frontend system health probe/read model.',
    inputs: ['health checks', 'runtime/service status'],
    outputs: ['system health state'],
    dependencies: ['platform health routes'],
    consumers: ['health/status surfaces'],
    failureModes: ['probe unavailable', 'false healthy/degraded state'],
    latencyRisks: ['health probe timeout'],
    duplicationConflicts: ['SaaS Health API also reports health'],
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
  {
    serviceName: 'Backend Auth Service',
    filePath: 'backend/src/modules/auth/auth.service.ts',
    purpose: 'Backend authentication, token, and access-control service.',
    inputs: ['login/register/token requests', 'provider identity'],
    outputs: ['JWT/session identity', 'authorization context'],
    dependencies: ['users service', 'identity provider registry', 'two-factor/biometric services'],
    consumers: ['backend auth controller', 'protected API modules'],
    failureModes: ['token invalid', 'provider unavailable', 'permission denial'],
    latencyRisks: ['identity provider and token validation latency'],
    duplicationConflicts: ['frontend auth config must match backend contract'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Backend Users Service',
    filePath: 'backend/src/modules/users/users.service.ts',
    purpose: 'Backend user account and profile service.',
    inputs: ['user queries/mutations'],
    outputs: ['user entities and profile state'],
    dependencies: ['database repositories'],
    consumers: ['auth module', 'profile/workspace modules'],
    failureModes: ['user lookup fails', 'profile stale'],
    latencyRisks: ['database query latency'],
    duplicationConflicts: ['frontend identity cache can diverge'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Backend Clinical Alerts Service',
    filePath: 'backend/src/modules/clinical-alerts/clinical-alerts.service.ts',
    purpose: 'Backend clinical alert lifecycle and acknowledgement service.',
    inputs: ['clinical alert queries', 'acknowledgement requests'],
    outputs: ['clinical alerts', 'acknowledgement state'],
    dependencies: ['database repositories', 'auth context'],
    consumers: ['clinical alerts controller', 'ClinicalAlertsApi'],
    failureModes: ['acknowledgement write fails', 'alert query unavailable'],
    latencyRisks: ['database/API round trip'],
    duplicationConflicts: ['frontend/store operational alerts are separate'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Backend Emergency OS Operational Intelligence Service',
    filePath: 'backend/src/modules/emergency-os/emergency-os.operational-intelligence.service.ts',
    purpose: 'Backend operational intelligence for emergency OS workflows.',
    inputs: ['emergency OS state', 'patient/arrival/queue signals'],
    outputs: ['operational intelligence payloads'],
    dependencies: ['emergency OS services', 'patient arrival sync', 'clinical decision support'],
    consumers: ['emergency OS API/controllers', 'frontend operational intelligence'],
    failureModes: ['backend intelligence unavailable', 'state projection stale'],
    latencyRisks: ['backend aggregation latency'],
    duplicationConflicts: ['frontend operational intelligence can overlap'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Backend Analytics Service',
    filePath: 'backend/src/modules/analytics/services/analytics.service.ts',
    purpose: 'Backend analytics event and reporting service.',
    inputs: ['analytics events', 'reporting queries'],
    outputs: ['analytics records and reports'],
    dependencies: ['database/event store'],
    consumers: ['analytics controller', 'EmergencyAnalyticsApi'],
    failureModes: ['event write/query unavailable'],
    latencyRisks: ['report query latency'],
    duplicationConflicts: ['frontend local analytics summaries can differ'],
    affectsThreeMinuteLoop: false,
  },
  {
    serviceName: 'Backend Interoperability Integration Hub Service',
    filePath: 'backend/src/modules/interoperability/integration-hub.service.ts',
    purpose: 'Backend integration hub for external systems and automation routing.',
    inputs: ['integration requests/events'],
    outputs: ['integration status, events, routed automation'],
    dependencies: ['external systems', 'integration event registry'],
    consumers: ['interoperability controllers/modules'],
    failureModes: ['external system timeout', 'routing failure'],
    latencyRisks: ['external EHR/lab/radiology latency'],
    duplicationConflicts: ['frontend interoperability readiness is only a view'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Triage Assist Service',
    filePath: 'src/services/triageAssist.ts',
    purpose: 'Builds client-side triage assist envelopes from patient records and operational context, then optionally enriches them via native AI bridge or backend endpoint.',
    inputs: ['patient record', 'all patients list', 'arrival reason', 'complaint category', 'handoff source'],
    outputs: ['TriageAssistEnvelope (acuity, flags, recommendations)', 'null on backend failure'],
    dependencies: ['emergencyOsApi.postTriageAssist', 'nativeAiTriageBridge', 'lib/patient-orchestration', 'backendApiCapabilities'],
    consumers: ['triage surfaces', 'patient detail feature', 'arrival/triage handoff flows'],
    failureModes: ['backend triage-assist capability disabled', 'native AI bridge unavailable', 'malformed patient record'],
    latencyRisks: ['backend enrichment round trip', 'native AI inference delay'],
    duplicationConflicts: ['nativeAiTriageBridge also enriches triage — Triage Assist is the composition layer'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Waiting Room Deterioration Watch',
    filePath: 'src/services/waitingRoomDeteriorationWatch.ts',
    purpose: 'Derives per-patient deterioration watch level (none/watch/review-needed/urgent-review) from overdue vitals, reassessment delays, high-risk complaint flags, and EMS intake observation. Advisory only — staff review always required.',
    inputs: ['patient', 'all patients', 'EMS arrivals', 'now', 'vitalsStaleMinutes threshold'],
    outputs: ['DeteriorationWatchSnapshot (watchActive, level, tone, factors, staffDetail)'],
    dependencies: ['arrivalControlLayer', 'highRiskComplaintFlags', 'ambulanceHandoffChecklist', 'reassessmentTimerEngine', 'reassessmentScheduler'],
    consumers: ['waiting room surfaces', 'patient list risk overlays', 'clinical alerts derivation'],
    failureModes: ['stale vital times', 'missing patient flags', 'advisory dismissed without clinical review'],
    latencyRisks: ['none significant; local synchronous derivation'],
    duplicationConflicts: ['overlaps with reassessmentAutomationService overdue signals — use this for per-patient watch, use reassessmentAutomationService for bulk overdue counts'],
    affectsThreeMinuteLoop: true,
  },
  {
    serviceName: 'Automation Engine',
    filePath: 'src/services/automationEngine.ts',
    purpose: 'Evaluates and executes workspace automation rules, gating execution on subscription tier, human review availability, and integration conditions. Logs all execution attempts to the audit trail.',
    inputs: ['automation ID', 'execution context (subscription tier, humanReviewAvailable, integrations)'],
    outputs: ['execution result (blocked/succeeded/failed)', 'audit log event'],
    dependencies: ['automationRegistry', 'automationAuditTrail', 'automationAuditLogger'],
    consumers: ['workspace automation surfaces', 'ED automation marketplace', 'escalation automation triggers'],
    failureModes: ['automation not found', 'subscription tier mismatch', 'human review unavailable', 'integration condition unmet'],
    latencyRisks: ['audit write latency', 'blocked automations accumulate without clearing'],
    duplicationConflicts: ['edAutomationMarketplace also triggers automations — Automation Engine is the execution layer, marketplace is the catalog'],
    affectsThreeMinuteLoop: true,
  },
]);

const SERVICE_DEPENDENCIES: Record<string, string[]> = Object.freeze({
  'AI Chief': ['API Client', 'CareDroid Central Node', 'Operational Intelligence'],
  'API Client': ['Backend API', 'Auth/session', 'Tenant context'],
  'CareDroid Central Node': ['Emergency store', 'Backend snapshot', 'Websocket sync'],
  'Clinical Alerts API': ['API Client', 'Backend alerts'],
  'Emergency Escalation Engine Service': [
    'Emergency Capacity Intelligence Service',
    'Boarding Intelligence Engine',
    'EMS Offload Command Center Service',
    'Queue Intelligence Service',
    'Emergency Resource Board Service',
  ],
  'Emergency Flow Engine Service': [
    'Queue Intelligence Service',
    'Referral Hub',
    'Reassessment Automation Service',
    'Boarding Intelligence Engine',
    'Emergency Capacity Intelligence Service',
  ],
  'Emergency Operating System Service': [
    'Emergency Flow Engine Service',
    'Emergency Escalation Engine Service',
    'Queue Intelligence Service',
    'Emergency Capacity Intelligence Service',
    'Emergency Intake Operating System Service',
  ],
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
  const ownership = canonicalAlertOwnership(input);
  return {
    ...input,
    ...ownership,
    detectedAt,
    status: 'active',
  };
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeBottleneckSeverity(value: unknown): BottleneckSeverity {
  const severity = String(value || '').toLowerCase();
  if (severity === 'critical') return 'critical';
  if (severity === 'urgent' || severity === 'high') return 'high';
  if (severity === 'watch' || severity === 'low') return 'low';
  return 'medium';
}

function dedupeBottleneckEvents(events: BottleneckEvent[]): BottleneckEvent[] {
  const byId = new Map<string, BottleneckEvent>();
  events.forEach((event) => {
    const existing = byId.get(event.id);
    if (!existing || severityRank(event.severity) > severityRank(existing.severity)) {
      byId.set(event.id, event);
    }
  });
  return Array.from(byId.values());
}

function flowStageOwner(stage: string): string {
  const normalized = stage.toLowerCase();
  if (normalized.includes('triage')) return 'triage_nurse';
  if (normalized.includes('referral') || normalized.includes('disposition')) return 'specialist';
  if (normalized.includes('reassessment') || normalized.includes('waiting')) return 'registered_nurse';
  return 'charge_nurse';
}

function adaptFlowEngineDetections(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  return (signals.flowEngine?.detections || []).map((detection) => {
    const id = readString(detection.id, readString(detection.title, 'flow-detection'));
    const stage = readString(detection.stage, 'Emergency flow');
    const severity = normalizeBottleneckSeverity(detection.severity);
    return bottleneck(
      {
        id: `bn-flow-engine-${id}`,
        category: 'clinical_workflow',
        serviceName: 'Emergency Flow Engine Service',
        source: 'EmergencyFlowEngineService.getFlowEngine',
        severity,
        title: readString(detection.title, `${stage} flow delay`),
        description: readString(detection.reason, 'Emergency flow engine detected a workflow delay.'),
        affectedWorkflow: stage,
        affectedPatientId: readString(detection.patientId) || undefined,
        affectedDepartment: 'Emergency Department',
        ownerRole: flowStageOwner(stage),
        responseDeadline: plusMinutes(detectedAt, severity === 'critical' || severity === 'high' ? 3 : 10),
        impactsThreeMinuteTarget: severity === 'critical' || severity === 'high',
        fallbackAction: readString(
          detection.nextRecommendedAction,
          'Assign a human workflow owner and document the next care step manually.',
        ),
        recommendedFix: 'Use the existing Emergency Flow Engine next action before adding any new workflow logic.',
      },
      detectedAt,
    );
  });
}

function adaptEscalationEngineSignals(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  return (signals.escalationDashboard?.escalations || []).map((escalation) => {
    const id = readString(escalation.id, readString(escalation.trigger, 'escalation'));
    const severity = normalizeBottleneckSeverity(escalation.severity);
    return bottleneck(
      {
        id: `bn-escalation-engine-${id}`,
        category: 'operational',
        serviceName: 'Emergency Escalation Engine Service',
        source: 'EmergencyEscalationEngineService.getEscalationDashboard',
        severity,
        title: readString(escalation.trigger, 'Operational escalation'),
        description: readString(escalation.reason, 'Emergency escalation engine detected operational risk.'),
        affectedWorkflow: readString(escalation.affectedWorkflow, 'Emergency operations'),
        affectedDepartment: 'Emergency Department',
        ownerRole: 'charge_nurse',
        responseDeadline: plusMinutes(detectedAt, severity === 'critical' || severity === 'high' ? 3 : 10),
        impactsThreeMinuteTarget: severity === 'critical' || severity === 'high',
        fallbackAction: readString(
          escalation.recommendedAction,
          'Open command huddle and assign an accountable operational owner.',
        ),
        recommendedFix: 'Resolve the existing escalation engine dependency before adding replacement escalation logic.',
      },
      detectedAt,
    );
  });
}

function adaptQueueDashboardSignals(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  return (signals.queueDashboard?.bottlenecks || []).map((queue) => {
    const id = readString(queue.queueId, readString(queue.id, readString(queue.label, 'queue')));
    const severity = normalizeBottleneckSeverity(queue.severity);
    return bottleneck(
      {
        id: `bn-queue-service-${id}`,
        category: 'clinical_workflow',
        serviceName: 'Queue Intelligence Service',
        source: 'QueueIntelligenceService.getQueueDashboard',
        severity,
        title: `${readString(queue.label, 'Queue')} bottleneck`,
        description: readString(queue.reason, 'Queue intelligence detected an overloaded queue.'),
        affectedWorkflow: readString(queue.label, 'Queue flow'),
        affectedDepartment: 'Emergency Department',
        ownerRole: 'charge_nurse',
        responseDeadline: plusMinutes(detectedAt, severity === 'critical' || severity === 'high' ? 3 : 10),
        impactsThreeMinuteTarget: severity === 'critical' || severity === 'high',
        fallbackAction: 'Use the existing queue recommendation, assign a queue owner, and pull highest-risk oldest waits forward.',
        recommendedFix: 'Reuse Queue Intelligence queue recommendations and align central queue schema to that service.',
      },
      detectedAt,
    );
  });
}

function adaptCapacityDashboardSignals(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  const dashboard = signals.capacityDashboard;
  if (!dashboard || readNumber(dashboard.score) < 75) return [];
  const severity = readNumber(dashboard.score) >= 85 ? 'critical' : 'high';
  return [
    bottleneck(
      {
        id: 'bn-capacity-service-dashboard',
        category: 'operational',
        serviceName: 'Emergency Capacity Intelligence Service',
        source: 'EmergencyCapacityIntelligenceService.getCapacityDashboard',
        severity,
        title: 'Capacity dashboard pressure',
        description: `Existing capacity service reports score ${dashboard.score} with ${dashboard.riskLevel || 'elevated'} risk.`,
        affectedWorkflow: 'Capacity and provider throughput',
        affectedDepartment: 'Emergency Department',
        ownerRole: 'patient_flow_coordinator',
        responseDeadline: plusMinutes(detectedAt, 3),
        impactsThreeMinuteTarget: true,
        fallbackAction:
          readString(dashboard.recommendations?.[0]?.action) ||
          'Use existing capacity recommendations, escalate bed management, and protect urgent reassessment flow.',
        recommendedFix: 'Extend Emergency Capacity Intelligence Service thresholds rather than creating a parallel capacity scorer.',
      },
      detectedAt,
    ),
  ];
}

function adaptReassessmentSignals(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  return (signals.reassessmentDashboard?.queue?.items || []).map((item) => {
    const id = readString(item.patientId, readString(item.id, 'reassessment'));
    const severity = normalizeBottleneckSeverity(item.priority);
    return bottleneck(
      {
        id: `bn-reassessment-service-${id}`,
        category: 'clinical_workflow',
        serviceName: 'Reassessment Automation Service',
        source: 'ReassessmentAutomationService.getDashboard',
        severity,
        title: 'Existing reassessment queue item',
        description: readString(item.triggerReason, 'Reassessment automation service flagged a patient for review.'),
        affectedWorkflow: readString(item.currentLocation, 'Reassessment'),
        affectedPatientId: id,
        affectedDepartment: 'Emergency Department',
        ownerRole: 'registered_nurse',
        responseDeadline: plusMinutes(detectedAt, severity === 'critical' || severity === 'high' ? 3 : 10),
        impactsThreeMinuteTarget: severity === 'critical' || severity === 'high',
        fallbackAction: readString(
          item.recommendedAction,
          'Assign bedside reassessment manually and document vitals while automation is reviewed.',
        ),
        recommendedFix: 'Reuse reassessment automation queue state and alert only once through the bottleneck adapter.',
      },
      detectedAt,
    );
  });
}

function adaptReferralSignals(
  signals: ExistingServiceBottleneckSignals,
  detectedAt: string,
): BottleneckEvent[] {
  return (signals.referralDashboard?.delays || []).map((delay) => {
    const id = readString(delay.referralId, readString(delay.id, readString(delay.department, 'referral')));
    const severity = normalizeBottleneckSeverity(delay.priority);
    return bottleneck(
      {
        id: `bn-referral-service-${id}`,
        category: 'interoperability',
        serviceName: 'Referral Hub',
        source: 'ReferralHub.getReferralDashboard',
        severity,
        title: `${readString(delay.department, 'Referral')} delayed`,
        description: readString(delay.reason, 'Referral hub detected an external handoff delay.'),
        affectedWorkflow: 'Referral and external handoff',
        affectedPatientId: readString(delay.patientLabel) || undefined,
        affectedDepartment: 'Emergency Department',
        ownerRole: 'specialist',
        responseDeadline: plusMinutes(detectedAt, severity === 'critical' || severity === 'high' ? 3 : 10),
        impactsThreeMinuteTarget: severity === 'critical' || severity === 'high',
        fallbackAction: 'Use local referral snapshot, call receiving service, and mark external data unavailable if sync is delayed.',
        recommendedFix: 'Reuse Referral Hub delay state as the source of truth for referral bottlenecks.',
      },
      detectedAt,
    );
  });
}

export function adaptExistingServiceSignalsToBottlenecks(
  signals: ExistingServiceBottleneckSignals | undefined,
  detectedAt = new Date().toISOString(),
): BottleneckEvent[] {
  if (!signals) return [];
  return dedupeBottleneckEvents([
    ...adaptFlowEngineDetections(signals, detectedAt),
    ...adaptEscalationEngineSignals(signals, detectedAt),
    ...adaptQueueDashboardSignals(signals, detectedAt),
    ...adaptCapacityDashboardSignals(signals, detectedAt),
    ...adaptReassessmentSignals(signals, detectedAt),
    ...adaptReferralSignals(signals, detectedAt),
  ]);
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
          ownerRole: 'it_admin',
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

  events.push(...adaptExistingServiceSignalsToBottlenecks(input.existingServiceSignals, detectedAt));

  return dedupeBottleneckEvents(events).sort(
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
          ownerUserId: event.ownerUserId,
          owningDepartment: event.owningDepartment,
          owningSite: event.owningSite,
          backupRole: event.backupRole,
          escalationChain: event.escalationChain,
          acknowledgementAuthority: event.acknowledgementAuthority,
          responseDeadline: event.responseDeadline,
          impactsThreeMinuteTarget: event.impactsThreeMinuteTarget,
        } as any,
      };
    });
}
