/**
 * Apgar score — newborn status at 1 and 5 minutes.
 * Reference: Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953;32:260–267.
 */

export const APGAR_OBSTETRIC_DISCLAIMER =
  'Newborn assessment and documentation aid at 1 and 5 minutes. Does not replace neonatal resuscitation algorithms (e.g. NRP), cord management, or ongoing monitoring — follow delivery-unit and pediatric protocols.';

export const APGAR_COMPONENTS_META = [
  {
    key: 'appearance',
    label: 'Appearance (skin colour)',
    options: [
      { value: 0, label: 'Blue or pale all over' },
      { value: 1, label: 'Body pink, extremities blue' },
      { value: 2, label: 'Completely pink' },
    ],
  },
  {
    key: 'pulse',
    label: 'Pulse (heart rate)',
    options: [
      { value: 0, label: 'Absent' },
      { value: 1, label: '< 100 bpm' },
      { value: 2, label: '≥ 100 bpm' },
    ],
  },
  {
    key: 'grimace',
    label: 'Grimace (reflex irritability)',
    options: [
      { value: 0, label: 'No response' },
      { value: 1, label: 'Grimace on stimulation' },
      { value: 2, label: 'Cry or active withdrawal' },
    ],
  },
  {
    key: 'activity',
    label: 'Activity (muscle tone)',
    options: [
      { value: 0, label: 'Limp' },
      { value: 1, label: 'Some flexion' },
      { value: 2, label: 'Active motion' },
    ],
  },
  {
    key: 'respiration',
    label: 'Respiration',
    options: [
      { value: 0, label: 'Absent' },
      { value: 1, label: 'Slow / irregular' },
      { value: 2, label: 'Good cry' },
    ],
  },
];

/** @param {number} score */
export function apgarRiskCategoryFromScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;
  if (score <= 3) return 'severely_depressed';
  if (score <= 6) return 'moderately_depressed';
  return 'reassuring';
}

/**
 * @param {Record<string, number|string>} inputs
 */
export function calculateApgarScore(inputs) {
  const validation = validateApgarMinuteInputs(inputs);
  if (!validation.valid) return null;

  let total = 0;
  for (const comp of APGAR_COMPONENTS_META) {
    total += Number(inputs[comp.key]);
  }
  return total;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateApgarMinuteInputs(raw) {
  const errors = [] as any[];
  for (const comp of APGAR_COMPONENTS_META) {
    const v = Number(raw[comp.key]);
    if (!Number.isFinite(v) || v < 0 || v > 2) {
      errors.push(`${comp.label}: select a score of 0, 1, or 2.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @param {number} score 0–10
 * @param {{ timingLabel?: string }} [options]
 */
export function interpretApgarScore(score, options: any = {}) {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;

  const riskCategory = apgarRiskCategoryFromScore(score);
  if (!riskCategory) return null;

  const timingSuffix = options.timingLabel ? ` at ${options.timingLabel}` : '';

  const referenceLine =
    'Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953;32:260–267.';

  const disclaimer = APGAR_OBSTETRIC_DISCLAIMER;

  const riskCategoryLabels = {
    severely_depressed: 'Severely depressed Apgar stratum',
    moderately_depressed: 'Moderately depressed Apgar stratum',
    reassuring: 'Reassuring Apgar stratum',
  };

  if (score <= 3) {
    return {
      severity: 'critical',
      riskCategory,
      riskCategoryLabel: riskCategoryLabels[riskCategory],
      label: 'Critically low Apgar',
      riskBand: `0–3${timingSuffix}`,
      interpretation:
        'Scores 0–3 fall in the severely depressed stratum in teaching — supports correlation with neonatal team assessment and institutional newborn resuscitation pathway documentation (e.g. NRP).',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 6) {
    return {
      severity: 'warning',
      riskCategory,
      riskCategoryLabel: riskCategoryLabels[riskCategory],
      label: 'Moderately depressed Apgar',
      riskBand: `4–6${timingSuffix}`,
      interpretation:
        'Scores 4–6 suggest moderate depression in validation cohorts — supports serial reassessment and newborn observation per delivery-unit protocol.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    riskCategory,
    riskCategoryLabel: riskCategoryLabels[riskCategory],
    label: 'Reassuring Apgar',
    riskBand: `7–10${timingSuffix}`,
    interpretation:
      'Scores 7–10 are generally reassuring in teaching — supports routine newborn observation and documentation.',
    disclaimer,
    referenceLine,
  };
}
