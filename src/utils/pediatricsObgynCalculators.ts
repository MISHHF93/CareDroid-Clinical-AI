/**
 * Pediatrics and OB-GYN calculator helpers.
 *
 * Deterministic decision support only. These helpers do not diagnose pediatric
 * or obstetric conditions, do not recommend treatment or disposition, and do
 * not calculate medication doses unless a governed institutional protocol is
 * explicitly in scope.
 */

export const PEDIATRICS_OBGYN_SAFETY_DISCLAIMER =
  'Pediatric and OB-GYN safety support. Use validated source charts, local protocols, and clinician judgment; do not delay urgent maternal, fetal, neonatal, pediatric, sepsis, trauma, airway, or emergency pathways to complete this tool.';

export const PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER =
  'Pediatric dose safety checker placeholder only. This build does not calculate mg/kg doses, dose ranges, infusion rates, maximum doses, or medication recommendations. Use governed institutional dosing references, pharmacy review, and local policy.';

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function parseIsoDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

function diffDays(start, end) {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

export function formatGestationalAge(totalDays) {
  if (!Number.isFinite(totalDays)) return null;
  const rounded = Math.round(totalDays);
  return {
    totalDays: rounded,
    weeks: Math.floor(rounded / 7),
    days: rounded % 7,
    label: `${Math.floor(rounded / 7)}w ${rounded % 7}d`,
  };
}

function result(label, interpretation, severity, referenceLine, extra: any = {}) {
  return {
    ok: true,
    label,
    interpretation,
    severity,
    referenceLine,
    disclaimer: PEDIATRICS_OBGYN_SAFETY_DISCLAIMER,
    ...extra,
  };
}

export function computePregnancyDueDate(raw) {
  const method = raw.method || 'lmp';
  const errors = [] as any[];
  let edd: Date | null = null;
  let anchorLabel = '';

  if (method === 'lmp') {
    const lmp = parseIsoDate(raw.lmpDate);
    if (!lmp) errors.push('Enter a valid last menstrual period date.');
    if (lmp) {
      edd = addDays(lmp, 280);
      anchorLabel = 'LMP + 280 days';
    }
  } else if (method === 'conception') {
    const conception = parseIsoDate(raw.conceptionDate);
    if (!conception) errors.push('Enter a valid conception or ovulation date.');
    if (conception) {
      edd = addDays(conception, 266);
      anchorLabel = 'Conception/ovulation + 266 days';
    }
  } else if (method === 'ultrasound') {
    const ultrasoundDate = parseIsoDate(raw.ultrasoundDate);
    const weeks = toNumber(raw.ultrasoundWeeks);
    const days = toNumber(raw.ultrasoundDays || 0);
    if (!ultrasoundDate) errors.push('Enter a valid ultrasound date.');
    if (!Number.isFinite(weeks) || weeks < 4 || weeks > 42) {
      errors.push('Enter ultrasound gestational age weeks from 4 to 42.');
    }
    if (!Number.isFinite(days) || days < 0 || days > 6) {
      errors.push('Enter ultrasound gestational age days from 0 to 6.');
    }
    if (ultrasoundDate && errors.length === 0) {
      edd = addDays(ultrasoundDate, 280 - (weeks * 7 + days));
      anchorLabel = 'Ultrasound dating';
    }
  } else {
    errors.push('Select a due-date method.');
  }

  if (errors.length) return { ok: false, errors };

  return result(
    `EDD ${formatIsoDate(edd)}`,
    'Estimated due date is a dating aid for obstetric documentation. Reconcile against first-trimester ultrasound, cycle reliability, assisted reproduction dates, and local ACOG dating policy.',
    'normal',
    'ACOG Committee Opinion No. 700: Methods for Estimating the Due Date. Obstet Gynecol. 2017.',
    {
      edd: formatIsoDate(edd),
      anchorLabel,
      score: formatIsoDate(edd),
    }
  );
}

export function computeGestationalAge(raw) {
  const asOfDate = parseIsoDate(raw.asOfDate);
  const errors = [] as any[];
  if (!asOfDate) errors.push('Enter a valid assessment date.');
  const dueDateResult = computePregnancyDueDate(raw);
  if (!dueDateResult.ok) errors.push(...dueDateResult.errors);
  if (errors.length) return { ok: false, errors };

  const edd = parseIsoDate(dueDateResult.edd);
  const remainingDays = diffDays(asOfDate!, edd!);
  const gestationalAge = formatGestationalAge(280 - remainingDays);
  if (!gestationalAge) return { ok: false, errors: ['Unable to compute gestational age.'] };
  const severity =
    gestationalAge.totalDays < 259 ? 'warning' : gestationalAge.totalDays > 294 ? 'warning' : 'normal';

  return result(
    `Gestational age ${gestationalAge.label}`,
    'Gestational age is calculated from the selected dating anchor. Confirm dating hierarchy and reconcile discrepancies using local obstetric policy.',
    severity,
    'ACOG Committee Opinion No. 700: Methods for Estimating the Due Date. Obstet Gynecol. 2017.',
    {
      score: gestationalAge.label,
      gestationalAge,
      edd: dueDateResult.edd,
      components: {
        estimatedDueDate: dueDateResult.edd,
        assessmentDate: formatIsoDate(asOfDate),
        datingMethod: dueDateResult.anchorLabel,
      },
    }
  );
}

function pediatricBpThresholds(ageYears) {
  if (ageYears >= 13) {
    return { elevatedSbp: 120, elevatedDbp: 80, stage1Sbp: 130, stage1Dbp: 80, stage2Sbp: 140, stage2Dbp: 90 };
  }
  const age = Math.max(1, Math.min(12, ageYears));
  const elevatedSbp = 95 + age * 2;
  const elevatedDbp = 55 + Math.floor(age / 2);
  return {
    elevatedSbp,
    elevatedDbp,
    stage1Sbp: Math.max(elevatedSbp + 5, 130),
    stage1Dbp: Math.max(elevatedDbp + 5, 80),
    stage2Sbp: Math.max(elevatedSbp + 17, 140),
    stage2Dbp: Math.max(elevatedDbp + 17, 90),
  };
}

export function computePediatricBpPercentile(raw) {
  const ageYears = toNumber(raw.ageYears);
  const systolic = toNumber(raw.systolic);
  const diastolic = toNumber(raw.diastolic);
  const errors = [] as any[];
  if (!Number.isFinite(ageYears) || ageYears < 1 || ageYears > 17) errors.push('Enter age from 1 to 17 years.');
  if (!Number.isFinite(systolic) || systolic < 40 || systolic > 260) errors.push('Enter systolic BP from 40 to 260 mmHg.');
  if (!Number.isFinite(diastolic) || diastolic < 20 || diastolic > 160) errors.push('Enter diastolic BP from 20 to 160 mmHg.');
  if (!['female', 'male'].includes(raw.sex)) errors.push('Select sex assigned at birth for source-table context.');
  if (errors.length) return { ok: false, errors };

  const thresholds = pediatricBpThresholds(ageYears);
  let band = '<90th percentile screening range';
  let severity = 'normal';
  if (systolic >= thresholds.stage2Sbp || diastolic >= thresholds.stage2Dbp) {
    band = 'stage 2 hypertension range';
    severity = 'critical';
  } else if (systolic >= thresholds.stage1Sbp || diastolic >= thresholds.stage1Dbp) {
    band = 'stage 1 hypertension range';
    severity = 'warning';
  } else if (systolic >= thresholds.elevatedSbp || diastolic >= thresholds.elevatedDbp) {
    band = '>=90th percentile/elevated screening range';
    severity = 'warning';
  }

  return result(
    band,
    'This helper provides a pediatric BP screening band and does not diagnose hypertension. Confirm with correct cuff size, repeat manual measurements, height percentile/source tables, and local pediatric guidance.',
    severity,
    'Flynn JT, et al. Clinical Practice Guideline for Screening and Management of High Blood Pressure in Children and Adolescents. Pediatrics. 2017.',
    {
      score: band,
      components: {
        ageYears,
        sex: raw.sex,
        systolic,
        diastolic,
        screeningThresholds: thresholds,
      },
    }
  );
}

function classifyGrowthPercentile(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  if (value < 3) return { label: '<3rd percentile', severity: 'critical' };
  if (value < 10) return { label: '3rd to <10th percentile', severity: 'warning' };
  if (value <= 90) return { label: '10th to 90th percentile', severity: 'normal' };
  if (value <= 97) return { label: '>90th to 97th percentile', severity: 'warning' };
  return { label: '>97th percentile', severity: 'warning' };
}

export function computeFentonGrowthChartHelper(raw) {
  const gestationalAgeWeeks = toNumber(raw.gestationalAgeWeeks);
  const weightPercentile = toNumber(raw.weightPercentile);
  const lengthPercentile = toNumber(raw.lengthPercentile);
  const headPercentile = toNumber(raw.headCircumferencePercentile);
  const errors = [] as any[];
  if (!Number.isFinite(gestationalAgeWeeks) || gestationalAgeWeeks < 22 || gestationalAgeWeeks > 50) {
    errors.push('Enter gestational/postmenstrual age from 22 to 50 weeks.');
  }
  const entries: [string, number][] = [
    ['weight', weightPercentile],
    ['length', lengthPercentile],
    ['head circumference', headPercentile],
  ];
  for (const [label, value] of entries) {
    if (!Number.isFinite(value) || value < 0 || value > 100) errors.push(`Enter ${label} percentile from 0 to 100.`);
  }
  if (errors.length) return { ok: false, errors };

  const classifications = {
    weight: classifyGrowthPercentile(weightPercentile),
    length: classifyGrowthPercentile(lengthPercentile),
    headCircumference: classifyGrowthPercentile(headPercentile),
  };
  const severities = Object.values(classifications).map((row) => row?.severity);
  const severity = severities.includes('critical') ? 'critical' : severities.includes('warning') ? 'warning' : 'normal';
  const label =
    weightPercentile < 10 ? 'Small-for-gestational-age weight band' : weightPercentile > 90 ? 'Large-for-gestational-age weight band' : 'Appropriate-for-gestational-age weight band';

  return result(
    label,
    'Fenton helper classifies already-derived growth chart percentiles. Use the official Fenton/INTERGROWTH chart, corrected gestational age, measurement quality, and neonatal team review for clinical decisions.',
    severity,
    'Fenton TR, Kim JH. A systematic review and meta-analysis to revise the Fenton growth chart for preterm infants. BMC Pediatr. 2013.',
    {
      score: label,
      components: {
        gestationalAgeWeeks,
        weight: classifications.weight?.label,
        length: classifications.length?.label,
        headCircumference: classifications.headCircumference?.label,
      },
    }
  );
}

export function computeNeonatalBilirubinRiskHelper(raw) {
  const ageHours = toNumber(raw.ageHours);
  const bilirubin = toNumber(raw.bilirubin);
  const gestationalAgeWeeks = toNumber(raw.gestationalAgeWeeks);
  const errors = [] as any[];
  if (!Number.isFinite(ageHours) || ageHours < 0 || ageHours > 336) errors.push('Enter age from 0 to 336 hours.');
  if (!Number.isFinite(bilirubin) || bilirubin < 0 || bilirubin > 50) errors.push('Enter bilirubin from 0 to 50 mg/dL.');
  if (!Number.isFinite(gestationalAgeWeeks) || gestationalAgeWeeks < 35 || gestationalAgeWeeks > 44) {
    errors.push('Enter gestational age from 35 to 44 weeks for AAP 2022 term/late-preterm context.');
  }
  if (!['yes', 'no'].includes(raw.neurotoxicityRiskFactors)) {
    errors.push('Select whether neurotoxicity risk factors are present.');
  }
  if (errors.length) return { ok: false, errors };

  const riskFactors = raw.neurotoxicityRiskFactors === 'yes';
  let severity = 'normal';
  let label = 'Nomogram review needed';
  if (ageHours < 24 || bilirubin >= 20 || riskFactors) {
    severity = 'warning';
    label = 'Higher-priority bilirubin review';
  }
  if (bilirubin >= 25 || (ageHours < 24 && bilirubin >= 10)) {
    severity = 'critical';
    label = 'Urgent bilirubin pathway review';
  }

  return result(
    label,
    'This helper does not recommend phototherapy, exchange transfusion, or disposition. Plot bilirubin by age in hours against the AAP 2022 nomogram or local governed tool, account for gestational age and neurotoxicity risk factors, and involve neonatal clinicians per protocol.',
    severity,
    'Kemper AR, et al. Clinical Practice Guideline Revision: Management of Hyperbilirubinemia in the Newborn Infant 35 or More Weeks of Gestation. Pediatrics. 2022.',
    {
      score: label,
      components: {
        ageHours,
        bilirubinMgDl: bilirubin,
        gestationalAgeWeeks,
        neurotoxicityRiskFactors: riskFactors ? 'present' : 'not selected',
      },
    }
  );
}

export function computePediatricDoseSafetyCheckerPlaceholder(raw) {
  const medicationName = String(raw.medicationName || '').trim();
  const weightKg = toNumber(raw.weightKg);
  const governedProtocol = raw.governedProtocol || '';
  const errors = [] as any[];
  if (!medicationName) errors.push('Enter medication name or class for documentation context.');
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 250) errors.push('Enter weight from >0 to 250 kg.');
  if (!['yes', 'no'].includes(governedProtocol)) errors.push('Select whether a governed dosing protocol is available.');
  if (errors.length) return { ok: false, errors };

  const severity = governedProtocol === 'yes' ? 'warning' : 'critical';
  const label = governedProtocol === 'yes' ? 'Protocol-governed review required' : 'Dose calculation blocked';

  return {
    ok: true,
    score: label,
    label,
    severity,
    interpretation:
      'No medication dose was calculated. Use the governed pediatric dosing reference, verify weight units, indication, renal/hepatic context, concentration, maximum dose, route, frequency, allergies, and independent pharmacy/nursing checks.',
    referenceLine:
      'AAP policy and institutional medication safety programs emphasize weight-based pediatric medication safety, independent verification, and local protocol governance.',
    disclaimer: PEDIATRIC_DOSING_PLACEHOLDER_DISCLAIMER,
    components: {
      medicationName,
      weightKg,
      governedProtocol: governedProtocol === 'yes' ? 'available' : 'not available',
    },
  };
}
