import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const CARDIOLOGY_PATTERN_PHRASES = [
  ['duke-treadmill-score', 'duke treadmill score'],
  ['reynolds-risk-score', 'reynolds risk score'],
  ['hcm-sudden-death-risk', 'hcm sudden death risk'],
  ['chads2', 'chads2 score'],
  ['heart-failure-staging', 'heart failure staging'],
  ['ecg-interpretation-assistant', 'ecg interpretation assistant'],
  ['stemi-pathway-assistant', 'stemi pathway'],
  ['acs-workflow-assistant', 'acs workflow'],
  ['atrial-fibrillation-assistant', 'atrial fibrillation assistant'],
  ['heart-failure-assistant', 'heart failure assistant'],
  ['cardiac-telemetry-analyzer', 'cardiac telemetry analyzer'],
  ['ecg-trend-engine', 'ecg trend engine'],
  ['arrhythmia-risk-classifier', 'arrhythmia risk classifier'],
  ['remote-cardiology-monitoring-dashboard', 'remote cardiology monitoring'],
  ['cardiology-command-center', 'cardiology command center'],
] as const;

describe('matchToolPatterns — Cardiology Clinical Tools Pack', () => {
  it.each(CARDIOLOGY_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
