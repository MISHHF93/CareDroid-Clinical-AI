import type { AdministrativeAutomationCategory } from '../types/administrativeAutomation';

export type ChartDatum = Readonly<{ name: string; value: number }>;

const CATEGORY_SHORT_LABELS: Record<AdministrativeAutomationCategory, string> = {
  patient_routing: 'Routing',
  documentation_handoff: 'Handoff',
  ai_patient_summary: 'AI summary',
  triage_preparation: 'Triage prep',
  department_notification: 'Notify',
  staff_assignment: 'Staff',
  queue_prioritization: 'Queue',
  escalation_workflow: 'Escalation',
};

export function buildAutomationStatusChart(metrics: {
  pendingReview: number;
  executedToday: number;
  overridden: number;
}): ChartDatum[] {
  return [
    { name: 'Pending review', value: metrics.pendingReview },
    { name: 'Executed today', value: metrics.executedToday },
    { name: 'Overridden', value: metrics.overridden },
  ].filter((row) => row.value > 0);
}

export function buildAutomationCategoryChart(
  byCategory: Readonly<Partial<Record<AdministrativeAutomationCategory, number>>>,
): ChartDatum[] {
  return Object.entries(byCategory)
    .filter(([, count]) => (count || 0) > 0)
    .map(([category, count]) => ({
      name: CATEGORY_SHORT_LABELS[category as AdministrativeAutomationCategory] || category,
      value: count || 0,
    }))
    .sort((a, b) => b.value - a.value);
}
