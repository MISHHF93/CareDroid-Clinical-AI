/**
 * Morse Fall Scale — inpatient fall risk.
 * Reference: Morse JM, et al. Predicting patient falls. Am J Nurs. 1989;89(3):334–337.
 */

export const MORSE_DIMENSIONS_META = [
  {
    key: 'historyOfFalling',
    label: 'History of falling',
    help: 'Immediate or within 3 months prior to admission.',
    options: [
      { value: 0, label: 'No' },
      { value: 25, label: 'Yes' },
    ],
  },
  {
    key: 'secondaryDiagnosis',
    label: 'Secondary diagnosis',
    help: 'More than one medical diagnosis on chart.',
    options: [
      { value: 0, label: 'No' },
      { value: 15, label: 'Yes' },
    ],
  },
  {
    key: 'ambulatoryAid',
    label: 'Ambulatory aid',
    help: 'Use of furniture, crutches, cane, or walker; or bed rest / nurse assist.',
    options: [
      { value: 0, label: 'None / bed rest / nurse assist' },
      { value: 15, label: 'Crutches, cane, or walker' },
      { value: 30, label: 'Furniture for support' },
    ],
  },
  {
    key: 'ivHeparinLock',
    label: 'IV or heparin lock',
    help: 'Intravenous line or heparin lock present.',
    options: [
      { value: 0, label: 'No' },
      { value: 20, label: 'Yes' },
    ],
  },
  {
    key: 'gait',
    label: 'Gait',
    help: 'Observed walking pattern.',
    options: [
      { value: 0, label: 'Normal / bed rest / immobile' },
      { value: 10, label: 'Weak' },
      { value: 20, label: 'Impaired' },
    ],
  },
  {
    key: 'mentalStatus',
    label: 'Mental status',
    help: 'Awareness of own ability to transfer.',
    options: [
      { value: 0, label: 'Oriented to own ability' },
      { value: 15, label: 'Overestimates or forgets limitations' },
    ],
  },
];

/**
 * @param {Record<string, number>} inputs
 */
export function calculateMorseFallScore(inputs) {
  let total = 0;
  for (const dim of MORSE_DIMENSIONS_META) {
    const v = Number(inputs[dim.key]);
    const allowed = dim.options.map((o) => o.value);
    if (!allowed.includes(v)) return null;
    total += v;
  }
  return total;
}

/**
 * @param {number} score 0–125
 */
export function interpretMorseFallScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 125) return null;

  const referenceLine =
    'Morse JM, et al. Predicting patient falls. Am J Nurs. 1989;89(3):334–337.';

  const disclaimer =
    'Fall-risk screening only — does not replace environmental assessment, toileting plans, or physiotherapy referral.';

  if (score > 50) {
    return {
      severity: 'critical',
      label: 'High fall risk',
      riskBand: '> 50 points',
      interpretation:
        'High fall-risk band in Morse validation — implement high-risk fall precautions per nursing protocol.',
      disclaimer,
      referenceLine,
    };
  }

  if (score >= 25) {
    return {
      severity: 'warning',
      label: 'Moderate fall risk',
      riskBand: '25–50 points',
      interpretation:
        'Moderate fall-risk band — standard fall-prevention interventions and reassessment with status changes.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Low fall risk',
    riskBand: '< 25 points',
    interpretation: 'Low fall-risk band — continue routine fall-prevention measures.',
    disclaimer,
    referenceLine,
  };
}
