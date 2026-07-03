import {
  buildCareDroidCentralNodeSnapshot,
  type CareDroidCentralNodeSource,
  type CareDroidScreenMode,
} from '../central-node/careDroidCentralNode';
import {
  AI_CHIEF_SAFETY_STATEMENT,
  type AiChiefDomainStatus,
  type AiChiefExplainableRecommendation,
  type AiChiefMonitoringDomain,
  type AiChiefMonitoringDomainStatus,
  type AiChiefOperationalRisk,
  type AiChiefPatientContextSummary,
} from '../config/aiChiefOrchestrationModel';
import { AI_CHIEF_ORCHESTRATOR_VERSION } from './aiChiefOrchestrator';
import { buildCommandCenterWorkflowActions } from '../config/operationalWorkflow.config';
import { buildBottleneckRegistrySnapshot } from './bottleneckRegistry';
import { buildHospitalOperatingSystemSnapshot } from './hospitalOperatingSystemService';
import { resolvePatientHospitalJourney } from './hospitalOperatingSystemService';
import {
  buildCareDroidOperationalIntelligenceSnapshot,
  resolveOperationalIntelligenceSettings,
} from '../operational-intelligence/careDroidOperationalIntelligence';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import { resolveWhatHappensNext } from './whatHappensNextGuidance';
import { CANONICAL_ROUTES } from '../config/routes.config';
import {
  PatientState,
  Priority,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
  type Staff,
} from '../types/emergency';

export type AiChiefOrchestrationSnapshot = Readonly<{
  generatedAt: string;
  orchestratorVersion: string;
  safety: typeof AI_CHIEF_SAFETY_STATEMENT;
  domainStatuses: readonly AiChiefMonitoringDomainStatus[];
  risks: readonly AiChiefOperationalRisk[];
  recommendations: readonly AiChiefExplainableRecommendation[];
  patientContexts: readonly AiChiefPatientContextSummary[];
  metrics: Readonly<{
    activePatients: number;
    p1p2Patients: number;
    inboundEms: number;
    criticalAlerts: number;
    unacknowledgedCriticalAlerts: number;
    capacityBand: string;
    threeMinuteBreaches: number;
    activeBottlenecks: number;
    degradedServices: number;
    reassessmentsDue: number;
    boardingPatients: number;
  }>;
}>;

type BuildAiChiefOrchestrationOptions = Readonly<{
  pathname?: string;
  screenMode?: CareDroidScreenMode;
  patients?: Patient[];
  staff?: Staff[];
  alerts?: Alert[];
  emsArrivals?: EMSArrival[];
  capacity?: CapacitySnapshot;
  referrals?: Referral[];
  workflowLogs?: Array<{ id: string; type: string; summary: string; timestamp: string; source: string }>;
  emergencySettings?: Record<string, unknown>;
  backendOperationalIntelligence?: OperationalIntelligenceSnapshot | null;
  selectedPatientId?: string | null;
  centralNodeSource?: Partial<CareDroidCentralNodeSource>;
}>;

const DEFAULT_CENTRAL_NODE_ROLE = Object.freeze({
  role: 'ed_manager',
  roleLabel: 'ED Manager',
  readOnly: false,
  allowedRoutes: [] as string[],
});

function buildCentralNodeSource(options: BuildAiChiefOrchestrationOptions): CareDroidCentralNodeSource {
  return {
    patients: options.patients ?? [],
    staff: options.staff ?? [],
    alerts: options.alerts ?? [],
    emsArrivals: options.emsArrivals ?? [],
    emsIncomingPatients: [],
    emsUnits: [],
    referrals: options.referrals ?? [],
    rooms: [],
    workflowLogs: options.workflowLogs ?? [],
    emergencySettings: (options.emergencySettings as CareDroidCentralNodeSource['emergencySettings']) ?? {},
    websocket: { connected: false, status: 'disconnected' },
    copilotMessages: [],
    integrationEvents: [],
    selectedPatientId: options.selectedPatientId ?? null,
    activeQueueFilter: null,
    whiteboardSearchQuery: '',
    loading: false,
    backendAvailable: false,
    capacity:
      options.capacity ??
      ({
        band: 'Green',
        score: 80,
        occupied: 0,
        total: 0,
      } as CapacitySnapshot),
    ...options.centralNodeSource,
  };
}

function toneToPriority(tone: string): AiChiefExplainableRecommendation['priority'] {
  if (tone === 'critical') return 'P0';
  if (tone === 'warning') return 'P1';
  if (tone === 'info') return 'P2';
  return 'P3';
}

function severityToTone(severity: string): AiChiefExplainableRecommendation['tone'] {
  if (severity === 'Critical' || severity === 'critical') return 'critical';
  if (severity === 'Warning' || severity === 'warning') return 'warning';
  if (severity === 'Info' || severity === 'info') return 'info';
  return 'neutral';
}

function buildPatientContexts(
  patients: Patient[],
  referrals: Referral[],
  staff: Staff[],
  selectedPatientId?: string | null,
): readonly AiChiefPatientContextSummary[] {
  const active = patients.filter(
    (patient) => patient.state !== PatientState.Discharge && patient.state !== PatientState.Deceased,
  );

  const prioritized = [...active].sort((left, right) => {
    const leftScore = left.priority === Priority.P1 ? 0 : left.priority === Priority.P2 ? 1 : 2;
    const rightScore = right.priority === Priority.P1 ? 0 : right.priority === Priority.P2 ? 1 : 2;
    return leftScore - rightScore;
  });

  const selected = selectedPatientId
    ? prioritized.find((patient) => patient.id === selectedPatientId)
    : null;
  const sample = selected
    ? [selected, ...prioritized.filter((patient) => patient.id !== selected.id)]
    : prioritized;

  return Object.freeze(
    sample.slice(0, 5).map((patient) => {
      const journey = resolvePatientHospitalJourney(patient, referrals);
      const next = resolveWhatHappensNext(patient, { referrals, staff });
      const riskSignals = [
        ...(patient.flags || []).map(String),
        ...(patient.vitalsAlerts || []).map((alert) => String(alert)),
      ].filter(Boolean);

      return Object.freeze({
        patientId: patient.id,
        label: patient.name || patient.id,
        phaseLabel: journey.phaseLabel,
        stageLabel: journey.stageLabel,
        priority: patient.priority,
        chiefComplaint: patient.chiefComplaint || 'Not documented',
        whatHappensNext: next?.shortLabel || next?.label || null,
        riskSignals: Object.freeze(riskSignals.slice(0, 6)),
        humanReviewRequired: true as const,
      });
    }),
  );
}

function mapWorkflowActions(
  actions: ReturnType<typeof buildCommandCenterWorkflowActions>,
): AiChiefExplainableRecommendation[] {
  return actions
    .filter((action) => action.active)
    .map((action) => {
      const domain: AiChiefMonitoringDomain =
        action.id === 'dispatch-echo-delta' || action.id === 'ed-readiness-overdue'
          ? 'ems_arrivals'
          : action.id === 'ack-critical-alerts'
            ? 'alerts'
            : action.id === 'clear-service-bottleneck'
              ? 'bottlenecks'
              : action.id === 'route-staff'
                ? 'staffing'
                : action.id === 'review-ai-chief'
                  ? 'clinical_workflow'
                  : 'operational_intelligence';

      return Object.freeze({
        id: `workflow-${action.id}`,
        domain,
        action: action.label,
        rationale: action.reason || action.nextAction,
        reasonCodes: Object.freeze([action.id, `count:${action.count}`]),
        confidence: 0.88,
        route: action.route,
        ownerRole: action.owner,
        priority: toneToPriority(action.tone),
        tone: action.tone === 'success' ? 'info' : action.tone,
        humanReviewRequired: true as const,
        advisoryOnly: true as const,
        modelOrRuleId: 'operational-workflow-v1',
      });
    });
}

function mapOperationalIntelligenceRecommendations(
  snapshot: OperationalIntelligenceSnapshot | null | undefined,
): AiChiefExplainableRecommendation[] {
  if (!snapshot?.recommendations?.length) return [];
  return snapshot.recommendations.slice(0, 8).map((recommendation) =>
    Object.freeze({
      id: recommendation.id,
      domain: 'operational_intelligence' as const,
      action: recommendation.action,
      rationale: recommendation.rationale,
      reasonCodes: Object.freeze(recommendation.reasonCodes || []),
      confidence: recommendation.confidence,
      route: recommendation.route,
      patientId: recommendation.patientId,
      ownerRole: 'ED manager',
      priority: recommendation.confidence >= 0.85 ? 'P1' : 'P2',
      tone: 'info' as const,
      humanReviewRequired: true as const,
      advisoryOnly: true as const,
      modelOrRuleId: recommendation.modelOrRuleId,
    }),
  );
}

function mapAnomaliesToRisks(
  snapshot: OperationalIntelligenceSnapshot | null | undefined,
): AiChiefOperationalRisk[] {
  if (!snapshot?.anomalies?.length) return [];
  return snapshot.anomalies.map((anomaly) =>
    Object.freeze({
      id: anomaly.id,
      domain: 'operational_intelligence' as const,
      title: anomaly.title,
      summary: anomaly.message,
      severity: severityToTone(anomaly.severity),
      reasonCodes: Object.freeze(anomaly.reasonCodes || []),
      humanReviewRequired: true as const,
    }),
  );
}

function mapBottleneckRisks(
  bottlenecks: ReturnType<typeof buildBottleneckRegistrySnapshot>,
): AiChiefOperationalRisk[] {
  return bottlenecks.activeBottlenecks.slice(0, 6).map((bottleneck) =>
    Object.freeze({
      id: bottleneck.id,
      domain: 'bottlenecks' as const,
      title: bottleneck.title,
      summary: bottleneck.description,
      severity: bottleneck.severity === 'critical' ? 'critical' : bottleneck.severity === 'high' ? 'warning' : 'info',
      reasonCodes: Object.freeze([bottleneck.category, bottleneck.serviceName]),
      route: CANONICAL_ROUTES.emergencyCommandCenter,
      patientId: bottleneck.affectedPatientId,
      humanReviewRequired: true as const,
    }),
  );
}

function mapAlertRisks(alerts: Alert[]): AiChiefOperationalRisk[] {
  return alerts
    .filter((alert) => alert.severity === 'Critical' && !alert.acknowledged && !alert.dismissed)
    .slice(0, 6)
    .map((alert) =>
      Object.freeze({
        id: `alert-risk-${alert.id}`,
        domain: 'alerts' as const,
        title: alert.title || 'Critical alert',
        summary: alert.message || 'Unacknowledged critical alert requires clinician review.',
        severity: 'critical' as const,
        reasonCodes: Object.freeze(['unacknowledged_critical_alert']),
        route: CANONICAL_ROUTES.emergencyAlerts,
        patientId: alert.patientId,
        humanReviewRequired: true as const,
      }),
    );
}

function deriveDomainStatuses(
  risks: readonly AiChiefOperationalRisk[],
  recommendations: readonly AiChiefExplainableRecommendation[],
  metrics: AiChiefOrchestrationSnapshot['metrics'],
): readonly AiChiefMonitoringDomainStatus[] {
  const domains: Array<{ id: AiChiefMonitoringDomain; label: string }> = [
    { id: 'patient_flow', label: 'Patient flow' },
    { id: 'department_capacity', label: 'Department capacity' },
    { id: 'staffing', label: 'Staffing' },
    { id: 'bottlenecks', label: 'Bottlenecks' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'service_health', label: 'Service health' },
    { id: 'ems_arrivals', label: 'EMS arrivals' },
    { id: 'patient_prioritization', label: 'Prioritization' },
    { id: 'operational_intelligence', label: 'Operational intelligence' },
    { id: 'clinical_workflow', label: 'Clinical workflow' },
  ];

  return Object.freeze(
    domains.map((domain) => {
      const domainRisks = risks.filter((risk) => risk.domain === domain.id);
      const domainRecommendations = recommendations.filter(
        (recommendation) => recommendation.domain === domain.id,
      );
      let status: AiChiefDomainStatus = 'healthy';
      if (domainRisks.some((risk) => risk.severity === 'critical')) status = 'critical';
      else if (domainRisks.length || domainRecommendations.some((r) => r.priority === 'P0' || r.priority === 'P1')) {
        status = 'watch';
      } else if (domain.id === 'department_capacity' && (metrics.capacityBand === 'Red' || metrics.capacityBand === 'Orange')) {
        status = 'watch';
      } else if (domain.id === 'ems_arrivals' && metrics.inboundEms > 0) {
        status = 'watch';
      }

      return Object.freeze({
        id: domain.id,
        label: domain.label,
        status,
        signalCount: domainRecommendations.length,
        riskCount: domainRisks.length,
      });
    }),
  );
}

export function buildAiChiefOrchestrationSnapshot(
  options: BuildAiChiefOrchestrationOptions = {},
): AiChiefOrchestrationSnapshot {
  const patients = options.patients ?? [];
  const staff = options.staff ?? [];
  const alerts = options.alerts ?? [];
  const emsArrivals = options.emsArrivals ?? [];
  const referrals = options.referrals ?? [];
  const workflowLogs = options.workflowLogs ?? [];
  const capacity = options.capacity;
  const pathname = options.pathname ?? '/';

  const hospitalOs = buildHospitalOperatingSystemSnapshot({
    pathname,
    patients,
    staff,
    emsArrivals,
    alerts,
    capacity,
    referrals,
  });

  const centralSource = buildCentralNodeSource(options);
  const centralSnapshot = buildCareDroidCentralNodeSnapshot(
    centralSource,
    DEFAULT_CENTRAL_NODE_ROLE,
    {
      screenMode: options.screenMode,
      pathname: options.pathname,
    },
  );

  const bottleneckSnapshot = buildBottleneckRegistrySnapshot({
    existingServiceSignals: {
      emergencyOperatingSystem: {
        dispatch: hospitalOs.journey.liveServiceSummaries.dispatch,
        preArrival: hospitalOs.journey.liveServiceSummaries.preArrival,
        readiness: hospitalOs.journey.liveServiceSummaries.readiness,
        journeyMetrics: hospitalOs.journey.liveServiceSummaries.journeyMetrics,
        capacity,
      },
    },
  });

  const oiSettings = resolveOperationalIntelligenceSettings(
    (options.emergencySettings as { operationalIntelligenceSettings?: Record<string, unknown> })
      ?.operationalIntelligenceSettings,
  );

  const operationalIntelligence =
    options.backendOperationalIntelligence ??
    buildCareDroidOperationalIntelligenceSnapshot({
      centralSnapshot,
      settings: oiSettings,
      patients,
      referrals,
      workflowLogs,
    });

  const workflowActions = buildCommandCenterWorkflowActions({
    dispatch: hospitalOs.journey.liveServiceSummaries.dispatch,
    readiness: hospitalOs.journey.liveServiceSummaries.readiness,
    metrics: hospitalOs.metrics,
    staffRouting: hospitalOs.journey.liveServiceSummaries.staffRouting,
    bottlenecks: bottleneckSnapshot,
  });

  const recommendations = Object.freeze([
    ...mapWorkflowActions(workflowActions),
    ...mapOperationalIntelligenceRecommendations(operationalIntelligence),
  ].sort((left, right) => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return order[left.priority] - order[right.priority];
  }));

  const risks = Object.freeze([
    ...mapAlertRisks(alerts),
    ...mapBottleneckRisks(bottleneckSnapshot),
    ...mapAnomaliesToRisks(operationalIntelligence),
  ]);

  const metrics = Object.freeze({
    activePatients: hospitalOs.metrics.activePatients,
    p1p2Patients: hospitalOs.metrics.p1p2Patients,
    inboundEms: hospitalOs.metrics.inboundEms,
    criticalAlerts: hospitalOs.metrics.criticalAlerts,
    unacknowledgedCriticalAlerts: hospitalOs.metrics.unacknowledgedCriticalAlerts,
    capacityBand: hospitalOs.metrics.capacityBand,
    threeMinuteBreaches: hospitalOs.metrics.threeMinuteBreaches,
    activeBottlenecks: bottleneckSnapshot.analytics.activeCount,
    degradedServices: bottleneckSnapshot.serviceHealth.filter((service) => service.status === 'degraded').length,
    reassessmentsDue: centralSnapshot.reassessmentStatus.due,
    boardingPatients: centralSnapshot.boardingStatus.boarders,
  });

  const patientContexts = buildPatientContexts(
    patients,
    referrals,
    staff,
    options.selectedPatientId,
  );

  const domainStatuses = deriveDomainStatuses(risks, recommendations, metrics);

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    orchestratorVersion: AI_CHIEF_ORCHESTRATOR_VERSION,
    safety: AI_CHIEF_SAFETY_STATEMENT,
    domainStatuses,
    risks,
    recommendations,
    patientContexts,
    metrics,
  });
}

export default {
  buildAiChiefOrchestrationSnapshot,
};