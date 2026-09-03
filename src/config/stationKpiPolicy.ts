/**
 * Pilot station KPI policy — caps frontline metrics to two actionable signals per screen mode.
 * Full enterprise sets remain in `emergencyScreenKpiPolicy`; this layer applies during practitioner cleanup.
 */
import { CARE_DROID_SCREEN_MODES, type CareDroidScreenMode } from './careDroidScreenModes';
import { isPractitionerCleanupEnabled } from './practitionerCleanup.config';
import type { EmergencyScreenKpiId } from './emergencyScreenKpiPolicy';

export const PILOT_STATION_KPI_LIMIT = 2;

/** Canonical two-KPI sets per frontline station during pilot. */
export const PILOT_STATION_KPI_IDS = Object.freeze({
  [CARE_DROID_SCREEN_MODES.reception]: Object.freeze(['arrivals-today', 'awaiting-triage']),
  [CARE_DROID_SCREEN_MODES.triage]: Object.freeze(['triage-pending', 'triage-breached']),
  [CARE_DROID_SCREEN_MODES.chargeNurse]: Object.freeze(['waiting-count', 'triage-breached']),
  [CARE_DROID_SCREEN_MODES.physician]: Object.freeze([
    'awaiting-clinician',
    'provider-wait-breached',
  ]),
  [CARE_DROID_SCREEN_MODES.commandCenter]: Object.freeze(['triage-breached', 'crowding']),
  [CARE_DROID_SCREEN_MODES.publicWaiting]: Object.freeze(['average-wait-range', 'crowd-level']),
}) as Readonly<Partial<Record<CareDroidScreenMode, readonly EmergencyScreenKpiId[]>>>;

/** Trimmed central-node header keys aligned with pilot station KPIs. */
export const PILOT_HEADER_OPERATIONAL_KEYS: Readonly<
  Partial<Record<CareDroidScreenMode, readonly string[]>>
> = Object.freeze({
  [CARE_DROID_SCREEN_MODES.triage]: Object.freeze(['triageBreached', 'longestWait']),
  [CARE_DROID_SCREEN_MODES.physician]: Object.freeze(['providerBreached', 'waiting']),
  [CARE_DROID_SCREEN_MODES.chargeNurse]: Object.freeze(['waiting', 'triageBreached']),
  [CARE_DROID_SCREEN_MODES.commandCenter]: Object.freeze(['waiting', 'capacityScore']),
  [CARE_DROID_SCREEN_MODES.reception]: Object.freeze(['arrivalControlPending', 'longestWait']),
  [CARE_DROID_SCREEN_MODES.readOnlyWhiteboard]: Object.freeze(['waiting', 'longestWait']),
});

export const COMPACT_KPI_LABELS: Readonly<Partial<Record<EmergencyScreenKpiId, string>>> =
  Object.freeze({
    'arrivals-today': 'Arrivals',
    'awaiting-verification': 'Verify',
    'awaiting-triage': 'Triage queue',
    'queue-size': 'Queue',
    'ems-inbound': 'EMS',
    'triage-pending': 'Awaiting triage',
    'longest-untriaged-wait': 'Longest wait',
    'triage-breach-approaching': 'Approaching',
    'triage-breached': 'Breached',
    'rapid-review-flags': 'Rapid review',
    'ems-handoffs-pending': 'EMS handoff',
    'waiting-count': 'Waiting',
    'awaiting-clinician': 'Awaiting MD',
    'longest-provider-wait': 'Longest MD wait',
    'average-provider-wait': 'Avg MD wait',
    'provider-wait-approaching': 'MD approaching',
    'provider-wait-breached': 'MD breached',
    'reassessments-due': 'Reassess',
    'capacity-score': 'Capacity',
    boarders: 'Boarders',
    'offload-delays': 'Offload',
    'offload-duration': 'Offload time',
    'handoff-pending': 'Handoff',
    'average-wait-range': 'Wait range',
    'crowd-level': 'Crowd',
    throughput: 'Throughput',
    crowding: 'Crowding',
    offload: 'EMS offload',
    boarding: 'Boarding',
    referrals: 'Referrals',
    'trend-metrics': 'LWBS risk',
  });

/** Short labels for operational strip metric ids (reception/triage/charge workflows). */
export const COMPACT_STRIP_METRIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'arrivals-today': 'Arrivals',
  'awaiting-verification': 'Verify',
  'awaiting-triage': 'Triage queue',
  'door-to-triage': 'Door-to-triage',
  'triage-breach-risk': 'At risk',
  'triage-breached': 'Breached',
  'rapid-review': 'Rapid review',
  'queue-size': 'Queue',
  'ems-inbound': 'EMS',
  'crowd-level': 'Crowd',
  'triage-pending': 'Awaiting triage',
  'longest-untriaged-wait': 'Longest wait',
  'triage-breach-approaching': 'Approaching',
  'rapid-review-flags': 'Rapid review',
  'ems-handoffs-pending': 'EMS handoff',
  'triage-awaiting': 'Awaiting triage',
  'longest-untriaged': 'Longest wait',
  'triage-approaching': 'Approaching',
  'waiting-count': 'Waiting',
  'provider-awaiting': 'Awaiting MD',
  'longest-provider-wait': 'Longest MD',
  'average-provider-wait': 'Avg MD wait',
  'provider-approaching': 'MD approaching',
  'provider-breached': 'MD breached',
  reassessments: 'Reassess',
  capacity: 'Capacity',
  boarding: 'Boarders',
  'offload-delays': 'Offload',
  'offload-duration': 'Offload time',
  'handoff-pending': 'Handoff',
});

/** Short labels for central-node header metric keys (operationalSummary.metrics). */
export const COMPACT_HEADER_METRIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  patientsToday: 'Arrivals',
  waiting: 'Waiting',
  longestWait: 'Longest wait',
  averageWait: 'Avg wait',
  emsInbound: 'EMS',
  reassessmentsDue: 'Reassess',
  capacityScore: 'Capacity',
  boarders: 'Boarders',
  referralsPending: 'Referrals',
  arrivalControlPending: 'Triage queue',
  emsOffload: 'EMS offload',
  triageBreached: 'Breached',
  providerBreached: 'MD breached',
});

export function isPilotStationKpiPolicyActive(): boolean {
  return isPractitionerCleanupEnabled();
}

export function resolvePilotStationKpiIds(
  screenMode: CareDroidScreenMode,
  kpiIds: readonly EmergencyScreenKpiId[],
): readonly EmergencyScreenKpiId[] {
  if (!isPilotStationKpiPolicyActive()) return kpiIds;
  const pilotIds = PILOT_STATION_KPI_IDS[screenMode];
  if (!pilotIds?.length) return kpiIds;

  const allowed = new Set(kpiIds);
  const ordered = pilotIds.filter((id) => allowed.has(id));
  return ordered.length
    ? ordered.slice(0, PILOT_STATION_KPI_LIMIT)
    : pilotIds.slice(0, PILOT_STATION_KPI_LIMIT);
}

export function resolvePilotHeaderOperationalMetricKeys(
  screenMode: CareDroidScreenMode,
): readonly string[] | null {
  if (!isPilotStationKpiPolicyActive()) return null;
  return PILOT_HEADER_OPERATIONAL_KEYS[screenMode] || null;
}

export function resolveCompactKpiLabel(kpiId: EmergencyScreenKpiId, fallback: string): string {
  return COMPACT_KPI_LABELS[kpiId] || fallback;
}

export function resolveCompactStripMetricLabel(metricId: string, fallback: string): string {
  return COMPACT_STRIP_METRIC_LABELS[metricId] || fallback;
}

export function resolveCompactHeaderMetricLabel(metricKey: string, fallback: string): string {
  return COMPACT_HEADER_METRIC_LABELS[metricKey] || fallback;
}

export function compactOperationalStripMetrics<T extends { id: string; label: string }>(
  metrics: T[] = [],
): T[] {
  if (!isPilotStationKpiPolicyActive()) return metrics;
  return metrics.map((metric) => ({
    ...metric,
    label: resolveCompactStripMetricLabel(metric.id, metric.label),
  }));
}
