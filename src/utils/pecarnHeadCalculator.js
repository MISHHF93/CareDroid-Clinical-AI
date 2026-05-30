/**
 * PECARN pediatric head injury / CT decision rule — informational stratification only.
 *
 * Reference: Kuppermann N, et al. Identification of children at very low risk of clinically
 * important brain injuries after head trauma. Lancet. 2009;374(9696):1160–1170.
 *
 * Does not order or defer CT; does not replace clinician judgment or observation protocols.
 */

export const PECARN_HEAD_DISCLAIMER =
  'Informational pediatric head injury decision support only. Does not recommend for or against head CT, observation, or discharge. Rule outputs do not override clinical judgment, shared decision-making, or institutional trauma protocols.';

/** @typedef {'under_2' | 'two_plus'} PecarnAgeCategory */

/** @typedef {'higher' | 'lower'} PecarnRiskStratum */

export const PECARN_AGE_CATEGORIES = Object.freeze([
  { value: 'under_2', label: 'Younger than 2 years' },
  { value: 'two_plus', label: '2 years and older (typically up to 18 years)' },
]);

/**
 * @param {{
 *   ageCategory: PecarnAgeCategory,
 *   alteredMentalStatus?: boolean,
 *   lossOfConsciousness?: boolean,
 *   vomiting?: boolean,
 *   severeMechanism?: boolean,
 *   skullFractureSigns?: boolean,
 * }} raw
 */
export function evaluatePecarnHead(raw) {
  const ageCategory = raw.ageCategory;
  if (ageCategory !== 'under_2' && ageCategory !== 'two_plus') {
    return null;
  }

  const alteredMentalStatus = Boolean(raw.alteredMentalStatus);
  const lossOfConsciousness = Boolean(raw.lossOfConsciousness);
  const vomiting = Boolean(raw.vomiting);
  const severeMechanism = Boolean(raw.severeMechanism);
  const skullFractureSigns = Boolean(raw.skullFractureSigns);

  /** @type {string[]} */
  const triggeredCriteria = [];

  if (alteredMentalStatus) {
    triggeredCriteria.push('GCS <15 or altered mental status');
  }

  if (ageCategory === 'under_2') {
    if (skullFractureSigns) {
      triggeredCriteria.push('Palpable skull fracture');
    }
    if (severeMechanism) {
      triggeredCriteria.push('Severe or worsening mechanism of injury');
    }
    if (lossOfConsciousness) {
      triggeredCriteria.push('Loss of consciousness (>5 seconds in PECARN <2 years cohort)');
    }
  } else {
    if (skullFractureSigns) {
      triggeredCriteria.push('Signs of basilar skull fracture');
    }
    if (vomiting) {
      triggeredCriteria.push('Vomiting');
    }
    if (severeMechanism) {
      triggeredCriteria.push('Severe or worsening mechanism of injury');
    }
  }

  const ruleCriteriaMet = triggeredCriteria.length > 0;
  const riskStratum = ruleCriteriaMet ? 'higher' : 'lower';

  return {
    ageCategory,
    ruleCriteriaMet,
    riskStratum,
    triggeredCriteria,
    ...interpretPecarnHead({ ageCategory, ruleCriteriaMet, riskStratum, triggeredCriteria }),
  };
}

/**
 * @param {{
 *   ageCategory: PecarnAgeCategory,
 *   ruleCriteriaMet: boolean,
 *   riskStratum: PecarnRiskStratum,
 *   triggeredCriteria: string[],
 * }} input
 */
export function interpretPecarnHead(input) {
  const { ageCategory, ruleCriteriaMet, triggeredCriteria } = input;
  const ageLabel = ageCategory === 'under_2' ? '<2 years' : '≥2 years';

  const referenceLine =
    'Kuppermann N, et al. Identification of children at very low risk of clinically important brain injuries after head trauma: a prospective cohort study. Lancet. 2009;374(9696):1160–1170.';

  if (ruleCriteriaMet) {
    return {
      severity: 'warning',
      riskStratumLabel: 'Higher-risk stratum (PECARN criteria present)',
      interpretation: `For the ${ageLabel} PECARN age group, one or more rule criteria are present (${triggeredCriteria.join('; ')}). In the derivation cohort, such patients were not in the very-low-risk group for clinically important traumatic brain injury. This is informational stratification only — it does not direct CT, observation, or discharge.`,
      disclaimer: PECARN_HEAD_DISCLAIMER,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    riskStratumLabel: 'Lower-risk stratum (no PECARN criteria in this assessment)',
    interpretation: `For the ${ageLabel} PECARN age group, none of the assessed rule criteria are present. In validation, this stratum had a low rate of clinically important TBI, but the miss rate is not zero. Continue clinical assessment per local pediatric trauma protocols.`,
    disclaimer: PECARN_HEAD_DISCLAIMER,
    referenceLine,
  };
}
