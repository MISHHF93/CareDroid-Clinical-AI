import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const NEUROLOGY_PATTERN_PHRASES = [
  ['abcd2', 'abcd2 score'],
  ['hunt-hess-scale', 'hunt hess scale'],
  ['ich-score', 'ich score'],
  ['four-score', 'four score'],
  ['modified-rankin-scale', 'modified rankin scale'],
  ['nihss-summary-view', 'nihss summary view'],
  ['pediatric-gcs', 'pediatric gcs'],
  ['seizure-assistant', 'seizure assistant'],
  ['stroke-workflow-assistant', 'stroke workflow assistant'],
  ['headache-red-flag-assistant', 'headache red flag assistant'],
  ['vertigo-hints-assistant', 'vertigo hints assistant'],
  ['neuro-exam-assistant', 'neuro exam assistant'],
  ['neuro-telemetry-dashboard', 'neuro telemetry dashboard'],
  ['stroke-command-center', 'stroke command center'],
  ['neuro-monitoring-engine', 'neuro monitoring engine'],
  ['eeg-trend-dashboard', 'eeg trend dashboard'],
  ['neurology-timeline-ai', 'neurology timeline ai'],
] as const;

describe('matchToolPatterns — Neurology Clinical Tools Pack', () => {
  it.each(NEUROLOGY_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
