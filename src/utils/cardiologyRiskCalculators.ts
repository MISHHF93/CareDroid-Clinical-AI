/**
 * Cardiology Clinical Tools Pack calculators.
 *
 * These helpers intentionally return risk documentation context only. They do
 * not diagnose disease, clear patients for exercise, or recommend treatment.
 */

export const CHADS2_CRITERIA_META = Object.freeze([
  {
    key: 'congestiveHeartFailure',
    shortLabel: 'Congestive heart failure',
    help: 'History or clinical evidence of heart failure / LV dysfunction.',
    points: 1,
  },
  {
    key: 'hypertension',
    shortLabel: 'Hypertension',
    help: 'History of hypertension or treated blood pressure.',
    points: 1,
  },
  {
    key: 'age75OrOlder',
    shortLabel: 'Age >= 75 years',
    help: 'Patient is 75 years old or older.',
    points: 1,
  },
  {
    key: 'diabetes',
    shortLabel: 'Diabetes mellitus',
    help: 'History of diabetes mellitus.',
    points: 1,
  },
  {
    key: 'strokeTia',
    shortLabel: 'Prior stroke or TIA',
    help: 'Prior stroke or transient ischemic attack.',
    points: 2,
  },
]);

export function calculateChads2Score(inputs) {
  return CHADS2_CRITERIA_META.reduce(
    (total, criterion) => total + (inputs?.[criterion.key] ? criterion.points : 0),
    0,
  );
}

export function interpretChads2Score(score) {
  if (!Number.isFinite(score) || score < 0 || score > 6) return null;
  const referenceLine =
    'Gage BF, Waterman AD, Shannon W, et al. Validation of clinical classification schemes for predicting stroke. JAMA. 2001;285(22):2864-2870.';
  const disclaimer =
    'CHADS2 is an older AF stroke-risk score. Prefer current guideline frameworks when applicable; this output does not recommend anticoagulation or any medication change.';
  if (score >= 3) {
    return {
      severity: 'critical',
      label: 'Higher CHADS2 stroke-risk band',
      riskBand: '3-6 points',
      interpretation:
        'Higher CHADS2 scores were associated with greater annual stroke risk in validation cohorts. Use for historical context and documentation, not as a standalone treatment trigger.',
      disclaimer,
      referenceLine,
    };
  }
  if (score >= 1) {
    return {
      severity: 'warning',
      label: 'Intermediate CHADS2 stroke-risk band',
      riskBand: '1-2 points',
      interpretation:
        'A score of 1-2 indicates non-trivial thromboembolic risk in the original CHADS2 framework. Compare with CHA2DS2-VASc and clinical context.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'normal',
    label: 'Lower CHADS2 stroke-risk band',
    riskBand: '0 points',
    interpretation:
      'A CHADS2 score of 0 was lower risk in the original cohort, but risk is not absent and modern tools may reclassify patients.',
    disclaimer,
    referenceLine,
  };
}

export function computeDukeTreadmillScore({ exerciseMinutes, stDeviationMm, anginaIndex }) {
  if (
    !Number.isFinite(exerciseMinutes) ||
    exerciseMinutes < 0 ||
    !Number.isFinite(stDeviationMm) ||
    stDeviationMm < 0 ||
    ![0, 1, 2].includes(anginaIndex)
  ) {
    return null;
  }
  const score = exerciseMinutes - 5 * stDeviationMm - 4 * anginaIndex;
  return {
    score: Number(score.toFixed(1)),
    exerciseMinutes,
    stDeviationMm,
    anginaIndex,
  };
}

export function interpretDukeTreadmillScore(score) {
  if (!Number.isFinite(score)) return null;
  const referenceLine =
    'Mark DB, Hlatky MA, Harrell FE Jr, et al. Exercise treadmill score for predicting prognosis in coronary artery disease. Ann Intern Med. 1987;106(6):793-800.';
  const disclaimer =
    'Applies to interpretable exercise treadmill testing; not for acute coronary syndrome, unstable symptoms, paced rhythm, LBBB, or uninterpretable ECG. Does not clear patients for discharge or exercise.';
  if (score <= -11) {
    return {
      severity: 'critical',
      label: 'High-risk Duke treadmill score',
      riskBand: '<= -11',
      interpretation:
        'A Duke treadmill score <= -11 is conventionally categorized as high risk in exercise treadmill prognostic frameworks.',
      disclaimer,
      referenceLine,
    };
  }
  if (score < 5) {
    return {
      severity: 'warning',
      label: 'Intermediate-risk Duke treadmill score',
      riskBand: '-10 to +4',
      interpretation:
        'Scores between -10 and +4 are conventionally intermediate risk and require clinical correlation with symptoms, ECG quality, and test adequacy.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'normal',
    label: 'Lower-risk Duke treadmill score',
    riskBand: '>= +5',
    interpretation:
      'Scores >= +5 are conventionally lower risk in validated exercise treadmill cohorts, but do not rule out coronary disease.',
    disclaimer,
    referenceLine,
  };
}

export function validateDukeTreadmillInputs(raw) {
  const errors = [] as any[];
  const exerciseMinutes = Number(raw.exerciseMinutes);
  const stDeviationMm = Number(raw.stDeviationMm);
  if (!Number.isFinite(exerciseMinutes) || exerciseMinutes < 0 || exerciseMinutes > 30) {
    errors.push('Enter exercise time from 0 to 30 minutes.');
  }
  if (!Number.isFinite(stDeviationMm) || stDeviationMm < 0 || stDeviationMm > 10) {
    errors.push('Enter ST-segment deviation from 0 to 10 mm.');
  }
  if (![0, 1, 2].includes(Number(raw.anginaIndex))) {
    errors.push('Select the angina index.');
  }
  return errors;
}

export function computeReynoldsRiskHelper(inputs) {
  const ageYears = Number(inputs.ageYears);
  const systolicBpMmHg = Number(inputs.systolicBpMmHg);
  const totalCholesterolMgDl = Number(inputs.totalCholesterolMgDl);
  const hdlCholesterolMgDl = Number(inputs.hdlCholesterolMgDl);
  const hsCrpMgL = Number(inputs.hsCrpMgL);
  const hba1cPct = inputs.diabetes ? Number(inputs.hba1cPct) : 0;
  const sex = inputs.sex;
  if (
    !Number.isFinite(ageYears) ||
    ageYears < 45 ||
    ageYears > 80 ||
    !['female', 'male'].includes(sex) ||
    !Number.isFinite(systolicBpMmHg) ||
    !Number.isFinite(totalCholesterolMgDl) ||
    !Number.isFinite(hdlCholesterolMgDl) ||
    !Number.isFinite(hsCrpMgL) ||
    (inputs.diabetes && !Number.isFinite(hba1cPct))
  ) {
    return null;
  }

  const points =
    (ageYears >= 65 ? 3 : ageYears >= 55 ? 2 : 1) +
    (systolicBpMmHg >= 160 ? 3 : systolicBpMmHg >= 140 ? 2 : systolicBpMmHg >= 120 ? 1 : 0) +
    (totalCholesterolMgDl / Math.max(hdlCholesterolMgDl, 1) >= 6
      ? 2
      : totalCholesterolMgDl / hdlCholesterolMgDl >= 4
        ? 1
        : 0) +
    (hsCrpMgL >= 3 ? 2 : hsCrpMgL >= 1 ? 1 : 0) +
    (inputs.smoker ? 2 : 0) +
    (inputs.parentalMiBefore60 ? 1 : 0) +
    (inputs.diabetes ? (hba1cPct >= 7 ? 2 : 1) : 0) +
    (sex === 'male' ? 1 : 0);

  const riskCategory = points >= 10 ? 'high' : points >= 6 ? 'intermediate' : 'low';
  return {
    points,
    riskCategory,
    factors: {
      ageYears,
      sex,
      systolicBpMmHg,
      totalCholesterolMgDl,
      hdlCholesterolMgDl,
      hsCrpMgL,
      smoker: Boolean(inputs.smoker),
      parentalMiBefore60: Boolean(inputs.parentalMiBefore60),
      diabetes: Boolean(inputs.diabetes),
      hba1cPct: inputs.diabetes ? hba1cPct : null,
    },
  };
}

export function interpretReynoldsRiskHelper(result) {
  if (!result) return null;
  const referenceLine =
    'Ridker PM, Buring JE, Rifai N, Cook NR. Development and validation of improved algorithms for global cardiovascular risk in women and men: the Reynolds Risk Score. JAMA. 2007;297(6):611-619; Circulation. 2008;118(22):2243-2251.';
  const disclaimer =
    'This CareDroid helper summarizes Reynolds Risk Score inputs and approximate risk category. It is not a replacement for a jurisdiction-approved Reynolds calculator and does not recommend statins, aspirin, or blood pressure therapy.';
  if (result.riskCategory === 'high') {
    return {
      severity: 'critical',
      label: 'Higher Reynolds risk signal',
      riskBand: 'High input-burden category',
      interpretation:
        'Multiple Reynolds inputs are in higher-risk ranges, including inflammatory/family-history factors when selected. Use a validated Reynolds implementation for exact percentage risk.',
      disclaimer,
      referenceLine,
    };
  }
  if (result.riskCategory === 'intermediate') {
    return {
      severity: 'warning',
      label: 'Intermediate Reynolds risk signal',
      riskBand: 'Intermediate input-burden category',
      interpretation:
        'Inputs suggest an intermediate prevention-risk discussion context after CRP and family history are considered.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'normal',
    label: 'Lower Reynolds risk signal',
    riskBand: 'Lower input-burden category',
    interpretation:
      'Inputs fall in a lower Reynolds helper band, though cardiovascular risk is not absent and should be reassessed over time.',
    disclaimer,
    referenceLine,
  };
}

export function validateReynoldsInputs(raw) {
  const errors = [] as any[];
  const age = Number(raw.ageYears);
  if (!Number.isFinite(age) || age < 45 || age > 80)
    errors.push('Age must be 45-80 years for this helper.');
  if (!raw.sex) errors.push('Select sex.');
  const sbp = Number(raw.systolicBpMmHg);
  const tc = Number(raw.totalCholesterolMgDl);
  const hdl = Number(raw.hdlCholesterolMgDl);
  const crp = Number(raw.hsCrpMgL);
  if (!Number.isFinite(sbp) || sbp < 80 || sbp > 250)
    errors.push('Enter systolic BP between 80 and 250 mmHg.');
  if (!Number.isFinite(tc) || tc < 100 || tc > 400)
    errors.push('Enter total cholesterol between 100 and 400 mg/dL.');
  if (!Number.isFinite(hdl) || hdl < 20 || hdl > 120)
    errors.push('Enter HDL cholesterol between 20 and 120 mg/dL.');
  if (!Number.isFinite(crp) || crp < 0.1 || crp > 50)
    errors.push('Enter hs-CRP between 0.1 and 50 mg/L.');
  if (raw.diabetes) {
    const hba1c = Number(raw.hba1cPct);
    if (!Number.isFinite(hba1c) || hba1c < 4 || hba1c > 15)
      errors.push('Enter HbA1c between 4% and 15%.');
  }
  return errors;
}

export function computeHcmSuddenDeathRisk(inputs) {
  const ageYears = Number(inputs.ageYears);
  const maxWallThicknessMm = Number(inputs.maxWallThicknessMm);
  const leftAtriumDiameterMm = Number(inputs.leftAtriumDiameterMm);
  const maxLvotGradientMmHg = Number(inputs.maxLvotGradientMmHg);
  if (
    !Number.isFinite(ageYears) ||
    !Number.isFinite(maxWallThicknessMm) ||
    !Number.isFinite(leftAtriumDiameterMm) ||
    !Number.isFinite(maxLvotGradientMmHg)
  ) {
    return null;
  }

  const prognosticIndex =
    0.15939858 * maxWallThicknessMm -
    0.00294271 * maxWallThicknessMm * maxWallThicknessMm +
    0.0259082 * leftAtriumDiameterMm +
    0.00446131 * maxLvotGradientMmHg +
    0.4583082 * (inputs.familyHistoryScd ? 1 : 0) +
    0.82639195 * (inputs.nsvt ? 1 : 0) +
    0.71650361 * (inputs.unexplainedSyncope ? 1 : 0) -
    0.01799934 * ageYears;

  const fiveYearRiskPct = (1 - Math.pow(0.998, Math.exp(prognosticIndex))) * 100;
  return {
    fiveYearRiskPct: Number(fiveYearRiskPct.toFixed(1)),
    prognosticIndex: Number(prognosticIndex.toFixed(4)),
  };
}

export function interpretHcmSuddenDeathRisk(fiveYearRiskPct) {
  if (!Number.isFinite(fiveYearRiskPct)) return null;
  const referenceLine =
    'O Mahony C, Jichi F, Pavlou M, et al. A novel clinical risk prediction model for sudden cardiac death in hypertrophic cardiomyopathy (HCM Risk-SCD). Eur Heart J. 2014;35(30):2010-2020.';
  const disclaimer =
    'Use only for appropriate adult HCM populations and verify exclusions/inputs against ESC HCM Risk-SCD guidance. Does not recommend ICD placement or non-placement.';
  if (fiveYearRiskPct >= 6) {
    return {
      severity: 'critical',
      label: 'Higher modeled HCM SCD risk',
      riskBand: '>= 6% estimated 5-year SCD risk',
      interpretation:
        'The modeled 5-year SCD risk is in a higher range used for specialist ICD risk discussion in ESC frameworks.',
      disclaimer,
      referenceLine,
    };
  }
  if (fiveYearRiskPct >= 4) {
    return {
      severity: 'warning',
      label: 'Intermediate modeled HCM SCD risk',
      riskBand: '4% to <6% estimated 5-year SCD risk',
      interpretation:
        'The modeled 5-year SCD risk is intermediate and should be interpreted by an HCM specialist with imaging, genetics, and patient preference context.',
      disclaimer,
      referenceLine,
    };
  }
  return {
    severity: 'normal',
    label: 'Lower modeled HCM SCD risk',
    riskBand: '<4% estimated 5-year SCD risk',
    interpretation:
      'The modeled 5-year SCD risk is lower by this model, but risk is not absent and serial specialist reassessment may still be needed.',
    disclaimer,
    referenceLine,
  };
}

export function validateHcmSuddenDeathRiskInputs(raw) {
  const errors = [] as any[];
  const age = Number(raw.ageYears);
  const wall = Number(raw.maxWallThicknessMm);
  const la = Number(raw.leftAtriumDiameterMm);
  const gradient = Number(raw.maxLvotGradientMmHg);
  if (!Number.isFinite(age) || age < 16 || age > 100)
    errors.push('Enter age between 16 and 100 years.');
  if (!Number.isFinite(wall) || wall < 10 || wall > 50)
    errors.push('Enter max wall thickness between 10 and 50 mm.');
  if (!Number.isFinite(la) || la < 20 || la > 80)
    errors.push('Enter left atrial diameter between 20 and 80 mm.');
  if (!Number.isFinite(gradient) || gradient < 0 || gradient > 250)
    errors.push('Enter max LVOT gradient between 0 and 250 mmHg.');
  return errors;
}

export function determineHeartFailureStage(inputs) {
  if (inputs?.refractorySymptoms) {
    return {
      stage: 'D',
      severity: 'critical',
      label: 'Stage D heart failure context',
      interpretation:
        'Advanced symptoms despite guideline-directed care, recurrent hospitalizations, or need for specialized advanced HF review.',
    };
  }
  if (inputs?.currentOrPriorSymptoms) {
    return {
      stage: 'C',
      severity: 'warning',
      label: 'Stage C heart failure context',
      interpretation:
        'Structural heart disease with current or prior symptoms consistent with heart failure.',
    };
  }
  if (inputs?.structuralHeartDisease) {
    return {
      stage: 'B',
      severity: 'warning',
      label: 'Stage B pre-heart-failure context',
      interpretation:
        'Structural heart disease or abnormal cardiac function without current or prior HF symptoms.',
    };
  }
  if (inputs?.riskFactors) {
    return {
      stage: 'A',
      severity: 'normal',
      label: 'Stage A at-risk context',
      interpretation:
        'Risk factors for heart failure are present without known structural disease or HF symptoms.',
    };
  }
  return {
    stage: 'None selected',
    severity: 'normal',
    label: 'No stage criteria selected',
    interpretation:
      'No ACC/AHA stage-defining features were selected. This does not exclude heart failure or future risk.',
  };
}

export const HEART_FAILURE_STAGE_DISCLAIMER =
  'ACC/AHA staging helper for documentation only. It does not diagnose heart failure, assign NYHA class, or recommend diuretics, devices, admission, or advanced therapy.';
