/**
 * Hepatology and gastroenterology calculators.
 * Decision support only: these utilities do not diagnose disease, recommend
 * treatment, determine disposition, or replace local hepatology/GI pathways.
 */

export const HEPATOLOGY_GI_DISCLAIMER =
  'Clinical decision support only. Does not establish a diagnosis, recommend treatment, determine disposition, or replace clinician judgment, endoscopy findings, specialist review, or local hepatology/GI protocols.';

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return NaN;
  const n = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(n) ? n : NaN;
}

export function bilirubinUmolLToMgDl(umolL) {
  if (!Number.isFinite(umolL)) return NaN;
  return umolL / 17.104;
}

export function bunMgDlToMmolL(mgDl) {
  if (!Number.isFinite(mgDl)) return NaN;
  return mgDl / 2.801;
}

export function hemoglobinGLToGDl(gL) {
  if (!Number.isFinite(gL)) return NaN;
  return gL / 10;
}

export function parseBilirubinMgDl(value, unit = 'mg_dl') {
  const raw = toNumber(value);
  return unit === 'umol_l' ? bilirubinUmolLToMgDl(raw) : raw;
}

export function parseBunMmolL(value, unit = 'mmol_l') {
  const raw = toNumber(value);
  return unit === 'mg_dl' ? bunMgDlToMmolL(raw) : raw;
}

export function parseHemoglobinGDl(value, unit = 'g_dl') {
  const raw = toNumber(value);
  return unit === 'g_l' ? hemoglobinGLToGDl(raw) : raw;
}

export function calculateMaddreyDiscriminantFunction({
  patientPtSeconds,
  controlPtSeconds,
  bilirubinMgDl,
}) {
  if (
    !Number.isFinite(patientPtSeconds) ||
    !Number.isFinite(controlPtSeconds) ||
    !Number.isFinite(bilirubinMgDl) ||
    patientPtSeconds <= 0 ||
    controlPtSeconds <= 0 ||
    bilirubinMgDl < 0
  ) {
    return null;
  }

  const score = 4.6 * (patientPtSeconds - controlPtSeconds) + bilirubinMgDl;
  return Math.round(score * 10) / 10;
}

export function validateMaddreyInputs(raw) {
  const errors = [] as any[];
  const patientPt = toNumber(raw.patientPtSeconds);
  const controlPt = toNumber(raw.controlPtSeconds);
  const bilirubinMgDl = parseBilirubinMgDl(raw.bilirubin, raw.bilirubinUnit);

  if (!Number.isFinite(patientPt) || patientPt < 5 || patientPt > 200) {
    errors.push('Enter patient PT between 5 and 200 seconds.');
  }
  if (!Number.isFinite(controlPt) || controlPt < 5 || controlPt > 60) {
    errors.push('Enter control PT between 5 and 60 seconds.');
  }
  if (Number.isFinite(patientPt) && Number.isFinite(controlPt) && patientPt < controlPt) {
    errors.push('Patient PT should not be lower than the control PT for Maddrey DF.');
  }
  if (!Number.isFinite(bilirubinMgDl) || bilirubinMgDl < 0.1 || bilirubinMgDl > 80) {
    errors.push('Enter total bilirubin in a clinically plausible range.');
  }

  return {
    valid: errors.length === 0,
    errors,
    values: { patientPtSeconds: patientPt, controlPtSeconds: controlPt, bilirubinMgDl },
  };
}

export function interpretMaddreyDf(score) {
  if (!Number.isFinite(score)) return null;
  const severe = score >= 32;
  return {
    severity: severe ? 'critical' : 'normal',
    label: severe ? 'Maddrey DF >= 32' : 'Maddrey DF < 32',
    riskBand: severe ? 'Severe-range historical risk marker' : 'Below severe-range threshold',
    interpretation: severe
      ? 'A Maddrey DF of 32 or higher has been used as a severe-range risk marker in alcoholic hepatitis cohorts. Interpret only with clinical context; this tool does not recommend corticosteroids, admission, transplant referral, or other therapy.'
      : 'A Maddrey DF below 32 is below the classic severe-range threshold. This does not exclude serious liver disease, infection, bleeding, withdrawal risk, or need for specialist review.',
    referenceLine:
      'Maddrey WC, et al. Corticosteroid therapy of alcoholic hepatitis. Gastroenterology. 1978;75(2):193-199.',
    disclaimer: HEPATOLOGY_GI_DISCLAIMER,
  };
}

export function calculateApri({ astUPerL, astUpperLimitUPerL, platelets10e9PerL }) {
  if (
    !Number.isFinite(astUPerL) ||
    !Number.isFinite(astUpperLimitUPerL) ||
    !Number.isFinite(platelets10e9PerL) ||
    astUPerL <= 0 ||
    astUpperLimitUPerL <= 0 ||
    platelets10e9PerL <= 0
  ) {
    return null;
  }

  const score = (astUPerL / astUpperLimitUPerL / platelets10e9PerL) * 100;
  return Math.round(score * 100) / 100;
}

export function validateApriInputs(raw) {
  const errors = [] as any[];
  const astUPerL = toNumber(raw.astUPerL);
  const astUpperLimitUPerL = toNumber(raw.astUpperLimitUPerL);
  const platelets10e9PerL = toNumber(raw.platelets10e9PerL);

  if (!Number.isFinite(astUPerL) || astUPerL <= 0 || astUPerL > 10000) {
    errors.push('Enter AST between 1 and 10000 U/L.');
  }
  if (!Number.isFinite(astUpperLimitUPerL) || astUpperLimitUPerL <= 0 || astUpperLimitUPerL > 500) {
    errors.push('Enter AST upper limit of normal between 1 and 500 U/L.');
  }
  if (!Number.isFinite(platelets10e9PerL) || platelets10e9PerL <= 0 || platelets10e9PerL > 2000) {
    errors.push('Enter platelet count between 1 and 2000 x10^9/L.');
  }

  return {
    valid: errors.length === 0,
    errors,
    values: { astUPerL, astUpperLimitUPerL, platelets10e9PerL },
  };
}

export function interpretApri(score) {
  if (!Number.isFinite(score) || score <= 0) return null;
  let severity = 'normal';
  let label = 'Lower APRI';
  let riskBand = '< 0.5';
  let interpretation =
    'APRI below 0.5 is a lower fibrosis concern range in common chronic viral hepatitis interpretations. It does not rule out fibrosis or cirrhosis.';

  if (score >= 2) {
    severity = 'critical';
    label = 'High APRI';
    riskBand = '>= 2.0';
    interpretation =
      'APRI at or above 2.0 is a high non-invasive fibrosis/cirrhosis concern range in validation literature. Correlate with etiology, elastography, imaging, labs, and specialist review; this is not a diagnosis.';
  } else if (score >= 1.5) {
    severity = 'warning';
    label = 'Elevated APRI';
    riskBand = '1.5-1.99';
    interpretation =
      'APRI 1.5-1.99 is an elevated range associated with increased concern for significant fibrosis in validation cohorts. It supports further staging context only.';
  } else if (score >= 0.5) {
    severity = 'warning';
    label = 'Indeterminate APRI';
    riskBand = '0.5-1.49';
    interpretation =
      'APRI 0.5-1.49 is commonly treated as an indeterminate range. Use alongside FIB-4, elastography, imaging, and clinical context.';
  }

  return {
    severity,
    label,
    riskBand,
    interpretation,
    referenceLine:
      'Wai CT, et al. A simple noninvasive index can predict both significant fibrosis and cirrhosis in patients with chronic hepatitis C. Hepatology. 2003;38(2):518-526.',
    disclaimer: HEPATOLOGY_GI_DISCLAIMER,
  };
}

export function scoreGbsBunMmolL(bunMmolL) {
  if (!Number.isFinite(bunMmolL)) return null;
  if (bunMmolL < 6.5) return 0;
  if (bunMmolL < 8) return 2;
  if (bunMmolL < 10) return 3;
  if (bunMmolL < 25) return 4;
  return 6;
}

export function scoreGbsHemoglobinGDl(hemoglobinGDl, sex) {
  if (!Number.isFinite(hemoglobinGDl)) return null;
  if (sex === 'male') {
    if (hemoglobinGDl >= 13) return 0;
    if (hemoglobinGDl >= 12) return 1;
    if (hemoglobinGDl >= 10) return 3;
    return 6;
  }
  if (sex === 'female') {
    if (hemoglobinGDl >= 12) return 0;
    if (hemoglobinGDl >= 10) return 1;
    return 6;
  }
  return null;
}

export function scoreGbsSystolicBp(systolicBpMmHg) {
  if (!Number.isFinite(systolicBpMmHg)) return null;
  if (systolicBpMmHg >= 110) return 0;
  if (systolicBpMmHg >= 100) return 1;
  if (systolicBpMmHg >= 90) return 2;
  return 3;
}

export function calculateGlasgowBlatchfordScore(raw) {
  const bunMmolL = parseBunMmolL(raw.bun, raw.bunUnit);
  const hemoglobinGDl = parseHemoglobinGDl(raw.hemoglobin, raw.hemoglobinUnit);
  const systolicBpMmHg = toNumber(raw.systolicBpMmHg);
  const bun = scoreGbsBunMmolL(bunMmolL);
  const hemoglobin = scoreGbsHemoglobinGDl(hemoglobinGDl, raw.sex);
  const systolicBp = scoreGbsSystolicBp(systolicBpMmHg);
  if (bun === null || hemoglobin === null || systolicBp === null) return null;

  const pulse = raw.pulseAtLeast100 ? 1 : 0;
  const melena = raw.melena ? 1 : 0;
  const syncope = raw.syncope ? 2 : 0;
  const hepaticDisease = raw.hepaticDisease ? 2 : 0;
  const cardiacFailure = raw.cardiacFailure ? 2 : 0;
  const total =
    bun + hemoglobin + systolicBp + pulse + melena + syncope + hepaticDisease + cardiacFailure;

  return {
    total,
    breakdown: {
      bun,
      hemoglobin,
      systolicBp,
      pulse,
      melena,
      syncope,
      hepaticDisease,
      cardiacFailure,
    },
    parsed: { bunMmolL, hemoglobinGDl, systolicBpMmHg },
  };
}

export function validateGlasgowBlatchfordInputs(raw) {
  const errors = [] as any[];
  const bunMmolL = parseBunMmolL(raw.bun, raw.bunUnit);
  const hemoglobinGDl = parseHemoglobinGDl(raw.hemoglobin, raw.hemoglobinUnit);
  const systolicBpMmHg = toNumber(raw.systolicBpMmHg);

  if (!['male', 'female'].includes(raw.sex)) errors.push('Select sex for hemoglobin scoring.');
  if (!Number.isFinite(bunMmolL) || bunMmolL < 1 || bunMmolL > 60) {
    errors.push('Enter BUN/urea in a plausible range.');
  }
  if (!Number.isFinite(hemoglobinGDl) || hemoglobinGDl < 2 || hemoglobinGDl > 25) {
    errors.push('Enter hemoglobin in a plausible range.');
  }
  if (!Number.isFinite(systolicBpMmHg) || systolicBpMmHg < 40 || systolicBpMmHg > 260) {
    errors.push('Enter systolic blood pressure between 40 and 260 mmHg.');
  }

  return { valid: errors.length === 0, errors };
}

export function interpretGlasgowBlatchford(score) {
  if (!Number.isFinite(score) || score < 0) return null;
  let severity = 'normal';
  let label = 'GBS 0';
  let riskBand = 'Very low risk marker in validation cohorts';
  let interpretation =
    'GBS 0 is a very low-risk marker in upper GI bleeding cohorts. This tool does not recommend discharge, endoscopy timing, transfusion, medication, or disposition.';

  if (score >= 7) {
    severity = 'critical';
    label = 'High Glasgow-Blatchford score';
    riskBand = 'Higher intervention-risk marker';
    interpretation =
      'Higher GBS values correlate with increased likelihood of clinical intervention or adverse outcomes in validation cohorts. Use local GI bleed pathways and clinician review; no treatment or disposition recommendation is made here.';
  } else if (score >= 2) {
    severity = 'warning';
    label = 'Elevated Glasgow-Blatchford score';
    riskBand = 'Above very-low-risk range';
    interpretation =
      'GBS above 1 is outside the commonly used very-low-risk range. Interpret with hemodynamics, ongoing bleeding, anticoagulants, comorbidities, and local protocols.';
  } else if (score === 1) {
    label = 'GBS 1';
    riskBand = 'Low-risk marker in some validation pathways';
    interpretation =
      'GBS 1 is low but not zero. It does not rule out clinically important bleeding and does not determine outpatient management by itself.';
  }

  return {
    severity,
    label,
    riskBand,
    interpretation,
    referenceLine:
      'Blatchford O, et al. A risk score to predict need for treatment for upper-gastrointestinal haemorrhage. Lancet. 2000;356(9238):1318-1321.',
    disclaimer: HEPATOLOGY_GI_DISCLAIMER,
  };
}

export function calculateRockallScore(raw) {
  const components = {
    age: Number(raw.agePoints),
    shock: Number(raw.shockPoints),
    comorbidity: Number(raw.comorbidityPoints),
    diagnosis: Number(raw.diagnosisPoints),
    stigmata: Number(raw.stigmataPoints),
  };
  if (Object.values(components).some((value) => !Number.isFinite(value) || value < 0)) return null;
  return {
    total: Object.values(components).reduce((sum, value) => sum + value, 0),
    breakdown: components,
  };
}

export function interpretRockall(score) {
  if (!Number.isFinite(score) || score < 0 || score > 11) return null;
  let severity = 'normal';
  let label = 'Lower Rockall score';
  let riskBand = '0-2';
  let interpretation =
    'Lower Rockall scores correlate with lower rebleeding/mortality risk in validation cohorts. This does not rule out clinically important bleeding and does not determine discharge or endoscopy timing.';

  if (score >= 5) {
    severity = 'critical';
    label = 'High Rockall score';
    riskBand = '>= 5';
    interpretation =
      'Rockall score 5 or higher is a high-risk marker in upper GI bleeding cohorts. Use with endoscopic findings and local GI bleed pathways; this screen does not recommend intervention, transfusion, admission, or discharge.';
  } else if (score >= 3) {
    severity = 'warning';
    label = 'Intermediate Rockall score';
    riskBand = '3-4';
    interpretation =
      'Rockall score 3-4 is an intermediate risk marker. Correlate with clinical trajectory, endoscopy, comorbidities, and local protocols.';
  }

  return {
    severity,
    label,
    riskBand,
    interpretation,
    referenceLine:
      'Rockall TA, et al. Risk assessment after acute upper gastrointestinal haemorrhage. Gut. 1996;38(3):316-321.',
    disclaimer: HEPATOLOGY_GI_DISCLAIMER,
  };
}
