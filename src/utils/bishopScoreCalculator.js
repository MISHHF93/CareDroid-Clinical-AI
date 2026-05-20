/**
 * Bishop score — cervical favourability for labour induction.
 * Reference: Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964;24:266–268.
 */

export const BISHOP_DIMENSIONS_META = [
  {
    key: 'dilation',
    label: 'Cervical dilation',
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

/**
 * @param {Record<string, number>} inputs
 */
export function calculateBishopScore(inputs) {
  let total = 0;
  for (const dim of BISHOP_DIMENSIONS_META) {
    const v = Number(inputs[dim.key]);
    const max = Math.max(...dim.options.map((o) => o.value));
    if (!Number.isFinite(v) || v < 0 || v > max) return null;
    total += v;
  }
  return total;
}

/**
 * @param {number} score 0–13
 */
export function interpretBishopScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 13) return null;

  const referenceLine =
    'Bishop EH. Pelvic scoring for elective induction. Obstet Gynecol. 1964;24:266–268.';

  const disclaimer =
    'Obstetric decision support only — does not recommend induction method, timing, or mode of delivery.';

  if (score >= 8) {
    return {
      severity: 'normal',
      label: 'Favourable Bishop score',
      riskBand: '≥ 8 points',
      favourability: 'Generally considered favourable cervix for induction in classic teaching',
      interpretation:
        'Scores ≥8 are traditionally associated with a favourable cervix and higher success with labour induction in many cohorts — interpret with gestational age, parity, and local obstetric protocol.',
      disclaimer,
      referenceLine,
    };
  }

  if (score >= 6) {
    return {
      severity: 'warning',
      label: 'Intermediate Bishop score',
      riskBand: '6–7 points',
      favourability: 'Intermediate favourability',
      interpretation:
        'Intermediate scores — cervical ripening or induction strategy per obstetric team and institutional protocol.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'warning',
    label: 'Unfavourable Bishop score',
    riskBand: '< 6 points',
    favourability: 'Unfavourable cervix in classic teaching',
    interpretation:
      'Scores <6 are traditionally considered unfavourable — discuss cervical ripening agents and induction planning with obstetrics.',
    disclaimer,
    referenceLine,
  };
}
