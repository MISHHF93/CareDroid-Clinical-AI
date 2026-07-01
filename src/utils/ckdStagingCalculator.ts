/**
 * KDIGO CKD staging — eGFR (CKD-EPI 2021), albuminuria category, combined prognostic risk.
 *
 * Reference: Kidney Disease: Improving Global Outcomes (KDIGO) CKD Work Group.
 * KDIGO 2012 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease.
 *
 * Decision support only — does not recommend medications, dialysis, or transplant.
 */

/** @typedef {'female' | 'male'} CkdSex */
/** @typedef {'mg_dl' | 'umol_l'} CreatinineUnit */
/** @typedef {'mg_g' | 'mg_mmol'} AcrUnit */
/** @typedef {'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5'} GfrCategory */
/** @typedef {'A1' | 'A2' | 'A3'} AlbuminuriaCategory */
/** @typedef {'low' | 'moderately_increased' | 'high' | 'very_high'} CkdPrognosticRisk */

const CREATININE_UMOL_TO_MG_DL = 1 / 88.4;
const ACR_MG_MMOL_TO_MG_G = 8.84;

/** KDIGO prognostic heat map (GFR × albuminuria). */
const KDIGO_PROGNOSTIC_RISK = {
  G1: { A1: 'low', A2: 'low', A3: 'moderately_increased' },
  G2: { A1: 'low', A2: 'low', A3: 'moderately_increased' },
  G3a: { A1: 'low', A2: 'moderately_increased', A3: 'high' },
  G3b: { A1: 'moderately_increased', A2: 'high', A3: 'very_high' },
  G4: { A1: 'high', A2: 'very_high', A3: 'very_high' },
  G5: { A1: 'very_high', A2: 'very_high', A3: 'very_high' },
};

/**
 * @param {number} umolL
 */
export function creatinineUmolLToMgDl(umolL) {
  if (!Number.isFinite(umolL)) return NaN;
  return umolL * CREATININE_UMOL_TO_MG_DL;
}

/**
 * @param {number} value
 * @param {CreatinineUnit} unit
 */
export function toCreatinineMgDl(value, unit) {
  if (!Number.isFinite(value)) return NaN;
  return unit === 'umol_l' ? creatinineUmolLToMgDl(value) : value;
}

/**
 * @param {number} value
 * @param {AcrUnit} unit
 */
export function toAcrMgG(value, unit) {
  if (!Number.isFinite(value)) return NaN;
  return unit === 'mg_mmol' ? value * ACR_MG_MMOL_TO_MG_G : value;
}

/**
 * CKD-EPI 2021 creatinine equation (race-free).
 * @param {number} ageYears
 * @param {CkdSex} sex
 * @param {number} serumCreatinineMgDl
 */
export function computeCkdEpi2021Egfr(ageYears, sex, serumCreatinineMgDl) {
  const isFemale = sex === 'female';
  const kappa = isFemale ? 0.7 : 0.9;
  const ratio = serumCreatinineMgDl / kappa;
  const alpha = isFemale
    ? ratio <= 1
      ? -0.241
      : -1.2
    : ratio <= 1
      ? -0.302
      : -1.2;
  const sexFactor = isFemale ? 1.012 : 1;
  const egfr =
    142 *
    Math.pow(Math.min(ratio, 1), alpha) *
    Math.pow(Math.max(ratio, 1), -1.2) *
    Math.pow(0.9938, ageYears) *
    sexFactor;
  return Math.round(egfr);
}

/**
 * @param {number} egfrMlMin
 * @returns {{ category: GfrCategory, label: string, description: string }}
 */
export function classifyGfrCategory(egfrMlMin) {
  if (!Number.isFinite(egfrMlMin)) return null;
  if (egfrMlMin >= 90) {
    return {
      category: 'G1',
      label: 'G1 (=90 mL/min/1.73 m²)',
      description: 'Normal or high GFR (with other kidney damage markers, CKD may still apply).',
    };
  }
  if (egfrMlMin >= 60) {
    return {
      category: 'G2',
      label: 'G2 (60–89 mL/min/1.73 m²)',
      description: 'Mildly decreased GFR.',
    };
  }
  if (egfrMlMin >= 45) {
    return {
      category: 'G3a',
      label: 'G3a (45–59 mL/min/1.73 m²)',
      description: 'Mildly to moderately decreased GFR.',
    };
  }
  if (egfrMlMin >= 30) {
    return {
      category: 'G3b',
      label: 'G3b (30–44 mL/min/1.73 m²)',
      description: 'Moderately to severely decreased GFR.',
    };
  }
  if (egfrMlMin >= 15) {
    return {
      category: 'G4',
      label: 'G4 (15–29 mL/min/1.73 m²)',
      description: 'Severely decreased GFR.',
    };
  }
  return {
    category: 'G5',
    label: 'G5 (<15 mL/min/1.73 m²)',
    description: 'Kidney failure (GFR category G5).',
  };
}

/**
 * @param {number} acrMgG
 * @returns {{ category: AlbuminuriaCategory, label: string, description: string }}
 */
export function classifyAlbuminuria(acrMgG) {
  if (!Number.isFinite(acrMgG)) return null;
  if (acrMgG < 30) {
    return {
      category: 'A1',
      label: 'A1 (<30 mg/g)',
      description: 'Normal to mildly increased albuminuria.',
    };
  }
  if (acrMgG <= 300) {
    return {
      category: 'A2',
      label: 'A2 (30–300 mg/g)',
      description: 'Moderately increased albuminuria.',
    };
  }
  return {
    category: 'A3',
    label: 'A3 (>300 mg/g)',
    description: 'Severely increased albuminuria.',
  };
}

/**
 * @param {GfrCategory} gfrCategory
 * @param {AlbuminuriaCategory} albuminuriaCategory
 * @returns {CkdPrognosticRisk}
 */
export function combineCkdPrognosticRisk(gfrCategory, albuminuriaCategory) {
  return KDIGO_PROGNOSTIC_RISK[gfrCategory]?.[albuminuriaCategory] ?? null;
}

const PROGNOSTIC_RISK_LABELS = {
  low: 'Low risk of CKD progression (KDIGO heat map)',
  moderately_increased: 'Moderately increased risk of CKD progression (KDIGO heat map)',
  high: 'High risk of CKD progression (KDIGO heat map)',
  very_high: 'Very high risk of CKD progression (KDIGO heat map)',
};

/**
 * @param {CkdPrognosticRisk} risk
 */
export function prognosticRiskSeverity(risk) {
  if (risk === 'very_high') return 'critical';
  if (risk === 'high') return 'warning';
  if (risk === 'moderately_increased') return 'warning';
  return 'normal';
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateCkdStagingInputs(raw) {
  const errors = [] as any[];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing CKD staging input object'] };
  }

  const ageYears = Number(raw.ageYears);
  const sex = raw.sex;
  const creatinineUnit = raw.creatinineUnit === 'umol_l' ? 'umol_l' : 'mg_dl';
  const serumCreatinine = Number(raw.serumCreatinine);
  const acrUnit = raw.acrUnit === 'mg_mmol' ? 'mg_mmol' : 'mg_g';
  const urineAcr = Number(raw.urineAcr);

  if (!Number.isFinite(ageYears) || ageYears < 18 || ageYears > 120) {
    errors.push('Enter age in years (18–120) for CKD-EPI 2021.');
  }

  if (sex !== 'female' && sex !== 'male') {
    errors.push('Select sex (female or male).');
  }

  if (!Number.isFinite(serumCreatinine) || serumCreatinine <= 0) {
    errors.push('Enter a valid serum creatinine greater than zero.');
  }

  const scrMgDl = toCreatinineMgDl(serumCreatinine, creatinineUnit);
  if (creatinineUnit === 'mg_dl' && Number.isFinite(scrMgDl) && (scrMgDl < 0.2 || scrMgDl > 25)) {
    errors.push('Serum creatinine should be between 0.2 and 25 mg/dL.');
  }
  if (creatinineUnit === 'umol_l' && Number.isFinite(serumCreatinine) && (serumCreatinine < 20 || serumCreatinine > 2200)) {
    errors.push('Serum creatinine should be between 20 and 2200 µmol/L.');
  }

  if (!Number.isFinite(urineAcr) || urineAcr < 0) {
    errors.push('Enter a valid urine albumin-creatinine ratio (=0).');
  }

  const acrMgG = toAcrMgG(urineAcr, acrUnit);
  if (acrUnit === 'mg_g' && Number.isFinite(acrMgG) && acrMgG > 5000) {
    errors.push('Urine ACR is outside a plausible range for mg/g entry.');
  }
  if (acrUnit === 'mg_mmol' && Number.isFinite(urineAcr) && urineAcr > 600) {
    errors.push('Urine ACR is outside a plausible range for mg/mmol entry.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    inputs: {
      ageYears,
      sex,
      serumCreatinineMgDl: scrMgDl,
      creatinineUnit,
      urineAcrMgG: acrMgG,
      acrUnit,
    },
  };
}

/**
 * @param {number} egfr
 * @param {ReturnType<typeof classifyGfrCategory>} gfr
 * @param {ReturnType<typeof classifyAlbuminuria>} albuminuria
 * @param {CkdPrognosticRisk} prognosticRisk
 */
export function interpretCkdStaging(egfr, gfr, albuminuria, prognosticRisk) {
  const combinedStage = `${gfr.category}${albuminuria.category}`;
  const riskLabel = PROGNOSTIC_RISK_LABELS[prognosticRisk];

  return {
    severity: prognosticRiskSeverity(prognosticRisk),
    combinedStage,
    combinedStageLabel: `KDIGO G×A category ${combinedStage} (GFR ${gfr.category} + albuminuria ${albuminuria.category})`,
    gfrCategory: gfr.category,
    gfrCategoryLabel: gfr.label,
    gfrCategoryDescription: gfr.description,
    albuminuriaCategory: albuminuria.category,
    albuminuriaCategoryLabel: albuminuria.label,
    albuminuriaCategoryDescription: albuminuria.description,
    prognosticRisk,
    prognosticRiskLabel: riskLabel,
    interpretation: `Estimated eGFR ${egfr} mL/min/1.73 m² (${gfr.label}). ${albuminuria.label}: ${albuminuria.description} Combined KDIGO prognostic category: ${riskLabel}.`,
    stagingDiscussion:
      'KDIGO defines CKD by abnormalities of kidney structure or function for =3 months. A single eGFR and ACR do not by themselves establish chronicity or etiology — correlate with history, imaging, and prior labs per institutional pathways.',
    clinicianPatientDisclaimer: 'Use as decision-support for clinician-patient discussions.',
    safetyDisclaimer:
      'CKD-EPI 2021 estimates GFR from serum creatinine and demographics. It does not replace measured GFR, does not diagnose acute kidney injury, and must not be used alone to rule in or rule out kidney disease.',
    pathwayDisclaimer:
      'Follow KDIGO CKD evaluation and referral guidance and local nephrology pathways. This tool does not recommend specific therapies, dialysis, or transplant evaluation.',
    referenceLine:
      'KDIGO 2012 Clinical Practice Guideline for the Evaluation and Management of Chronic Kidney Disease. Kidney Int Suppl. 2013;3:1–150. eGFR: Inker LA, et al. N Engl J Med. 2021 (CKD-EPI 2021 creatinine equation).',
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computeCkdStagingResult(raw) {
  const v = validateCkdStagingInputs(raw);
  if (!v.valid) return { ok: false, errors: v.errors };

  const { ageYears, sex, serumCreatinineMgDl, urineAcrMgG, creatinineUnit, acrUnit } = v.inputs as any;
  const egfrMlMin = computeCkdEpi2021Egfr(ageYears, sex, serumCreatinineMgDl);
  const gfr = classifyGfrCategory(egfrMlMin);
  const albuminuria = classifyAlbuminuria(urineAcrMgG);
  const prognosticRisk = combineCkdPrognosticRisk((gfr as any).category, (albuminuria as any).category);
  const interp = interpretCkdStaging(egfrMlMin, gfr, albuminuria, prognosticRisk);

  return {
    ok: true,
    inputs: v.inputs,
    egfrMlMin,
    serumCreatinineMgDl,
    urineAcrMgG,
    creatinineUnit,
    acrUnit,
    ...interp,
  };
}
