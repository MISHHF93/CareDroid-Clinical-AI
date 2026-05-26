import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const PULMONOLOGY_PATTERN_PHRASES = [
  ['bode-index', 'bode index'],
  ['copd-gold-assessment', 'copd gold assessment'],
  ['aa-gradient', 'a-a gradient'],
  ['pao2-fio2-ratio', 'pao2 fio2 ratio'],
  ['rox-index', 'rox index'],
  ['pneumonia-severity-index', 'pneumonia severity index'],
  ['asthma-severity-score', 'asthma severity score'],
  ['asthma-exacerbation-assistant', 'asthma exacerbation assistant'],
  ['ventilator-support-assistant', 'ventilator support assistant'],
  ['oxygen-escalation-helper', 'oxygen escalation helper'],
  ['copd-workflow-assistant', 'copd workflow assistant'],
  ['ventilator-monitoring-dashboard', 'ventilator monitoring dashboard'],
  ['respiratory-telemetry-dashboard', 'respiratory telemetry dashboard'],
  ['sleep-apnea-analytics', 'sleep apnea analytics'],
  ['pulmonary-trend-engine', 'pulmonary trend engine'],
  ['respiratory-command-center', 'respiratory command center'],
] as const;

describe('matchToolPatterns — Pulmonology Clinical Tools Pack', () => {
  it.each(PULMONOLOGY_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
