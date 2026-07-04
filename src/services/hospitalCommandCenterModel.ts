import {
  PatientState,
  Priority,
  type Alert,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Staff,
} from '../types/emergency';
import { buildFullEmergencyCareJourneySnapshot } from './fullEmergencyCareJourneyService';
import {
  buildCommandCenterThroughputSnapshot,
  type CommandCenterThroughputSnapshot,
} from '../components/whiteboard/commandCenterThroughputModel';
import { buildCommandCenterWorkflowActions } from '../config/operationalWorkflow.config';
import type { OperationalIntelligenceSnapshot } from '../operational-intelligence/operationalIntelligence.types';
import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import type { HospitalCommandMetricId } from '../config/hospitalCommandCenterRolePolicy';
import { CANONICAL_ROUTES } from '../config/routes.config';
import type { ContinuousPatientFlowSnapshot } from '../engine/continuousPatientFlowEngine';
import type { AdministrativeAutomationTask } from '../types/administrativeAutomation';
import type { DashboardKnowledgeGraphSummary } from './unifiedApplicationKnowledgeGraphPresentation';
import type { UnifiedOperationalIntelligenceSnapshot } from '../config/unifiedOperationalIntelligenceModel';
import { isAuthoritativeUnifiedOperationalSnapshot } from './unifiedOperationalIntelligenceService';

export type HospitalCommandTone = 'stable' | 'watch' | 'warning' | 'critical';

export type HospitalCommandMetric = Readonly<{
  id: HospitalCommandMetricId;
  label: string;
  value: string | number;
  detail: string;
  tone: HospitalCommandTone;
  route?: string;
}>;

export type HospitalCommandBottleneck = Readonly<{
  id: string;
  title: string;
  severity: string;
  ownerRole?: string;
}>;

export type HospitalCommandAiRecommendation = Readonly<{
  id: string;
  action: string;
  rationale: string;
  route?: string;
}>;

export type HospitalCommandAlertItem = Readonly<{
  id: string;
  title: string;
  severity: string;
  acknowledged: boolean;
  route: string;
}>;

export type HospitalCommandCenterSnapshot = Readonly<{
  generatedAt: string;
  statusLine: string;
  ownerRole: string;
  nextAction: string;
  tone: HospitalCommandTone;
  metrics: readonly HospitalCommandMetric[];
  bottlenecks: readonly HospitalCommandBottleneck[];
  aiRecommendations: readonly HospitalCommandAiRecommendation[];
  unresolvedAlerts: readonly HospitalCommandAlertItem[];
  threeMinuteCompliance: Readonly<{
    breaches: number;
    activeTraces: number;
    compliant: boolean;
  }>;
  throughput: CommandCenterThroughputSnapshot;
  knowledgeGraph?: DashboardKnowledgeGraphSummary;
}>;

const DOCTOR_ROLES = new Set(['MD', 'Attending', 'Resident', 'PA', 'Consultant']);
const NURSE_ROLES = new Set(['RN', 'Nurse', 'TriageNurse', 'ChargeNurse', 'Charge']);

function minutesSince(value: string | null | undefined, now = new Date()): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round((now.getTime() - parsed) / 60000));
}

function isOnShift(staff: Staff): boolean {
  return staff.active !== false && staff.status !== 'OffShift' && staff.status !== 'Unavailable';
}

function countStaffByRoles(staff: Staff[], roles: Set<string>): number {
  return staff.filter((member) => isOnShift(member) && roles.has(member.role)).length;
}

function toneFromCapacityBand(band: string | undefined): HospitalCommandTone {
  if (band === 'Red') return 'critical';
  if (band === 'Orange') return 'warning';
  if (band === 'Yellow') return 'watch';
  return 'stable';
}

function metricTone(value: number, warnAt: number, criticalAt: number): HospitalCommandTone {
  if (value >= criticalAt) return 'critical';
  if (value >= warnAt) return 'warning';
  if (value > 0) return 'watch';
  return 'stable';
}

function mapUnifiedOperationalBottlenecks(
  snapshot: UnifiedOperationalIntelligenceSnapshot,
): readonly HospitalCommandBottleneck[] {
  return Object.freeze(
    snapshot.insights
      .filter((insight) => insight.type === 'bottleneck' || insight.type === 'congestion_prediction')
      .slice(0, 6)
      .map((insight) =>
        Object.freeze({
          id: insight.id,
          title: insight.title,
          severity: insight.severity,
          ownerRole: insight.ownerRole,
        }),
      ),
  );
}

function mapUnifiedOperationalRecommendations(
  snapshot: UnifiedOperationalIntelligenceSnapshot,
): readonly HospitalCommandAiRecommendation[] {
  return Object.freeze(
    snapshot.insights
      .filter((insight) => insight.type === 'intervention' || insight.type === 'recommendation')
      .slice(0, 8)
      .map((insight) =>
        Object.freeze({
          id: insight.id,
          action: insight.title,
          rationale: insight.summary,
          route: insight.route,
        }),
      ),
  );
}

function throughputMetric(
  snapshot: CommandCenterThroughputSnapshot,
  id: string,
): { value: string | number; detail: string; tone: HospitalCommandTone } | null {
  const metric = snapshot.metrics.find((entry) => entry.id === id);
  if (!metric) return null;
  const toneMap: Record<string, HospitalCommandTone> = {
    stable: 'stable',
    info: 'watch',
    watch: 'watch',
    warning: 'warning',
    critical: 'critical',
  };
  return {
    value: metric.value,
    detail: metric.detail,
    tone: toneMap[metric.tone] || 'stable',
  };
}

export function buildHospitalCommandCenterSnapshot(input: {
  patients?: Patient[];
  staff?: Staff[];
  alerts?: Alert[];
  emsArrivals?: EMSArrival[];
  capacity?: CapacitySnapshot;
  centralSnapshot?: CareDroidCentralNodeSnapshot;
  intelligenceSnapshot?: OperationalIntelligenceSnapshot | null;
  emergencySettings?: Record<string, unknown>;
  referrals?: Array<{ status?: string }>;
  hourlyArrivals?: Array<{ hour: string; count: number }>;
  patientFlowSnapshot?: ContinuousPatientFlowSnapshot | null;
  administrativeAutomationQueue?: AdministrativeAutomationTask[];
  knowledgeGraphSummary?: DashboardKnowledgeGraphSummary;
  unifiedOperationalSnapshot?: UnifiedOperationalIntelligenceSnapshot | null;
  now?: Date;
} = {}): HospitalCommandCenterSnapshot {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const staff = input.staff || [];
  const alerts = input.alerts || [];
  const emsArrivals = input.emsArrivals || [];
  const capacity = input.capacity;
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const waitingPatients = patients.filter((patient) => patient.state === PatientState.Waiting);
  const criticalPatients = activePatients.filter(
    (patient) =>
      patient.priority === Priority.P1 ||
      patient.priority === Priority.P2 ||
      patient.flags?.length > 0,
  );

  const journey = buildFullEmergencyCareJourneySnapshot({
    patients,
    staff,
    emsArrivals,
    alerts,
    capacity,
  });

  const throughput = buildCommandCenterThroughputSnapshot({
    patients,
    capacity,
    emsArrivals,
    staff,
    referrals: input.referrals as never[],
    emergencySettings: input.emergencySettings,
    centralSnapshot: input.centralSnapshot,
    intelligenceSnapshot: input.intelligenceSnapshot,
    hourlyArrivals: input.hourlyArrivals,
    now,
    updatedAt: capacity?.updatedAt || journey.generatedAt,
  });

  const occupancyPercent =
    capacity?.occupancyPercent ??
    (capacity?.maxCapacity && capacity?.currentOccupancy != null
      ? Math.round((capacity.currentOccupancy / capacity.maxCapacity) * 100)
      : null);

  const avgWaitMinutes =
    input.centralSnapshot?.currentDepartmentStatus?.averageWait ??
    (waitingPatients.length
      ? Math.round(
          waitingPatients.reduce(
            (sum, patient) => sum + minutesSince(patient.arrivalTime, now),
            0,
          ) / waitingPatients.length,
        )
      : 0);

  const avgLosMinutes =
    activePatients.length > 0
      ? Math.round(
          activePatients.reduce(
            (sum, patient) => sum + minutesSince(patient.arrivalTime, now),
            0,
          ) / activePatients.length,
        )
      : 0;

  const inboundEms = emsArrivals.filter((arrival) => arrival.status === 'Inbound');
  const nextEta = inboundEms.reduce<number | null>((min, arrival) => {
    const eta = Number(arrival.eta);
    if (!Number.isFinite(eta)) return min;
    return min == null ? eta : Math.min(min, eta);
  }, null);

  const unresolvedClinical = alerts.filter(
    (alert) => alert.severity === 'Critical' && !alert.dismissed && !alert.acknowledged,
  );

  const unifiedOperational = input.unifiedOperationalSnapshot;
  const useBackendOperationalIntelligence = isAuthoritativeUnifiedOperationalSnapshot(unifiedOperational);
  const unifiedMetrics = useBackendOperationalIntelligence ? unifiedOperational.metrics : null;

  const bottleneckFindings = useBackendOperationalIntelligence
    ? mapUnifiedOperationalBottlenecks(unifiedOperational!)
    : journey.liveServiceSummaries.bottlenecks?.activeBottlenecks?.slice(0, 6).map((finding) =>
        Object.freeze({
          id: finding.id,
          title: finding.title,
          severity: finding.severity,
          ownerRole: finding.ownerRole,
        }),
      ) || [];

  const flowRecommendations =
    input.patientFlowSnapshot?.aiRecommendations?.slice(0, 5).map((rec) =>
      Object.freeze({
        id: rec.id,
        action: rec.action,
        rationale: rec.rationale,
        route: rec.patientId
          ? `${CANONICAL_ROUTES.emergencyWhiteboard}?patient=${encodeURIComponent(rec.patientId)}`
          : CANONICAL_ROUTES.emergencyQueues,
      }),
    ) || [];
  const oiRecommendations = useBackendOperationalIntelligence
    ? mapUnifiedOperationalRecommendations(unifiedOperational!)
    : [
        ...flowRecommendations,
        ...(input.intelligenceSnapshot?.recommendations?.slice(0, 5).map((rec) =>
          Object.freeze({
            id: rec.id,
            action: rec.action,
            rationale: rec.rationale,
            route: rec.route,
          }),
        ) || []),
      ].slice(0, 8);

  const workflowActions = buildCommandCenterWorkflowActions({
    dispatch: journey.liveServiceSummaries.dispatch,
    readiness: journey.liveServiceSummaries.readiness,
    metrics: journey.metrics,
    staffRouting: journey.liveServiceSummaries.staffRouting,
    bottlenecks: journey.liveServiceSummaries.bottlenecks,
  });

  const topAction = workflowActions.find((action) => action.active) ?? workflowActions[0];

  const doctorsAvailable = countStaffByRoles(staff, DOCTOR_ROLES);
  const nursesAvailable = countStaffByRoles(staff, NURSE_ROLES);
  const bedCapacityLabel = capacity
    ? `${capacity.occupiedRooms ?? capacity.currentOccupancy ?? 0}/${capacity.maxCapacity ?? capacity.staffedRoomCount ?? '—'}`
    : throughputMetric(throughput, 'capacity-score')?.value ?? '—';

  const triageBreached = throughputMetric(throughput, 'triage-breached');
  const emsInbound = throughputMetric(throughput, 'ems-inbound');

  const metrics: HospitalCommandMetric[] = [
    {
      id: 'department-occupancy',
      label: 'Department occupancy',
      value:
        unifiedMetrics != null
          ? `${unifiedMetrics.capacityScore}%`
          : occupancyPercent != null
            ? `${occupancyPercent}%`
            : capacity?.band ?? '—',
      detail: `Capacity band ${unifiedMetrics?.capacityBand ?? capacity?.band ?? journey.metrics.capacityBand}`,
      tone: toneFromCapacityBand(
        unifiedMetrics?.capacityBand ?? capacity?.band ?? journey.metrics.capacityBand,
      ),
      route: CANONICAL_ROUTES.emergencyCapacity,
    },
    {
      id: 'waiting-patients',
      label: 'Waiting patients',
      value: unifiedMetrics?.waitingPatients ?? waitingPatients.length,
      detail: `${triageBreached?.value ?? 0} triage breach · ${throughputMetric(throughput, 'waiting-count')?.value ?? 0} in waiting room`,
      tone: metricTone(unifiedMetrics?.waitingPatients ?? waitingPatients.length, 6, 12),
      route: CANONICAL_ROUTES.emergencyQueues,
    },
    {
      id: 'critical-patients',
      label: 'Critical patients',
      value: criticalPatients.length,
      detail: `${journey.metrics.p1p2Patients} P1/P2 on the board`,
      tone: metricTone(criticalPatients.length, 2, 5),
      route: CANONICAL_ROUTES.emergencyWhiteboard,
    },
    {
      id: 'avg-wait-time',
      label: 'Average wait',
      value: `${avgWaitMinutes}m`,
      detail: throughputMetric(throughput, 'longest-wait')?.detail || 'Door-to-provider signal',
      tone: metricTone(avgWaitMinutes, 45, 90),
      route: CANONICAL_ROUTES.emergencyQueues,
    },
    {
      id: 'length-of-stay',
      label: 'Avg length of stay',
      value: `${avgLosMinutes}m`,
      detail: 'Active ED patients · arrival to now',
      tone: metricTone(avgLosMinutes, 240, 360),
      route: CANONICAL_ROUTES.emergencyPatients,
    },
    {
      id: 'doctors-available',
      label: 'Doctors available',
      value: doctorsAvailable,
      detail: 'On-shift physicians and advanced practitioners',
      tone: doctorsAvailable === 0 ? 'critical' : doctorsAvailable <= 1 ? 'warning' : 'stable',
      route: `${CANONICAL_ROUTES.adminOperations}/team`,
    },
    {
      id: 'nurses-available',
      label: 'Nurses available',
      value: nursesAvailable,
      detail: 'On-shift nursing staff',
      tone: nursesAvailable === 0 ? 'critical' : nursesAvailable <= 2 ? 'warning' : 'stable',
      route: `${CANONICAL_ROUTES.adminOperations}/team`,
    },
    {
      id: 'bed-capacity',
      label: 'Bed capacity',
      value: bedCapacityLabel,
      detail: throughputMetric(throughput, 'boarding-duration')?.detail || 'Occupied / staffed beds',
      tone: toneFromCapacityBand(capacity?.band),
      route: CANONICAL_ROUTES.emergencyCapacity,
    },
    {
      id: 'ems-arrivals',
      label: 'EMS arrivals',
      value: unifiedMetrics?.inboundEms ?? emsInbound?.value ?? inboundEms.length,
      detail: emsInbound?.detail || `${unifiedMetrics?.inboundEms ?? inboundEms.length} inbound ambulances`,
      tone:
        (emsInbound?.tone as HospitalCommandTone) ||
        metricTone(unifiedMetrics?.inboundEms ?? inboundEms.length, 2, 4),
      route: CANONICAL_ROUTES.emergencyEms,
    },
    {
      id: 'ambulance-eta',
      label: 'Ambulance ETA',
      value: nextEta != null ? `${nextEta}m` : '—',
      detail:
        inboundEms.length > 0
          ? `Next of ${inboundEms.length} inbound unit${inboundEms.length === 1 ? '' : 's'}`
          : 'No inbound EMS',
      tone: nextEta != null && nextEta <= 5 ? 'warning' : 'stable',
      route: CANONICAL_ROUTES.emergencyEms,
    },
    {
      id: 'service-bottlenecks',
      label: 'Service bottlenecks',
      value: unifiedMetrics?.activeBottlenecks ?? bottleneckFindings.length,
      detail:
        bottleneckFindings[0]?.title ||
        'No active bottleneck signals',
      tone: metricTone(unifiedMetrics?.activeBottlenecks ?? bottleneckFindings.length, 1, 3),
      route: CANONICAL_ROUTES.emergencyReports,
    },
    {
      id: 'ai-recommendations',
      label: 'AI recommendations',
      value: unifiedMetrics?.aiRecommendationCount ?? oiRecommendations.length,
      detail:
        oiRecommendations[0]?.action ||
        'CareDroid Copilot — review case-aware suggestions',
      tone: (unifiedMetrics?.aiRecommendationCount ?? oiRecommendations.length) > 0 ? 'watch' : 'stable',
      route: CANONICAL_ROUTES.emergencyCopilot,
    },
    {
      id: 'unresolved-alerts',
      label: 'Unresolved alerts',
      value: unifiedMetrics?.unresolvedAlerts ?? unresolvedClinical.length,
      detail: `${journey.metrics.criticalAlerts} critical · acknowledgement required`,
      tone: metricTone(unifiedMetrics?.unresolvedAlerts ?? unresolvedClinical.length, 1, 3),
      route: CANONICAL_ROUTES.emergencyAlerts,
    },
    {
      id: 'three-minute-compliance',
      label: '3-minute compliance',
      value: journey.metrics.threeMinuteBreaches > 0 ? `${journey.metrics.threeMinuteBreaches} breach` : 'On track',
      detail: `${journey.metrics.activeJourneyTraces} active traces · ${journey.principle}`,
      tone: journey.metrics.threeMinuteBreaches > 0 ? 'critical' : 'stable',
      route: CANONICAL_ROUTES.emergencyCommandCenter,
    },
  ];

  const statusParts: string[] = [];
  if (journey.metrics.threeMinuteBreaches > 0) {
    statusParts.push(`${journey.metrics.threeMinuteBreaches} three-minute breach${journey.metrics.threeMinuteBreaches === 1 ? '' : 'es'}`);
  }
  if (unresolvedClinical.length > 0) {
    statusParts.push(`${unresolvedClinical.length} unresolved critical alert${unresolvedClinical.length === 1 ? '' : 's'}`);
  }
  if (waitingPatients.length > 0) {
    statusParts.push(`${waitingPatients.length} waiting`);
  }
  if (inboundEms.length > 0) {
    statusParts.push(`${inboundEms.length} EMS inbound`);
  }
  if (input.patientFlowSnapshot?.metrics.activeDetections) {
    statusParts.push(`${input.patientFlowSnapshot.metrics.activeDetections} flow signals`);
  }
  const pendingAutomations =
    input.administrativeAutomationQueue?.filter((task) => task.status === 'pending_review').length || 0;
  if (pendingAutomations > 0) {
    statusParts.push(`${pendingAutomations} automation${pendingAutomations === 1 ? '' : 's'} to review`);
  }
  if (input.knowledgeGraphSummary?.criticalNodes.length) {
    statusParts.push(
      `${input.knowledgeGraphSummary.criticalNodes.length} connected critical signal${input.knowledgeGraphSummary.criticalNodes.length === 1 ? '' : 's'}`,
    );
  }

  const statusLine =
    statusParts.length > 0
      ? statusParts.join(' · ')
      : throughput.summaryLine || 'Department operating within expected ranges';

  const overallTone: HospitalCommandTone =
    journey.metrics.threeMinuteBreaches > 0 || unresolvedClinical.length > 0
      ? 'critical'
      : waitingPatients.length >= 8 || inboundEms.length >= 3
        ? 'warning'
        : 'stable';

  return Object.freeze({
    generatedAt: journey.generatedAt,
    statusLine,
    ownerRole: topAction?.owner || 'Charge nurse',
    nextAction: topAction?.active ? topAction.nextAction : 'Monitor live metrics and assign next owner',
    tone: overallTone,
    metrics: Object.freeze(metrics),
    bottlenecks: Object.freeze(bottleneckFindings),
    aiRecommendations: Object.freeze(
      oiRecommendations.map((rec) =>
        Object.freeze({
          id: rec.id,
          action: rec.action,
          rationale: rec.rationale,
          route: rec.route,
        }),
      ),
    ),
    unresolvedAlerts: Object.freeze(
      unresolvedClinical.slice(0, 8).map((alert) =>
        Object.freeze({
          id: alert.id,
          title: alert.message || alert.type || 'Critical alert',
          severity: alert.severity,
          acknowledged: Boolean(alert.acknowledged),
          route: CANONICAL_ROUTES.emergencyAlerts,
        }),
      ),
    ),
    threeMinuteCompliance: Object.freeze({
      breaches: journey.metrics.threeMinuteBreaches,
      activeTraces: journey.metrics.activeJourneyTraces,
      compliant: journey.metrics.threeMinuteBreaches === 0,
    }),
    throughput,
    knowledgeGraph: input.knowledgeGraphSummary,
  });
}

export function filterHospitalCommandMetrics(
  snapshot: HospitalCommandCenterSnapshot,
  visibleIds: readonly HospitalCommandMetricId[],
): readonly HospitalCommandMetric[] {
  const allowed = new Set(visibleIds);
  const order = new Map(visibleIds.map((id, index) => [id, index]));
  return snapshot.metrics
    .filter((metric) => allowed.has(metric.id))
    .sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
}