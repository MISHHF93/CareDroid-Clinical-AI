/**
 * HEART score — chest pain risk stratification in the emergency department.
 * Reference: Six AJ, et al. Chest. 2008;134(6):1157–1164.
 */

/** @typedef {'low' | 'intermediate' | 'high'} HeartRiskCategory */

export const HEART_SCORE_DISCLAIMER =
  'Clinical decision support only. Does not diagnose acute coronary syndrome, rule out myocardial infarction, or recommend treatment, disposition, observation duration, or invasive strategy.';

export const HEART_DIMENSIONS_META = [
  {
    key: 'history',
    label: 'History',
    help: 'Suspiciousness of chest pain history for ACS.',
    options: [
      { value: 0, label: 'Slightly suspicious' },
      { value: 1, label: 'Moderately suspicious' },
      { value: 2, label: 'Highly suspicious' },
    ],
  },
  {
    key: 'ecg',
    label: 'ECG',
    help: 'Admission ECG findings.',
    options: [
      { value: 0, label: 'Normal' },
      { value: 1, label: 'Non-specific repolarisation disturbance' },
      { value: 2, label: 'Significant ST deviation' },
    ],
  },
  {
    key: 'age',
    label: 'Age',
    help: 'Patient age at presentation.',
    options: [
      { value: 0, label: '< 45 years' },
      { value: 1, label: '45–64 years' },
      { value: 2, label: '≥ 65 years' },
    ],
  },
  {
    key: 'riskFactors',
    label: 'Risk factors',
    help: 'CAD risk factors: hypertension, hypercholesterolaemia, diabetes, smoking, obesity, family history; or known atherosclerotic disease.',
    options: [
      { value: 0, label: 'No known risk factors' },
      { value: 1, label: '1–2 risk factors' },
      { value: 2, label: '≥ 3 risk factors or history of atherosclerotic disease' },
    ],
  },
  {
    key: 'troponin',
    label: 'Troponin',
    help: 'Initial troponin relative to local assay upper limit of normal (ULN).',
    options: [
      { value: 0, label: '≤ normal limit' },
      { value: 1, label: '1–3× ULN' },
      { value: 2, label: '> 3× ULN' },
    ],
  },
];

/**
 * @param {Record<string, number>} inputs
 * @returns {number | null}
 */
export function calculateHeartScore(inputs) {
  let total = 0;
  for (const dim of HEART_DIMENSIONS_META) {
    const v = Number(inputs[dim.key]);
    if (!Number.isFinite(v) || v < 0 || v > 2) return null;
    total += v;
  }
  return total;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateHeartScoreInputs(raw) {
  const errors = [] as any[];
  for (const dim of HEART_DIMENSIONS_META) {
    const v = Number(raw[dim.key]);
    if (!Number.isFinite(v) || v < 0 || v > 2) {
      errors.push(`${dim.label}: select a score of 0, 1, or 2.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @param {number} score
 * @returns {HeartRiskCategory | null}
 */
export function heartRiskCategoryFromScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  if (score >= 7) return 'high';
  if (score >= 4) return 'intermediate';
  return 'low';
}

/**
 * @param {HeartRiskCategory} riskCategory
 */
function riskCategoryLabel(riskCategory) {
  if (riskCategory === 'high') return 'High risk';
  if (riskCategory === 'intermediate') return 'Intermediate risk';
  return 'Low risk';
}

/**
 * @param {number} score 0–10
 */
export function interpretHeartScore(score) {
  const riskCategory = heartRiskCategoryFromScore(score);
  if (!riskCategory) return null;

  const referenceLine =
    'Six AJ, et al. Chest pain in the emergency room: value of the HEART score. Chest. 2008;134(6):1157–1164.';

  const disclaimer = HEART_SCORE_DISCLAIMER;

  if (riskCategory === 'high') {
    return {
      severity: 'critical',
      riskCategory,
      riskCategoryLabel: riskCategoryLabel(riskCategory),
      label: 'High HEART score',
      riskBand: '7–10 points',
      maceContext: 'Approximate MACE ~50–65% at 6 weeks in validation cohorts',
      interpretation:
        'Scores of 7–10 fall in the high-risk stratum in validation studies. This output stratifies short-term cardiac risk only — it does not diagnose acute coronary syndrome.',
      disclaimer,
      referenceLine,
    };
  }

  if (riskCategory === 'intermediate') {
    return {
      severity: 'warning',
      riskCategory,
      riskCategoryLabel: riskCategoryLabel(riskCategory),
      label: 'Intermediate HEART score',
      riskBand: '4–6 points',
      maceContext: 'Approximate MACE ~12–17% at 6 weeks in validation cohorts',
      interpretation:
        'Scores of 4–6 fall in the intermediate-risk stratum in validation studies. Risk stratification only — does not direct testing, disposition, or therapy.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    riskCategory,
    riskCategoryLabel: riskCategoryLabel(riskCategory),
    label: 'Low HEART score',
    riskBand: '0–3 points',
    maceContext: 'Approximate MACE ~1–2% at 6 weeks in validation cohorts',
    interpretation:
      'Scores of 0–3 fall in the low-risk stratum in validation studies. Low short-term risk does not exclude acute coronary syndrome — clinical judgment and local chest-pain pathways still apply.',
    disclaimer,
    referenceLine,
  };
}
