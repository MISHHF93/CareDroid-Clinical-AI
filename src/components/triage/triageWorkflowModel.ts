import { selectTriageBreachVisibilityMetrics } from '../../services/triageBreachVisibilityModel';
import { summarizeEmsAwareness } from '../whiteboard/emsAwarenessModel';
import { resolveTriageStripMetricIds } from '../../config/emergencyScreenKpiPolicy';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';

const TRIAGE_STRIP_LABELS = Object.freeze({
  'triage-pending': 'Awaiting triage',
  'longest-untriaged-wait': 'Longest untriaged wait',
  'triage-breach-approaching': 'Approaching breach',
  'triage-breached': 'Triage breached',
  'rapid-review-flags': 'Rapid-review flags',
  'ems-handoffs-pending': 'EMS handoffs pending',
});

export function selectTriageOperationalStripMetrics(
  patients = [] as any[],
  emsArrivals = [] as any[],
  { metricIds = null, settings = null, now = new Date() }: any = {},
) {
  const policyMetricIds =
    metricIds || resolveTriageStripMetricIds(CARE_DROID_SCREEN_MODES.triage) || [];
  const visibilityMetrics = selectTriageBreachVisibilityMetrics(patients, {
    settings,
    now,
    surface: 'triage',
  });
  const emsAwareness = summarizeEmsAwareness(emsArrivals, now.getTime(), { patients });

  const metrics = [
    ...visibilityMetrics.map((metric) => ({
      ...metric,
      label: TRIAGE_STRIP_LABELS[metric.id] || metric.label,
      queueTab: metric.queueTab ?? 'pretriage',
    })),
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
