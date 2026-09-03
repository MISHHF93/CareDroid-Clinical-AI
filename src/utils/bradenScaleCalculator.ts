/**
 * Braden Scale — pressure injury risk assessment.
 * Reference: Bergstrom N, et al. The Braden Scale for Predicting Pressure Sore Risk. Nurs Res. 1987;36(4):205–210.
 */

export const BRADEN_HOSPITAL_DISCLAIMER =
  'Inpatient nursing risk screen for pressure-injury prevention documentation. Does not replace skin inspection, repositioning orders, support-surface selection, or wound care plans — follow institutional prevention bundles.';

export const BRADEN_DIMENSIONS_META = [
  {
    key: 'sensoryPerception',
    label: 'Sensory perception',
    help: 'Ability to respond meaningfully to pressure-related discomfort.',
    options: [
      { value: 1, label: 'Completely limited' },
      { value: 2, label: 'Very limited' },
      { value: 3, label: 'Slightly limited' },
      { value: 4, label: 'No impairment' },
    ],
  },
  {
    key: 'moisture',
    label: 'Moisture',
    help: 'Degree to which skin is exposed to moisture.',
    options: [
      { value: 1, label: 'Constantly moist' },
      { value: 2, label: 'Often moist' },
      { value: 3, label: 'Occasionally moist' },
      { value: 4, label: 'Rarely moist' },
    ],
  },
  {
    key: 'activity',
    label: 'Activity',
    help: 'Degree of physical activity.',
    options: [
      { value: 1, label: 'Bedfast' },
      { value: 2, label: 'Chairfast' },
      { value: 3, label: 'Walks occasionally' },
      { value: 4, label: 'Walks frequently' },
    ],
  },
  {
    key: 'mobility',
    label: 'Mobility',
    help: 'Ability to change and control body position.',
    options: [
      { value: 1, label: 'Completely immobile' },
      { value: 2, label: 'Very limited' },
      { value: 3, label: 'Slightly limited' },
      { value: 4, label: 'No limitation' },
    ],
  },
  {
    key: 'nutrition',
    label: 'Nutrition',
    help: 'Usual food intake pattern.',
    options: [
      { value: 1, label: 'Very poor' },
      { value: 2, label: 'Probably inadequate' },
      { value: 3, label: 'Adequate' },
      { value: 4, label: 'Excellent' },
    ],
  },
  {
    key: 'frictionShear',
    label: 'Friction & shear',
    help: 'Friction and shear forces on skin.',
    options: [
      { value: 1, label: 'Problem' },
      { value: 2, label: 'Potential problem' },
      { value: 3, label: 'No apparent problem' },
    ],
  },
];

/**
 * @param {Record<string, number>} inputs
 */
export function calculateBradenScore(inputs) {
  let total = 0;
  for (const dim of BRADEN_DIMENSIONS_META) {
    const v = Number(inputs[dim.key]);
    const min = Math.min(...dim.options.map((o) => o.value));
    const max = Math.max(...dim.options.map((o) => o.value));
    if (!Number.isFinite(v) || v < min || v > max) return null;
    total += v;
  }
  return total;
}

/**
 * @param {number} score 6–23 (lower = higher risk)
 */
export function interpretBradenScore(score) {
  if (!Number.isFinite(score) || score < 6 || score > 23) return null;

  const referenceLine =
    'Bergstrom N, et al. The Braden Scale for Predicting Pressure Sore Risk. Nurs Res. 1987;36(4):205–210.';

  const disclaimer = BRADEN_HOSPITAL_DISCLAIMER;

  if (score <= 12) {
    return {
      severity: 'critical',
      riskCategory: 'high',
      riskCategoryLabel: 'High pressure-injury risk',
      label: 'High pressure-injury risk',
      riskBand: '≤ 12',
      interpretation:
        'Scores ≤12 fall in the high-risk stratum in validation studies — discuss enhanced prevention measures per institutional pressure-injury protocol.',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 14) {
    return {
      severity: 'warning',
      riskCategory: 'moderate',
      riskCategoryLabel: 'Moderate pressure-injury risk',
      label: 'Moderate pressure-injury risk',
      riskBand: '13–14',
      interpretation:
        'Moderate risk stratum — supports documentation for prevention bundle review and serial skin assessment.',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 16) {
    return {
      severity: 'warning',
      riskCategory: 'mild',
      riskCategoryLabel: 'Mild pressure-injury risk',
      label: 'Mild pressure-injury risk',
      riskBand: '15–16',
      interpretation:
        'Mild risk stratum — continue standard prevention documentation and reassessment.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    riskCategory: 'low',
    riskCategoryLabel: 'Lower pressure-injury risk',
    label: 'Lower pressure-injury risk',
    riskBand: '17–23',
    interpretation:
      'Lower risk stratum — maintain routine prevention and reassess with clinical status changes.',
    disclaimer,
    referenceLine,
  };
}
