/**
 * Deterministic fixtures for PR2 calculators (MELD, MELD-Na, TIMI, Wells PE, PERC).
 */

import { TIMI_UA_NSTEMI_CRITERIA_META } from '../../utils/timiUaNstemiCalculator';
import { WELLS_PE_CRITERIA_META } from '../../utils/wellsPeCalculator';
import { PERC_CRITERIA_META } from '../../utils/percCalculator';
import { PR2_TOOL_IDS } from '../pr2TestConstants';

export { PR2_TOOL_IDS };

export const MELD_BASE_LABS = Object.freeze({
  bilirubin: '2',
  bilirubinUnit: 'mg_dl',
  inr: '1.5',
  creatinine: '1.2',
  creatinineUnit: 'mg_dl',
  onDialysis: false,
});

/** UNOS floor: creatinine 0.3 mg/dL → clamped to 1.0 */
export const MELD_LOW_CREATININE_INPUT = Object.freeze({
  ...MELD_BASE_LABS,
  creatinine: '0.3',
});

/** Dialysis: creatinine entry ignored; UNOS uses 4.0 mg/dL */
export const MELD_DIALYSIS_INPUT = Object.freeze({
  ...MELD_BASE_LABS,
  creatinine: '0.5',
  onDialysis: true,
});

/** Published regression: MELD 15 + Na 125 → MELD-Na 25 */
export const MELD_NA_REGRESSION = Object.freeze({
  ...MELD_BASE_LABS,
  sodium: '125',
  expectedMeld: 15,
  expectedMeldNa: 25,
});

export const TIMI_NONE = Object.freeze(
  Object.fromEntries(TIMI_UA_NSTEMI_CRITERIA_META.map((r) => [r.key, false]))
);

export const TIMI_ALL = Object.freeze(
  Object.fromEntries(TIMI_UA_NSTEMI_CRITERIA_META.map((r) => [r.key, true]))
);

export const WELLS_PE_NONE = Object.freeze(
  Object.fromEntries(WELLS_PE_CRITERIA_META.map((r) => [r.key, false]))
);

export const WELLS_PE_ALL = Object.freeze(
  Object.fromEntries(WELLS_PE_CRITERIA_META.map((r) => [r.key, true]))
);

export const PERC_ALL_MET = Object.freeze(
  Object.fromEntries(PERC_CRITERIA_META.map((r) => [r.key, true]))
);

export const PERC_NONE_MET = Object.freeze(
  Object.fromEntries(PERC_CRITERIA_META.map((r) => [r.key, false]))
);

/** Wells PE score bands for interpretWellsPe */
export const WELLS_PE_BAND_FIXTURES = Object.freeze([
  { score: 2, band: 'Low probability', severity: 'normal' },
  { score: 4, band: 'Low probability', severity: 'normal' },
  { score: 4.5, band: 'Intermediate probability', severity: 'warning' },
  { score: 6, band: 'Intermediate probability', severity: 'warning' },
  { score: 6.5, band: 'High probability', severity: 'critical' },
  { score: 12.5, band: 'High probability', severity: 'critical' },
]);

/** TIMI interpretation bands */
export const TIMI_BAND_FIXTURES = Object.freeze([
  { score: 0, severity: 'normal', riskBand: '0–2 points' },
  { score: 2, severity: 'normal', riskBand: '0–2 points' },
  { score: 3, severity: 'warning', riskBand: '3–4 points' },
  { score: 5, severity: 'critical', riskBand: '5–7 points' },
  { score: 7, severity: 'critical', riskBand: '5–7 points' },
]);

export const WELLS_PE_LAUNCH_ALIASES = Object.freeze([
  'wells-pe',
  'wells-pe-score',
  'pe-score',
  'pulmonary-embolism-wells',
]);

export const PERC_LAUNCH_ALIASES = Object.freeze([
  'perc',
  'perc-rule',
  'pe-rule-out',
  'pulmonary-embolism-rule-out',
]);
