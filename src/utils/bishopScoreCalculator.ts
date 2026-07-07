/**
 * Bishop score — cervical favourability for labour induction.
 * Reference: Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964;24:266–268.
 */

export const BISHOP_OBSTETRIC_DISCLAIMER =
  'Cervical favourability documentation for labour and delivery planning. Does not recommend induction method, ripening agents, timing, or mode of delivery — follow obstetric team and institutional protocols.';

export const BISHOP_DIMENSIONS_META = [
  {
    key: 'dilation',
    label: 'Cervical dilation',
    help: 'Measured in centimetres from closed to ≥5 cm.',
    options: [
      { value: 0, label: 'Closed' },
      { value: 1, label: '1–2 cm' },
      { value: 2, label: '3–4 cm' },
      { value: 3, label: '≥ 5 cm' },
    ],
  },
  {
    key: 'effacement',
    label: 'Effacement',
    help: 'Percentage of cervical length effaced.',
    options: [
      { value: 0, label: '0–30%' },
      { value: 1, label: '40–50%' },
      { value: 2, label: '60–70%' },
      { value: 3, label: '≥ 80%' },
    ],
  },
  {
    key: 'station',
    label: 'Fetal station',
    help: 'Fetal head position relative to ischial spines.',
    options: [
      { value: 0, label: '−3' },
      { value: 1, label: '−2' },
      { value: 2, label: '−1 or 0' },
      { value: 3, label: '+1 or +2' },
    ],
  },
  {
    key: 'consistency',
    label: 'Cervical consistency',
    options: [
      { value: 0, label: 'Firm' },
      { value: 1, label: 'Medium' },
      { value: 2, label: 'Soft' },
    ],
  },
  {
    key: 'position',
    label: 'Cervical position',
    options: [
      { value: 0, label: 'Posterior' },
      { value: 1, label: 'Mid-position' },
      { value: 2, label: 'Anterior' },
    ],
  },
];

/** @param {number} score */
export function bishopRiskCategoryFromScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 13) return null;
  if (score >= 8) return 'favourable';
  if (score >= 6) return 'intermediate';
  return 'unfavourable';
}

/**
 * @param {Record<string, number>} inputs
 */
export function calculateBishopScore(inputs) {
  const validation = validateBishopInputs(inputs);
  if (!validation.valid) return null;

  let total = 0;
  for (const dim of BISHOP_DIMENSIONS_META) {
    total += Number(inputs[dim.key]);
  }
  return total;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateBishopInputs(raw) {
  const errors = [] as any[];
  for (const dim of BISHOP_DIMENSIONS_META) {
    const v = Number(raw[dim.key]);
    const allowed = dim.options.map((o) => o.value);
    if (!allowed.includes(v)) {
      errors.push(`${dim.label}: select a valid examination finding.`);
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @param {number} score 0–13
 */
export function interpretBishopScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 13) return null;

  const riskCategory = bishopRiskCategoryFromScore(score);
  if (!riskCategory) return null;

  const referenceLine =
    'Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964;24:266–268.';

  const disclaimer = BISHOP_OBSTETRIC_DISCLAIMER;

  const riskCategoryLabels = {
    favourable: 'Favourable cervical favourability',
    intermediate: 'Intermediate cervical favourability',
    unfavourable: 'Unfavourable cervical favourability',
  };

  if (score >= 8) {
    return {
      severity: 'normal',
      riskCategory,
      riskCategoryLabel: riskCategoryLabels[riskCategory],
      label: 'Favourable Bishop score',
      riskBand: '≥ 8 points',
      favourability: 'Traditionally considered favourable cervix in classic teaching',
      interpretation:
        'Scores =8 are associated with a favourable cervix and higher induction success in many cohorts — interpret with gestational age, parity, and local obstetric documentation standards.',
      disclaimer,
      referenceLine,
    };
  }

  if (score >= 6) {
    return {
      severity: 'warning',
      riskCategory,
      riskCategoryLabel: riskCategoryLabels[riskCategory],
      label: 'Intermediate Bishop score',
      riskBand: '6–7 points',
      favourability: 'Intermediate favourability in classic teaching',
      interpretation:
        'Intermediate scores — supports induction-planning documentation with obstetric correlation per institutional protocol.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'warning',
    riskCategory,
    riskCategoryLabel: riskCategoryLabels[riskCategory],
    label: 'Unfavourable Bishop score',
    riskBand: '< 6 points',
    favourability: 'Unfavourable cervix in classic teaching',
    interpretation:
      'Scores <6 are traditionally considered unfavourable — supports cervical exam documentation and obstetric team review per protocol.',
    disclaimer,
    referenceLine,
  };
}
