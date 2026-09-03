/**
 * FIB-4 index — non-invasive liver fibrosis risk (NAFLD / chronic hepatitis context).
 * Reference: Vallet-Pichard A, et al. FIB-4: an inexpensive and accurate marker of fibrosis in HCV/HIV co-infection. Hepatology. 2007;46(1):266–272.
 */

export const FIB4_SAFETY_DISCLAIMER =
  'Non-invasive fibrosis screening index only. Does not diagnose cirrhosis or replace elastography, liver biopsy, or hepatology referral pathways — follow local NAFLD/hepatitis staging protocols.';

/** @param {number} score */
export function fib4RiskCategoryFromIndex(score, ageYears) {
  if (!Number.isFinite(score) || score <= 0 || !Number.isFinite(ageYears)) return null;
  if (ageYears < 65) {
    if (score < 1.3) return 'low';
    if (score <= 2.67) return 'indeterminate';
    return 'high';
  }
  return score < 2.0 ? 'low' : 'elevated';
}

/**
 * @param {{ ageYears: number, astUPerL: number, altUPerL: number, platelets10e9PerL: number }} inputs
 */
export function calculateFib4(inputs) {
  const { ageYears, astUPerL, altUPerL, platelets10e9PerL } = inputs;
  if (
    !Number.isFinite(ageYears) ||
    ageYears <= 0 ||
    !Number.isFinite(astUPerL) ||
    astUPerL <= 0 ||
    !Number.isFinite(altUPerL) ||
    altUPerL <= 0 ||
    !Number.isFinite(platelets10e9PerL) ||
    platelets10e9PerL <= 0
  ) {
    return null;
  }

  const index = (ageYears * astUPerL) / (platelets10e9PerL * Math.sqrt(altUPerL));
  if (!Number.isFinite(index) || index <= 0) return null;
  return Math.round(index * 100) / 100;
}

/**
 * @param {number} fib4
 * @param {number} ageYears
 */
export function interpretFib4(fib4, ageYears) {
  if (!Number.isFinite(fib4) || fib4 <= 0 || !Number.isFinite(ageYears) || ageYears <= 0)
    return null;

  const riskCategory = fib4RiskCategoryFromIndex(fib4, ageYears);
  if (!riskCategory) return null;

  const referenceLine =
    'Vallet-Pichard A, et al. FIB-4: an inexpensive and accurate marker of fibrosis in HCV/HIV co-infection. Hepatology. 2007;46(1):266–272.';

  const disclaimer = FIB4_SAFETY_DISCLAIMER;
  const youngCutoff = ageYears < 65;

  if (youngCutoff) {
    if (fib4 < 1.3) {
      return {
        severity: 'normal',
        riskCategory,
        riskCategoryLabel: 'Low fibrosis concern (age <65)',
        label: 'Low FIB-4',
        riskBand: '< 1.3 (age <65)',
        interpretation:
          'FIB-4 <1.3 in patients <65 years suggests advanced fibrosis is unlikely in validation studies — supports routine monitoring per hepatology protocol.',
        disclaimer,
        referenceLine,
      };
    }
    if (fib4 <= 2.67) {
      return {
        severity: 'warning',
        riskCategory,
        riskCategoryLabel: 'Indeterminate fibrosis concern (age <65)',
        label: 'Indeterminate FIB-4',
        riskBand: '1.3–2.67 (age <65)',
        interpretation:
          'Indeterminate range — supports additional non-invasive staging (e.g. elastography) or specialist review per local pathway.',
        disclaimer,
        referenceLine,
      };
    }
    return {
      severity: 'critical',
      riskCategory,
      riskCategoryLabel: 'Higher fibrosis concern (age <65)',
      label: 'High FIB-4',
      riskBand: '> 2.67 (age <65)',
      interpretation:
        'FIB-4 >2.67 in patients <65 years is associated with higher likelihood of advanced fibrosis in validation studies — supports hepatology correlation and further staging.',
      disclaimer,
      referenceLine,
    };
  }

  if (fib4 < 2.0) {
    return {
      severity: 'normal',
      riskCategory,
      riskCategoryLabel: 'Lower fibrosis concern (age ≥65)',
      label: 'Lower FIB-4 (age ≥65)',
      riskBand: '< 2.0 (age ≥65)',
      interpretation:
        'FIB-4 <2.0 in older adults — lower risk stratum per age-adjusted interpretation; correlate with comorbidities and serial trends.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'warning',
    riskCategory,
    riskCategoryLabel: 'Elevated fibrosis concern (age ≥65)',
    label: 'Elevated FIB-4 (age ≥65)',
    riskBand: '≥ 2.0 (age ≥65)',
    interpretation:
      'FIB-4 ≥2.0 in patients ≥65 years — higher fibrosis concern in age-adjusted thresholds; supports specialist correlation.',
    disclaimer,
    referenceLine,
  };
}

const FIB4_LIMITS = {
  ageYears: { min: 18, max: 120 },
  astUPerL: { min: 0, max: 10000 },
  altUPerL: { min: 0, max: 10000 },
  platelets10e9PerL: { min: 0, max: 2000 },
};

/**
 * @param {{ ageYears: string|number, astUPerL: string|number, altUPerL: string|number, platelets10e9PerL: string|number }} raw
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateFib4Inputs(raw) {
  const errors = [] as any[];
  const age = Number(raw.ageYears);
  const ast = Number(raw.astUPerL);
  const alt = Number(raw.altUPerL);
  const plt = Number(raw.platelets10e9PerL);

  if (!Number.isFinite(age) || age < FIB4_LIMITS.ageYears.min || age > FIB4_LIMITS.ageYears.max) {
    errors.push(
      `Enter age between ${FIB4_LIMITS.ageYears.min} and ${FIB4_LIMITS.ageYears.max} years.`,
    );
  }
  if (!Number.isFinite(ast) || ast <= FIB4_LIMITS.astUPerL.min || ast > FIB4_LIMITS.astUPerL.max) {
    errors.push(`Enter AST between 1 and ${FIB4_LIMITS.astUPerL.max} U/L.`);
  }
  if (!Number.isFinite(alt) || alt <= FIB4_LIMITS.altUPerL.min || alt > FIB4_LIMITS.altUPerL.max) {
    errors.push(`Enter ALT between 1 and ${FIB4_LIMITS.altUPerL.max} U/L.`);
  }
  if (
    !Number.isFinite(plt) ||
    plt <= FIB4_LIMITS.platelets10e9PerL.min ||
    plt > FIB4_LIMITS.platelets10e9PerL.max
  ) {
    errors.push(
      `Enter platelet count between 1 and ${FIB4_LIMITS.platelets10e9PerL.max} (×10?/L).`,
    );
  }

  return { valid: errors.length === 0, errors };
}
