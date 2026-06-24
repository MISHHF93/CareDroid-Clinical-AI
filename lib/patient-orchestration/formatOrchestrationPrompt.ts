import type { PatientCardOrchestrationContext } from './orchestrationTypes';

export function formatPatientOrchestrationForCopilot(
  context: PatientCardOrchestrationContext | null | undefined,
): string {
  if (!context) return '';
  return context.promptContext;
}

export function formatPatientToolRecommendationsForCopilot(
  context: PatientCardOrchestrationContext | null | undefined,
): string {
  const prioritized = context?.prioritizedRecommendations ?? [];
  const secondary = context?.secondaryRecommendations ?? [];
  if (!prioritized.length) {
    return 'No patient-specific tool recommendations for this case.';
  }
  return [
    'Patient-card tool recommendations (staff must confirm):',
    ...prioritized.map(
      (rec) =>
        `- ${rec.label} [${rec.launchKind}]: ${rec.reason}${rec.completed ? ' (already documented)' : ''}`,
    ),
    ...secondary.slice(0, 4).map((rec) => `- Secondary: ${rec.label}: ${rec.reason}`),
  ].join('\n');
}