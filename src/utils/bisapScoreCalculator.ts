/**
 * BISAP score — early pancreatitis severity / mortality risk.
 * Reference: Wu BU, et al. The early prediction of mortality in acute pancreatitis. Am J Gastroenterol. 2008;103(5):1198–1203.
 */

export const BISAP_SAFETY_DISCLAIMER =
  'Early pancreatitis severity estimate for risk documentation. Does not replace imaging for necrosis, ICU criteria, fluid resuscitation, or serial clinical reassessment — follow institutional acute pancreatitis pathways.';

export const BISAP_CRITERIA_META = [
  {
    key: 'bunOver25',
    shortLabel: 'BUN > 25 mg/dL',
    help: 'Blood urea nitrogen >25 mg/dL (SI: >8.9 mmol/L) within 24 hours of presentation.',
  },
  {
    key: 'impairedMentalStatus',
    shortLabel: 'Impaired mental status',
    help: 'Disorientation, lethargy, somnolence, coma, or stupor attributed to pancreatitis.',
  },
  {
    key: 'sirsPresent',
    shortLabel: 'SIRS present',
    help: 'Systemic inflammatory response syndrome within 24 hours.',
  },
  {
    key: 'ageOver60',
    shortLabel: 'Age > 60 years',
    help: 'Age greater than 60 years at presentation.',
  },
  {
    key: 'pleuralEffusion',
    shortLabel: 'Pleural effusion',
    help: 'Pleural effusion on imaging within 24 hours.',
  },
];

/** @param {number} score */
export function bisapRiskCategoryFromScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 5) return null;
  if (score <= 2) return 'low';
  if (score === 3) return 'moderate';
  return 'high';
}

/**
 * @param {Record<string, boolean>} raw
 */
export function calculateBisapScore(raw) {
  const validation = validateBisapInputs(raw);
  if (!validation.valid) return null;

  let score = 0;
  for (const row of BISAP_CRITERIA_META) {
    if (raw[row.key]) score += 1;
  }
  return score;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBisapInputs(raw) {
  const errors = [] as any[];
  for (const row of BISAP_CRITERIA_META) {
    const value = raw[row.key];
    if (value !== undefined && value !== true && value !== false) {
      errors.push(`${row.shortLabel}: must be yes or no.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @param {number} score 0–5
 */
export function interpretBisapScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 5) return null;

  const riskCategory = bisapRiskCategoryFromScore(score);
  if (!riskCategory) return null;

  const referenceLine =
    'Wu BU, et al. The early prediction of mortality in acute pancreatitis. Am J Gastroenterol. 2008;103(5):1198–1203.';

  const disclaimer = BISAP_SAFETY_DISCLAIMER;

  const mortalityByScore = {
    0: '<1%',
    1: '~2%',
    2: '~4%',
    3: '~7%',
    4: '~15%',
    5: '~22%',
  };

  let severity = 'normal';
  if (score >= 3) severity = 'warning';
  if (score >= 4) severity = 'critical';

  const riskCategoryLabels = {
    low: 'Lower BISAP mortality risk',
    moderate: 'Moderate BISAP mortality risk',
    high: 'Higher BISAP mortality risk',
  };

  return {
    severity,
    riskCategory,
    riskCategoryLabel: riskCategoryLabels[riskCategory],
    label: score >= 3 ? 'Higher BISAP score' : 'Lower BISAP score',
    riskBand: `${score} of 5 points`,
    mortalityContext: `Approximate in-hospital mortality ${mortalityByScore[score] ?? '—'} in validation cohort`,
    interpretation:
      score >= 3
        ? 'Higher BISAP scores correlate with increased mortality in validation studies — supports monitored-care documentation and early critical-care consultation per protocol.'
        : 'Lower BISAP scores — supports standard pancreatitis care documentation with serial reassessment.',
    disclaimer,
    referenceLine,
  };
}
