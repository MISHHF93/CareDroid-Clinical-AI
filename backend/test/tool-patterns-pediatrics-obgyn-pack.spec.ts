import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const PEDIATRICS_OBGYN_PATTERN_PHRASES = [
  ['apgar-score', 'apgar score'],
  ['bishop-score', 'bishop score'],
  ['gestational-age-calculator', 'gestational age calculator'],
  ['pediatric-bp-percentile', 'pediatric bp percentile'],
  ['pediatric-gcs', 'pediatric gcs'],
  ['pews', 'pediatric early warning score'],
  ['pregnancy-due-date-calculator', 'pregnancy due date calculator'],
  ['fenton-growth-chart-helper', 'fenton growth chart helper'],
  ['neonatal-bilirubin-risk-helper', 'neonatal bilirubin risk helper'],
  ['pediatric-dose-safety-checker', 'pediatric dose safety checker'],
  ['pediatric-sepsis-assistant', 'pediatric sepsis assistant'],
  ['pregnancy-workflow-assistant', 'pregnancy workflow assistant'],
  ['neonatal-assessment-assistant', 'neonatal assessment assistant'],
  ['ob-triage-assistant', 'ob triage assistant'],
  ['neonatal-dashboard', 'neonatal dashboard'],
  ['maternal-monitoring-dashboard', 'maternal monitoring dashboard'],
  ['pediatric-command-center', 'pediatric command center'],
  ['growth-trend-analytics', 'growth trend analytics'],
  ['perinatal-risk-dashboard', 'perinatal risk dashboard'],
] as const;

describe('matchToolPatterns — Pediatrics and OB-GYN Clinical Tools Pack', () => {
  it.each(PEDIATRICS_OBGYN_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
