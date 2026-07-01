/**
 * Wells clinical prediction rule for pulmonary embolism (PE).
 * Seven criteria with fractional points (maximum 12.5).
 *
 * Reference: Wells PS, Anderson DR, Rodger M, et al. Derivation of a simple clinical
 * model to categorize patients' probability of pulmonary embolism: increasing the
 * model's utility with the SimpliRED D-dimer. Thromb Haemost. 2000;83(3):416–420;
 * Wells PS et al. Excluding pulmonary embolism at the bedside without diagnostic imaging.
 * Ann Intern Med. 2001;135(2):98–107.
 */

/** @typedef {{
 *   clinicalDvtSigns: boolean,
 *   peMostLikelyDiagnosis: boolean,
 *   heartRateOver100: boolean,
 *   immobilizationOrSurgery: boolean,
 *   previousDvtOrPe: boolean,
 *   hemoptysis: boolean,
 *   malignancy: boolean,
 * }} WellsPeInputs */

export const WELLS_PE_CRITERIA_META = [
  {
    key: 'clinicalDvtSigns',
    shortLabel: 'Clinical signs/symptoms of DVT',
    points: 3,
    help: 'Leg swelling, pain with palpation of deep veins, or other clinical features of DVT.',
  },
  {
    key: 'peMostLikelyDiagnosis',
    shortLabel: 'PE is #1 diagnosis or equally likely',
    points: 3,
    help: 'Pulmonary embolism is as likely as or more likely than an alternative diagnosis.',
  },
  {
    key: 'heartRateOver100',
    shortLabel: 'Heart rate > 100/min',
    points: 1.5,
    help: 'Pulse greater than 100 beats per minute.',
  },
  {
    key: 'immobilizationOrSurgery',
    shortLabel: 'Immobilization =3 days or surgery (past 4 weeks)',
    points: 1.5,
    help: 'Bed rest =3 days or major surgery under general anaesthesia within the previous 4 weeks.',
  },
  {
    key: 'previousDvtOrPe',
    shortLabel: 'Previous DVT or PE',
    points: 1.5,
    help: 'Objective history of deep vein thrombosis or pulmonary embolism.',
  },
  {
    key: 'hemoptysis',
    shortLabel: 'Hemoptysis',
    points: 1,
    help: 'Coughing blood reported or observed.',
  },
  {
    key: 'malignancy',
    shortLabel: 'Malignancy',
    points: 1,
    help: 'Active cancer (treatment ongoing, within 6 months, or palliative).',
  },
];

/**
 * @param {WellsPeInputs} raw
 * @returns {Record<string, number>}
 */
export function computeWellsPeBreakdown(raw) {
  const breakdown: any = {};
  for (const row of WELLS_PE_CRITERIA_META) {
    breakdown[row.key] = raw[row.key] ? row.points : 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, number>} breakdown
 */
export function sumWellsPeScore(breakdown) {
  let total = 0;
  for (const row of WELLS_PE_CRITERIA_META) {
    const v = breakdown[row.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    total += v;
  }
  return Math.round(total * 10) / 10;
}

/**
 * @param {WellsPeInputs} raw
 */
export function calculateWellsPeScore(raw) {
  return sumWellsPeScore(computeWellsPeBreakdown(raw));
}

/**
 * Three-tier probability bands (Wells PE validation literature).
 * @param {number} score
 */
export function interpretWellsPe(score) {
  if (!Number.isFinite(score) || score < 0 || score > 12.5) {
    return null;
  }

  const referenceLine =
    'Wells PS et al. Thromb Haemost. 2000;83(3):416–420; Wells PS et al. Ann Intern Med. 2001;135(2):98–107.';

  const diagnosticDisclaimer =
    'This score estimates pre-test clinical probability only. It does not rule in or rule out pulmonary embolism and must not replace imaging, D-dimer, or institutional PE pathways when indicated.';

  if (score > 6) {
    return {
      severity: 'critical',
      probabilityBand: 'High probability',
      label: 'High clinical probability of PE',
      interpretation:
        'A Wells PE score above 6 is associated with a higher likelihood of pulmonary embolism in validation cohorts. Further evaluation (e.g. imaging or pathway-based work-up per local protocol) may be appropriate — this tool does not mandate a specific test or treatment.',
      diagnosticDisclaimer,
      referenceLine,
    };
  }

  if (score > 4) {
    return {
      severity: 'warning',
      probabilityBand: 'Intermediate probability',
      label: 'Intermediate clinical probability of PE',
      interpretation:
        'Scores between 4 and 6 fall in an intermediate probability band. Interpret alongside pre-test probability, D-dimer strategy where applicable, and senior review per your PE pathway.',
      diagnosticDisclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    probabilityBand: 'Low probability',
    label: 'Lower clinical probability of PE',
    interpretation:
      'A Wells PE score of 4 or less is associated with lower probability in validation studies, but pulmonary embolism can still be present. Do not exclude PE on this score alone if clinical suspicion remains.',
    diagnosticDisclaimer,
    referenceLine,
  };
}
