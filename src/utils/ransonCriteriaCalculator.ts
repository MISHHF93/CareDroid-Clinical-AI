/**
 * Ranson criteria — acute pancreatitis severity (admission + 48 h).
 * Reference: Ranson JH, et al. Prognostic signs and the role of operative management in acute pancreatitis. Am J Surg. 1974;128(5):576–584.
 */

export const RANSON_ADMISSION_META = [
  {
    key: 'ageOver55',
    shortLabel: 'Age > 55 years',
    help: 'Age greater than 55 years at admission.',
  },
  {
    key: 'wbcOver16000',
    shortLabel: 'WBC > 16,000/mm³',
    help: 'White blood cell count >16,000/mm³.',
  },
  {
    key: 'glucoseOver200',
    shortLabel: 'Glucose > 200 mg/dL',
    help: 'Blood glucose >200 mg/dL (11.1 mmol/L).',
  },
  { key: 'ldhOver350', shortLabel: 'LDH > 350 IU/L', help: 'Serum LDH >350 IU/L.' },
  { key: 'astOver250', shortLabel: 'AST > 250 IU/L', help: 'Serum AST >250 IU/L.' },
];

export const RANSON_AT_48H_META = [
  {
    key: 'hematocritDrop10',
    shortLabel: 'Hematocrit fall > 10%',
    help: 'Hematocrit decrease >10% from admission.',
  },
  {
    key: 'bunRise5',
    shortLabel: 'BUN rise > 5 mg/dL',
    help: 'BUN increase >5 mg/dL despite fluids.',
  },
  {
    key: 'calciumBelow8',
    shortLabel: 'Calcium < 8 mg/dL',
    help: 'Serum calcium <8 mg/dL (2.0 mmol/L).',
  },
  { key: 'pao2Below60', shortLabel: 'PaO₂ < 60 mmHg', help: 'Arterial PO₂ <60 mmHg (8 kPa).' },
  { key: 'baseDeficitOver4', shortLabel: 'Base deficit > 4 mEq/L', help: 'Base deficit >4 mEq/L.' },
  {
    key: 'fluidSequestration6L',
    shortLabel: 'Fluid sequestration > 6 L',
    help: 'Estimated fluid sequestration >6 L in 48 h.',
  },
];

/**
 * @param {Record<string, boolean>} admission
 * @param {Record<string, boolean>} at48h
 */
export function calculateRansonScore(admission, at48h) {
  let score = 0;
  for (const row of RANSON_ADMISSION_META) {
    if (admission[row.key]) score += 1;
  }
  for (const row of RANSON_AT_48H_META) {
    if (at48h[row.key]) score += 1;
  }
  return score;
}

/**
 * @param {number} score 0–11
 */
export function interpretRansonScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 11) return null;

  const referenceLine =
    'Ranson JH, et al. Prognostic signs and operative management in acute pancreatitis. Am J Surg. 1974;128(5):576–584.';

  const disclaimer =
    'Historical severity index — many units prefer BISAP, APACHE II, or organ-failure scores. Does not direct ICU admission or surgery.';

  let severity = 'normal';
  let label = 'Lower Ranson score';
  let mortalityContext = 'Mortality ~0–3% in classic cohorts for 0–2 criteria';
  let interpretation =
    'Fewer criteria met — lower historical mortality band; continue supportive care per pancreatitis protocol.';

  if (score >= 7) {
    severity = 'critical';
    label = 'Very high Ranson score';
    mortalityContext = 'Mortality ~100% in original cohort for ≥7 criteria';
    interpretation =
      '≥7 criteria historically associated with very high mortality — consider ICU-capable setting and multidisciplinary critical care.';
  } else if (score >= 5) {
    severity = 'critical';
    label = 'High Ranson score';
    mortalityContext = 'Mortality ~40% in original cohort for 5–6 criteria';
    interpretation =
      '5–6 criteria — high historical severity; close monitoring and aggressive supportive care per protocol.';
  } else if (score >= 3) {
    severity = 'warning';
    label = 'Moderate Ranson score';
    mortalityContext = 'Mortality ~15% in original cohort for 3–4 criteria';
    interpretation =
      '3–4 criteria — moderate historical severity — escalate monitoring and fluid resuscitation per guidelines.';
  }

  return {
    severity,
    label,
    riskBand: `${score} of 11 criteria`,
    mortalityContext,
    interpretation,
    disclaimer,
    referenceLine,
  };
}
