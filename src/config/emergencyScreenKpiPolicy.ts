/**
 * Screen-mode KPI policy — canonical KPI sets per CareDroid screen mode.
 * Values resolve from existing operational builders (central node, reception strip,
 * department status, public waiting, command center throughput).
 */
import { CARE_DROID_SCREEN_MODES, type CareDroidScreenMode } from './careDroidScreenModes';
import { CHARGE_NURSE_SCREEN_WIDGETS } from './chargeNurseScreenModel';
import { COMMAND_CENTER_SCREEN_WIDGETS } from './commandCenterScreenModel';
import { PHYSICIAN_SCREEN_WIDGETS } from './physicianScreenModel';
import { PUBLIC_WAITING_SCREEN_WIDGETS } from './publicWaitingScreenModel';
import type { DepartmentStatusMetricId } from '../components/whiteboard/departmentStatusScreenModel';
import {
  buildCommandCenterThroughputSnapshot,
  type CommandCenterMetricId,
} from '../components/whiteboard/commandCenterThroughputModel';
import { buildPublicWaitingDisplaySnapshot } from '../components/whiteboard/publicWaitingDisplayModel';
import { buildCrowdLevelSnapshot } from '../engine/crowdLevelEngine';
import { selectChargeNurseOperationalStrip } from '../components/whiteboard/chargeNurseWorkflowModel';
import { buildTriageBreachVisibilitySnapshot } from '../services/triageBreachVisibilityModel';
import { buildProviderWaitVisibilitySnapshot } from '../services/providerWaitVisibilityModel';
import { summarizeEmsAwareness } from '../components/whiteboard/emsAwarenessModel';
import {
  PatientState,
  type CapacitySnapshot,
  type EMSArrival,
  type Patient,
  type Referral,
} from '../types/emergency';
import {
  resolvePilotHeaderOperationalMetricKeys,
  resolvePilotStationKpiIds,
} from './stationKpiPolicy';

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
  | 'triage-breach-approaching'
  | 'triage-breached'
  | 'rapid-review-flags'
  | 'ems-handoffs-pending'
  | 'waiting-count'
  | 'awaiting-clinician'
  | 'longest-provider-wait'
  | 'average-provider-wait'
  | 'provider-wait-approaching'
  | 'provider-wait-breached'
  | 'reassessments-due'
  | 'capacity-score'
  | 'boarders'
  | 'offload-delays'
  | 'offload-duration'
  | 'handoff-pending'
  | 'ems-crowding-impact'
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

export type ScreenModeKpiSettingsInput = {
  screenModeKpiVisibility?: Partial<Record<string, readonly EmergencyScreenKpiId[]>>;
  publicDisplayPrivacy?: string | null;
};

export const EMERGENCY_SCREEN_KPI_LABELS: Readonly<Record<EmergencyScreenKpiId, string>> =
  Object.freeze({
    'arrivals-today': 'Arrivals today',
    'awaiting-verification': 'Awaiting verification',
    'awaiting-triage': 'Awaiting triage',
    'queue-size': 'Queue size',
    'ems-inbound': 'EMS inbound',
    'triage-pending': 'Awaiting triage',
    'longest-untriaged-wait': 'Longest untriaged wait',
    'triage-breach-approaching': 'Approaching breach',
    'triage-breached': 'Triage breached',
    'rapid-review-flags': 'Rapid review flags',
    'ems-handoffs-pending': 'EMS handoffs pending',
    'waiting-count': 'Waiting count',
    'awaiting-clinician': 'Awaiting clinician',
    'longest-provider-wait': 'Longest provider wait',
    'average-provider-wait': 'Average provider wait',
    'provider-wait-approaching': 'Approaching threshold',
    'provider-wait-breached': 'Provider wait breached',
    'reassessments-due': 'Reassessments due',
    'capacity-score': 'Capacity score',
    boarders: 'Boarders',
    'offload-delays': 'Offload delays',
    'offload-duration': 'Offload duration',
    'handoff-pending': 'Handoff pending',
    'ems-crowding-impact': 'Ambulance crowding impact',
    'average-wait-range': 'Average wait range',
    'crowd-level': 'Crowd level',
    'process-stage-messaging': 'Process stage messaging',
    throughput: 'Throughput',
    crowding: 'Crowding',
    offload: 'EMS offload',
    boarding: 'Boarding',
    referrals: 'Referrals',
    'trend-metrics': 'Trend metrics',
  });

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
  'longest-untriaged-wait',
  'triage-breach-approaching',
  'triage-breached',
  'rapid-review-flags',
  'queue-size',
  'ems-inbound',
  'crowd-level',
]);

const TRIAGE_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'triage-pending',
  'longest-untriaged-wait',
  'triage-breach-approaching',
  'triage-breached',
  'rapid-review-flags',
  'ems-handoffs-pending',
]);

const CHARGE_NURSE_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'triage-pending',
  'longest-untriaged-wait',
  'triage-breach-approaching',
  'triage-breached',
  'rapid-review-flags',
  'waiting-count',
  'awaiting-clinician',
  'longest-provider-wait',
  'average-provider-wait',
  'provider-wait-approaching',
  'provider-wait-breached',
  'reassessments-due',
  'capacity-score',
  'crowd-level',
  'boarders',
  'ems-inbound',
  'offload-delays',
  'offload-duration',
  'handoff-pending',
]);

const PHYSICIAN_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'awaiting-clinician',
  'longest-provider-wait',
  'average-provider-wait',
  'provider-wait-approaching',
  'provider-wait-breached',
]);

const PUBLIC_WAITING_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'average-wait-range',
  'crowd-level',
  'ems-crowding-impact',
  'process-stage-messaging',
]);

const COMMAND_CENTER_KPIS: readonly EmergencyScreenKpiId[] = Object.freeze([
  'triage-pending',
  'longest-untriaged-wait',
  'triage-breach-approaching',
  'triage-breached',
  'rapid-review-flags',
  'awaiting-clinician',
  'longest-provider-wait',
  'average-provider-wait',
  'provider-wait-approaching',
  'provider-wait-breached',
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
  [CARE_DROID_SCREEN_MODES.physician]: PHYSICIAN_KPIS,
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: [],
  [CARE_DROID_SCREEN_MODES.admin]: [],
});

/** Reception operational strip metric ids (receptionQueueModel). */
export const RECEPTION_KPI_TO_STRIP_ID: Readonly<Partial<Record<EmergencyScreenKpiId, string>>> =
  Object.freeze({
    'arrivals-today': 'arrivals-today',
    'awaiting-verification': 'awaiting-verification',
    'awaiting-triage': 'awaiting-triage',
    'longest-untriaged-wait': 'door-to-triage',
    'triage-breach-approaching': 'triage-breach-risk',
    'triage-breached': 'triage-breached',
    'rapid-review-flags': 'rapid-review',
    'queue-size': 'queue-size',
    'ems-inbound': 'ems-inbound',
    'crowd-level': 'crowd-level',
  });

/** Triage operational strip metric ids (triageWorkflowModel). */
export const TRIAGE_KPI_TO_STRIP_ID: Readonly<Partial<Record<EmergencyScreenKpiId, string>>> =
  Object.freeze({
    'triage-pending': 'triage-pending',
    'longest-untriaged-wait': 'longest-untriaged-wait',
    'triage-breach-approaching': 'triage-breach-approaching',
    'triage-breached': 'triage-breached',
    'rapid-review-flags': 'rapid-review-flags',
    'ems-handoffs-pending': 'ems-handoffs-pending',
  });

/** Charge nurse strip metric ids (chargeNurseWorkflowModel). */
export const CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'triage-pending': 'triage-awaiting',
  'longest-untriaged-wait': 'longest-untriaged',
  'triage-breach-approaching': 'triage-approaching',
  'triage-breached': 'triage-breached',
  'rapid-review-flags': 'rapid-review',
  'waiting-count': 'waiting-count',
  'awaiting-clinician': 'provider-awaiting',
  'longest-provider-wait': 'longest-provider-wait',
  'average-provider-wait': 'average-provider-wait',
  'provider-wait-approaching': 'provider-approaching',
  'provider-wait-breached': 'provider-breached',
  'reassessments-due': 'reassessments',
  'capacity-score': 'capacity',
  'crowd-level': 'crowd-level',
  boarders: 'boarding',
  'ems-inbound': 'ems-inbound',
  'offload-delays': 'offload-delays',
  'offload-duration': 'offload-duration',
  'handoff-pending': 'handoff-pending',
});

/** Charge nurse strip widget surfaces for backward-compatible filtering. */
export const CHARGE_NURSE_KPI_TO_STRIP_SURFACE: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'triage-pending': CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  'longest-untriaged-wait': CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  'triage-breach-approaching': CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  'triage-breached': CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  'rapid-review-flags': CHARGE_NURSE_SCREEN_WIDGETS.triageBreach,
  'waiting-count': CHARGE_NURSE_SCREEN_WIDGETS.queueHealth,
  'awaiting-clinician': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'longest-provider-wait': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'average-provider-wait': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'provider-wait-approaching': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'provider-wait-breached': CHARGE_NURSE_SCREEN_WIDGETS.providerWaitBreaches,
  'reassessments-due': CHARGE_NURSE_SCREEN_WIDGETS.reassessmentsDue,
  'capacity-score': CHARGE_NURSE_SCREEN_WIDGETS.capacityStatus,
  boarders: CHARGE_NURSE_SCREEN_WIDGETS.boarders,
  'ems-inbound': CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
  'offload-delays': CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
  'offload-duration': CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
  'handoff-pending': CHARGE_NURSE_SCREEN_WIDGETS.emsOffloadAggregate,
  'crowd-level': CHARGE_NURSE_SCREEN_WIDGETS.crowdLevel,
});

export const CHARGE_NURSE_KPI_TO_DEPARTMENT_METRIC_ID: Readonly<
  Partial<Record<EmergencyScreenKpiId, DepartmentStatusMetricId>>
> = Object.freeze({
  'waiting-count': 'waiting-count',
  'awaiting-clinician': 'provider-awaiting',
  'longest-provider-wait': 'longest-provider-wait',
  'average-provider-wait': 'provider-wait-breached',
  'provider-wait-approaching': 'provider-wait-breached',
  'provider-wait-breached': 'provider-wait-breached',
  'reassessments-due': 'reassessments-due',
  'capacity-score': 'capacity-status',
  boarders: 'boarders',
  'offload-delays': 'offload-delays',
});

/** Physician operational strip metric ids (physicianWorkflowModel). */
export const PHYSICIAN_KPI_TO_STRIP_ID: Readonly<Partial<Record<EmergencyScreenKpiId, string>>> =
  Object.freeze({
    'awaiting-clinician': 'provider-awaiting',
    'longest-provider-wait': 'longest-provider-wait',
    'average-provider-wait': 'average-provider-wait',
    'provider-wait-approaching': 'provider-approaching',
    'provider-wait-breached': 'provider-breached',
  });

/** Physician strip widget surfaces. */
export const PHYSICIAN_KPI_TO_STRIP_SURFACE: Readonly<
  Partial<Record<EmergencyScreenKpiId, string>>
> = Object.freeze({
  'awaiting-clinician': PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
  'longest-provider-wait': PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
  'average-provider-wait': PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
  'provider-wait-approaching': PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
  'provider-wait-breached': PHYSICIAN_SCREEN_WIDGETS.providerWaitBreaches,
});

export const PUBLIC_WAITING_KPI_TO_WIDGET: Readonly<Partial<Record<EmergencyScreenKpiId, string>>> =
  Object.freeze({
    'average-wait-range': PUBLIC_WAITING_SCREEN_WIDGETS.waitRange,
    'crowd-level': PUBLIC_WAITING_SCREEN_WIDGETS.crowdLevel,
    'ems-crowding-impact': PUBLIC_WAITING_SCREEN_WIDGETS.emsCrowdingImpact,
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
  'triage-pending': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.triageAwaiting,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage,
  ]),
  'longest-untriaged-wait': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.longestUntriagedWait]),
  'triage-breach-approaching': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.triageApproachingBreach,
  ]),
  'triage-breached': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.triageBreached]),
  'rapid-review-flags': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.rapidReviewFlags]),
  'awaiting-clinician': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.providerAwaiting,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider,
  ]),
  'longest-provider-wait': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.longestProviderWait]),
  'average-provider-wait': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider]),
  'provider-wait-approaching': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.providerApproachingBreach,
  ]),
  'provider-wait-breached': Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.providerBreached]),
  throughput: Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
    COMMAND_CENTER_SCREEN_WIDGETS.waitingCount,
    COMMAND_CENTER_SCREEN_WIDGETS.longestWait,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitTriage,
    COMMAND_CENTER_SCREEN_WIDGETS.avgWaitProvider,
  ]),
  crowding: Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.crowdLevel,
    COMMAND_CENTER_SCREEN_WIDGETS.capacityScore,
    COMMAND_CENTER_SCREEN_WIDGETS.crowdingForecast,
  ]),
  offload: Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.emsInbound,
    COMMAND_CENTER_SCREEN_WIDGETS.emsOffloadDelays,
    COMMAND_CENTER_SCREEN_WIDGETS.offloadDuration,
    COMMAND_CENTER_SCREEN_WIDGETS.handoffPending,
  ]),
  boarding: Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.boardingDuration]),
  referrals: Object.freeze([COMMAND_CENTER_SCREEN_WIDGETS.referralsBacklog]),
  'trend-metrics': Object.freeze([
    COMMAND_CENTER_SCREEN_WIDGETS.trendIndicators,
    COMMAND_CENTER_SCREEN_WIDGETS.arrivalsByHour,
    COMMAND_CENTER_SCREEN_WIDGETS.lwbsRisk,
    COMMAND_CENTER_SCREEN_WIDGETS.systemHealth,
  ]),
});

export const COMMAND_CENTER_KPI_TO_METRIC_ID = Object.freeze({
  'triage-pending': Object.freeze(['triage-awaiting', 'avg-wait-triage']),
  'longest-untriaged-wait': Object.freeze(['longest-untriaged-wait']),
  'triage-breach-approaching': Object.freeze(['triage-approaching-breach']),
  'triage-breached': Object.freeze(['triage-breached']),
  'rapid-review-flags': Object.freeze(['rapid-review-flags']),
  'awaiting-clinician': Object.freeze(['provider-awaiting', 'avg-wait-provider']),
  'longest-provider-wait': Object.freeze(['longest-provider-wait']),
  'average-provider-wait': Object.freeze(['avg-wait-provider']),
  'provider-wait-approaching': Object.freeze(['provider-approaching-breach']),
  'provider-wait-breached': Object.freeze(['provider-breached']),
  throughput: Object.freeze([
    'waiting-count',
    'longest-wait',
    'avg-wait-triage',
    'avg-wait-provider',
  ]),
  crowding: Object.freeze(['crowd-level', 'capacity-score']),
  offload: Object.freeze([
    'ems-inbound',
    'ems-offload-delays',
    'offload-duration',
    'handoff-pending',
  ]),
  boarding: Object.freeze(['boarding-duration']),
  referrals: Object.freeze(['referrals-backlog']),
  'trend-metrics': Object.freeze(['lwbs-risk']),
}) as Readonly<Partial<Record<EmergencyScreenKpiId, readonly CommandCenterMetricId[]>>>;

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
  [CARE_DROID_SCREEN_MODES.physician]: Object.freeze([
    'providerBreached',
    'waiting',
    'longestWait',
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
  settings: ScreenModeKpiSettingsInput = {},
): readonly EmergencyScreenKpiId[] {
  const defaults = EMERGENCY_SCREEN_KPI_POLICY[screenMode] || [];
  const configured = settings.screenModeKpiVisibility?.[screenMode];

  let kpiIds: EmergencyScreenKpiId[] =
    configured && configured.length
      ? configured.filter((id) => defaults.includes(id))
      : [...defaults];

  if (screenMode === CARE_DROID_SCREEN_MODES.publicWaiting) {
    const privacy = String(settings.publicDisplayPrivacy || 'standard').toLowerCase();
    if (privacy === 'minimal') {
      kpiIds = kpiIds.filter((id) => id === 'crowd-level');
    }
  }

  return resolvePilotStationKpiIds(screenMode, kpiIds);
}

export function resolveReceptionStripMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.reception) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => RECEPTION_KPI_TO_STRIP_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveTriageStripMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.triage) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => TRIAGE_KPI_TO_STRIP_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolvePhysicianStripMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.physician) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => PHYSICIAN_KPI_TO_STRIP_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveChargeNurseStripMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID[kpiId])
    .filter((id): id is string => Boolean(id));
}

export function resolveChargeNurseStripSurfaces(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_STRIP_SURFACE[kpiId])
    .filter((surface): surface is string => Boolean(surface));
}

export function resolveChargeNurseDepartmentMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): DepartmentStatusMetricId[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.chargeNurse) return null;
  return resolveScreenModeKpiIds(screenMode, settings)
    .map((kpiId) => CHARGE_NURSE_KPI_TO_DEPARTMENT_METRIC_ID[kpiId])
    .filter((id): id is DepartmentStatusMetricId => Boolean(id));
}

export function resolvePublicWaitingKpiWidgets(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): string[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.publicWaiting) return null;
  const widgets = new Set<string>();
  resolveScreenModeKpiIds(screenMode, settings).forEach((kpiId) => {
    const primary = PUBLIC_WAITING_KPI_TO_WIDGET[kpiId];
    const secondary = PUBLIC_WAITING_KPI_TO_SECONDARY_WIDGET[kpiId];
    if (primary) widgets.add(primary);
    if (secondary) widgets.add(secondary);
  });
  return [...widgets];
}

export function resolveCommandCenterMetricIds(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): CommandCenterMetricId[] | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.commandCenter) return null;
  const metricIds = new Set<CommandCenterMetricId>();
  resolveScreenModeKpiIds(screenMode, settings).forEach((kpiId) => {
    (COMMAND_CENTER_KPI_TO_METRIC_ID[kpiId] || []).forEach((id) => metricIds.add(id));
  });
  return [...metricIds];
}

export function resolveCommandCenterWidgetVisibility(
  screenMode: CareDroidScreenMode,
  settings?: ScreenModeKpiSettingsInput,
): Partial<Record<string, boolean>> | null {
  if (screenMode !== CARE_DROID_SCREEN_MODES.commandCenter) return null;
  const enabledWidgets = new Set<string>();
  resolveScreenModeKpiIds(screenMode, settings).forEach((kpiId) => {
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
): readonly string[] | null {
  return (
    resolvePilotHeaderOperationalMetricKeys(screenMode) ||
    SCREEN_MODE_HEADER_OPERATIONAL_KEYS[screenMode] ||
    null
  );
}

export function filterOperationalMetricsByScreenMode<T extends { key: string }>(
  metrics: T[] = [],
  screenMode: CareDroidScreenMode,
): T[] {
  const allowedKeys = resolveHeaderOperationalMetricKeys(screenMode);
  if (!allowedKeys?.length) return metrics;
  const allowed = new Set(allowedKeys);
  return metrics.filter((metric) => allowed.has(metric.key));
}

function localDateKey(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

/** Lightweight triage KPI resolver for strip/header contexts. */
export function buildTriageKpiValues(
  input: {
    patients?: Patient[];
    emsArrivals?: EMSArrival[];
    settings?: Record<string, unknown> | null;
    now?: Date;
  } = {},
): Record<
  | 'triage-pending'
  | 'longest-untriaged-wait'
  | 'triage-breach-approaching'
  | 'triage-breached'
  | 'rapid-review-flags'
  | 'ems-handoffs-pending',
  { value: string | number; tone: EmergencyScreenKpiTone; detail: string }
> {
  const now = input.now || new Date();
  const patients = input.patients || [];
  const visibility = buildTriageBreachVisibilitySnapshot(patients, {
    settings: input.settings ? { emergencySettings: input.settings } : undefined,
    now,
  });
  const emsAwareness = summarizeEmsAwareness(input.emsArrivals || [], now.getTime(), {
    patients,
  });

  return {
    'triage-pending': {
      value: visibility.awaitingTriageCount,
      tone:
        visibility.awaitingTriageCount >= 4
          ? 'critical'
          : visibility.awaitingTriageCount >= 2
            ? 'warning'
            : visibility.awaitingTriageCount
              ? 'watch'
              : 'stable',
      detail: 'Patients awaiting triage nurse review',
    },
    'longest-untriaged-wait': {
      value: visibility.longestUntriagedWaitLabel,
      tone:
        visibility.breachedCount >= 3
          ? 'critical'
          : visibility.approachingBreachCount
            ? 'warning'
            : 'stable',
      detail: `Door-to-triage target ${visibility.summary.targetMinutes}m`,
    },
    'triage-breach-approaching': {
      value: visibility.approachingBreachCount,
      tone: visibility.approachingBreachCount ? 'warning' : 'stable',
      detail: `Within ${visibility.summary.warningMinutes}m of ${visibility.summary.targetMinutes}m target`,
    },
    'triage-breached': {
      value: visibility.breachedCount,
      tone:
        visibility.breachedCount >= 3
          ? 'critical'
          : visibility.breachedCount
            ? 'warning'
            : 'stable',
      detail: visibility.breachedCount
        ? `Longest ${visibility.summary.longestElapsedLabel}`
        : `Target ${visibility.summary.targetMinutes}m`,
    },
    'rapid-review-flags': {
      value: visibility.rapidReviewFlags,
      tone: visibility.rapidReviewFlags ? 'warning' : 'stable',
      detail: 'High-risk complaint flags needing rapid review',
    },
    'ems-handoffs-pending': {
      value: emsAwareness.awaitingHandoff,
      tone: emsAwareness.awaitingHandoff ? 'watch' : 'stable',
      detail: 'EMS units awaiting handoff completion',
    },
  };
}

/** Lightweight provider-wait KPI resolver for strip/header contexts. */
export function buildProviderWaitKpiValues(
  input: {
    patients?: Patient[];
    settings?: Record<string, unknown> | null;
    now?: Date;
  } = {},
): Record<
  | 'awaiting-clinician'
  | 'longest-provider-wait'
  | 'average-provider-wait'
  | 'provider-wait-approaching'
  | 'provider-wait-breached',
  { value: string | number; tone: EmergencyScreenKpiTone; detail: string }
> {
  const visibility = buildProviderWaitVisibilitySnapshot(input.patients || [], {
    settings: input.settings ? { emergencySettings: input.settings } : undefined,
    now: input.now || new Date(),
  });

  return {
    'awaiting-clinician': {
      value: visibility.awaitingClinicianCount,
      tone:
        visibility.awaitingClinicianCount >= 6
          ? 'critical'
          : visibility.awaitingClinicianCount >= 3
            ? 'warning'
            : visibility.awaitingClinicianCount
              ? 'watch'
              : 'stable',
      detail: 'Patients waiting for first clinician contact',
    },
    'longest-provider-wait': {
      value: visibility.longestProviderWaitLabel,
      tone:
        visibility.breachedCount >= 3
          ? 'critical'
          : visibility.approachingThresholdCount
            ? 'warning'
            : 'stable',
      detail: `CTAS thresholds · default target ${visibility.summary.defaultTargetMinutes}m`,
    },
    'average-provider-wait': {
      value: visibility.averageProviderWaitLabel,
      tone:
        visibility.averageProviderWaitMinutes != null &&
        visibility.averageProviderWaitMinutes >= visibility.summary.defaultTargetMinutes
          ? 'critical'
          : visibility.approachingThresholdCount
            ? 'warning'
            : 'stable',
      detail: `Mean triage-to-provider wait · warning ${visibility.summary.warningMinutes}m`,
    },
    'provider-wait-approaching': {
      value: visibility.approachingThresholdCount,
      tone: visibility.approachingThresholdCount ? 'warning' : 'stable',
      detail: `Within ${visibility.summary.warningMinutes}m of patient CTAS target`,
    },
    'provider-wait-breached': {
      value: visibility.breachedCount,
      tone:
        visibility.breachedCount >= 3
          ? 'critical'
          : visibility.breachedCount
            ? 'warning'
            : 'stable',
      detail: visibility.breachedCount
        ? `Longest ${visibility.summary.longestElapsedLabel}`
        : `Default target ${visibility.summary.defaultTargetMinutes}m`,
    },
  };
}

const CHARGE_STRIP_TO_KPI_ID = Object.freeze(
  Object.fromEntries(
    Object.entries(CHARGE_NURSE_KPI_TO_STRIP_METRIC_ID).map(([kpiId, stripId]) => [stripId, kpiId]),
  ) as Record<string, EmergencyScreenKpiId>,
);

const CHARGE_KPI_LABELS: Partial<Record<EmergencyScreenKpiId, string>> = Object.freeze({
  'triage-pending': 'Awaiting triage',
  'longest-untriaged-wait': 'Longest untriaged wait',
  'triage-breach-approaching': 'Approaching breach',
  'triage-breached': 'Triage breached',
  'rapid-review-flags': 'Rapid-review flags',
  'waiting-count': 'Waiting count',
  'awaiting-clinician': 'Awaiting clinician',
  'longest-provider-wait': 'Longest provider wait',
  'average-provider-wait': 'Average provider wait',
  'provider-wait-approaching': 'Approaching threshold',
  'provider-wait-breached': 'Provider wait breached',
  'reassessments-due': 'Reassessments due',
  'capacity-score': 'Capacity score',
  'crowd-level': 'Crowd level',
  boarders: 'Boarders',
  'offload-delays': 'Offload delays',
});

export function buildChargeNurseKpiValues(input: {
  patients?: Patient[];
  emsArrivals?: EMSArrival[];
  settings?: Record<string, unknown> | null;
  emsInbound?: number;
  capacity?: CapacitySnapshot;
  now?: Date;
}): Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> {
  const stripMetrics = selectChargeNurseOperationalStrip({
    patients: input.patients || [],
    emsArrivals: input.emsArrivals || [],
    settings: input.settings || {},
    activeEmsArrivals: input.emsInbound ?? 0,
    capacity: input.capacity,
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
  const triageAwaiting = metricById.get('triage-awaiting');
  const longestUntriaged = metricById.get('longest-untriaged-wait');
  const triageApproaching = metricById.get('triage-approaching-breach');
  const triageBreached = metricById.get('triage-breached');
  const rapidReview = metricById.get('rapid-review-flags');
  const providerAwaiting = metricById.get('provider-awaiting');
  const longestProviderWait = metricById.get('longest-provider-wait');
  const providerApproaching = metricById.get('provider-approaching-breach');
  const providerBreached = metricById.get('provider-breached');
  const avgTriage = metricById.get('avg-wait-triage');
  const avgProvider = metricById.get('avg-wait-provider');
  const offload = metricById.get('ems-offload-delays');
  const boarding = metricById.get('boarding-duration');
  const referralsBacklog = metricById.get('referrals-backlog');
  const lwbsRisk = metricById.get('lwbs-risk');

  return {
    'triage-pending': {
      id: 'triage-pending',
      label: 'Awaiting triage',
      value: triageAwaiting?.value ?? 0,
      tone: (triageAwaiting?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: triageAwaiting?.detail,
      source: 'commandCenterThroughputModel.triage-awaiting',
    },
    'longest-untriaged-wait': {
      id: 'longest-untriaged-wait',
      label: 'Longest untriaged wait',
      value: longestUntriaged?.value ?? '—',
      tone: (longestUntriaged?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: longestUntriaged?.detail,
      source: 'commandCenterThroughputModel.longest-untriaged-wait',
    },
    'triage-breach-approaching': {
      id: 'triage-breach-approaching',
      label: 'Approaching breach',
      value: triageApproaching?.value ?? 0,
      tone: (triageApproaching?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: triageApproaching?.detail,
      source: 'commandCenterThroughputModel.triage-approaching-breach',
    },
    'triage-breached': {
      id: 'triage-breached',
      label: 'Triage breached',
      value: triageBreached?.value ?? 0,
      tone: (triageBreached?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: triageBreached?.detail,
      source: 'commandCenterThroughputModel.triage-breached',
    },
    'rapid-review-flags': {
      id: 'rapid-review-flags',
      label: 'Rapid-review flags',
      value: rapidReview?.value ?? 0,
      tone: (rapidReview?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: rapidReview?.detail,
      source: 'commandCenterThroughputModel.rapid-review-flags',
    },
    'awaiting-clinician': {
      id: 'awaiting-clinician',
      label: 'Awaiting clinician',
      value: providerAwaiting?.value ?? 0,
      tone: (providerAwaiting?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: providerAwaiting?.detail,
      source: 'commandCenterThroughputModel.provider-awaiting',
    },
    'longest-provider-wait': {
      id: 'longest-provider-wait',
      label: 'Longest provider wait',
      value: longestProviderWait?.value ?? '—',
      tone: (longestProviderWait?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: longestProviderWait?.detail,
      source: 'commandCenterThroughputModel.longest-provider-wait',
    },
    'average-provider-wait': {
      id: 'average-provider-wait',
      label: 'Average provider wait',
      value: avgProvider?.value ?? '—',
      tone: (avgProvider?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: avgProvider?.detail,
      source: 'commandCenterThroughputModel.avg-wait-provider',
    },
    'provider-wait-approaching': {
      id: 'provider-wait-approaching',
      label: 'Approaching threshold',
      value: providerApproaching?.value ?? 0,
      tone: (providerApproaching?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: providerApproaching?.detail,
      source: 'commandCenterThroughputModel.provider-approaching-breach',
    },
    'provider-wait-breached': {
      id: 'provider-wait-breached',
      label: 'Provider wait breached',
      value: providerBreached?.value ?? 0,
      tone: (providerBreached?.tone as EmergencyScreenKpiTone) || 'stable',
      detail: providerBreached?.detail,
      source: 'commandCenterThroughputModel.provider-breached',
    },
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
      label: 'Crowd level',
      value: throughput.crowdLevel.staffLabel,
      tone: throughput.crowdLevel.tone as EmergencyScreenKpiTone,
      detail: throughput.crowdingForecast.detail,
      source: 'crowdLevelEngine.commandCenter',
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
  emsArrivals?: EMSArrival[];
  now?: Date;
}): Partial<Record<EmergencyScreenKpiId, EmergencyScreenKpi>> {
  const snapshot = buildPublicWaitingDisplaySnapshot({
    patients: input.patients || [],
    capacity: input.capacity,
    referrals: input.referrals || [],
    emsArrivals: input.emsArrivals || [],
    showEmsCrowdingImpact: true,
    now: input.now || new Date(),
    updatedAt: input.capacity?.updatedAt || null,
  });
  return {
    'average-wait-range': {
      id: 'average-wait-range',
      label: snapshot.waitRange.label,
      value: snapshot.waitRange.value,
      tone: 'info',
      detail: `${snapshot.waitRange.detail} ${snapshot.waitRange.disclaimer}`,
      source: 'publicWaitingDisplayModel.waitRange',
    },
    'crowd-level': {
      id: 'crowd-level',
      label: 'Crowd level',
      value: snapshot.crowdLevel.label,
      tone: snapshot.crowdLevel.tone as EmergencyScreenKpiTone,
      detail: snapshot.crowdLevel.detail,
      source: 'crowdLevelEngine.publicWaiting',
    },
    'ems-crowding-impact': {
      id: 'ems-crowding-impact',
      label: 'Ambulance crowding impact',
      value: snapshot.emsCrowdingImpact.active ? snapshot.emsCrowdingImpact.label : 'Not shown',
      tone: snapshot.emsCrowdingImpact.tone as EmergencyScreenKpiTone,
      detail: snapshot.emsCrowdingImpact.detail,
      source: 'emsOffloadVisibilityModel.publicCrowdingImpact',
    },
    'process-stage-messaging': {
      id: 'process-stage-messaging',
      label: 'Visit process education',
      value: `${snapshot.processEducation.steps.length} steps`,
      tone: 'neutral',
      detail: `${snapshot.processEducation.intro} Live status: ${snapshot.statusMessaging.summaryLine}`,
      source: 'waitingRoomProcessEducation.steps',
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
  const kpiSettings = (input.settings || {}) as ScreenModeKpiSettingsInput;
  const kpiIds = resolveScreenModeKpiIds(input.screenMode, kpiSettings);
  const patients = input.patients || [];
  const kpis: EmergencyScreenKpi[] = [];

  if (input.screenMode === CARE_DROID_SCREEN_MODES.reception) {
    const today = localDateKey();
    const arrivalsToday = patients.filter(
      (patient) => localDateKey(patient.arrivalTime) === today,
    ).length;
    const triageVisibility = buildTriageBreachVisibilitySnapshot(patients, {
      settings: input.settings ? { emergencySettings: input.settings } : undefined,
      now: input.now || new Date(),
    });
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
        value: triageVisibility.awaitingTriageCount,
        tone: triageVisibility.awaitingTriageCount >= 6 ? 'warning' : 'stable',
        source: 'triageBreachVisibility.awaitingTriageCount',
      },
      'longest-untriaged-wait': {
        id: 'longest-untriaged-wait',
        label: 'Longest untriaged wait',
        value: triageVisibility.longestUntriagedWaitLabel,
        tone: triageVisibility.breachedCount
          ? 'critical'
          : triageVisibility.approachingBreachCount
            ? 'warning'
            : 'stable',
        source: 'triageBreachVisibility.longestUntriagedWait',
      },
      'triage-breach-approaching': {
        id: 'triage-breach-approaching',
        label: 'Approaching breach',
        value: triageVisibility.approachingBreachCount,
        tone: triageVisibility.approachingBreachCount ? 'warning' : 'stable',
        source: 'triageBreachVisibility.approachingBreachCount',
      },
      'triage-breached': {
        id: 'triage-breached',
        label: 'Triage breached',
        value: triageVisibility.breachedCount,
        tone: triageVisibility.breachedCount ? 'critical' : 'stable',
        source: 'triageBreachVisibility.breachedCount',
      },
      'rapid-review-flags': {
        id: 'rapid-review-flags',
        label: 'Rapid-review flags',
        value: triageVisibility.rapidReviewFlags,
        tone: triageVisibility.rapidReviewFlags ? 'warning' : 'stable',
        source: 'triageBreachVisibility.rapidReviewFlags',
      },
      'queue-size': {
        id: 'queue-size',
        label: 'Queue size',
        value: awaitingVerification + triageVisibility.awaitingTriageCount,
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
      'crowd-level': (() => {
        const crowd = buildCrowdLevelSnapshot({
          patients,
          capacity: input.capacity,
          emsArrivals: input.emsArrivals || [],
          emsInbound: input.emsInbound ?? 0,
          settings: input.settings || undefined,
          now: input.now || new Date(),
        });
        return {
          id: 'crowd-level',
          label: 'Crowd level',
          value: crowd.staffLabel,
          tone: crowd.tone as EmergencyScreenKpiTone,
          detail: crowd.detail,
          source: 'crowdLevelEngine.reception',
        };
      })(),
    } as Record<EmergencyScreenKpiId, EmergencyScreenKpi>;

    kpiIds.forEach((id) => {
      if (receptionValues[id]) kpis.push(receptionValues[id]);
    });
  }

  if (input.screenMode === CARE_DROID_SCREEN_MODES.triage) {
    const triageValues = buildTriageKpiValues(input);
    const triageLabels: Record<string, string> = {
      'triage-pending': 'Awaiting triage',
      'longest-untriaged-wait': 'Longest untriaged wait',
      'triage-breach-approaching': 'Approaching breach',
      'triage-breached': 'Triage breached',
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

  if (input.screenMode === CARE_DROID_SCREEN_MODES.physician) {
    const providerValues = buildProviderWaitKpiValues(input);
    kpiIds.forEach((id) => {
      const resolved = providerValues[id as keyof typeof providerValues];
      if (!resolved) return;
      kpis.push({
        id,
        label: EMERGENCY_SCREEN_KPI_LABELS[id] || id,
        value: resolved.value,
        tone: resolved.tone,
        detail: resolved.detail,
        source: `providerWaitKpi.${id}`,
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
      'awaiting-clinician': 'Awaiting clinician',
      'longest-provider-wait': 'Longest provider wait',
      'average-provider-wait': 'Average provider wait',
      'provider-wait-approaching': 'Approaching threshold',
      'provider-wait-breached': 'Provider wait breached',
      'reassessments-due': 'Reassessments due',
      'capacity-score': 'Capacity score',
      boarders: 'Boarders',
      'offload-delays': 'Offload delays',
    };
    const chargeKeyMap: Partial<Record<EmergencyScreenKpiId, string>> = {
      'waiting-count': 'waiting',
      'provider-wait-breached': 'providerBreached',
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
