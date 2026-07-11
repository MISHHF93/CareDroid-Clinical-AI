/**
 * Nephrology Clinical Tools Pack calculator helpers.
 *
 * Deterministic calculation and documentation support only. These helpers do
 * not diagnose kidney disease, recommend dialysis, prescribe fluids, or perform
 * medication dosing automation.
 */

export const NEPHROLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local nephrology, AKI, electrolyte, acid-base, dialysis, and critical-care pathways; do not delay urgent evaluation to complete this tool.';

const CREATININE_UMOL_TO_MG_DL = 1 / 88.4;
const GLUCOSE_MMOL_TO_MG_DL = 18.0182;
const UREA_MMOL_TO_BUN_MG_DL = 2.801;
const ETHANOL_MMOL_TO_MG_DL = 4.608;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function round(value, decimals = 1) {
  return Number(value.toFixed(decimals));
}

function renalSeverityForGfr(egfr) {
  if (egfr < 15) return 'critical';
  if (egfr < 45) return 'warning';
  return 'normal';
}

export function toCreatinineMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'umol_l' ? n * CREATININE_UMOL_TO_MG_DL : n;
}

export function toGlucoseMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'mmol_l' ? n * GLUCOSE_MMOL_TO_MG_DL : n;
}

export function toBunMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'mmol_l_urea' ? n * UREA_MMOL_TO_BUN_MG_DL : n;
}

export function toEthanolMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  return unit === 'mmol_l' ? n * ETHANOL_MMOL_TO_MG_DL : n;
}

export function classifyGfrCategory(egfr) {
  if (!Number.isFinite(egfr)) return null;
  if (egfr >= 90) return { category: 'G1', label: 'G1 (>=90)' };
  if (egfr >= 60) return { category: 'G2', label: 'G2 (60-89)' };
  if (egfr >= 45) return { category: 'G3a', label: 'G3a (45-59)' };
  if (egfr >= 30) return { category: 'G3b', label: 'G3b (30-44)' };
  if (egfr >= 15) return { category: 'G4', label: 'G4 (15-29)' };
  return { category: 'G5', label: 'G5 (<15)' };
}

export function computeEgfrCkdEpi2021(raw) {
  const ageYears = toNumber(raw.ageYears);
  const sex = raw.sex;
  const serumCreatinineMgDl = toCreatinineMgDl(raw.serumCreatinine, raw.creatinineUnit);
  const errors = [] as any[];
  if (!inRange(ageYears, 18, 120)) errors.push('Enter age from 18 to 120 years.');
  if (!['female', 'male'].includes(sex)) errors.push('Select sex.');
  if (!inRange(serumCreatinineMgDl, 0.2, 25)) errors.push('Enter serum creatinine in a plausible adult range.');
  if (errors.length) return { ok: false as const, errors };

  const isFemale = sex === 'female';
  const kappa = isFemale ? 0.7 : 0.9;
  const ratio = serumCreatinineMgDl / kappa;
  const alpha = isFemale ? -0.241 : -0.302;
  const egfr =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, ageYears) *
    (isFemale ? 1.012 : 1);
  const egfrMlMin173 = Math.round(egfr);
  const gfr = classifyGfrCategory(egfrMlMin173);
  return {
    ok: true as const,
    egfrMlMin173,
    serumCreatinineMgDl: round(serumCreatinineMgDl, 2),
    gfrCategory: (gfr as any).category,
    severity: renalSeverityForGfr(egfrMlMin173),
    label: `CKD-EPI 2021 ${(gfr as any).label}`,
    interpretation:
      'Race-free CKD-EPI 2021 estimates GFR from age, sex, and serum creatinine. Interpret trends, chronicity, body habitus, pregnancy status, and measured GFR indications with clinician review.',
    referenceLine: 'Inker LA, et al. N Engl J Med. 2021;385:1737-1749. CKD-EPI 2021 creatinine equation.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} eGFR does not diagnose AKI or CKD by itself and does not automate renal medication dose adjustment.`,
  };
}

export function computeCreatinineClearanceCockcroftGault(raw) {
  const ageYears = toNumber(raw.ageYears);
  const sex = raw.sex;
  const weightKg = toNumber(raw.weightKg);
  const serumCreatinineMgDl = toCreatinineMgDl(raw.serumCreatinine, raw.creatinineUnit);
  const errors = [] as any[];
  if (!inRange(ageYears, 18, 120)) errors.push('Enter age from 18 to 120 years.');
  if (!['female', 'male'].includes(sex)) errors.push('Select sex.');
  if (!inRange(weightKg, 20, 350)) errors.push('Enter weight from 20 to 350 kg.');
  if (!inRange(serumCreatinineMgDl, 0.2, 25)) errors.push('Enter serum creatinine in a plausible adult range.');
  if (errors.length) return { ok: false as const, errors };

  const sexFactor = sex === 'female' ? 0.85 : 1;
  const creatinineClearanceMlMin = round(((140 - ageYears) * weightKg * sexFactor) / (72 * serumCreatinineMgDl), 1);
  return {
    ok: true as const,
    creatinineClearanceMlMin,
    severity: creatinineClearanceMlMin < 15 ? 'critical' : creatinineClearanceMlMin < 45 ? 'warning' : 'normal',
    label: 'Cockcroft-Gault creatinine clearance estimate',
    interpretation:
      'Cockcroft-Gault estimates creatinine clearance using age, weight, sex, and serum creatinine. Weight selection can materially change the result; verify local policy and clinical context.',
    referenceLine: 'Cockcroft DW, Gault MH. Nephron. 1976;16:31-41.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} This is not medication dosing automation and does not recommend a drug dose, interval, or renal adjustment.`,
  };
}

export function computeFeNa(raw) {
  const serumSodium = toNumber(raw.serumSodium);
  const urineSodium = toNumber(raw.urineSodium);
  const serumCreatinineMgDl = toCreatinineMgDl(raw.serumCreatinine, raw.serumCreatinineUnit);
  const urineCreatinineMgDl = toCreatinineMgDl(raw.urineCreatinine, raw.urineCreatinineUnit);
  const errors = [] as any[];
  if (!inRange(serumSodium, 90, 190)) errors.push('Enter serum sodium from 90 to 190 mEq/L.');
  if (!inRange(urineSodium, 0, 300)) errors.push('Enter urine sodium from 0 to 300 mEq/L.');
  if (!inRange(serumCreatinineMgDl, 0.2, 25)) errors.push('Enter serum creatinine in a plausible range.');
  if (!inRange(urineCreatinineMgDl, 1, 5000)) errors.push('Enter urine creatinine in a plausible range.');
  if (errors.length) return { ok: false as const, errors };

  const fractionalExcretionPct = round((urineSodium * serumCreatinineMgDl * 100) / (serumSodium * urineCreatinineMgDl), 2);
  const riskBand = fractionalExcretionPct < 1 ? 'low' : fractionalExcretionPct > 2 ? 'high' : 'intermediate';
  return {
    ok: true as const,
    fractionalExcretionPct,
    riskBand,
    severity: riskBand === 'intermediate' ? 'warning' : 'normal',
    label: `FeNa ${fractionalExcretionPct}%`,
    interpretation:
      'FeNa is a urine electrolyte pattern adjunct in selected AKI contexts. Diuretics, CKD, contrast exposure, sepsis, rhabdomyolysis, and non-oliguric states can make thresholds unreliable.',
    referenceLine: 'FeNa = (urine sodium x serum creatinine) / (serum sodium x urine creatinine) x 100.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} FeNa does not diagnose AKI etiology and does not recommend fluids, diuretics, or dialysis.`,
  };
}

export function computeFeUrea(raw) {
  const bunMgDl = toBunMgDl(raw.bun, raw.bunUnit);
  const urineUreaNitrogenMgDl = toBunMgDl(raw.urineUreaNitrogen, raw.urineUreaUnit);
  const serumCreatinineMgDl = toCreatinineMgDl(raw.serumCreatinine, raw.serumCreatinineUnit);
  const urineCreatinineMgDl = toCreatinineMgDl(raw.urineCreatinine, raw.urineCreatinineUnit);
  const errors = [] as any[];
  if (!inRange(bunMgDl, 1, 300)) errors.push('Enter BUN in a plausible range.');
  if (!inRange(urineUreaNitrogenMgDl, 1, 5000)) errors.push('Enter urine urea nitrogen in a plausible range.');
  if (!inRange(serumCreatinineMgDl, 0.2, 25)) errors.push('Enter serum creatinine in a plausible range.');
  if (!inRange(urineCreatinineMgDl, 1, 5000)) errors.push('Enter urine creatinine in a plausible range.');
  if (errors.length) return { ok: false as const, errors };

  const fractionalExcretionPct = round((urineUreaNitrogenMgDl * serumCreatinineMgDl * 100) / (bunMgDl * urineCreatinineMgDl), 1);
  const riskBand = fractionalExcretionPct < 35 ? 'low' : 'not_low';
  return {
    ok: true as const,
    fractionalExcretionPct,
    riskBand,
    severity: 'normal',
    label: `FeUrea ${fractionalExcretionPct}%`,
    interpretation:
      'FeUrea can support AKI pattern review when diuretics limit FeNa interpretation, but performance varies by population and timing.',
    referenceLine: 'FeUrea = (urine urea nitrogen x serum creatinine) / (BUN x urine creatinine) x 100.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} FeUrea does not diagnose AKI etiology and does not recommend fluids, diuretics, or dialysis.`,
  };
}

export function computeKfre4Variable(raw) {
  const ageYears = toNumber(raw.ageYears);
  const sex = raw.sex;
  const egfrMlMin173 = toNumber(raw.egfrMlMin173);
  const acrMgG = toNumber(raw.acrMgG);
  const errors = [] as any[];
  if (!inRange(ageYears, 18, 120)) errors.push('Enter age from 18 to 120 years.');
  if (!['female', 'male'].includes(sex)) errors.push('Select sex.');
  if (!inRange(egfrMlMin173, 1, 120)) errors.push('Enter eGFR from 1 to 120 mL/min/1.73 m2.');
  if (!inRange(acrMgG, 0.1, 10000)) errors.push('Enter urine ACR from 0.1 to 10000 mg/g.');
  if (errors.length) return { ok: false as const, errors };

  const male = sex === 'male' ? 1 : 0;
  const linearPredictor =
    -0.2201 * (ageYears / 10 - 7.036) +
    0.2467 * (male - 0.5642) -
    0.5567 * (egfrMlMin173 / 5 - 7.222) +
    0.451 * (Math.log(acrMgG) - 5.137);
  const exponent = Math.exp(linearPredictor);
  const twoYearRiskPct = round((1 - Math.pow(0.9832, exponent)) * 100, 1);
  const fiveYearRiskPct = round((1 - Math.pow(0.9365, exponent)) * 100, 1);
  const severity = fiveYearRiskPct >= 20 ? 'critical' : fiveYearRiskPct >= 5 ? 'warning' : 'normal';
  return {
    ok: true as const,
    twoYearRiskPct,
    fiveYearRiskPct,
    severity,
    label: '4-variable Kidney Failure Risk Equation',
    interpretation:
      'KFRE estimates 2-year and 5-year kidney failure risk from age, sex, eGFR, and ACR for CKD populations. Calibration varies by region and population.',
    referenceLine: 'Tangri N, et al. JAMA. 2011;305:1553-1559. Four-variable KFRE.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} KFRE does not diagnose CKD, determine transplant referral, or recommend dialysis initiation.`,
  };
}

export function computeBunCreatinineRatio(raw) {
  const bunMgDl = toBunMgDl(raw.bun, raw.bunUnit);
  const serumCreatinineMgDl = toCreatinineMgDl(raw.serumCreatinine, raw.creatinineUnit);
  const errors = [] as any[];
  if (!inRange(bunMgDl, 1, 300)) errors.push('Enter BUN in a plausible range.');
  if (!inRange(serumCreatinineMgDl, 0.2, 25)) errors.push('Enter serum creatinine in a plausible range.');
  if (errors.length) return { ok: false as const, errors };

  const ratio = round(bunMgDl / serumCreatinineMgDl, 1);
  const riskBand = ratio > 20 ? 'high' : ratio < 10 ? 'low' : 'common_range';
  return {
    ok: true as const,
    ratio,
    riskBand,
    severity: riskBand === 'common_range' ? 'normal' : 'warning',
    label: `BUN/Creatinine ratio ${ratio}:1`,
    interpretation:
      'BUN/creatinine ratio is a nonspecific pattern marker. Interpret with volume status, catabolism, GI bleeding, diet, liver disease, CKD, and lab timing.',
    referenceLine: 'BUN/creatinine ratio = BUN (mg/dL) / serum creatinine (mg/dL).',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} This ratio does not diagnose prerenal azotemia or recommend fluids, diuretics, or dialysis.`,
  };
}

export function computeCorrectedSodium(raw) {
  const sodium = toNumber(raw.sodium);
  const glucoseMgDl = toGlucoseMgDl(raw.glucose, raw.glucoseUnit);
  const correctionFactor = raw.correctionFactor === '2.4' ? 2.4 : 1.6;
  const errors = [] as any[];
  if (!inRange(sodium, 90, 190)) errors.push('Enter measured sodium from 90 to 190 mEq/L.');
  if (!inRange(glucoseMgDl, 20, 2000)) errors.push('Enter glucose in a plausible range.');
  if (errors.length) return { ok: false as const, errors };

  const correctedSodium = round(sodium + correctionFactor * ((glucoseMgDl - 100) / 100), 1);
  return {
    ok: true as const,
    correctedSodium,
    glucoseMgDl: round(glucoseMgDl, 1),
    severity: correctedSodium < 125 || correctedSodium > 155 ? 'critical' : correctedSodium < 135 || correctedSodium > 145 ? 'warning' : 'normal',
    label: `Corrected sodium ${correctedSodium} mEq/L`,
    interpretation:
      'Corrected sodium estimates sodium after accounting for hyperglycemia-related water shift. Use measured osmolality, tonicity, symptoms, and rate of change for clinical decisions.',
    referenceLine: 'Common correction factors add 1.6 or 2.4 mEq/L sodium per 100 mg/dL glucose above 100 mg/dL.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} Does not recommend hypertonic saline, insulin, free water, or correction rates.`,
  };
}

export function computeFreeWaterDeficit(raw) {
  const sodium = toNumber(raw.sodium);
  const weightKg = toNumber(raw.weightKg);
  const tbwFactor = toNumber(raw.tbwFactor);
  const targetSodium = raw.targetSodium === '' || raw.targetSodium === undefined ? 140 : toNumber(raw.targetSodium);
  const errors = [] as any[];
  if (!inRange(sodium, 120, 190)) errors.push('Enter sodium from 120 to 190 mEq/L.');
  if (!inRange(weightKg, 1, 350)) errors.push('Enter weight from 1 to 350 kg.');
  if (!inRange(tbwFactor, 0.35, 0.7)) errors.push('Select total body water factor from 0.35 to 0.70.');
  if (!inRange(targetSodium, 130, 145)) errors.push('Enter target sodium from 130 to 145 mEq/L.');
  if (errors.length) return { ok: false as const, errors };

  const deficitLiters = Math.max(0, round(tbwFactor * weightKg * (sodium / targetSodium - 1), 1));
  return {
    ok: true as const,
    deficitLiters,
    severity: sodium >= 160 ? 'critical' : sodium > 145 ? 'warning' : 'normal',
    label: `Estimated free water deficit ${deficitLiters} L`,
    interpretation:
      'Free water deficit estimates the water volume associated with hypernatremia under simplified assumptions. Ongoing losses, sodium gains, symptoms, chronicity, and safe correction limits require clinician management.',
    referenceLine: 'Free water deficit = TBW x ((serum sodium / target sodium) - 1).',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} Does not prescribe IV fluids, enteral water, correction rate, or monitoring frequency.`,
  };
}

export function computeOsmolalGap(raw) {
  const sodium = toNumber(raw.sodium);
  const glucoseMgDl = toGlucoseMgDl(raw.glucose, raw.glucoseUnit);
  const bunMgDl = toBunMgDl(raw.bun, raw.bunUnit);
  const ethanolMgDl = toEthanolMgDl(raw.ethanol, raw.ethanolUnit);
  const measuredOsmolality = toNumber(raw.measuredOsmolality);
  const errors = [] as any[];
  if (!inRange(sodium, 90, 190)) errors.push('Enter sodium from 90 to 190 mEq/L.');
  if (!inRange(glucoseMgDl, 20, 2000)) errors.push('Enter glucose in a plausible range.');
  if (!inRange(bunMgDl, 1, 300)) errors.push('Enter BUN in a plausible range.');
  if (!inRange(ethanolMgDl, 0, 600)) errors.push('Enter ethanol from 0 to 600 mg/dL or leave 0.');
  if (!inRange(measuredOsmolality, 200, 450)) errors.push('Enter measured osmolality from 200 to 450 mOsm/kg.');
  if (errors.length) return { ok: false as const, errors };

  const calculatedOsmolality = round(2 * sodium + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolMgDl / 3.7, 1);
  const osmolalGap = round(measuredOsmolality - calculatedOsmolality, 1);
  return {
    ok: true as const,
    calculatedOsmolality,
    osmolalGap,
    severity: osmolalGap > 20 ? 'critical' : osmolalGap > 10 ? 'warning' : 'normal',
    label: `Osmolal gap ${osmolalGap} mOsm/kg`,
    interpretation:
      'Osmolal gap compares measured and calculated serum osmolality. Interpret with timing, ethanol, ketones, renal failure, shock, laboratory method, and toxicology pathway context.',
    referenceLine: 'Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.',
    disclaimer: `${NEPHROLOGY_SAFETY_DISCLAIMER} Does not diagnose toxic alcohol ingestion or recommend antidotes, dialysis, or disposition.`,
  };
}
