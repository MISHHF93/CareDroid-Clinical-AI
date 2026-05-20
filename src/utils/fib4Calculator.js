/**
 * FIB-4 index — non-invasive liver fibrosis risk (NAFLD / chronic hepatitis context).
 * Reference: Vallet-Pichard A, et al. FIB-4: an inexpensive and accurate marker of fibrosis in HCV/HIV co-infection. Hepatology. 2007;46(1):266–272.
 */

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
  if (!Number.isFinite(fib4) || fib4 <= 0) return null;

  const referenceLine =
    'Vallet-Pichard A, et al. FIB-4: an inexpensive and accurate marker of fibrosis in HCV/HIV co-infection. Hepatology. 2007;46(1):266–272.';

  const disclaimer =
    'Screening index only — does not diagnose cirrhosis or replace elastography, biopsy, or hepatology referral pathways.';

  const youngCutoff = ageYears < 65;

  if (youngCutoff) {
    if (fib4 < 1.3) {
      return {
        severity: 'normal',
        label: 'Low FIB-4',
        riskBand: '< 1.3 (age <65)',
        interpretation:
          'FIB-4 <1.3 in patients <65 years suggests advanced fibrosis is unlikely in validation studies — continue routine monitoring per hepatology protocol.',
        disclaimer,
        referenceLine,
      };
    }
    if (fib4 <= 2.67) {
      return {
        severity: 'warning',
        label: 'Indeterminate FIB-4',
        riskBand: '1.3–2.67 (age <65)',
        interpretation:
          'Indeterminate range — consider additional non-invasive tests (e.g. elastography) or specialist review per local pathway.',
        disclaimer,
        referenceLine,
      };
    }
    return {
      severity: 'critical',
      label: 'High FIB-4',
      riskBand: '> 2.67 (age <65)',
      interpretation:
        'FIB-4 >2.67 in patients <65 years is associated with higher likelihood of advanced fibrosis — consider hepatology referral and further staging.',
      disclaimer,
      referenceLine,
    };
  }

  if (fib4 < 2.0) {
    return {
      severity: 'normal',
      label: 'Lower FIB-4 (age ≥65)',
      riskBand: '< 2.0 (age ≥65)',
      interpretation:
        'FIB-4 <2.0 in older adults — lower risk band per age-adjusted interpretation; correlate with comorbidities.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'warning',
    label: 'Elevated FIB-4 (age ≥65)',
    riskBand: '≥ 2.0 (age ≥65)',
    interpretation:
      'FIB-4 ≥2.0 in patients ≥65 years — higher fibrosis concern in age-adjusted thresholds; specialist correlation advised.',
    disclaimer,
    referenceLine,
  };
}

/**
 * @param {{ ageYears: string|number, astUPerL: string|number, altUPerL: string|number, platelets10e9PerL: string|number }} raw
 */
export function validateFib4Inputs(raw) {
  const errors = [];
  const age = Number(raw.ageYears);
  const ast = Number(raw.astUPerL);
  const alt = Number(raw.altUPerL);
  const plt = Number(raw.platelets10e9PerL);

  if (!Number.isFinite(age) || age < 18 || age > 120) {
    errors.push('Enter age between 18 and 120 years.');
  }
  if (!Number.isFinite(ast) || ast <= 0) {
    errors.push('Enter AST greater than 0 U/L.');
  }
  if (!Number.isFinite(alt) || alt <= 0) {
    errors.push('Enter ALT greater than 0 U/L.');
  }
  if (!Number.isFinite(plt) || plt <= 0) {
    errors.push('Enter platelet count greater than 0 (×10⁹/L).');
  }

  return errors;
}
