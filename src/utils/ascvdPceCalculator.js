/**
 * ACC/AHA 2013 Pooled Cohort Equations (PCE) — 10-year ASCVD risk.
 *
 * Reference: Goff DC Jr, et al. 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk.
 * Circulation. 2014;129(25 suppl 2):S49–S73. Table A equation parameters.
 *
 * Decision support only — does not recommend statins or other therapies.
 */

/** @typedef {'female' | 'male'} AscvdSex */
/** @typedef {'white' | 'african_american' | 'other'} AscvdRace */
/** @typedef {'mg_dl' | 'mmol_l'} CholesterolUnit */

/** @typedef {{
 *   ageYears: number,
 *   sex: AscvdSex,
 *   race: AscvdRace,
 *   totalCholesterol: number,
 *   hdlCholesterol: number,
 *   cholesterolUnit: CholesterolUnit,
 *   systolicBpMmHg: number,
 *   onHypertensionTreatment: boolean,
 *   diabetes: boolean,
 *   smoker: boolean,
 * }} AscvdPceInputs */

const CHOL_MMOL_TO_MG_DL = 38.67;
const PCE_MIN_AGE = 40;
const PCE_MAX_AGE = 79;

/**
 * Sex- and race-specific PCE linear predictors (Table A).
 * "Other" race uses White coefficients per ACC guidance.
 */
const PCE_MODELS = {
  white_female: {
    lnAge: -29.799,
    lnAgeSq: 4.884,
    lnTotalChol: 13.54,
    lnAgeLnTotalChol: -3.114,
    lnHdl: -13.578,
    lnAgeLnHdl: 3.149,
    lnSbpTreated: 2.019,
    lnSbpUntreated: 1.957,
    smoker: 7.574,
    lnAgeSmoker: -1.665,
    diabetes: 0.661,
    mean: -29.18,
    baselineSurvival: 0.9665,
  },
  white_male: {
    lnAge: 12.344,
    lnTotalChol: 11.853,
    lnAgeLnTotalChol: -2.664,
    lnHdl: -7.99,
    lnAgeLnHdl: 1.769,
    lnSbpTreated: 1.797,
    lnSbpUntreated: 1.764,
    smoker: 7.837,
    lnAgeSmoker: -1.795,
    diabetes: 0.658,
    mean: 61.18,
    baselineSurvival: 0.9144,
  },
  african_american_female: {
    lnAge: 17.114,
    lnTotalChol: 0.94,
    lnHdl: -18.92,
    lnAgeLnHdl: 4.475,
    lnSbpTreated: 29.291,
    lnAgeLnSbpTreated: -6.432,
    lnSbpUntreated: 27.82,
    lnAgeLnSbpUntreated: -6.087,
    smoker: 0.691,
    diabetes: 0.874,
    mean: 86.61,
    baselineSurvival: 0.9533,
  },
  // AA men: main effects only (no age×lipid/BP interactions per ACC reference implementation).
  african_american_male: {
    lnAge: 2.469,
    lnTotalChol: 0.302,
    lnHdl: -0.307,
    lnSbpTreated: 1.916,
    lnSbpUntreated: 1.809,
    smoker: 0.549,
    diabetes: 0.645,
    mean: 19.54,
    baselineSurvival: 0.8954,
  },
};

/**
 * @param {number} mmolL
 */
export function cholesterolMmolLToMgDl(mmolL) {
  if (!Number.isFinite(mmolL)) return NaN;
  return mmolL * CHOL_MMOL_TO_MG_DL;
}

/**
 * @param {number} value
 * @param {CholesterolUnit} unit
 */
export function toCholesterolMgDl(value, unit) {
  if (!Number.isFinite(value)) return NaN;
  return unit === 'mmol_l' ? cholesterolMmolLToMgDl(value) : value;
}

/**
 * @param {AscvdRace} race
 * @param {AscvdSex} sex
 */
export function resolvePceModelKey(race, sex) {
  const isAA = race === 'african_american';
  if (sex === 'female') {
    return isAA ? 'african_american_female' : 'white_female';
  }
  return isAA ? 'african_american_male' : 'white_male';
}

/**
 * @param {typeof PCE_MODELS.white_female} model
 * @param {AscvdPceInputs} inputs — lipids in mg/dL
 */
function computeLinearPredictorSum(model, inputs) {
  const lnAge = Math.log(inputs.ageYears);
  const lnAgeSq = lnAge * lnAge;
  const lnTotalChol = Math.log(inputs.totalCholesterol);
  const lnHdl = Math.log(inputs.hdlCholesterol);
  const lnSbp = Math.log(inputs.systolicBpMmHg);

  let sum = 0;

  if (model.lnAge !== undefined) sum += model.lnAge * lnAge;
  if (model.lnAgeSq !== undefined) sum += model.lnAgeSq * lnAgeSq;
  if (model.lnTotalChol !== undefined) sum += model.lnTotalChol * lnTotalChol;
  if (model.lnAgeLnTotalChol !== undefined) sum += model.lnAgeLnTotalChol * lnAge * lnTotalChol;
  if (model.lnHdl !== undefined) sum += model.lnHdl * lnHdl;
  if (model.lnAgeLnHdl !== undefined) sum += model.lnAgeLnHdl * lnAge * lnHdl;

  if (inputs.onHypertensionTreatment) {
    if (model.lnSbpTreated !== undefined) sum += model.lnSbpTreated * lnSbp;
    if (model.lnAgeLnSbpTreated !== undefined) sum += model.lnAgeLnSbpTreated * lnAge * lnSbp;
  } else {
    if (model.lnSbpUntreated !== undefined) sum += model.lnSbpUntreated * lnSbp;
    if (model.lnAgeLnSbpUntreated !== undefined) sum += model.lnAgeLnSbpUntreated * lnAge * lnSbp;
  }

  if (inputs.smoker) {
    if (model.smoker !== undefined) sum += model.smoker;
    if (model.lnAgeSmoker !== undefined) sum += model.lnAgeSmoker * lnAge;
  }

  if (inputs.diabetes && model.diabetes !== undefined) {
    sum += model.diabetes;
  }

  return sum;
}

/**
 * @param {AscvdPceInputs} inputs
 */
export function computeAscvdPceTenYearRisk(inputs) {
  const modelKey = resolvePceModelKey(inputs.race, inputs.sex);
  const model = PCE_MODELS[modelKey];
  const individualSum = computeLinearPredictorSum(model, inputs);
  const riskFraction =
    1 - Math.pow(model.baselineSurvival, Math.exp(individualSum - model.mean));
  const riskPct = Math.max(0, Math.min(100, riskFraction * 100));

  return {
    tenYearRiskPct: riskPct,
    modelKey,
    individualSum,
    usesOtherRaceWhiteCoefficients: inputs.race === 'other',
  };
}

/**
 * @param {number} riskPct
 * @returns {'low' | 'borderline' | 'intermediate' | 'high'}
 */
export function categorizeAscvdTenYearRisk(riskPct) {
  if (!Number.isFinite(riskPct)) return null;
  if (riskPct < 5) return 'low';
  if (riskPct < 7.5) return 'borderline';
  if (riskPct < 20) return 'intermediate';
  return 'high';
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateAscvdPceInputs(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing ASCVD input object'] };
  }

  const ageYears = Number(raw.ageYears);
  const sex = raw.sex;
  const race = raw.race;
  const cholesterolUnit = raw.cholesterolUnit === 'mmol_l' ? 'mmol_l' : 'mg_dl';
  const totalCholesterol = Number(raw.totalCholesterol);
  const hdlCholesterol = Number(raw.hdlCholesterol);
  const systolicBpMmHg = Number(raw.systolicBpMmHg);

  if (!Number.isFinite(ageYears)) {
    errors.push('Enter age in years.');
  } else if (ageYears < PCE_MIN_AGE || ageYears > PCE_MAX_AGE) {
    errors.push(`Age must be ${PCE_MIN_AGE}–${PCE_MAX_AGE} years for the pooled cohort equations.`);
  }

  if (sex !== 'female' && sex !== 'male') {
    errors.push('Select sex (female or male).');
  }

  if (race !== 'white' && race !== 'african_american' && race !== 'other') {
    errors.push('Select race/ethnicity (White, African American, or Other).');
  }

  if (!Number.isFinite(totalCholesterol) || totalCholesterol <= 0) {
    errors.push('Enter a valid total cholesterol greater than zero.');
  }
  if (!Number.isFinite(hdlCholesterol) || hdlCholesterol <= 0) {
    errors.push('Enter a valid HDL cholesterol greater than zero.');
  }

  const totalMgDl = toCholesterolMgDl(totalCholesterol, cholesterolUnit);
  const hdlMgDl = toCholesterolMgDl(hdlCholesterol, cholesterolUnit);

  if (Number.isFinite(totalMgDl) && Number.isFinite(hdlMgDl) && hdlMgDl >= totalMgDl) {
    errors.push('HDL cholesterol must be lower than total cholesterol.');
  }

  if (cholesterolUnit === 'mmol_l') {
    if (Number.isFinite(totalMgDl) && (totalMgDl < 80 || totalMgDl > 500)) {
      errors.push('Total cholesterol is outside a plausible range for mmol/L entry.');
    }
    if (Number.isFinite(hdlMgDl) && (hdlMgDl < 10 || hdlMgDl > 150)) {
      errors.push('HDL cholesterol is outside a plausible range for mmol/L entry.');
    }
  } else if (Number.isFinite(totalMgDl) && (totalMgDl < 80 || totalMgDl > 500)) {
    errors.push('Total cholesterol should be between 80 and 500 mg/dL.');
  }

  if (!Number.isFinite(systolicBpMmHg)) {
    errors.push('Enter systolic blood pressure in mmHg.');
  } else if (systolicBpMmHg < 70 || systolicBpMmHg > 260) {
    errors.push('Systolic blood pressure should be between 70 and 260 mmHg.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  /** @type {AscvdPceInputs} */
  const normalized = {
    ageYears,
    sex,
    race,
    totalCholesterol: totalMgDl,
    hdlCholesterol: hdlMgDl,
    cholesterolUnit,
    systolicBpMmHg,
    onHypertensionTreatment: Boolean(raw.onHypertensionTreatment),
    diabetes: Boolean(raw.diabetes),
    smoker: Boolean(raw.smoker),
  };

  return { valid: true, errors: [], inputs: normalized };
}

/**
 * @param {number} tenYearRiskPct
 * @param {{ usesOtherRaceWhiteCoefficients?: boolean }} [opts]
 */
export function interpretAscvdTenYearRisk(tenYearRiskPct, opts = {}) {
  if (!Number.isFinite(tenYearRiskPct)) return null;

  const category = categorizeAscvdTenYearRisk(tenYearRiskPct);
  const usesOtherRaceNote = opts.usesOtherRaceWhiteCoefficients
    ? ' “Other” race uses White coefficient values per ACC/AHA pooled cohort guidance.'
    : '';

  const categoryLabels = {
    low: 'Low 10-year ASCVD risk (<5%)',
    borderline: 'Borderline 10-year ASCVD risk (5% to <7.5%)',
    intermediate: 'Intermediate 10-year ASCVD risk (7.5% to <20%)',
    high: 'High 10-year ASCVD risk (≥20%)',
  };

  const preventionGuidance = {
    low:
      'Discuss heart-healthy lifestyle habits and periodic reassessment of risk factors. PCE estimates population-based atherosclerotic cardiovascular disease risk — it does not diagnose existing disease.',
    borderline:
      'Suitable for shared decision-making about risk factors and whether additional risk refinement (e.g. coronary artery calcium, family history) may inform prevention discussions per institutional pathways. This tool does not recommend starting or withholding statin therapy.',
    intermediate:
      'Elevated estimated risk warrants structured clinician–patient discussion of lifestyle modification and whether further risk assessment is appropriate per ACC/AHA prevention guidance and local policy. Avoid using this percentage alone to mandate treatment.',
    high:
      'High estimated 10-year risk supports intensive discussion of risk-factor modification and guideline-concordant prevention pathways with the treating clinician. This output is decision support for discussion — not a treatment prescription.',
  };

  const severity =
    category === 'high' ? 'critical' : category === 'intermediate' ? 'warning' : 'normal';

  return {
    severity,
    label: categoryLabels[category],
    riskCategory: category,
    tenYearRiskPct,
    interpretation: `Estimated 10-year ASCVD risk ≈ ${tenYearRiskPct.toFixed(1)}% (${categoryLabels[category].toLowerCase()}).${usesOtherRaceNote}`,
    preventionDiscussion: preventionGuidance[category],
    clinicianPatientDisclaimer:
      'Use as decision-support for clinician-patient discussions.',
    safetyDisclaimer:
      'Pooled Cohort Equations estimate 10-year risk of first hard ASCVD event in primary prevention populations aged 40–79. They do not diagnose coronary artery disease, do not replace clinical judgment, and must not be used alone to rule in or rule out cardiovascular disease.',
    pathwayDisclaimer:
      'Follow ACC/AHA cholesterol and prevention guidelines and institutional pathways for risk-factor management. This tool does not recommend specific medications, doses, or preventive therapies.',
    referenceLine:
      'Goff DC Jr, et al. 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk. Circulation. 2014;129(25 suppl 2):S49–S73.',
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computeAscvdPceResult(raw) {
  const v = validateAscvdPceInputs(raw);
  if (!v.valid) return { ok: false, errors: v.errors };

  const pce = computeAscvdPceTenYearRisk(v.inputs);
  const interp = interpretAscvdTenYearRisk(pce.tenYearRiskPct, {
    usesOtherRaceWhiteCoefficients: pce.usesOtherRaceWhiteCoefficients,
  });

  return {
    ok: true,
    inputs: v.inputs,
    tenYearRiskPct: pce.tenYearRiskPct,
    modelKey: pce.modelKey,
    usesOtherRaceWhiteCoefficients: pce.usesOtherRaceWhiteCoefficients,
    ...interp,
  };
}
