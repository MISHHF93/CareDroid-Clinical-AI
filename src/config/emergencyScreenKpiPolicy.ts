/**
 * Screen-mode KPI policy — canonical KPI sets per CareDroid screen mode.
 * Values resolve from existing operational builders (central node, reception strip,
 * department status, public waiting, command center throughput).
 */
import { CARE_DROID_SCREEN_MODES, type CareDroidScreenMode } from './careDroidScreenModes';
import { CHARGE_NURSE_SCREEN_WIDGETS } from './chargeNurseScreenModel';
import { COMMAND_CENTER_SCREEN_WIDGETS } from './commandCenterScreenModel';
import { PUBLIC_WAITING_SCREEN_WIDGETS } from './publicWaitingScreenModel';
import type { DepartmentStatusMetricId } from '../components/whiteboard/departmentStatusScreenModel';
import {
  buildCommandCenterThroughputSnapshot,
  type CommandCenterMetricId,
} from '../components/whiteboard/commandCenterThroughputModel';
import { buildPublicWaitingDisplaySnapshot } from '../components/whiteboard/publicWaitingDisplayModel';
import { selectChargeNurseOperationalStrip } from '../components/whiteboard/chargeNurseWorkflowModel';
import { buildArrivalControlSummary } from '../services/arrivalControlLayer';
import { summarizeTriageBreachBoard } from '../services/triageBreachTimer';
import { summarizeEmsAwareness } from '../components/whiteboard/emsAwarenessModel';
import {
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
} from '../types/emergency';

export type EmergencyScreenKpiTone =
  | 'stable'
  | 'info'
  | 'watch'
  | 'warning'
  | 'critical'
  | 'neutral'
  | 'success';

export type EmergencyScreenKpiId =
  | 'arrivals-today'
  | 'awaiting-verification'
  | 'awaiting-triage'
  | 'queue-size'
  | 'ems-inbound'
  | 'triage-pending'
  | 'longest-untriaged-wait'
  | 'rapid-review-flags'
  | 'ems-handoffs-pending'
  | 'waiting-count'
  | 'provider-breaches'
  | 'reassessments-due'
  | 'capacity-score'
  | 'boarders'
  | 'offload-delays'
  | 'average-wait-range'
  | 'crowd-level'
  | 'process-stage-messaging'
  | 'throughput'
  | 'crowding'
  | 'offload'
  | 'boarding'
  | 'referrals'
  | 'trend-metrics';

export type EmergencyScreenKpi = {
  id: EmergencyScreenKpiId;
  label: string;
  value: string | number;
  tone: EmergencyScreenKpiTone;
  detail?: string;
  source: string;
};

export type EmergencyScreenKpiSnapshot = {
  screenMode: CareDroidScreenMode;
  kpiIds: readonly EmergencyScreenKpiId[];
  kpis: EmergencyScreenKpi[];
  summaryLine: string;
};

const RECEPTION_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'arrivals-today',
  'awaiting-verification',
  'awaiting-triage',
  'queue-size',
  'ems-inbound',
]);

const TRIAGE_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'triage-pending',
  'longest-untriaged-wait',
  'rapid-review-flags',
  'ems-handoffs-pending',
]);

const CHARGE_NURSE_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'waiting-count',
  'provider-breaches',
  'reassessments-due',
  'capacity-score',
  'boarders',
  'offload-delays',
]);

const PUBLIC_WAITING_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'average-wait-range',
  'crowd-level',
  'process-stage-messaging',
]);

const COMMAND_CENTER_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'throughput',
  'crowding',
  'offload',
  'boarding',
  'referrals',
  'trend-metrics',
]);

export const EMERGENCY_SCREEN_KPI_POLICY: Readonly<
  Record<CareDroidScreenMode, readonly EmergencyScreenKpiId[]>
> = Object.freeze({
  [CARE_DROID_SCREEN_MODES.reception]: RECEPTION_KPIS,
  [CARE_DROID_SCREEN_MODES.triage]: TRIAGE_KPIS,
  [CARE_DROID_SCREEN_MODES.chargeNurse]: CHARGE_NURSE_KPIS,
  [CARE_DROID_SCREEN_MODES.publicWaiting]: PUBLIC_WAITING_KPIS,
  [CARE_DROID_SCREEN_MODES.commandCenter]: COMMAND_CENTER_KPIS,
  [CARE_DROID_SCREEN_MODES.ems]: [],
  [CARE_DROID_SCREEN_MODES.physician]: [],
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: [],
  [CARE_DROID_SCREEN_MODES.admin]: [],
});

/** Reception operational strip metric ids (receptionQueueModel). */
export const RECEPTION_KPI_TO_STRIP_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'arrivals-today': 'arrivals-today',
  'awaiting-verification': 'awaiting-verification',
  'awaiting-triage': 'awaiting-triage',
  'queue-size': 'queue-size',
  'ems-inbound': 'ems-inbound',
});

/** Triage operational strip metric ids (triageWorkflowModel). */
export const TRIAGE_KPI_TO_STRIP_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'triage-pending': 'triage-pending',
  'longest-untriaged-wait': 'longest-untriaged-wait',
  'rapid-review-flags': 'rapid-review-flags',
  'ems-handoffs-pending': 'ems-handoffs-pending',
});

/** Charge nurse strip metric ids (chargeNurseWorkflowModel). */
export const CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'waiting-count': 'waiting-count',
  'provider-breaches': 'provider-wait',
  'reassessments-due': 'reassessments',
  'capacity-score': 'capacity',
  boarders: 'boarding',
  'offload-delays': 'offload',
});

/** Charge nurse strip widget surfaces for backward-compatible filtering. */
export const CHARGE_NURSE_KPI_TO_STRIP_SURFACE: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'waiting-count': CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
  'provider-breaches': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'reassessments-due': CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
  'capacity-score': CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
  boarders: CHARGE_NURSE_SCREEN_WIDGETS.boarders,
  'offload-delays': CHARGE_NURSE_SCREEN_WIDGETS.offloadDelays,
});

export const CHARGE_NURSE_KPI_TO_DEPARTMENT_METRIC_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, DepartmentStatusMetricId>>
> = Object.freeze({
  'waiting-count': 'waiting-count',
  'provider-breaches': 'provider-wait-breached',
  'reassessments-due': 'reassessments-due',
  'capacity-score': 'capacity-status',
  boarders: 'boarders',
  'offload-delays': 'offload-delays',
});

export const PUBLIC_WAITING_KPI_TO_WIDGET: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'average-wait-range': PUBLIC_WAITING_SCREEN_WIDGETS.waitRange,
  'crowd-level': PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel,
  'process-stage-messaging': PUBLIC_WAITING_SCREEN_WIDGETS.careProcessStages,
});

export const PUBLIC_WAITING_KPI_TO_SECONDARY_WIDGET: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'process-stage-messaging': PUBLIC_WAITING_SCREEN_WIDGETS.patientGuidance,
});

export const COMMAND_CENTER_KPI_TO_WIDGET: Readonly<
  Partial<Record<EmergencyScreenKpiId, readonly string[]>>
> = Object.freeze({
  throughput: Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider,
  ]),
  crowding: Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast,
    COMMAND_CENTER_SCREEN_WIDGETS.waitingRoomOccupancy,
  ]),
  offload: Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays]),
  boarding: Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration]),
  referrals: Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog]),
  'trend-metrics': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
    COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk,
    COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
  ]),
});

export const COMMAND_CENTER_KPI_TO_METRIC_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, readonly CommandCenterMetricId[]>>
> = Object.freeze({
  throughput: Object.freeze(['avg-wait-triage', 'avg-wait-provider', 'waiting-room-occupancy']),
  crowding: Object.freeze(['waiting-room-occupancy']),
  offload: Object.freeze(['ems-offload-delays']),
  boarding: Object.freeze(['boarding-duration']),
  referrals: Object.freeze(['referrals-backlog']),
  'trend-metrics': Object.freeze(['lwbs-risk']),
});

/** Central-node operational metric keys for header strip filtering. */
export const SCREEN_MODE_HEADER_OPERATIONAL_KEYS: Readonly<
  Partial<Record<CareDroidScreenMode, readonly string[]>>
> = Object.freeze({
  [CARE_DROID_SCREEN_MODES.triage]: Object.freeze([
    'arrivalControlPending',
    'longestWait',
    'emsOffload',
    'triageBreached',
  ]),
  [CARE_DROID_SCREEN_MODES.chargeNurse]: Object.freeze([
    'waiting',
    'triageBreached',
    'providerBreached',
    'reassessmentsDue',
    'capacityScore',
    'boarders',
    'emsOffload',
  ]),
  [CARE_DROID_SCREEN_MODES.commandCenter]: Object.freeze([
    'patientsToday',
    'waiting',
    'averageWait',
    'emsOffload',
    'boarders',
    'referralsPending',
    'capacityScore',
  ]),
  [CARE_DROID_SCREEN_MODES.publicWaiting]: Object.freeze(['averageWait']),
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: Object.freeze([
    'waiting',
    'longestWait',
    'emsInbound',
    'capacityScore',
  ]),
});

export function resolveScreenModeKpiIds(
  screenMode: CareDroidScreenMode,
): readonly EmergencyScreenKpiId[] {
  return EMERGENCY_SCREEN_KPI_POLICY[screenMode] || [];
}

export function resolveReceptionStripMetricIds(
  screenMode: CareDroidScreenMode,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.reception) return null;
  return resolveScreenModeKpiIds(screenMode)
    .map((kpiId) => RECEPTION_KPI_TO_STRIP_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveTriageStripMetricIds(
  screenMode: CareDroidScreenMode,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.triage) return null;
  return resolveScreenModeKpiIds(screenMode)
    .map((kpiId) => TRIAGE_KPI_TO_STRIP_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveChargeNurseStripMetricIds(
  screenMode: CareDroidScreenMode,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveChargeNurseStripSurfaces(
  screenMode: CareDroidScreenMode,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_STRIP_SURFACE[kpiId])
    .filter((surface): surface is string => Boolean(surface));
}

export function resolveChargeNurseDepartmentMetricIds(
  screenMode: CareDroidScreenMode,
): DepartmentStatusMetricId[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_DEPARTMENT_METRIC_ID[kpiId])
    .filter((id): id is DepartmentStatusMetricId => Boolean(id));
}

export function resolvePublicWaitingKpiWidgets(
  screenMode: CareDroidScreenMode,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.publicWaiting) return null;
  const widgets = new Set<string>();
  resolveScreenModeKpiIds(screenMode).forEach((kpiId) => {
    const primary = PUBLIC_WAITING_KPI_TO_WIDGET[kpiId];
    const secondary = PUBLIC_WAITING_KPI_TO_SECONDARY_WIDGET[kpiId];
    if (primary) widgets.add(primary);
    if (secondary) widgets.add(secondary);
  });
  return [...widgets];
}

export function resolveCommandCenterMetricIds(
  screenMode: CareDroidScreenMode,
): CommandCenterMetricId[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.commandCenter) return null;
  const metricIds = new Set<CommandCenterMetricId>();
  resolveScreenModeKpiIds(screenMode).forEach((kpiId) => {
    (COMMAND_CENTER_KPI_TO_METRIC_ID[kpiId] || []).forEach((id) => metricIds.add(id));
  });
  return [...metricIds];
}

export function resolveCommandCenterWidgetVisibility(
  screenMode: CareDroidScreenMode,
): Partial<Record<string, boolean>> | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.commandCenter) return null;
  const enabledWidgets = new Set<string>();
  resolveScreenModeKpiIds(screenMode).forEach((kpiId) => {
    (COMMAND_CENTER_KPI_TO_WIDGET[kpiId] || []).forEach((widgetId) => enabledWidgets.add(widgetId));
  });

  return Object.fromEntries(
    Object.values(COMMAND_CENTER_SCREEN_WIDGETS).map((widgetId) => [
      widgetId,
      enabledWidgets.has(widgetId),
    ]),
  );
}

export function resolveHeaderOperationalMetricKeys(
  screenMode: CareDroidScreenMode,
): string[] | null {
  return SCREEN_MODE_HEADER_OPERATIONAL_KEYS[screenMode] || null;
}

export function filterOperationalMetricsByScreenMode<
  T extends { key: string },
>(metrics: T[] = [], screenMode: CareDroidScreenMode): T[] {
  const allowedKeys = resolveHeaderOperationalMetricKeys(screenMode);
  if (!allowedKeys?.length) return metrics;
  const allowed = new Set(allowedKeys);
  return metrics.filter((metric) => allowed.has(metric.key));
}

function localDateKey(value = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Lightweight triage KPI resolver for strip/header contexts. */
export function buildTriageKpiValues(input: {
  patients?: Patient[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  now?: Date;
} = {}): Record<
  'triage-pending' | 'longest-untriaged-wait' | 'rapid-review-flags' | 'ems-handoffs-pending',
  { value: string | number; tone: EmergencyScreenKpiTone; detail: string }
> {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const arrivalControl = buildArrivalControlSummary(patients);
  const triageBreach = summarizeTriageBreachBoard(patients, {
    settings: input.settings ? { emergencySettings: input.settings } : undefined,
    now,
  });
  const emsAwareness = summarizeEmsAwareness(input.emsArrivals || [], now.getTime(), {
    patients,
  });

  return {
    'triage-pending': {
      value: arrivalControl.triagePending,
      tone:
        arrivalControl.triagePending >= 4
          ? 'critical'
          : arrivalControl.triagePending >= 2
            ? 'warning'
            : arrivalControl.triagePending
              ? 'watch'
              : 'stable',
      detail: 'Patients awaiting triage nurse review',
    },
    'longest-untriaged-wait': {
      value: triageBreach.longestElapsedLabel,
      tone:
        triageBreach.breachedCount >= 3
          ? 'critical'
          : triageBreach.breachRiskCount
            ? 'warning'
            : 'stable',
      detail: `Door-to-triage target ${triageBreach.targetMinutes}m`,
    },
    'rapid-review-flags': {
      value: arrivalControl.rapidReview,
      tone: arrivalControl.rapidReview ? 'warning' : 'stable',
      detail: 'High-risk complaint flags needing rapid review',
    },
    'ems-handoffs-pending': {
      value: emsAwareness.awaitingHandoff,
      tone: emsAwareness.awaitingHandoff ? 'watch' : 'stable',
      detail: 'EMS units awaiting handoff completion',
    },
  };
}

const CHARGE_STRIP_TO_KPI_ID = Object.freeze(
  Object.fromEntries(
    Object.entries(CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID).map(([kpiId, stripId]) => [stripId, kpiId]),
  ) as Record<string, EmergencyScreenKpiId>,
);

const CHARGE_KPI_LABELS: Partial<Record<EmergencyScreenKpiId, string>> = Object.freeze({
  'waiting-count': 'Waiting count',
  'provider-breaches': 'Provider breaches',
  'reassessments-due': 'Reassessments due',
  'capacity-score': 'Capacity score',
  boarders: 'Boarders',
  'offload-delays': 'Offload delays',
});

export function buildChargeNurseKpiValues(input: {
  patients?: Patient[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  emsInbound?: number;
  now?: Date;
}): Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> {
  const stripMetrics = selectChargeNurseOperationalStrip({
    patients: input.patients || [],
    emsArrivals: input.emsArrivals || [],
    settings: input.settings || {},
    activeEmsArrivals: input.emsInbound ?? 0,
    now: input.now || new Date(),
  });
  const values: Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> = {};
  stripMetrics.forEach((metric) => {
    const kpiId = CHARGE_STRIP_TO_KPI_ID[metric.id];
    if (!kpiId) return;
    values[kpiId] = {
      id: kpiId,
      label: CHARGE_KPI_LABELS[kpiId] || metric.label,
      value: metric.value,
      tone: (metric.tone as EmergencyScreenKpiTone) || 'neutral',
      detail: metric.hint,
      source: `chargeNurseWorkflowModel.${metric.id}`,
    };
  });
  return values;
}

export function buildCommandCenterKpiValues(input: {
  patients?: Patient[];
  capacity?: CapacitySnapshot;
  referrals?: Referral[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  now?: Date;
}): Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> {
  const throughput = buildCommandCenterThroughputSnapshot({
    patients: input.patients || [],
    capacity: input.capacity,
    referrals: input.referrals || [],
    emsArrivals: input.emsArrivals || [],
    emergencySettings: input.settings || undefined,
    now: input.now || new Date(),
    updatedAt: input.capacity?.updatedAt || null,
  });
  const metricById = new Map(throughput.metrics.map((metric) => [metric.id, metric]));
  const avgTriage = metricById.get('avg-wait-triage');
  const avgProvider = metricById.get('avg-wait-provider');
  const waitingOccupancy = metricById.get('waiting-room-occupancy');
  const offload = metricById.get('ems-offload-delays');
  const boarding = metricById.get('boarding-duration');
  const referralsBacklog = metricById.get('referrals-backlog');
  const lwbsRisk = metricById.get('lwbs-risk');

  return {
    throughput: {
      id: 'throughput',
      label: 'Throughput',
      value: `${avgTriage?.value ?? '—'} / ${avgProvider?.value ?? '—'}`,
      tone: (avgProvider?.tone as EmergencyScreenKpiTone) || 'info',
      detail: 'Average triage and provider waits',
      source: 'commandCenterThroughputModel.throughput',
    },
    crowding: {
      id: 'crowding',
      label: 'Crowding',
      value: waitingOccupancy?.value ?? throughput.crowdingForecast.label,
      tone: (waitingOccupancy?.tone as EmergencyScreenKpiTone) || 'watch',
      detail: throughput.crowdingForecast.detail,
      source: 'commandCenterThroughputModel.crowding',
    },
    offload: {
      id: 'offload',
      label: 'EMS offload',
      value: offload?.value ?? 0,
      tone: (offload?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: offload?.detail,
      source: 'commandCenterThroughputModel.offload',
    },
    boarding: {
      id: 'boarding',
      label: 'Boarding',
      value: boarding?.value ?? 0,
      tone: (boarding?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: boarding?.detail,
      source: 'commandCenterThroughputModel.boarding',
    },
    referrals: {
      id: 'referrals',
      label: 'Referrals backlog',
      value: referralsBacklog?.value ?? 0,
      tone: (referralsBacklog?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: referralsBacklog?.detail,
      source: 'commandCenterThroughputModel.referrals',
    },
    'trend-metrics': {
      id: 'trend-metrics',
      label: 'LWBS risk',
      value: lwbsRisk?.value ?? '—',
      tone: (lwbsRisk?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: lwbsRisk?.detail,
      source: 'commandCenterThroughputModel.lwbs-risk',
    },
  };
}

export function buildPublicWaitingKpiValues(input: {
  patients?: Patient[];
  capacity?: CapacitySnapshot;
  referrals?: Referral[];
  now?: Date;
}): Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> {
  const snapshot = buildPublicWaitingDisplaySnapshot({
    patients: input.patients || [],
    capacity: input.capacity,
    referrals: input.referrals || [],
    now: input.now || new Date(),
    updatedAt: input.capacity?.updatedAt || null,
  });
  return {
    'average-wait-range': {
      id: 'average-wait-range',
      label: snapshot.waitRange.label,
      value: snapshot.waitRange.value,
      tone: 'info',
      detail: snapshot.waitRange.detail,
      source: 'publicWaitingDisplayModel.waitRange',
    },
    'crowd-level': {
      id: 'crowd-level',
      label: 'Crowd level',
      value: snapshot.crowdLevel.label,
      tone: snapshot.crowdLevel.tone as EmergencyScreenKpiTone,
      detail: snapshot.crowdLevel.detail,
      source: 'publicWaitingDisplayModel.crowdLevel',
    },
    'process-stage-messaging': {
      id: 'process-stage-messaging',
      label: 'Care process stages',
      value: snapshot.statusMessaging.statusLines.length,
      tone: 'neutral',
      detail: snapshot.statusMessaging.summaryLine,
      source: 'waitingRoomStatusMessaging.statusLines',
    },
  };
}

export function buildScreenModeKpiSnapshot(input: {
  screenMode: CareDroidScreenMode;
  patients?: Patient[];
  emsInbound?: number;
  emsArrivals?: EMSArrival[];
  referrals?: Referral[];
  capacity?: CapacitySnapshot;
  settings?: Record<string, unknown> | null;
  operationalMetrics?: Array<{ key: string; label: string; value: string | number; tone?: string }>;
  now?: Date;
}): EmergencyScreenKpiSnapshot {
  const kpiIds = resolveScreenModeKpiIds(input.screenMode);
  const patients = input.patients || [];
  const kpis: EmergencyScreenKpi[] = [];

  if (input.screenMode === CARE_DROID_SCREEN_MODES.reception) {
    const today = localDateKey();
    const arrivalsToday = patients.filter(
      (patient) => localDateKey(patient.arrivalTime) === today,
    ).length;
    const arrivalControl = buildArrivalControlSummary(patients);
    const awaitingVerification = patients.filter(
      (patient) => patient.state === PatientState.Registration,
    ).length;

    const receptionValues: Record<EmergencyScreenKpiId, EmergencyScreenKpi> = {
      'arrivals-today': {
        id: 'arrivals-today',
        label: 'Arrivals today',
        value: arrivalsToday,
        tone: 'info',
        source: 'patients.arrivalTime',
      },
      'awaiting-verification': {
        id: 'awaiting-verification',
        label: 'Awaiting verification',
        value: awaitingVerification,
        tone: awaitingVerification >= 5 ? 'warning' : 'stable',
        source: 'patients.registration',
      },
      'awaiting-triage': {
        id: 'awaiting-triage',
        label: 'Awaiting triage',
        value: arrivalControl.triagePending,
        tone: arrivalControl.triagePending >= 6 ? 'warning' : 'stable',
        source: 'arrivalControlLayer.triagePending',
      },
      'queue-size': {
        id: 'queue-size',
        label: 'Queue size',
        value: awaitingVerification + arrivalControl.triagePending,
        tone: 'neutral',
        source: 'receptionQueueModel.queueTotal',
      },
      'ems-inbound': {
        id: 'ems-inbound',
        label: 'EMS inbound',
        value: input.emsInbound ?? 0,
        tone: (input.emsInbound ?? 0) > 0 ? 'info' : 'stable',
        source: 'centralNode.emsPressure.inbound',
      },
    } as Record<EmergencyScreenKpiId, EmergencyScreenKpi>;

    kpiIds.forEach((id) => {
      if (receptionValues[id]) kpis.push(receptionValues[id]);
    });
  }

  if (input.screenMode === CARE_DROID_SCREEN_MODES.triage) {
    const triageValues = buildTriageKpiValues(input);
    const triageLabels: Record<string, string> = {
      'triage-pending': 'Triage pending',
      'longest-untriaged-wait': 'Longest untriaged wait',
      'rapid-review-flags': 'Rapid-review flags',
      'ems-handoffs-pending': 'EMS handoffs pending',
    };
    kpiIds.forEach((id) => {
      const resolved = triageValues[id as keyof typeof triageValues];
      if (!resolved) return;
      kpis.push({
        id,
        label: triageLabels[id] || id,
        value: resolved.value,
        tone: resolved.tone,
        detail: resolved.detail,
        source: `triageKpi.${id}`,
      });
    });
  }

  if (
    input.operationalMetrics?.length &&
    (input.screenMode === CARE_DROID_SCREEN_MODES.chargeNurse ||
      input.screenMode === CARE_DROID_SCREEN_MODES.commandCenter)
  ) {
    const metricByKey = new Map(input.operationalMetrics.map((metric) => [metric.key, metric]));
    const chargeLabels: Partial<Record<EmergencyScreenKpiId, string>> = {
      'waiting-count': 'Waiting count',
      'provider-breaches': 'Provider breaches',
      'reassessments-due': 'Reassessments due',
      'capacity-score': 'Capacity score',
      boarders: 'Boarders',
      'offload-delays': 'Offload delays',
    };
    const chargeKeyMap: Partial<Record<EmergencyScreenKpiId, string>> = {
      'waiting-count': 'waiting',
      'provider-breaches': 'providerBreached',
      'reassessments-due': 'reassessmentsDue',
      'capacity-score': 'capacityScore',
      boarders: 'boarders',
      'offload-delays': 'emsOffload',
    };

    kpiIds.forEach((id) => {
      const metricKey = chargeKeyMap[id];
      const metric = metricKey ? metricByKey.get(metricKey) : null;
      if (!metric) return;
      kpis.push({
        id,
        label: chargeLabels[id] || metric.label,
        value: metric.value,
        tone: (metric.tone as EmergencyScreenKpiTone) || 'neutral',
        source: `operationalSummary.${metricKey}`,
      });
    });
  }

  if (
    input.screenMode === CARE_DROID_SCREEN_MODES.chargeNurse &&
    !input.operationalMetrics?.length
  ) {
    const chargeValues = buildChargeNurseKpiValues(input);
    kpiIds.forEach((id) => {
      const resolved = chargeValues[id];
      if (resolved) kpis.push(resolved);
    });
  }

  if (input.screenMode === CARE_DROID_SCREEN_MODES.commandCenter) {
    const commandValues = buildCommandCenterKpiValues(input);
    kpiIds.forEach((id) => {
      const resolved = commandValues[id];
      if (resolved) kpis.push(resolved);
    });
  }

  if (input.screenMode === CARE_DROID_SCREEN_MODES.publicWaiting) {
    const publicValues = buildPublicWaitingKpiValues(input);
    kpiIds.forEach((id) => {
      const resolved = publicValues[id];
      if (resolved) kpis.push(resolved);
    });
  }

  const summaryLine = kpis
    .map((kpi) => `${kpi.label}: ${kpi.value}`)
    .slice(0, 4)
    .join(' · ');

  return {
    screenMode: input.screenMode,
    kpiIds,
    kpis,
    summaryLine: summaryLine || 'Operational KPIs unavailable',
  };
}
