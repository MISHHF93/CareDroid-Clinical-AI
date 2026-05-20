/**
 * Braden Scale — pressure injury risk assessment.
 * Reference: Bergstrom N, et al. The Braden Scale for Predicting Pressure Sore Risk. Nurs Res. 1987;36(4):205–210.
 */

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

  const disclaimer =
    'Nursing risk screen only — does not replace skin inspection, repositioning orders, or wound care plans.';

  if (score <= 12) {
    return {
      severity: 'critical',
      label: 'High pressure-injury risk',
      riskBand: '≤ 12',
      interpretation:
        'Scores ≤12 indicate high risk in validation studies — implement enhanced skin care, repositioning, and support surface per institutional pressure-injury prevention protocol.',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 14) {
    return {
      severity: 'warning',
      label: 'Moderate pressure-injury risk',
      riskBand: '13–14',
      interpretation:
        'Moderate risk band — reinforce prevention bundle and frequent skin assessment.',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 16) {
    return {
      severity: 'warning',
      label: 'Mild pressure-injury risk',
      riskBand: '15–16',
      interpretation: 'Mild risk — continue standard prevention measures and documentation.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Lower pressure-injury risk',
    riskBand: '17–23',
    interpretation: 'Lower risk band — maintain routine prevention and reassess with clinical changes.',
    disclaimer,
    referenceLine,
  };
}
