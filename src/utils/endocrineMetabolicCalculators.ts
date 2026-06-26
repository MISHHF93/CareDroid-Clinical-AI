/**
 * Endocrine and metabolic calculator helpers.
 *
 * Deterministic calculation and documentation support only. These helpers do
 * not diagnose endocrine disease and do not recommend insulin, antidiabetic,
 * thyroid, weight-based, electrolyte, or other medication dosing.
 */

export const ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local endocrine, diabetes, DKA, thyroid, electrolyte, nutrition, and emergency pathways; do not delay urgent evaluation to complete this tool.';

const GLUCOSE_MMOL_TO_MG_DL = 18.0182;
const UREA_MMOL_TO_BUN_MG_DL = 2.801;
const ETHANOL_MMOL_TO_MG_DL = 4.608;
const KG_TO_LB = 2.2046226218;
const IN_TO_CM = 2.54;

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

function toGlucoseMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'mmol_l' ? n * GLUCOSE_MMOL_TO_MG_DL : n;
}

function toBunMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'mmol_l_urea' ? n * UREA_MMOL_TO_BUN_MG_DL : n;
}

function toEthanolMgDl(value, unit = 'mg_dl') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return 0;
  return unit === 'mmol_l' ? n * ETHANOL_MMOL_TO_MG_DL : n;
}

function toWeightKg(value, unit = 'kg') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'lb' ? n / KG_TO_LB : n;
}

function toHeightCm(value, unit = 'cm') {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'in' ? n * IN_TO_CM : n;
}

function severityForBmi(bmi) {
  if (bmi < 18.5) return 'warning';
  if (bmi < 25) return 'normal';
  if (bmi < 35) return 'warning';
  return 'critical';
}

function categoryForBmi(bmi) {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  if (bmi < 35) return 'Obesity class I';
  if (bmi < 40) return 'Obesity class II';
  return 'Obesity class III';
}

export function computeHomaIr(raw) {
  const fastingGlucoseMgDl = toGlucoseMgDl(raw.fastingGlucose, raw.glucoseUnit);
  const fastingInsulinUiuMl = toNumber(raw.fastingInsulinUiuMl);
  const errors = [] as any[];
  if (!inRange(fastingGlucoseMgDl, 40, 600)) errors.push('Enter fasting glucose in a plausible range.');
  if (!inRange(fastingInsulinUiuMl, 0.2, 300)) errors.push('Enter fasting insulin from 0.2 to 300 uIU/mL.');
  if (errors.length) return { ok: false, errors };

  const homaIr = round((fastingGlucoseMgDl * fastingInsulinUiuMl) / 405, 2);
  const riskBand = homaIr < 2 ? 'lower' : homaIr < 2.9 ? 'borderline' : 'higher';
  return {
    ok: true,
    homaIr,
    glucoseMgDl: round(fastingGlucoseMgDl, 1),
    severity: riskBand === 'higher' ? 'warning' : 'normal',
    label: `HOMA-IR ${homaIr}`,
    interpretation:
      'HOMA-IR estimates insulin resistance from fasting glucose and fasting insulin. Thresholds vary by assay, population, pregnancy status, puberty, and acute illness.',
    referenceLine: 'HOMA-IR = fasting insulin (uIU/mL) x fasting glucose (mg/dL) / 405.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose diabetes, insulin resistance, or metabolic syndrome and does not recommend insulin or medication dosing.`,
  };
}

export function computeCorrectedCalcium(raw) {
  const calciumMgDl =
    raw.calciumUnit === 'mmol_l' ? toNumber(raw.calcium) / 0.2495 : toNumber(raw.calcium);
  const albuminGdl =
    raw.albuminUnit === 'g_l' ? toNumber(raw.albumin) / 10 : toNumber(raw.albumin);
  const errors = [] as any[];
  if (!inRange(calciumMgDl, 4, 18)) errors.push('Enter total calcium in a plausible range.');
  if (!inRange(albuminGdl, 1, 6)) errors.push('Enter albumin from 1 to 6 g/dL or equivalent.');
  if (errors.length) return { ok: false, errors };

  const correctedCalciumMgDl = round(calciumMgDl + 0.8 * (4 - albuminGdl), 2);
  const correctedCalciumMmolL = round(correctedCalciumMgDl * 0.2495, 2);
  return {
    ok: true,
    correctedCalciumMgDl,
    correctedCalciumMmolL,
    severity: correctedCalciumMgDl < 7 || correctedCalciumMgDl > 12 ? 'critical' : correctedCalciumMgDl < 8.5 || correctedCalciumMgDl > 10.5 ? 'warning' : 'normal',
    label: `Corrected calcium ${correctedCalciumMgDl} mg/dL`,
    interpretation:
      'Albumin-corrected calcium approximates total calcium when albumin is abnormal. Ionized calcium is preferred when accuracy is critical, especially in critical illness, acid-base disturbances, or major protein abnormalities.',
    referenceLine: 'Corrected calcium (mg/dL) = measured calcium + 0.8 x (4.0 - albumin g/dL).',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose calcium disorders and does not recommend calcium, vitamin D, bisphosphonate, calcitonin, or dialysis treatment.`,
  };
}

export function computeCorrectedSodium(raw) {
  const sodium = toNumber(raw.sodium);
  const glucoseMgDl = toGlucoseMgDl(raw.glucose, raw.glucoseUnit);
  const correctionFactor = raw.correctionFactor === '2.4' ? 2.4 : 1.6;
  const errors = [] as any[];
  if (!inRange(sodium, 90, 190)) errors.push('Enter measured sodium from 90 to 190 mEq/L.');
  if (!inRange(glucoseMgDl, 20, 2000)) errors.push('Enter glucose in a plausible range.');
  if (errors.length) return { ok: false, errors };

  const correctedSodium = round(sodium + correctionFactor * ((glucoseMgDl - 100) / 100), 1);
  return {
    ok: true,
    correctedSodium,
    glucoseMgDl: round(glucoseMgDl, 1),
    severity: correctedSodium < 125 || correctedSodium > 155 ? 'critical' : correctedSodium < 135 || correctedSodium > 145 ? 'warning' : 'normal',
    label: `Corrected sodium ${correctedSodium} mEq/L`,
    interpretation:
      'Corrected sodium estimates sodium after accounting for hyperglycemia-related water shift. Use measured osmolality, tonicity, symptoms, and rate of change for clinical decisions.',
    referenceLine: 'Common correction factors add 1.6 or 2.4 mEq/L sodium per 100 mg/dL glucose above 100 mg/dL.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not recommend hypertonic saline, insulin, free water, or correction rates.`,
  };
}

export function computeSerumOsmolality(raw) {
  const sodium = toNumber(raw.sodium);
  const glucoseMgDl = toGlucoseMgDl(raw.glucose, raw.glucoseUnit);
  const bunMgDl = toBunMgDl(raw.bun, raw.bunUnit);
  const ethanolMgDl = toEthanolMgDl(raw.ethanol, raw.ethanolUnit);
  const errors = [] as any[];
  if (!inRange(sodium, 90, 190)) errors.push('Enter sodium from 90 to 190 mEq/L.');
  if (!inRange(glucoseMgDl, 20, 2000)) errors.push('Enter glucose in a plausible range.');
  if (!inRange(bunMgDl, 1, 300)) errors.push('Enter BUN in a plausible range.');
  if (!inRange(ethanolMgDl, 0, 600)) errors.push('Enter ethanol from 0 to 600 mg/dL or leave 0.');
  if (errors.length) return { ok: false, errors };

  const calculatedOsmolality = round(2 * sodium + glucoseMgDl / 18 + bunMgDl / 2.8 + ethanolMgDl / 3.7, 1);
  return {
    ok: true,
    calculatedOsmolality,
    severity: calculatedOsmolality < 275 || calculatedOsmolality > 320 ? 'warning' : 'normal',
    label: `Calculated osmolality ${calculatedOsmolality} mOsm/kg`,
    interpretation:
      'Calculated serum osmolality estimates osmoles from sodium, glucose, BUN, and optional ethanol. Compare with measured osmolality when available and interpret with tonicity and clinical context.',
    referenceLine: 'Calculated osmolality = 2 x Na + glucose/18 + BUN/2.8 + ethanol/3.7.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose hyperosmolar states, DKA, toxic ingestion, or recommend insulin, fluids, dialysis, or disposition.`,
  };
}

export function computeOsmolalGap(raw) {
  const osmolality = computeSerumOsmolality(raw);
  const measuredOsmolality = toNumber(raw.measuredOsmolality);
  const errors = [] as any[];
  if (!osmolality.ok) errors.push(...(osmolality.errors as any[]));
  if (!inRange(measuredOsmolality, 200, 450)) errors.push('Enter measured osmolality from 200 to 450 mOsm/kg.');
  if (errors.length) return { ok: false, errors };

  const osmolalGap = round(measuredOsmolality - (osmolality as any).calculatedOsmolality, 1);
  return {
    ok: true,
    calculatedOsmolality: (osmolality as any).calculatedOsmolality,
    osmolalGap,
    severity: osmolalGap > 20 ? 'critical' : osmolalGap > 10 ? 'warning' : 'normal',
    label: `Osmolal gap ${osmolalGap} mOsm/kg`,
    interpretation:
      'Osmolal gap compares measured and calculated serum osmolality. Interpret with timing, ethanol, ketones, renal failure, shock, laboratory method, and toxicology pathway context.',
    referenceLine: osmolality.referenceLine,
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose toxic alcohol ingestion or recommend antidotes, dialysis, insulin, fluids, or disposition.`,
  };
}

export function computeBmi(raw) {
  const weightKg = toWeightKg(raw.weight, raw.weightUnit);
  const heightCm = toHeightCm(raw.height, raw.heightUnit);
  const errors = [] as any[];
  if (!inRange(weightKg, 1, 350)) errors.push('Enter weight from 1 to 350 kg or equivalent.');
  if (!inRange(heightCm, 30, 250)) errors.push('Enter height from 30 to 250 cm or equivalent.');
  if (errors.length) return { ok: false, errors };

  const bmi = round(weightKg / Math.pow(heightCm / 100, 2), 1);
  return {
    ok: true,
    bmi,
    category: categoryForBmi(bmi),
    severity: severityForBmi(bmi),
    label: `BMI ${bmi} kg/m2`,
    interpretation:
      'BMI is a population-level body-size index. Interpret with age, ethnicity, pregnancy status, edema, sarcopenia, athletic body composition, and waist measures.',
    referenceLine: 'BMI = weight (kg) / height (m)^2.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose obesity-related disease and does not recommend diet, weight-loss medication, surgery, or medication dosing.`,
  };
}

export function computeBsaMosteller(raw) {
  const weightKg = toWeightKg(raw.weight, raw.weightUnit);
  const heightCm = toHeightCm(raw.height, raw.heightUnit);
  const errors = [] as any[];
  if (!inRange(weightKg, 1, 350)) errors.push('Enter weight from 1 to 350 kg or equivalent.');
  if (!inRange(heightCm, 30, 250)) errors.push('Enter height from 30 to 250 cm or equivalent.');
  if (errors.length) return { ok: false, errors };

  const bsaM2 = round(Math.sqrt((heightCm * weightKg) / 3600), 2);
  return {
    ok: true,
    bsaM2,
    severity: 'normal',
    label: `BSA ${bsaM2} m2`,
    interpretation:
      'Mosteller BSA estimates body surface area from height and weight. Confirm the required BSA method for protocols, chemotherapy, burns, pediatrics, and research contexts.',
    referenceLine: 'Mosteller BSA = sqrt((height cm x weight kg) / 3600).',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not recommend medication doses, chemotherapy doses, fluid volumes, or treatment protocols.`,
  };
}

export function computeIdealBodyWeight(raw) {
  const heightCm = toHeightCm(raw.height, raw.heightUnit);
  const sex = raw.sex;
  const errors = [] as any[];
  if (!['female', 'male'].includes(sex)) errors.push('Select sex for the Devine equation.');
  if (!inRange(heightCm, 120, 230)) errors.push('Enter adult height from 120 to 230 cm or equivalent.');
  if (errors.length) return { ok: false, errors };

  const heightIn = heightCm / IN_TO_CM;
  const base = sex === 'female' ? 45.5 : 50;
  const idealBodyWeightKg = round(base + 2.3 * (heightIn - 60), 1);
  const idealBodyWeightLb = round(idealBodyWeightKg * KG_TO_LB, 1);
  return {
    ok: true,
    idealBodyWeightKg,
    idealBodyWeightLb,
    severity: 'normal',
    label: `IBW ${idealBodyWeightKg} kg`,
    interpretation:
      'Devine ideal body weight is a height-based reference estimate originally developed for medication context. It does not represent a health target or individualized goal weight.',
    referenceLine: 'Devine IBW: male 50 kg + 2.3 kg/in over 5 ft; female 45.5 kg + 2.3 kg/in over 5 ft.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not recommend drug dosing, nutrition targets, weight goals, or treatment plans.`,
  };
}

export function computeAdjustedBodyWeight(raw) {
  const actualWeightKg = toWeightKg(raw.actualWeight, raw.weightUnit);
  const ibw = computeIdealBodyWeight(raw);
  const correctionFactor = raw.correctionFactor === '0.25' ? 0.25 : raw.correctionFactor === '0.3' ? 0.3 : 0.4;
  const errors = [] as any[];
  if (!inRange(actualWeightKg, 1, 350)) errors.push('Enter actual weight from 1 to 350 kg or equivalent.');
  if (!ibw.ok) errors.push(...(ibw.errors as any[]));
  if (errors.length) return { ok: false, errors };

  const adjustedBodyWeightKg =
    actualWeightKg > (ibw as any).idealBodyWeightKg
      ? round((ibw as any).idealBodyWeightKg + correctionFactor * (actualWeightKg - (ibw as any).idealBodyWeightKg), 1)
      : round(actualWeightKg, 1);
  return {
    ok: true,
    adjustedBodyWeightKg,
    idealBodyWeightKg: (ibw as any).idealBodyWeightKg,
    actualWeightKg: round(actualWeightKg, 1),
    severity: 'normal',
    label: `AdjBW ${adjustedBodyWeightKg} kg`,
    interpretation:
      'Adjusted body weight is a convention sometimes used when actual weight exceeds ideal body weight. Which correction factor applies depends on the specific institutional protocol and clinical context.',
    referenceLine: `Adjusted body weight = IBW + ${correctionFactor} x (actual weight - IBW) when actual weight exceeds IBW.`,
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} This is not medication dosing automation and does not recommend a drug dose, insulin dose, nutrition prescription, or fluid rate.`,
  };
}

export function computeWaistHipRatio(raw) {
  const waist = toNumber(raw.waist);
  const hip = toNumber(raw.hip);
  const sex = raw.sex;
  const errors = [] as any[];
  if (!['female', 'male'].includes(sex)) errors.push('Select sex for waist-to-hip risk bands.');
  if (!inRange(waist, 20, 250)) errors.push('Enter waist circumference from 20 to 250 units.');
  if (!inRange(hip, 20, 250)) errors.push('Enter hip circumference from 20 to 250 units.');
  if (errors.length) return { ok: false, errors };

  const ratio = round(waist / hip, 2);
  const riskBand =
    sex === 'male'
      ? ratio > 1 ? 'high' : ratio >= 0.96 ? 'moderate' : 'lower'
      : ratio > 0.85 ? 'high' : ratio >= 0.81 ? 'moderate' : 'lower';
  return {
    ok: true,
    waistHipRatio: ratio,
    riskBand,
    severity: riskBand === 'high' ? 'warning' : 'normal',
    label: `Waist-to-hip ratio ${ratio}`,
    interpretation:
      'Waist-to-hip ratio estimates central adiposity pattern. Measurement technique, ethnicity, pregnancy, edema, body habitus, and longitudinal context affect interpretation.',
    referenceLine: 'Waist-to-hip ratio = waist circumference / hip circumference.',
    disclaimer: `${ENDOCRINE_METABOLIC_SAFETY_DISCLAIMER} Does not diagnose cardiometabolic disease and does not recommend treatment, medication, surgery, or nutrition plans.`,
  };
}
