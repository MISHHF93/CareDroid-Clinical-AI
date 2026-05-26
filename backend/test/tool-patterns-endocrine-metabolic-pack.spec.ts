import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const ENDOCRINE_METABOLIC_PATTERN_PHRASES = [
  ['homa-ir', 'homa ir'],
  ['corrected-calcium', 'corrected calcium'],
  ['corrected-sodium', 'corrected sodium'],
  ['serum-osmolality', 'serum osmolality'],
  ['osmolal-gap', 'osmolal gap'],
  ['bsa', 'body surface area'],
  ['ideal-body-weight', 'ideal body weight'],
  ['adjusted-body-weight', 'adjusted body weight'],
  ['waist-hip-ratio', 'waist to hip ratio'],
  ['diabetes-care-assistant', 'diabetes care assistant'],
  ['dka-pathway-assistant', 'dka pathway assistant'],
  ['thyroid-disorder-assistant', 'thyroid disorder assistant'],
  ['metabolic-syndrome-assistant', 'metabolic syndrome assistant'],
  ['glucose-telemetry-dashboard', 'glucose telemetry dashboard'],
  ['insulin-trend-engine', 'insulin trend engine'],
  ['endocrine-monitoring-system', 'endocrine monitoring system'],
  ['metabolic-analytics', 'metabolic analytics'],
  ['continuous-glucose-command-center', 'continuous glucose command center'],
] as const;

describe('matchToolPatterns — Endocrine and Metabolic Tools Pack', () => {
  it.each(ENDOCRINE_METABOLIC_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
