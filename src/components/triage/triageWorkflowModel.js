import { buildArrivalControlSummary } from '../../services/arrivalControlLayer';
import { summarizeTriageBreachBoard } from '../../services/triageBreachTimer';
import { summarizeEmsAwareness } from '../whiteboard/emsAwarenessModel';
import { resolveTriageStripMetricIds } from '../../config/emergencyScreenKpiPolicy';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';

const TRIAGE_STRIP_LABELS = Object.freeze({
  'triage-pending': 'Triage pending',
  'longest-untriaged-wait': 'Longest untriaged wait',
  'rapid-review-flags': 'Rapid-review flags',
  'ems-handoffs-pending': 'EMS handoffs pending',
});

export function selectTriageOperationalStripMetrics(
  patients = [],
  emsArrivals = [],
  { metricIds = null, settings = null, now = new Date() } = {},
) {
  const policyMetricIds =
    metricIds || resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage) || [];
  const arrivalControl = buildArrivalControlSummary(patients);
  const triageBreach = summarizeTriageBreachBoard(patients, {
    settings: settings || undefined,
    now,
  });
  const emsAwareness = summarizeEmsAwareness(emsArrivals, now.getTime(), { patients });

  const metrics = [
    {
      id: 'triage-pending',
      label: TRIAGE_STRIP_LABELS['triage-pending'],
      value: arrivalControl.triagePending,
      queueTab: 'pretriage',
      hint: 'Patients awaiting triage nurse review',
    },
    {
      id: 'longest-untriaged-wait',
      label: TRIAGE_STRIP_LABELS['longest-untriaged-wait'],
      value: triageBreach.longestElapsedLabel,
      queueTab: 'pretriage',
      hint: `Door-to-triage target ${triageBreach.targetMinutes}m`,
    },
    {
      id: 'rapid-review-flags',
      label: TRIAGE_STRIP_LABELS['rapid-review-flags'],
      value: arrivalControl.rapidReview,
      queueTab: 'pretriage',
      hint: 'High-risk complaint flags needing rapid review',
    },
    {
      id: 'ems-handoffs-pending',
      label: TRIAGE_STRIP_LABELS['ems-handoffs-pending'],
      value: emsAwareness.awaitingHandoff,
      queueTab: 'ems',
      hint: 'EMS units awaiting handoff completion',
    },
  ];

  if (!policyMetricIds.length) return metrics;
  const allowed = new Set(policyMetricIds);
  return metrics.filter((metric) => allowed.has(metric.id));
}
