import { buildArrivalControlSummary } from './arrivalControlLayer';
import {
  summarizeTriageBreachBoard,
  type TriageBreachBoardSummary,
  type TriageBreachContext,
} from './triageBreachTimer';
import type { Patient } from '../types/emergency';

export type TriageBreachVisibilityMetricId =
  | 'awaiting-triage'
  | 'longest-untriaged-wait'
  | 'triage-breach-approaching'
  | 'triage-breached'
  | 'rapid-review-flags';

export type TriageBreachVisibilitySnapshot = {
  summary: TriageBreachBoardSummary;
  awaitingTriageCount: number;
  longestUntriagedWaitLabel: string;
  approachingBreachCount: number;
  breachedCount: number;
  rapidReviewFlags: number;
  onTrackCount: number;
};

export type TriageBreachVisibilityStripMetric = {
  id: string;
  label: string;
  value: string | number;
  hint?: string;
  queueTab?: string | null;
  tone?: 'neutral' | 'info' | 'watch' | 'warning' | 'critical';
};

const METRIC_LABELS: Readonly<Record<TriageBreachVisibilityMetricId, string>> = Object.freeze({
  'awaiting-triage': 'Awaiting triage',
  'longest-untriaged-wait': 'Longest untriaged wait',
  'triage-breach-approaching': 'Approaching breach',
  'triage-breached': 'Triage breached',
  'rapid-review-flags': 'Rapid-review flags',
});

export const TRIAGE_BREACH_VISIBILITY_SURFACES = Object.freeze([
  'reception',
  'triage',
  'charge-nurse',
  'command-center',
]);

export function buildTriageBreachVisibilitySnapshot(
  patients: Patient[] = [],
  context: TriageBreachContext = {},
): TriageBreachVisibilitySnapshot {
  const summary = summarizeTriageBreachBoard(patients, context);
  const arrivalControl = buildArrivalControlSummary(patients);

  return {
    summary,
    awaitingTriageCount: summary.awaitingTriageCount,
    longestUntriagedWaitLabel: summary.longestElapsedLabel,
    approachingBreachCount: summary.breachRiskCount,
    breachedCount: summary.breachedCount,
    rapidReviewFlags: arrivalControl.rapidReview,
    onTrackCount: summary.onTrackCount,
  };
}

function metricTone(
  id: TriageBreachVisibilityMetricId,
  snapshot: TriageBreachVisibilitySnapshot,
): TriageBreachVisibilityStripMetric['tone'] {
  switch (id) {
    case 'awaiting-triage':
      if (snapshot.awaitingTriageCount >= 4) return 'critical';
      if (snapshot.awaitingTriageCount >= 2) return 'warning';
      return snapshot.awaitingTriageCount ? 'watch' : 'neutral';
    case 'longest-untriaged-wait':
      if (snapshot.breachedCount) return 'critical';
      if (snapshot.approachingBreachCount) return 'warning';
      return snapshot.awaitingTriageCount ? 'watch' : 'neutral';
    case 'triage-breach-approaching':
      return snapshot.approachingBreachCount ? 'warning' : 'neutral';
    case 'triage-breached':
      return snapshot.breachedCount >= 3
        ? 'critical'
        : snapshot.breachedCount
          ? 'critical'
          : 'neutral';
    case 'rapid-review-flags':
      return snapshot.rapidReviewFlags ? 'warning' : 'neutral';
    default:
      return 'neutral';
  }
}

function metricValue(
  id: TriageBreachVisibilityMetricId,
  snapshot: TriageBreachVisibilitySnapshot,
): string | number {
  switch (id) {
    case 'awaiting-triage':
      return snapshot.awaitingTriageCount;
    case 'longest-untriaged-wait':
      return snapshot.awaitingTriageCount ? snapshot.longestUntriagedWaitLabel : '—';
    case 'triage-breach-approaching':
      return snapshot.approachingBreachCount;
    case 'triage-breached':
      return snapshot.breachedCount;
    case 'rapid-review-flags':
      return snapshot.rapidReviewFlags;
    default:
      return '—';
  }
}

function metricHint(
  id: TriageBreachVisibilityMetricId,
  snapshot: TriageBreachVisibilitySnapshot,
): string {
  const { summary } = snapshot;
  switch (id) {
    case 'awaiting-triage':
      return 'Patients waiting for triage nurse review';
    case 'longest-untriaged-wait':
      return `Door-to-triage target ${summary.targetMinutes}m · warning ${summary.warningMinutes}m`;
    case 'triage-breach-approaching':
      return `Within ${summary.warningMinutes}m of ${summary.targetMinutes}m target`;
    case 'triage-breached':
      return snapshot.breachedCount
        ? `Longest ${summary.longestElapsedLabel}`
        : `Target ${summary.targetMinutes}m`;
    case 'rapid-review-flags':
      return 'High-risk complaint flags needing rapid review';
    default:
      return '';
  }
}

/** Canonical strip metric ids per surface (maps to local strip builders). */
export const TRIAGE_BREACH_VISIBILITY_STRIP_ID_ALIASES: Readonly<
  Record<TriageBreachVisibilityMetricId, Record<string, string>>
> = Object.freeze({
  'awaiting-triage': Object.freeze({
    reception: 'awaiting-triage',
    triage: 'triage-pending',
    chargeNurse: 'triage-awaiting',
    commandCenter: 'triage-awaiting',
  }),
  'longest-untriaged-wait': Object.freeze({
    reception: 'door-to-triage',
    triage: 'longest-untriaged-wait',
    chargeNurse: 'longest-untriaged',
    commandCenter: 'longest-untriaged-wait',
  }),
  'triage-breach-approaching': Object.freeze({
    reception: 'triage-breach-risk',
    triage: 'triage-breach-approaching',
    chargeNurse: 'triage-approaching',
    commandCenter: 'triage-approaching-breach',
  }),
  'triage-breached': Object.freeze({
    reception: 'triage-breached',
    triage: 'triage-breached',
    chargeNurse: 'triage-breached',
    commandCenter: 'triage-breached',
  }),
  'rapid-review-flags': Object.freeze({
    reception: 'rapid-review',
    triage: 'rapid-review-flags',
    chargeNurse: 'rapid-review',
    commandCenter: 'rapid-review-flags',
  }),
});

export function selectTriageBreachVisibilityMetrics(
  patients: Patient[] = [],
  {
    metricIds = null,
    settings = null,
    now = new Date(),
    surface = 'triage',
  }: {
    metricIds?: readonly TriageBreachVisibilityMetricId[] | null;
    settings?: Record<string, unknown> | null;
    now?: Date;
    surface?: 'reception' | 'triage' | 'chargeNurse' | 'commandCenter';
  } = {},
): TriageBreachVisibilityStripMetric[] {
  const snapshot = buildTriageBreachVisibilitySnapshot(patients, {
    settings: settings ? { emergencySettings: settings } : undefined,
    now,
  });

  const ids: TriageBreachVisibilityMetricId[] = metricIds?.length
    ? [...metricIds]
    : [
        'awaiting-triage',
        'longest-untriaged-wait',
        'triage-breach-approaching',
        'triage-breached',
        'rapid-review-flags',
      ];

  const aliasMap = TRIAGE_BREACH_VISIBILITY_STRIP_ID_ALIASES;
  const surfaceKey =
    surface === 'reception' ||
    surface === 'triage' ||
    surface === 'chargeNurse' ||
    surface === 'commandCenter'
      ? surface
      : 'triage';

  return ids.map((canonicalId) => ({
    id: aliasMap[canonicalId][surfaceKey],
    label: METRIC_LABELS[canonicalId],
    value: metricValue(canonicalId, snapshot),
    hint: metricHint(canonicalId, snapshot),
    queueTab: canonicalId === 'rapid-review-flags' || canonicalId.startsWith('triage') ? 'pretriage' : null,
    tone: metricTone(canonicalId, snapshot),
  }));
}

export function hasTriageBreachVisibilityActivity(
  snapshot: TriageBreachVisibilitySnapshot,
): boolean {
  return Boolean(
    snapshot.awaitingTriageCount ||
      snapshot.approachingBreachCount ||
      snapshot.breachedCount ||
      snapshot.rapidReviewFlags,
  );
}
