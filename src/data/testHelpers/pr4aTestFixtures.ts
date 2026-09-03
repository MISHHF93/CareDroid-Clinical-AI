/**
 * Deterministic fixtures for PR4A Tier-A calculators (ASCVD, CKD, STOP-Bang, AUDIT-C).
 */

import { STOP_BANG_CRITERIA_META } from '../../utils/stopBangCalculator';
import { PR4A_TOOL_IDS } from '../pr4aTestConstants';

export { PR4A_TOOL_IDS };

/** ACC/AHA PCE Table A demo profile (Goff et al., Circulation 2014). */
export const ASCVD_TABLE_A_DEMO = Object.freeze({
  ageYears: 55,
  totalCholesterol: 213,
  hdlCholesterol: 50,
  cholesterolUnit: 'mg_dl',
  systolicBpMmHg: 120,
  onHypertensionTreatment: false,
  diabetes: false,
  smoker: false,
});

/** Expected Table A 10-year risk % by sex × race. */
export const ASCVD_TABLE_A_EXPECTED = Object.freeze([
  { sex: 'female', race: 'white', pct: 2.1 },
  { sex: 'male', race: 'white', pct: 5.3 },
  { sex: 'female', race: 'african_american', pct: 3.0 },
  { sex: 'male', race: 'african_american', pct: 6.1 },
]);

/** CKD-EPI 2021 reference inputs (matches ckdStagingCalculator.test.js). */
export const CKD_REFERENCE_INPUT = Object.freeze({
  ageYears: 55,
  sex: 'male',
  serumCreatinine: 1.5,
  creatinineUnit: 'mg_dl',
  urineAcr: 45,
  acrUnit: 'mg_g',
});

export const CKD_EGFR_FIXTURES = Object.freeze([
  { ageYears: 50, sex: 'male', creatinine: 1.2, expectedEgfr: 74 },
  { ageYears: 35, sex: 'female', creatinine: 1.1, expectedEgfr: 67 },
]);

export const STOP_BANG_ALL_FALSE = Object.freeze(
  Object.fromEntries(STOP_BANG_CRITERIA_META.map((r) => [r.key, false])),
);

export const STOP_BANG_ALL_TRUE = Object.freeze(
  Object.fromEntries(STOP_BANG_CRITERIA_META.map((r) => [r.key, true])),
);

export const STOP_BANG_BAND_FIXTURES = Object.freeze([
  { score: 0, osaRiskCategory: 'low', severity: 'normal' },
  { score: 2, osaRiskCategory: 'low', severity: 'normal' },
  { score: 3, osaRiskCategory: 'intermediate', severity: 'warning' },
  { score: 5, osaRiskCategory: 'high', severity: 'critical' },
  { score: 8, osaRiskCategory: 'high', severity: 'critical' },
]);

export const AUDIT_C_NEGATIVE_INPUT = Object.freeze({
  drinkingFrequency: 'never',
  drinksPerDay: 'one_or_two',
  bingeFrequency: 'never',
});

export const AUDIT_C_POSITIVE_MEN_INPUT = Object.freeze({
  drinkingFrequency: 'four_plus_per_week',
  drinksPerDay: 'ten_plus',
  bingeFrequency: 'weekly',
});

/** Per-registry launch alias samples (subset of required NLU + discovery). */
export const PR4A_LAUNCH_ALIASES_BY_REGISTRY_ID = Object.freeze({
  'ascvd-risk': ['ascvd', 'cardiovascular risk', 'ascvd-score', 'cv-risk'],
  'ckd-staging': ['ckd stage', 'gfr stage', 'ckd-stage', 'albuminuria-stage'],
  'stop-bang': ['stop bang', 'osa risk', 'sleep-apnea-score'],
  'audit-c': ['audit c', 'alcohol screen', 'drinking-screen'],
});
