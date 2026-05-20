/**
 * Modified Centor / McIsaac score — streptococcal pharyngitis probability.
 * Reference: McIsaac WJ, et al. Ann Intern Med. 1998;129(5):381–388.
 */

export const CENTOR_CRITERIA_META = [
  {
    key: 'tonsillarExudates',
    shortLabel: 'Tonsillar exudates or swelling',
    help: 'Tonsillar exudates or swelling on examination.',
  },
  {
    key: 'tenderAnteriorCervicalNodes',
    shortLabel: 'Tender anterior cervical adenopathy',
    help: 'Tender anterior cervical lymphadenopathy.',
  },
  {
    key: 'feverHistory',
    shortLabel: 'History of fever (>38°C / 100.4°F)',
    help: 'History of fever or measured temperature >38°C (100.4°F).',
  },
  {
    key: 'absenceOfCough',
    shortLabel: 'Absence of cough',
    help: 'No cough reported or heard on examination.',
  },
];

export const CENTOR_AGE_BANDS = [
  { value: '3_14', label: 'Age 3–14 years (+1)', points: 1 },
  { value: '15_44', label: 'Age 15–44 years (0)', points: 0 },
  { value: '45_plus', label: 'Age ≥45 years (+1)', points: 1 },
];

/**
 * @param {{ tonsillarExudates: boolean, tenderAnteriorCervicalNodes: boolean, feverHistory: boolean, absenceOfCough: boolean, ageBand: string }} raw
 */
export function calculateCentorMcisaacScore(raw) {
  let score = 0;
  for (const row of CENTOR_CRITERIA_META) {
    if (raw[row.key]) score += 1;
  }
  const band = CENTOR_AGE_BANDS.find((b) => b.value === raw.ageBand);
  if (!band) return null;
  score += band.points;
  return score;
}

/**
 * @param {number} score 0–5
 */
export function interpretCentorMcisaac(score) {
  if (!Number.isFinite(score) || score < 0 || score > 5) return null;

  const referenceLine =
    'McIsaac WJ, et al. Empirical validation of guidelines for the management of pharyngitis in children and adults. Ann Intern Med. 1998;129(5):381–388.';

  const probabilityByScore = {
    0: '~2.5%',
    1: '~6.4%',
    2: '~11.8%',
    3: '~22.8%',
    4: '~47.5%',
    5: '~51.6%',
  };

  const disclaimer =
    'Estimates group probability of GAS pharyngitis — does not replace rapid antigen or culture, and does not recommend antibiotics.';

  let severity = 'normal';
  let label = 'Lower Centor/McIsaac score';
  if (score >= 4) {
    severity = 'warning';
    label = 'Higher Centor/McIsaac score';
  }
  if (score >= 5) {
    severity = 'critical';
    label = 'Very high Centor/McIsaac score';
  }

  return {
    severity,
    label,
    riskBand: `${score} of 5 points`,
    strepProbability: `Approximate GAS probability ${probabilityByScore[score] ?? '—'} in validation cohort`,
    interpretation:
      score >= 4
        ? 'Higher scores favour streptococcal pharyngitis in validation studies — consider targeted testing before empiric antibiotics per local guideline.'
        : 'Lower scores favour viral aetiology in validation studies — testing and antibiotics per local pharyngitis protocol.',
    disclaimer,
    referenceLine,
  };
}
