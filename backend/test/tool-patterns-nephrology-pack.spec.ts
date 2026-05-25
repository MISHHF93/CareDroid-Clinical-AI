import { matchToolPatterns } from '../src/modules/medical-control-plane/intent-classifier/patterns/tool.patterns';

const NEPHROLOGY_PATTERN_PHRASES = [
  ['egfr-ckd-epi', 'egfr ckd epi'],
  ['creatinine-clearance-cg', 'cockcroft gault'],
  ['fena', 'fractional excretion of sodium'],
  ['feurea', 'fractional excretion of urea'],
  ['kfre', 'kidney failure risk equation'],
  ['bun-creatinine-ratio', 'bun creatinine ratio'],
  ['corrected-sodium', 'corrected sodium'],
  ['free-water-deficit', 'free water deficit'],
  ['osmolal-gap', 'osmolal gap'],
  ['aki-staging-assistant', 'aki staging assistant'],
  ['dialysis-readiness-helper', 'dialysis readiness helper'],
  ['electrolyte-disorder-assistant', 'electrolyte disorder assistant'],
  ['renal-monitoring-dashboard', 'renal monitoring dashboard'],
  ['ckd-progression-predictor', 'ckd progression predictor'],
  ['dialysis-utilization-tracker', 'dialysis utilization tracker'],
  ['electrolyte-trend-engine', 'electrolyte trend engine'],
  ['fluid-balance-monitor', 'fluid balance monitor'],
] as const;

describe('matchToolPatterns — Nephrology Clinical Tools Pack', () => {
  it.each(NEPHROLOGY_PATTERN_PHRASES)('matches %s via "%s"', (toolId, phrase) => {
    const matches = matchToolPatterns(`open ${phrase}`);
    expect(matches.some((match) => match.toolId === toolId)).toBe(true);
  });
});
