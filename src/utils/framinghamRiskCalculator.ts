/**
 * Framingham 10-year hard CHD risk — ATP III point-based profile (Wilson et al.).
 * Alternative to ACC/AHA PCE (ASCVD) for cardiovascular risk context.
 *
 * Reference: Wilson PWF, et al. Prediction of coronary heart disease using risk factor categories.
 * Circulation. 1998;97(18):1837–1847. NHLBI Framingham Heart Study tables.
 *
 * Decision support only — does not recommend statins or other therapies.
 */

/** @typedef {'female' | 'male'} FraminghamSex */

const MIN_AGE = 30;
const MAX_AGE = 74;

/** Total points → 10-year hard CHD risk % (Wilson Table 4, selected bands). */
const RISK_FROM_POINTS = {
  female: [
    { maxPoints: 8, riskPct: 1 },
    { maxPoints: 9, riskPct: 1 },
    { maxPoints: 10, riskPct: 1 },
    { maxPoints: 11, riskPct: 1 },
    { maxPoints: 12, riskPct: 1 },
    { maxPoints: 13, riskPct: 2 },
    { maxPoints: 14, riskPct: 2 },
    { maxPoints: 15, riskPct: 3 },
    { maxPoints: 16, riskPct: 4 },
    { maxPoints: 17, riskPct: 5 },
    { maxPoints: 18, riskPct: 6 },
    { maxPoints: 19, riskPct: 8 },
    { maxPoints: 20, riskPct: 11 },
    { maxPoints: 21, riskPct: 14 },
    { maxPoints: 22, riskPct: 17 },
    { maxPoints: 23, riskPct: 22 },
    { maxPoints: 24, riskPct: 27 },
    { maxPoints: 99, riskPct: 30 },
  ],
  male: [
    { maxPoints: 0, riskPct: 1 },
    { maxPoints: 1, riskPct: 1 },
    { maxPoints: 2, riskPct: 1 },
    { maxPoints: 3, riskPct: 1 },
    { maxPoints: 4, riskPct: 1 },
    { maxPoints: 5, riskPct: 2 },
    { maxPoints: 6, riskPct: 2 },
    { maxPoints: 7, riskPct: 3 },
    { maxPoints: 8, riskPct: 4 },
    { maxPoints: 9, riskPct: 5 },
    { maxPoints: 10, riskPct: 6 },
    { maxPoints: 11, riskPct: 8 },
    { maxPoints: 12, riskPct: 10 },
    { maxPoints: 13, riskPct: 12 },
    { maxPoints: 14, riskPct: 16 },
    { maxPoints: 15, riskPct: 20 },
    { maxPoints: 16, riskPct: 25 },
    { maxPoints: 99, riskPct: 30 },
  ],
};

function agePoints(age, sex) {
  if (sex === 'female') {
    if (age < 35) return 0;
    if (age <= 39) return 0;
    if (age <= 44) return 3;
    if (age <= 49) return 6;
    if (age <= 54) return 8;
    if (age <= 59) return 10;
    if (age <= 64) return 12;
    if (age <= 69) return 14;
    return 16;
  }
  if (age < 35) return 0;
  if (age <= 39) return 0;
  if (age <= 44) return 2;
  if (age <= 49) return 5;
  if (age <= 54) return 6;
  if (age <= 59) return 8;
  if (age <= 64) return 10;
  if (age <= 69) return 11;
  return 13;
}

function totalCholPoints(tc, sex) {
  if (sex === 'female') {
    if (tc < 160) return 0;
    if (tc <= 199) return 1;
    if (tc <= 239) return 3;
    if (tc <= 279) return 4;
    return 5;
  }
  if (tc < 160) return 0;
  if (tc <= 199) return 1;
  if (tc <= 239) return 2;
  if (tc <= 279) return 3;
  return 4;
}

function hdlPoints(hdl) {
  if (hdl >= 60) return -1;
  if (hdl >= 50) return 0;
  if (hdl >= 40) return 1;
  return 2;
}

function sbpPoints(sbp, treated, sex) {
  if (sex === 'female') {
    if (sbp < 120) return treated ? 1 : 0;
    if (sbp <= 129) return treated ? 3 : 1;
    if (sbp <= 139) return treated ? 4 : 2;
    if (sbp <= 159) return treated ? 5 : 3;
    return treated ? 7 : 4;
  }
  if (sbp < 120) return treated ? 0 : 0;
  if (sbp <= 129) return treated ? 1 : 0;
  if (sbp <= 139) return treated ? 2 : 1;
  if (sbp <= 159) return treated ? 2 : 1;
  return treated ? 3 : 2;
}

function riskFromTotalPoints(points, sex) {
  const table = RISK_FROM_POINTS[sex];
  for (const row of table) {
    if (points <= row.maxPoints) return row.riskPct;
  }
  return 30;
}

/**
 * @param {{
 *   ageYears: number,
 *   sex: FraminghamSex,
 *   totalCholesterolMgDl: number,
 *   hdlCholesterolMgDl: number,
 *   systolicBpMmHg: number,
 *   onHypertensionTreatment: boolean,
 *   smoker: boolean,
 * }} inputs
 */
export function computeFraminghamRisk(inputs) {
  const { ageYears, sex, totalCholesterolMgDl, hdlCholesterolMgDl, systolicBpMmHg, onHypertensionTreatment, smoker } =
    inputs;

  if (
    !Number.isFinite(ageYears) ||
    ageYears < MIN_AGE ||
    ageYears > MAX_AGE ||
    (sex !== 'female' && sex !== 'male') ||
    !Number.isFinite(totalCholesterolMgDl) ||
    !Number.isFinite(hdlCholesterolMgDl) ||
    !Number.isFinite(systolicBpMmHg)
  ) {
    return null;
  }

  const breakdown = {
    age: agePoints(ageYears, sex),
    totalCholesterol: totalCholPoints(totalCholesterolMgDl, sex),
    hdl: hdlPoints(hdlCholesterolMgDl),
    systolicBp: sbpPoints(systolicBpMmHg, onHypertensionTreatment, sex),
    smoking: smoker ? (sex === 'female' ? 2 : 2) : 0,
  };

  const totalPoints = breakdown.age + breakdown.totalCholesterol + breakdown.hdl + breakdown.systolicBp + breakdown.smoking;
  const tenYearRiskPct = riskFromTotalPoints(totalPoints, sex);

  let riskCategory = 'low';
  if (tenYearRiskPct >= 20) riskCategory = 'high';
  else if (tenYearRiskPct >= 10) riskCategory = 'intermediate';

  return {
    totalPoints,
    breakdown,
    tenYearRiskPct,
    riskCategory,
  };
}

/**
 * @param {number} tenYearRiskPct
 */
export function interpretFraminghamRisk(tenYearRiskPct) {
  if (!Number.isFinite(tenYearRiskPct) || tenYearRiskPct < 0) return null;

  const referenceLine =
    'Wilson PWF, et al. Prediction of coronary heart disease using risk factor categories. Circulation. 1998;97(18):1837–1847.';

  const disclaimer =
    'Framingham hard CHD risk (not full ASCVD PCE). Does not recommend lipid-lowering or antihypertensive therapy — use ACC/AHA guidelines and shared decision-making.';

  if (tenYearRiskPct >= 20) {
    return {
      severity: 'critical',
      label: 'High Framingham CHD risk',
      riskBand: '≥ 20% 10-year hard CHD risk',
      interpretation:
        '10-year hard CHD risk ≥20% in ATP III framing — high-risk category for prevention discussion per historical guidelines.',
      disclaimer,
      referenceLine,
    };
  }

  if (tenYearRiskPct >= 10) {
    return {
      severity: 'warning',
      label: 'Intermediate Framingham CHD risk',
      riskBand: '10–19% 10-year hard CHD risk',
      interpretation:
        'Intermediate risk band — intensify risk-factor modification discussion per clinician judgment and current guidelines.',
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Lower Framingham CHD risk',
    riskBand: '< 10% 10-year hard CHD risk',
    interpretation:
      'Lower 10-year hard CHD risk in Framingham point tables — continue lifestyle counselling and periodic reassessment.',
    disclaimer,
    referenceLine,
  };
}

/**
 * @param {Record<string, string|number|boolean>} raw
 */
export function validateFraminghamInputs(raw) {
  const errors = [] as any[];
  const age = Number(raw.ageYears);
  if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) {
    errors.push(`Age must be ${MIN_AGE}–${MAX_AGE} years for this Framingham table.`);
  }
  if (!raw.sex) errors.push('Select sex.');
  const tc = Number(raw.totalCholesterolMgDl);
  const hdl = Number(raw.hdlCholesterolMgDl);
  const sbp = Number(raw.systolicBpMmHg);
  if (!Number.isFinite(tc) || tc < 100 || tc > 400) {
    errors.push('Enter total cholesterol between 100 and 400 mg/dL.');
  }
  if (!Number.isFinite(hdl) || hdl < 20 || hdl > 120) {
    errors.push('Enter HDL cholesterol between 20 and 120 mg/dL.');
  }
  if (!Number.isFinite(sbp) || sbp < 80 || sbp > 250) {
    errors.push('Enter systolic BP between 80 and 250 mmHg.');
  }
  return errors;
}
