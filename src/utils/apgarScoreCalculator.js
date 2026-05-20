/**
 * Apgar score — newborn status at 1 and 5 minutes.
 * Reference: Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953;32:260–267.
 */

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

/**
 * @param {Record<string, number>} inputs
 */
export function calculateApgarScore(inputs) {
  let total = 0;
  for (const comp of APGAR_COMPONENTS_META) {
    const v = Number(inputs[comp.key]);
    if (!Number.isFinite(v) || v < 0 || v > 2) return null;
    total += v;
  }
  return total;
}

/**
 * @param {number} score 0–10
 */
export function interpretApgarScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 10) return null;

  const referenceLine =
    'Apgar V. A proposal for a new method of evaluation of the newborn infant. Curr Res Anesth Analg. 1953;32:260–267.';

  const disclaimer =
    'Neonatal assessment aid only — does not replace resuscitation algorithms (e.g. NRP) or ongoing monitoring.';

  if (score <= 3) {
    return {
      severity: 'critical',
      label: 'Critically low Apgar',
      riskBand: '0–3',
      interpretation:
        'Scores 0–3 at 1 minute indicate need for immediate resuscitation and neonatal team support per NRP/local protocol.',
      disclaimer,
      referenceLine,
    };
  }

  if (score <= 6) {
    return {
      severity: 'warning',
      label: 'Moderately depressed Apgar',
      riskBand: '4–6',
      interpretation:
        'Scores 4–6 suggest moderate depression — continued warming, stimulation, and respiratory support as indicated; reassess at 5 minutes.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Reassuring Apgar',
    riskBand: '7–10',
    interpretation:
      'Scores 7–10 are generally reassuring — continue routine newborn care and serial observation.',
    disclaimer,
    referenceLine,
  };
}
