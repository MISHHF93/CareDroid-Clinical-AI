/**
 * Deterministic fixtures for PR1 Tier-A calculators (qSOFA, NEWS2, Child-Pugh, HAS-BLED).
 */

import { PR1_CALCULATOR_REGISTRY_IDS } from '../clinicalToolIdContract';

export const PR1_TOOL_IDS = Object.freeze([...PR1_CALCULATOR_REGISTRY_IDS]);

/** All 2³ qSOFA criterion combinations → expected score 0–3 */
export const QSOFA_SCORE_PERMUTATIONS = Object.freeze(
  (() => {
    const rows = [];
    for (const respiratoryRateGte22 of [false, true]) {
      for (const systolicBpLte100 of [false, true]) {
        for (const alteredMentationOrGcsLt15 of [false, true]) {
          const expected =
            (respiratoryRateGte22 ? 1 : 0) +
            (systolicBpLte100 ? 1 : 0) +
            (alteredMentationOrGcsLt15 ? 1 : 0);
          rows.push({
            respiratoryRateGte22,
            systolicBpLte100,
            alteredMentationOrGcsLt15,
            expected,
          });
        }
      }
    }
    return rows;
  })()
);

/** qSOFA interpretation severity by aggregate score */
export const QSOFA_INTERPRETATION_BY_SCORE = Object.freeze([
  { score: 0, severity: 'normal', positiveThreshold: false },
  { score: 1, severity: 'normal', positiveThreshold: false },
  { score: 2, severity: 'critical', positiveThreshold: true },
  { score: 3, severity: 'critical', positiveThreshold: true },
]);

/** HAS-BLED interpretHasBled severity — threshold at ≥3 */
export const HAS_BLED_SEVERITY_BY_SCORE = Object.freeze(
  Array.from({ length: 10 }, (_, score) => ({
    score,
    severity: score >= 3 ? 'critical' : 'normal',
    elevated: score >= 3,
  }))
);

/** Child-Pugh class and severity for each valid total 5–15 */
export const CHILD_PUGH_CLASS_BY_TOTAL = Object.freeze(
  Array.from({ length: 11 }, (_, i) => {
    const total = i + 5;
    if (total <= 6) {
      return { total, childPughClass: 'A', severity: 'normal' };
    }
    if (total <= 9) {
      return { total, childPughClass: 'B', severity: 'warning' };
    }
    return { total, childPughClass: 'C', severity: 'critical' };
  })
);

/** Class boundary totals (inclusive ranges) */
export const CHILD_PUGH_CLASS_BOUNDARIES = Object.freeze([
  { total: 5, childPughClass: 'A' },
  { total: 6, childPughClass: 'A' },
  { total: 7, childPughClass: 'B' },
  { total: 9, childPughClass: 'B' },
  { total: 10, childPughClass: 'C' },
  { total: 15, childPughClass: 'C' },
]);

/** Vitals held constant; only SpO₂ scale differs — expect different spo2 sub-scores */
export const NEWS2_SCALE_SWITCH_FIXTURE = Object.freeze({
  respiratoryRate: 16,
  spo2: 96,
  supplementalOxygen: true,
  systolicBp: 120,
  pulse: 72,
  newConfusion: false,
  temperature: 36.8,
});

/** Scale 2 room-air vs oxygen at high SpO₂ (hypercapnic pathway edge) */
export const NEWS2_SCALE2_SPO2_EDGE = Object.freeze({
  spo2: 93,
  respiratoryRate: 16,
  systolicBp: 120,
  pulse: 72,
  newConfusion: false,
  temperature: 36.8,
});

/** Minimal valid vitals for NEWS2 validation */
export const NEWS2_VALID_BASE_INPUTS = Object.freeze({
  respiratoryRate: '16',
  spo2: '98',
  spo2Scale: '1',
  supplementalOxygen: false,
  systolicBp: '120',
  pulse: '72',
  newConfusion: false,
  temperature: '37.0',
});

/** Minimal valid Child-Pugh (class A, INR path) */
export const CHILD_PUGH_CLASS_A_INPUTS = Object.freeze({
  bilirubin: '1',
  bilirubinUnit: 'mg_dl',
  albumin: '4',
  albuminUnit: 'g_dl',
  coagulationMode: 'inr',
  inr: '1.2',
  ptProlongationSec: '',
  ascites: 'none',
  encephalopathy: 'none',
});

/** HAS-BLED empty factor set */
export const HAS_BLED_NONE = Object.freeze({
  hypertension: false,
  renalDysfunction: false,
  liverDysfunction: false,
  strokeHistory: false,
  bleedingHistory: false,
  labileInr: false,
  ageOver65: false,
  bleedingPredisposingDrugs: false,
  alcoholUse: false,
});
