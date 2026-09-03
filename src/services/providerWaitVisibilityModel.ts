import {
  isAwaitingProvider,
  resolveTriageToProviderElapsedMinutes,
  summarizeProviderWaitBreachBoard,
  type ProviderWaitBreachBoardSummary,
  type ProviderWaitBreachContext,
} from './providerWaitBreachTimer';
import type { Patient } from '../types/emergency';

export type ProviderWaitVisibilityMetricId =
  | 'awaiting-clinician'
  | 'longest-provider-wait'
  | 'average-provider-wait'
  | 'provider-wait-approaching'
  | 'provider-wait-breached';

export type ProviderWaitVisibilitySnapshot = {
  summary: ProviderWaitBreachBoardSummary;
  awaitingClinicianCount: number;
  longestProviderWaitLabel: string;
  averageProviderWaitMinutes: number | null;
  averageProviderWaitLabel: string;
  approachingThresholdCount: number;
  breachedCount: number;
  onTrackCount: number;
};

export type ProviderWaitVisibilityStripMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  queueTab?: string | null;
  tone?: 'neutral' | 'info' | 'watch' | 'warning' | 'critical';
};

const METRIC_LABELS: Readonly<Record<ProviderWaitVisibilityMetricId, string>> = Object.freeze({
  'awaiting-clinician': 'Awaiting clinician',
  'longest-provider-wait': 'Longest provider wait',
  'average-provider-wait': 'Average provider wait',
  'provider-wait-approaching': 'Approaching threshold',
  'provider-wait-breached': 'Provider wait breached',
});

export const PROVIDER_WAIT_VISIBILITY_SURFACES = Object.freeze([
  'whiteboard',
  'charge-nurse',
  'physician',
  'command-center',
]);

function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function computeAverageProviderWaitMinutes(patients: Patient[], now: Date): number | null {
  const awaiting = patients.filter(isAwaitingProvider);
  if (!awaiting.length) return null;
  const values = awaiting.map((patient) => resolveTriageToProviderElapsedMinutes(patient, now));
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function buildProviderWaitVisibilitySnapshot(
  patients: Patient[] = [],
  context: ProviderWaitBreachContext = {},
): ProviderWaitVisibilitySnapshot {
  const now = context.now || new Date();
  const summary = summarizeProviderWaitBreachBoard(patients, context);
  const averageProviderWaitMinutes = computeAverageProviderWaitMinutes(patients, now);

  return {
    summary,
    awaitingClinicianCount: summary.awaitingProviderCount,
    longestProviderWaitLabel: summary.longestElapsedLabel,
    averageProviderWaitMinutes,
    averageProviderWaitLabel:
      averageProviderWaitMinutes != null ? formatDuration(averageProviderWaitMinutes) : '—',
    approachingThresholdCount: summary.approachingThresholdCount,
    breachedCount: summary.breachedCount,
    onTrackCount: summary.onTrackCount,
  };
}

function metricTone(
  id: ProviderWaitVisibilityMetricId,
  snapshot: ProviderWaitVisibilitySnapshot,
): ProviderWaitVisibilityStripMetric['tone'] {
  switch (id) {
    case 'awaiting-clinician':
      if (snapshot.awaitingClinicianCount >= 6) return 'critical';
      if (snapshot.awaitingClinicianCount >= 3) return 'warning';
      return snapshot.awaitingClinicianCount ? 'watch' : 'neutral';
    case 'longest-provider-wait':
      if (snapshot.breachedCount) return 'critical';
      if (snapshot.approachingThresholdCount) return 'warning';
      return snapshot.awaitingClinicianCount ? 'watch' : 'neutral';
    case 'average-provider-wait':
      if (
        snapshot.averageProviderWaitMinutes != null &&
        snapshot.averageProviderWaitMinutes >= snapshot.summary.defaultTargetMinutes
      ) {
        return 'critical';
      }
      if (
        snapshot.averageProviderWaitMinutes != null &&
        snapshot.averageProviderWaitMinutes >= snapshot.summary.warningMinutes
      ) {
        return 'warning';
      }
      return snapshot.awaitingClinicianCount ? 'watch' : 'neutral';
    case 'provider-wait-approaching':
      return snapshot.approachingThresholdCount ? 'warning' : 'neutral';
    case 'provider-wait-breached':
      return snapshot.breachedCount >= 3
        ? 'critical'
        : snapshot.breachedCount
          ? 'critical'
          : 'neutral';
    default:
      return 'neutral';
  }
}

function metricValue(
  id: ProviderWaitVisibilityMetricId,
  snapshot: ProviderWaitVisibilitySnapshot,
): string | number {
  switch (id) {
    case 'awaiting-clinician':
      return snapshot.awaitingClinicianCount;
    case 'longest-provider-wait':
      return snapshot.awaitingClinicianCount ? snapshot.longestProviderWaitLabel : '—';
    case 'average-provider-wait':
      return snapshot.averageProviderWaitLabel;
    case 'provider-wait-approaching':
      return snapshot.approachingThresholdCount;
    case 'provider-wait-breached':
      return snapshot.breachedCount;
    default:
      return '—';
  }
}

function metricHint(
  id: ProviderWaitVisibilityMetricId,
  snapshot: ProviderWaitVisibilitySnapshot,
): string {
  const { summary } = snapshot;
  switch (id) {
    case 'awaiting-clinician':
      return 'Patients waiting for first clinician contact';
    case 'longest-provider-wait':
      return `CTAS thresholds · default target ${summary.defaultTargetMinutes}m`;
    case 'average-provider-wait':
      return `Mean triage-to-provider wait · warning ${summary.warningMinutes}m`;
    case 'provider-wait-approaching':
      return `Within ${summary.warningMinutes}m of patient CTAS target`;
    case 'provider-wait-breached':
      return snapshot.breachedCount
        ? `Longest ${summary.longestElapsedLabel}`
        : `Default target ${summary.defaultTargetMinutes}m`;
    default:
      return '';
  }
}

export const PROVIDER_WAIT_VISIBILITY_STRIP_ID_ALIASES: Readonly<
  Record<ProviderWaitVisibilityMetricId, Record<string, string>>
> = Object.freeze({
  'awaiting-clinician': Object.freeze({
    whiteboard: 'provider-awaiting',
    chargeNurse: 'provider-awaiting',
    physician: 'provider-awaiting',
    commandCenter: 'provider-awaiting',
  }),
  'longest-provider-wait': Object.freeze({
    whiteboard: 'longest-provider-wait',
    chargeNurse: 'longest-provider-wait',
    physician: 'longest-provider-wait',
    commandCenter: 'longest-provider-wait',
  }),
  'average-provider-wait': Object.freeze({
    whiteboard: 'average-provider-wait',
    chargeNurse: 'average-provider-wait',
    physician: 'average-provider-wait',
    commandCenter: 'avg-wait-provider',
  }),
  'provider-wait-approaching': Object.freeze({
    whiteboard: 'provider-approaching',
    chargeNurse: 'provider-approaching',
    physician: 'provider-approaching',
    commandCenter: 'provider-approaching-breach',
  }),
  'provider-wait-breached': Object.freeze({
    whiteboard: 'provider-breached',
    chargeNurse: 'provider-breached',
    physician: 'provider-breached',
    commandCenter: 'provider-breached',
  }),
});

export function selectProviderWaitVisibilityMetrics(
  patients: Patient[] = [],
  {
    metricIds = null,
    settings = null,
    now = new Date(),
    surface = 'whiteboard',
  }: {
    metricIds?: readonly ProviderWaitVisibilityMetricId[] | null;
    settings?: Record<string, unknown> | null;
    now?: Date;
    surface?: 'whiteboard' | 'chargeNurse' | 'physician' | 'commandCenter';
  } = {},
): ProviderWaitVisibilityStripMetric[] {
  const snapshot = buildProviderWaitVisibilitySnapshot(patients, {
    settings: settings ? { emergencySettings: settings } : undefined,
    now,
  });

  const ids: ProviderWaitVisibilityMetricId[] = metricIds?.length
    ? [...metricIds]
    : [
        'awaiting-clinician',
        'longest-provider-wait',
        'average-provider-wait',
        'provider-wait-approaching',
        'provider-wait-breached',
      ];

  const aliasMap = PROVIDER_WAIT_VISIBILITY_STRIP_ID_ALIASES;
  const surfaceKey =
    surface === 'whiteboard' ||
    surface === 'chargeNurse' ||
    surface === 'physician' ||
    surface === 'commandCenter'
      ? surface
      : 'whiteboard';

  return ids.map((canonicalId) => ({
    id: aliasMap[canonicalId][surfaceKey],
    label: METRIC_LABELS[canonicalId],
    value: metricValue(canonicalId, snapshot),
    hint: metricHint(canonicalId, snapshot),
    queueTab: 'waiting',
    tone: metricTone(canonicalId, snapshot),
  }));
}

export function hasProviderWaitVisibilityActivity(
  snapshot: ProviderWaitVisibilitySnapshot,
): boolean {
  return Boolean(
    snapshot.awaitingClinicianCount || snapshot.approachingThresholdCount || snapshot.breachedCount,
  );
}
