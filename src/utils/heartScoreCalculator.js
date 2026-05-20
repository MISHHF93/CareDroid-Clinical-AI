/**
 * HEART score — chest pain risk stratification in the emergency department.
 * Reference: Six AJ, et al. Chest. 2008;134(6):1157–1164.
 */

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
 * @param {number} score 0–10
 */
export function interpretHeartScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;

  const referenceLine =
    'Six AJ, et al. Chest pain in the emergency room: value of the HEART score. Chest. 2008;134(6):1157–1164.';

  const disclaimer =
    'For patients with acute chest pain — not a diagnosis of ACS. Does not direct disposition, observation time, or invasive strategy.';

  if (score >= 7) {
    return {
      severity: 'critical',
      label: 'High HEART score',
      riskBand: '7–10 points',
      maceContext: 'MACE ~50–65% in validation cohorts at 6 weeks',
      interpretation:
        'Scores ≥7 are associated with a high rate of major adverse cardiac events (MACE) at 6 weeks in original validation studies. Consider expedited cardiology review and serial biomarkers per local chest-pain pathway.',
      disclaimer,
      referenceLine,
    };
  }

  if (score >= 4) {
    return {
      severity: 'warning',
      label: 'Intermediate HEART score',
      riskBand: '4–6 points',
      maceContext: 'MACE ~12–17% at 6 weeks in validation cohorts',
      interpretation:
        'Intermediate-risk band — observation, serial ECG/troponin, and risk-factor management per institutional chest-pain protocol.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Low HEART score',
    riskBand: '0–3 points',
    maceContext: 'MACE ~1–2% at 6 weeks in validation cohorts',
    interpretation:
      'Lower short-term MACE rates in validation cohorts, but ACS can still occur. Continue appropriate evaluation per protocol.',
    disclaimer,
    referenceLine,
  };
}
