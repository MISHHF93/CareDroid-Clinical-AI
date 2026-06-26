import type { Patient } from '../../src/types/emergency';

const SCORE_EVENT_TYPES = new Set(['SCORE', 'ClinicalScoreSaved']);

export function formatScoresForCopilot(patient: Patient | null | undefined): string {
  const scores = [...(patient?.timeline || [])]
    .filter((event) => event && event.type != null && SCORE_EVENT_TYPES.has(event.type))
    .slice(0, 4);

  if (!scores.length) return '';

  return scores
    .map((event) => {
      const metadata = (event.metadata || {}) as Record<string, unknown>;
      const label = String(metadata.scoreLabel || metadata.toolName || 'Score');
      const result = metadata.scoreTotal ?? metadata.result ?? '--';
      const band = metadata.band || metadata.riskBand || 'band unknown';
      return `${label}=${result} (${band})`;
    })
    .join(', ');
}