import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const PSYCHIATRY_PATTERN_PHRASES = [
  ['phq9', 'phq-9'],
  ['gad7', 'gad-7'],
  ['audit-c', 'audit c'],
  ['cage', 'cage questionnaire'],
  ['mmse', 'mini mental state'],
  ['moca-placeholder-workflow', 'moca workflow'],
  ['pcl5', 'pcl-5'],
  ['mdq', 'mood disorder questionnaire'],
  ['epworth-sleepiness-scale', 'epworth sleepiness scale'],
  ['columbia-suicide-severity-workflow', 'columbia suicide severity workflow'],
  ['mental-health-screening-assistant', 'mental health screening assistant'],
  ['suicide-risk-workflow-assistant', 'suicide risk workflow assistant'],
  ['substance-use-screening-assistant', 'substance use screening assistant'],
  ['cognitive-screening-assistant', 'cognitive screening assistant'],
  ['behavioral-analytics-dashboard', 'behavioral analytics dashboard'],
  ['screening-trend-engine', 'screening trend engine'],
  ['psychiatry-monitoring-dashboard', 'psychiatry monitoring dashboard'],
  ['crisis-escalation-audit-log', 'crisis escalation audit log'],
  ['population-screening-dashboard', 'population screening dashboard'],
] as const;

describe('matchToolPatterns — Psychiatry and Screening Tools Pack', () => {
  it.each(PSYCHIATRY_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
