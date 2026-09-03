export const EMERGENCY_DECISION_SUPPORT_DISCLAIMER =
  'This tool supports clinical assessment and does not replace physician judgment.';

export const PEDIATRIC_CAUTION =
  'Pediatric caution: use age-appropriate vital sign norms, local pediatric escalation pathways, and clinician judgment.';

export const GCS_COMPONENTS_META = Object.freeze([
  {
    key: 'eye',
    label: 'Eye opening',
    options: [
      { value: 4, label: 'Spontaneous (4)' },
      { value: 3, label: 'To speech (3)' },
      { value: 2, label: 'To pain (2)' },
      { value: 1, label: 'None (1)' },
    ],
  },
  {
    key: 'verbal',
    label: 'Verbal response',
    options: [
      { value: 5, label: 'Oriented (5)' },
      { value: 4, label: 'Confused conversation (4)' },
      { value: 3, label: 'Inappropriate words (3)' },
      { value: 2, label: 'Incomprehensible sounds (2)' },
      { value: 1, label: 'None (1)' },
    ],
  },
  {
    key: 'motor',
    label: 'Motor response',
    options: [
      { value: 6, label: 'Obeys commands (6)' },
      { value: 5, label: 'Localizes pain (5)' },
      { value: 4, label: 'Withdraws from pain (4)' },
      { value: 3, label: 'Flexion to pain (3)' },
      { value: 2, label: 'Extension to pain (2)' },
      { value: 1, label: 'None (1)' },
    ],
  },
]);

export const CURB65_CRITERIA_META = Object.freeze([
  { key: 'confusion', label: 'New confusion' },
  { key: 'urea', label: 'Urea >7 mmol/L or BUN >19 mg/dL' },
  { key: 'respiratoryRate', label: 'Respiratory rate >=30/min' },
  { key: 'bloodPressure', label: 'SBP <90 mmHg or DBP <=60 mmHg' },
  { key: 'age65', label: 'Age >=65 years' },
]);

export const APACHE_II_COMPONENTS_META = Object.freeze([
  {
    key: 'temperature',
    label: 'Temperature (C)',
    options: [
      { value: 4, label: '>=41 or <30 (4)' },
      { value: 3, label: '39-40.9 or 30-31.9 (3)' },
      { value: 2, label: '32-33.9 (2)' },
      { value: 1, label: '38.5-38.9 or 34-35.9 (1)' },
      { value: 0, label: '36-38.4 (0)' },
    ],
  },
  {
    key: 'map',
    label: 'Mean arterial pressure',
    options: [
      { value: 4, label: '>=160 or <50 mmHg (4)' },
      { value: 3, label: '130-159 mmHg (3)' },
      { value: 2, label: '110-129 mmHg (2)' },
      { value: 0, label: '70-109 mmHg (0)' },
      { value: 2, label: '50-69 mmHg (2)' },
    ],
  },
  {
    key: 'heartRate',
    label: 'Heart rate',
    options: [
      { value: 4, label: '>=180 or <40/min (4)' },
      { value: 3, label: '140-179 or 40-54/min (3)' },
      { value: 2, label: '110-139/min (2)' },
      { value: 0, label: '70-109/min (0)' },
      { value: 2, label: '55-69/min (2)' },
    ],
  },
  {
    key: 'respiratoryRate',
    label: 'Respiratory rate',
    options: [
      { value: 4, label: '>=50 or <6/min (4)' },
      { value: 3, label: '35-49/min (3)' },
      { value: 1, label: '25-34 or 10-11/min (1)' },
      { value: 0, label: '12-24/min (0)' },
      { value: 2, label: '6-9/min (2)' },
    ],
  },
  {
    key: 'oxygenation',
    label: 'Oxygenation',
    options: [
      { value: 4, label: 'A-aDO2 >=500, or PaO2 <55 on FiO2 <0.5 (4)' },
      { value: 3, label: 'A-aDO2 350-499, or PaO2 55-60 (3)' },
      { value: 2, label: 'A-aDO2 200-349, or PaO2 61-70 (2)' },
      { value: 1, label: 'PaO2 71-80 on FiO2 <0.5 (1)' },
      { value: 0, label: 'A-aDO2 <200, or PaO2 >70 (0)' },
    ],
  },
  {
    key: 'acidBase',
    label: 'Arterial pH or serum HCO3 surrogate',
    options: [
      { value: 4, label: 'pH >=7.70 or <7.15 (4)' },
      { value: 3, label: 'pH 7.60-7.69 or 7.15-7.24 (3)' },
      { value: 2, label: 'pH 7.25-7.32 (2)' },
      { value: 1, label: 'pH 7.50-7.59 (1)' },
      { value: 0, label: 'pH 7.33-7.49 (0)' },
    ],
  },
  {
    key: 'sodium',
    label: 'Serum sodium',
    options: [
      { value: 4, label: '>=180 or <110 mmol/L (4)' },
      { value: 3, label: '160-179 or 111-119 mmol/L (3)' },
      { value: 2, label: '155-159 or 120-129 mmol/L (2)' },
      { value: 1, label: '150-154 mmol/L (1)' },
      { value: 0, label: '130-149 mmol/L (0)' },
    ],
  },
  {
    key: 'potassium',
    label: 'Serum potassium',
    options: [
      { value: 4, label: '>=7.0 or <2.5 mmol/L (4)' },
      { value: 3, label: '6.0-6.9 mmol/L (3)' },
      { value: 2, label: '2.5-2.9 mmol/L (2)' },
      { value: 1, label: '5.5-5.9 mmol/L (1)' },
      { value: 0, label: '3.0-5.4 mmol/L (0)' },
    ],
  },
  {
    key: 'creatinine',
    label: 'Serum creatinine',
    options: [
      { value: 4, label: '>=3.5 mg/dL / >=309 umol/L (4; double in acute renal failure)' },
      { value: 3, label: '2.0-3.4 mg/dL / 177-308 umol/L (3; double in acute renal failure)' },
      { value: 2, label: '1.5-1.9 mg/dL / 133-176 umol/L (2; double in acute renal failure)' },
      { value: 0, label: '0.6-1.4 mg/dL / 53-132 umol/L (0)' },
      { value: 2, label: '<0.6 mg/dL / <53 umol/L (2)' },
    ],
  },
  {
    key: 'hematocrit',
    label: 'Hematocrit',
    options: [
      { value: 4, label: '>=60% or <20% (4)' },
      { value: 2, label: '50-59.9% or 20-29.9% (2)' },
      { value: 0, label: '30-49.9% (0)' },
    ],
  },
  {
    key: 'wbc',
    label: 'White blood cell count',
    options: [
      { value: 4, label: '>=40 or <1 x10^3/uL (4)' },
      { value: 2, label: '20-39.9 or 1-2.9 x10^3/uL (2)' },
      { value: 1, label: '15-19.9 x10^3/uL (1)' },
      { value: 0, label: '3-14.9 x10^3/uL (0)' },
    ],
  },
  {
    key: 'age',
    label: 'Age points',
    options: [
      { value: 0, label: '<45 years (0)' },
      { value: 2, label: '45-54 years (2)' },
      { value: 3, label: '55-64 years (3)' },
      { value: 5, label: '65-74 years (5)' },
      { value: 6, label: '>=75 years (6)' },
    ],
  },
  {
    key: 'chronicHealth',
    label: 'Chronic health points',
    options: [
      { value: 0, label: 'No severe chronic organ insufficiency/immunocompromise (0)' },
      { value: 2, label: 'Severe chronic condition, elective postoperative (2)' },
      { value: 5, label: 'Severe chronic condition, nonoperative or emergency postoperative (5)' },
    ],
  },
]);

export const PEWS_DIMENSIONS_META = Object.freeze([
  {
    key: 'behavior',
    label: 'Behavior',
    options: [
      { value: 0, label: 'Playing/appropriate (0)' },
      { value: 1, label: 'Sleeping (1)' },
      { value: 2, label: 'Irritable (2)' },
      { value: 3, label: 'Lethargic/confused or reduced pain response (3)' },
    ],
  },
  {
    key: 'cardiovascular',
    label: 'Cardiovascular',
    options: [
      { value: 0, label: 'Pink or capillary refill 1-2 sec (0)' },
      { value: 1, label: 'Pale or capillary refill 3 sec (1)' },
      { value: 2, label: 'Gray/capillary refill 4 sec or tachycardic (2)' },
      { value: 3, label: 'Gray and mottled, capillary refill >=5 sec, or marked tachycardia (3)' },
    ],
  },
  {
    key: 'respiratory',
    label: 'Respiratory',
    options: [
      { value: 0, label: 'Within normal parameters, no retractions (0)' },
      { value: 1, label: '>10 above normal or accessory muscle use (1)' },
      { value: 2, label: '>20 above normal, retractions, or post-op oxygen (2)' },
      { value: 3, label: 'Severe distress, grunting, or FiO2 >=40% (3)' },
    ],
  },
  {
    key: 'nebulizer',
    label: 'Nebulizer frequency',
    options: [
      { value: 0, label: 'No q15 min nebulizers (0)' },
      { value: 2, label: 'Nebulizers every 15 minutes or continuous (2)' },
    ],
  },
  {
    key: 'vomiting',
    label: 'Persistent postoperative vomiting',
    options: [
      { value: 0, label: 'No persistent vomiting (0)' },
      { value: 2, label: 'Persistent vomiting after surgery (2)' },
    ],
  },
]);

function toNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumSelectedPoints(inputs, requiredKeys) {
  let total = 0;
  for (const key of requiredKeys) {
    const value = toNumber(inputs[key]);
    if (value === null) return null;
    total += value;
  }
  return total;
}

export function validateRequiredSelections(inputs, requiredKeys, labelByKey) {
  const errors = [] as any[];
  for (const key of requiredKeys) {
    if (toNumber(inputs[key]) === null) {
      errors.push(`Select ${labelByKey[key] || key}.`);
    }
  }
  return { ok: errors.length === 0, errors };
}

export function calculateGcsScore(inputs) {
  return sumSelectedPoints(inputs, ['eye', 'verbal', 'motor']);
}

export function interpretGcsScore(score) {
  if (!Number.isFinite(score)) return null;
  const referenceLine = 'Teasdale G, Jennett B. Lancet. 1974;2:81-84.';
  if (score <= 8) {
    return {
      riskCategory: 'severe',
      severity: 'critical',
      label: 'Severe impairment range',
      interpretation:
        'GCS 3-8 is commonly categorized as severe traumatic brain injury/marked impaired consciousness context. Escalate urgently when clinically indicated.',
      warnings: [
        'Airway, trauma, tox/metabolic, and neurologic emergencies require immediate clinical evaluation.',
      ],
      referenceLine,
    };
  }
  if (score <= 12) {
    return {
      riskCategory: 'moderate',
      severity: 'warning',
      label: 'Moderate impairment range',
      interpretation:
        'GCS 9-12 is commonly categorized as moderate impairment. Trend serial exams and interpret with cause, sedation, intoxication, and intubation status.',
      warnings: ['A single GCS does not diagnose cause or determine imaging/treatment by itself.'],
      referenceLine,
    };
  }
  return {
    riskCategory: 'mild',
    severity: 'normal',
    label: 'Mild/no impairment range',
    interpretation:
      'GCS 13-15 is commonly categorized as mild impairment/no major depression of consciousness on this scale. It does not rule out serious pathology.',
    warnings: [
      'Normal or near-normal GCS does not exclude intracranial injury or evolving deterioration.',
    ],
    referenceLine,
  };
}

export function calculateCurb65Score(inputs) {
  return CURB65_CRITERIA_META.reduce((total, item) => total + (inputs[item.key] ? 1 : 0), 0);
}

export function interpretCurb65Score(score) {
  const referenceLine =
    'Lim WS, et al. Thorax. 2003;58:377-382; British Thoracic Society CAP guideline.';
  if (score >= 3) {
    return {
      riskCategory: 'high',
      severity: 'critical',
      label: 'High severity range',
      interpretation:
        'CURB-65 score 3-5 is a high-severity range in validation/guideline use and should prompt urgent senior review and site-of-care assessment.',
      warnings: [
        'CURB-65 does not diagnose pneumonia and does not replace sepsis or respiratory failure pathways.',
      ],
      referenceLine,
    };
  }
  if (score === 2) {
    return {
      riskCategory: 'moderate',
      severity: 'warning',
      label: 'Moderate severity range',
      interpretation:
        'CURB-65 score 2 is an intermediate range; clinical review and local CAP pathways determine monitoring and disposition.',
      warnings: [
        'Use alongside oxygenation, comorbidities, social context, imaging, and lab findings.',
      ],
      referenceLine,
    };
  }
  return {
    riskCategory: 'low',
    severity: 'normal',
    label: 'Lower severity range',
    interpretation:
      'CURB-65 score 0-1 is a lower severity range in the original rule, but does not by itself determine outpatient care.',
    warnings: [
      'Low CURB-65 does not rule out deterioration, sepsis, hypoxemia, or need for admission.',
    ],
    referenceLine,
  };
}

export function calculateApacheIIScore(inputs) {
  const requiredKeys = APACHE_II_COMPONENTS_META.map((row) => row.key);
  const selected = sumSelectedPoints(inputs, requiredKeys);
  const gcs = toNumber(inputs.gcs);
  if (selected === null || gcs === null || gcs < 3 || gcs > 15) return null;
  const creatinineBase = toNumber(inputs.creatinine) ?? 0;
  const renalAdjustment = inputs.acuteRenalFailure ? creatinineBase : 0;
  const gcsContribution = 15 - gcs;
  return {
    total: selected + renalAdjustment + gcsContribution,
    acutePhysiology:
      selected +
      renalAdjustment +
      gcsContribution -
      (toNumber(inputs.age) ?? 0) -
      (toNumber(inputs.chronicHealth) ?? 0),
    gcsContribution,
    renalAdjustment,
  };
}

export function validateApacheIIInputs(inputs) {
  const labelByKey = Object.fromEntries(
    APACHE_II_COMPONENTS_META.map((row) => [row.key, row.label]),
  );
  const required = validateRequiredSelections(
    inputs,
    APACHE_II_COMPONENTS_META.map((row) => row.key),
    labelByKey,
  );
  const errors = [...required.errors];
  const gcs = toNumber(inputs.gcs);
  if (gcs === null) errors.push('Enter Glasgow Coma Scale total.');
  else if (gcs < 3 || gcs > 15) errors.push('GCS total must be between 3 and 15.');
  return { ok: errors.length === 0, errors };
}

export function interpretApacheIIScore(score) {
  if (!Number.isFinite(score)) return null;
  const referenceLine = 'Knaus WA, et al. APACHE II. Crit Care Med. 1985;13(10):818-829.';
  if (score >= 30) {
    return {
      riskCategory: 'very_high',
      severity: 'critical',
      label: 'Very high severity score',
      interpretation:
        'APACHE II score >=30 is a very high severity range. Original mortality prediction is diagnosis-specific and not a standalone bedside disposition rule.',
      warnings: [
        'Do not use APACHE II alone for individual prognosis, code status, ICU triage, or treatment decisions.',
      ],
      referenceLine,
    };
  }
  if (score >= 20) {
    return {
      riskCategory: 'high',
      severity: 'critical',
      label: 'High severity score',
      interpretation:
        'APACHE II score 20-29 indicates substantial acute physiology burden in the original ICU severity system.',
      warnings: ['Interpret with diagnosis, lead-time bias, organ support, and local ICU context.'],
      referenceLine,
    };
  }
  if (score >= 10) {
    return {
      riskCategory: 'moderate',
      severity: 'warning',
      label: 'Moderate severity score',
      interpretation:
        'APACHE II score 10-19 reflects intermediate physiologic severity; trend and context are essential.',
      warnings: ['APACHE II is not a diagnostic test and does not recommend treatment.'],
      referenceLine,
    };
  }
  return {
    riskCategory: 'lower',
    severity: 'normal',
    label: 'Lower severity score',
    interpretation:
      'APACHE II score 0-9 is a lower range in the scoring system, but serious illness may still be present.',
    warnings: ['A low score does not exclude deterioration or need for ICU-level care.'],
    referenceLine,
  };
}

export function computeMewsBreakdown(raw) {
  const rr = toNumber(raw.respiratoryRate);
  const hr = toNumber(raw.heartRate);
  const sbp = toNumber(raw.systolicBp);
  const temp = toNumber(raw.temperature);
  const avpu = toNumber(raw.avpu);
  if ([rr, hr, sbp, temp, avpu].some((v) => v === null)) return null;
  const rrN = rr!;
  const hrN = hr!;
  const sbpN = sbp!;
  const tempN = temp!;
  return {
    respiratoryRate: rrN <= 8 || rrN >= 30 ? 3 : rrN >= 21 ? 2 : rrN >= 15 ? 1 : 0,
    heartRate: hrN <= 40 || hrN >= 130 ? 3 : hrN >= 111 ? 2 : hrN <= 50 || hrN >= 101 ? 1 : 0,
    systolicBp: sbpN <= 70 ? 3 : sbpN <= 80 || sbpN >= 200 ? 2 : sbpN <= 100 ? 1 : 0,
    temperature: tempN < 35 || tempN >= 38.5 ? 2 : 0,
    avpu,
  };
}

export function validateMewsInputs(raw) {
  const errors = [] as any[];
  const ranges: [string, string, number, number][] = [
    ['respiratoryRate', 'respiratory rate', 0, 80],
    ['heartRate', 'heart rate', 20, 250],
    ['systolicBp', 'systolic blood pressure', 40, 300],
    ['temperature', 'temperature', 30, 43],
  ];
  for (const [key, label, min, max] of ranges) {
    const value = toNumber(raw[key]);
    if (value === null) errors.push(`Enter ${label}.`);
    else if (value < min || value > max)
      errors.push(`${label} should be between ${min} and ${max}.`);
  }
  if (toNumber(raw.avpu) === null) errors.push('Select AVPU consciousness level.');
  return { ok: errors.length === 0, errors };
}

export function sumMewsScore(breakdown) {
  if (!breakdown) return null;
  return Object.values(breakdown).reduce<number>((sum, value) => sum + (value as number), 0);
}

export function interpretMewsScore(score) {
  const referenceLine = 'Subbe CP, et al. QJM. 2001;94(10):521-526.';
  if (score >= 5) {
    return {
      riskCategory: 'high',
      severity: 'critical',
      label: 'High MEWS range',
      interpretation:
        'MEWS >=5 is commonly treated as a high early-warning range requiring urgent clinical review per local escalation policy.',
      warnings: [
        'MEWS does not diagnose sepsis, shock, respiratory failure, or any specific condition.',
      ],
      referenceLine,
    };
  }
  if (score >= 3) {
    return {
      riskCategory: 'medium',
      severity: 'warning',
      label: 'Moderate MEWS range',
      interpretation:
        'MEWS 3-4 suggests increased deterioration concern and should prompt reassessment and escalation according to local policy.',
      warnings: [
        'Single abnormal vital signs may still require urgent action even if total score is lower.',
      ],
      referenceLine,
    };
  }
  return {
    riskCategory: 'low',
    severity: 'normal',
    label: 'Lower MEWS range',
    interpretation:
      'MEWS 0-2 is a lower early-warning range, but trend and clinical context remain essential.',
    warnings: ['A low MEWS does not rule out serious illness or impending deterioration.'],
    referenceLine,
  };
}

export function computeRevisedTraumaScore(raw) {
  const gcs = toNumber(raw.gcs);
  const sbp = toNumber(raw.systolicBp);
  const rr = toNumber(raw.respiratoryRate);
  if ([gcs, sbp, rr].some((v) => v === null)) return null;
  const gcsN = gcs!;
  const sbpN2 = sbp!;
  const rrN2 = rr!;
  const gcsCode = gcsN >= 13 ? 4 : gcsN >= 9 ? 3 : gcsN >= 6 ? 2 : gcsN >= 4 ? 1 : 0;
  const sbpCode = sbpN2 > 89 ? 4 : sbpN2 >= 76 ? 3 : sbpN2 >= 50 ? 2 : sbpN2 >= 1 ? 1 : 0;
  const rrCode = rrN2 >= 10 && rrN2 <= 29 ? 4 : rrN2 > 29 ? 3 : rrN2 >= 6 ? 2 : rrN2 >= 1 ? 1 : 0;
  const weighted = Number((0.9368 * gcsCode + 0.7326 * sbpCode + 0.2908 * rrCode).toFixed(4));
  return { weighted, gcsCode, sbpCode, rrCode, unweighted: gcsCode + sbpCode + rrCode };
}

export function validateRtsInputs(raw) {
  const errors = [] as any[];
  const gcs = toNumber(raw.gcs);
  const sbp = toNumber(raw.systolicBp);
  const rr = toNumber(raw.respiratoryRate);
  if (gcs === null) errors.push('Enter GCS total.');
  else if (gcs < 3 || gcs > 15) errors.push('GCS total must be between 3 and 15.');
  if (sbp === null) errors.push('Enter systolic blood pressure.');
  else if (sbp < 0 || sbp > 300) errors.push('Systolic BP should be between 0 and 300 mmHg.');
  if (rr === null) errors.push('Enter respiratory rate.');
  else if (rr < 0 || rr > 80) errors.push('Respiratory rate should be between 0 and 80/min.');
  return { ok: errors.length === 0, errors };
}

export function interpretRevisedTraumaScore(weighted) {
  const referenceLine = 'Champion HR, et al. J Trauma. 1989;29(5):623-629.';
  if (!Number.isFinite(weighted)) return null;
  if (weighted < 4) {
    return {
      riskCategory: 'critical',
      severity: 'critical',
      label: 'Very low RTS',
      interpretation:
        'Weighted RTS below 4 indicates very severe physiologic derangement in trauma scoring context.',
      warnings: [
        'Trauma resuscitation and transfer decisions must follow local trauma-system protocols.',
      ],
      referenceLine,
    };
  }
  if (weighted < 6) {
    return {
      riskCategory: 'high',
      severity: 'critical',
      label: 'Low RTS',
      interpretation:
        'Weighted RTS below 6 indicates high physiologic concern and should be interpreted with mechanism and injuries.',
      warnings: [
        'RTS is not a substitute for primary survey, imaging, or trauma team activation criteria.',
      ],
      referenceLine,
    };
  }
  if (weighted < 7.84) {
    return {
      riskCategory: 'moderate',
      severity: 'warning',
      label: 'Reduced RTS',
      interpretation:
        'Weighted RTS is reduced from the maximum value, indicating at least one abnormal coded physiologic component.',
      warnings: ['Serial reassessment is important because trauma physiology can deteriorate.'],
      referenceLine,
    };
  }
  return {
    riskCategory: 'maximal',
    severity: 'normal',
    label: 'Maximum RTS',
    interpretation:
      'Weighted RTS is at the maximum coded value for GCS, systolic BP, and respiratory rate.',
    warnings: ['Maximum RTS does not exclude significant injury.'],
    referenceLine,
  };
}

export function calculatePewsScore(inputs) {
  return sumSelectedPoints(
    inputs,
    PEWS_DIMENSIONS_META.map((row) => row.key),
  );
}

export function interpretPewsScore(score) {
  const referenceLine = 'Monaghan A. Arch Dis Child. 2005;90:297-301 (Brighton PEWS).';
  if (!Number.isFinite(score)) return null;
  if (score >= 4) {
    return {
      riskCategory: 'high',
      severity: 'critical',
      label: 'High pediatric early-warning range',
      interpretation:
        'PEWS >=4 is commonly used as a high concern trigger for urgent pediatric reassessment/escalation in Brighton-style PEWS workflows.',
      warnings: [PEDIATRIC_CAUTION],
      referenceLine,
    };
  }
  if (score === 3) {
    return {
      riskCategory: 'medium',
      severity: 'warning',
      label: 'Escalation threshold range',
      interpretation:
        'PEWS 3 is a common escalation threshold in Brighton-style PEWS workflows and should prompt clinician review per local policy.',
      warnings: [PEDIATRIC_CAUTION],
      referenceLine,
    };
  }
  return {
    riskCategory: 'low',
    severity: 'normal',
    label: 'Lower pediatric early-warning range',
    interpretation:
      'PEWS 0-2 is a lower range, but pediatric deterioration can be rapid and trend/context are essential.',
    warnings: [PEDIATRIC_CAUTION],
    referenceLine,
  };
}
