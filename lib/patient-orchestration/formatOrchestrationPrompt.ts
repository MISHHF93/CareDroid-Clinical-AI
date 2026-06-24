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
  if (!context?.prioritizedRecommendations.length) {
    return 'No patient-specific tool recommendations for this case.';
  }
  return [
    'Patient-card tool recommendations (staff must confirm):',
    ...context.prioritizedRecommendations.map(
      (rec) =>
        `- ${rec.label} [${rec.launchKind}]: ${rec.reason}${rec.completed ? ' (already documented)' : ''}`,
    ),
    ...context.secondaryRecommendations.slice(0, 4).map(
      (rec) => `- Secondary: ${rec.label}: ${rec.reason}`,
    ),
  ].join('\n');
}