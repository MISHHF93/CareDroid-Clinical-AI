/**
 * Pulmonology Clinical Tools Pack calculator helpers.
 *
 * These helpers provide deterministic scoring and documentation context only.
 * They do not diagnose respiratory failure, pneumonia, asthma, COPD, or sleep
 * apnea, and they do not recommend oxygen, ventilator, medication, or
 * disposition changes.
 */

export const PULMONOLOGY_SAFETY_DISCLAIMER =
  'Clinical decision support only. Follow local respiratory, oxygen, ventilator, sepsis, pneumonia, asthma, COPD, and sleep pathways; do not delay urgent care to complete this tool.';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function inRange(value, min, max) {
  return Number.isFinite(value) && value >= min && value <= max;
}

function severityForBand(band) {
  if (band === 'critical' || band === 'very_high' || band === 'severe') return 'critical';
  if (band === 'warning' || band === 'high' || band === 'intermediate' || band === 'moderate')
    return 'warning';
  return 'normal';
}

export function validateBodeIndexInputs(raw) {
  const values = {
    bmi: toNumber(raw.bmi),
    fev1PctPredicted: toNumber(raw.fev1PctPredicted),
    sixMinuteWalkMeters: toNumber(raw.sixMinuteWalkMeters),
    mmrcDyspnea: toNumber(raw.mmrcDyspnea),
  };
  const errors = [] as any[];
  if (!inRange(values.bmi, 8, 80)) errors.push('Enter BMI from 8 to 80 kg/m2.');
  if (!inRange(values.fev1PctPredicted, 1, 150))
    errors.push('Enter FEV1 percent predicted from 1 to 150.');
  if (!inRange(values.sixMinuteWalkMeters, 0, 800))
    errors.push('Enter 6-minute walk distance from 0 to 800 meters.');
  if (!inRange(values.mmrcDyspnea, 0, 4)) errors.push('Select mMRC dyspnea grade 0 to 4.');
  return { ok: errors.length === 0, errors, values };
}

export function computeBodeIndex(raw) {
  const validation = validateBodeIndexInputs(raw);
  if (!validation.ok) return { ok: false as const, errors: validation.errors };
  const { bmi, fev1PctPredicted, sixMinuteWalkMeters, mmrcDyspnea } = validation.values;
  const fev1Points =
    fev1PctPredicted >= 65 ? 0 : fev1PctPredicted >= 50 ? 1 : fev1PctPredicted >= 36 ? 2 : 3;
  const walkPoints =
    sixMinuteWalkMeters >= 350
      ? 0
      : sixMinuteWalkMeters >= 250
        ? 1
        : sixMinuteWalkMeters >= 150
          ? 2
          : 3;
  const dyspneaPoints = mmrcDyspnea <= 1 ? 0 : mmrcDyspnea === 2 ? 1 : mmrcDyspnea === 3 ? 2 : 3;
  const bmiPoints = bmi > 21 ? 0 : 1;
  const totalScore = fev1Points + walkPoints + dyspneaPoints + bmiPoints;
  const riskBand =
    totalScore >= 7
      ? 'very_high'
      : totalScore >= 5
        ? 'high'
        : totalScore >= 3
          ? 'intermediate'
          : 'low';
  return {
    ok: true as const,
    totalScore,
    riskBand,
    severity: severityForBand(riskBand),
    label:
      riskBand === 'very_high'
        ? 'Very high BODE index band'
        : riskBand === 'high'
          ? 'High BODE index band'
          : riskBand === 'intermediate'
            ? 'Intermediate BODE index band'
            : 'Lower BODE index band',
    interpretation:
      'BODE combines body mass index, airflow obstruction, dyspnea, and exercise capacity for COPD prognosis context. Use with spirometry quality, exacerbation history, comorbidities, and clinician review.',
    breakdown: { bmiPoints, fev1Points, walkPoints, dyspneaPoints },
    inputs: validation.values,
    referenceLine:
      'Celli BR, Cote CG, Marin JM, et al. The body-mass index, airflow obstruction, dyspnea, and exercise capacity index in COPD. N Engl J Med. 2004;350:1005-1012.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} BODE does not diagnose COPD or recommend inhalers, oxygen, pulmonary rehab, transplant referral, or admission.`,
  };
}

export function computeCopdGoldAssessment(raw) {
  const mmrcGrade =
    raw.mmrcGrade === '' || raw.mmrcGrade === undefined ? NaN : toNumber(raw.mmrcGrade);
  const catScore = raw.catScore === '' || raw.catScore === undefined ? NaN : toNumber(raw.catScore);
  const moderateExacerbations = toNumber(raw.moderateExacerbations);
  const severeExacerbations = toNumber(raw.severeExacerbations);
  const fev1PctPredicted =
    raw.fev1PctPredicted === '' || raw.fev1PctPredicted === undefined
      ? NaN
      : toNumber(raw.fev1PctPredicted);
  const errors = [] as any[];
  if (!Number.isFinite(mmrcGrade) && !Number.isFinite(catScore)) {
    errors.push('Enter either mMRC dyspnea grade or CAT score.');
  }
  if (Number.isFinite(mmrcGrade) && !inRange(mmrcGrade, 0, 4)) errors.push('mMRC must be 0 to 4.');
  if (Number.isFinite(catScore) && !inRange(catScore, 0, 40))
    errors.push('CAT score must be 0 to 40.');
  if (!inRange(moderateExacerbations, 0, 20))
    errors.push('Enter moderate exacerbations from 0 to 20.');
  if (!inRange(severeExacerbations, 0, 20))
    errors.push('Enter severe exacerbations or hospitalizations from 0 to 20.');
  if (Number.isFinite(fev1PctPredicted) && !inRange(fev1PctPredicted, 1, 150))
    errors.push('Optional FEV1 percent predicted must be 1 to 150.');
  if (errors.length) return { ok: false as const, errors };

  const moreSymptoms =
    (Number.isFinite(catScore) && catScore >= 10) || (Number.isFinite(mmrcGrade) && mmrcGrade >= 2);
  const highExacerbationRisk = moderateExacerbations >= 2 || severeExacerbations >= 1;
  const group = highExacerbationRisk ? 'E' : moreSymptoms ? 'B' : 'A';
  const spirometricGrade = !Number.isFinite(fev1PctPredicted)
    ? null
    : fev1PctPredicted >= 80
      ? 'GOLD 1'
      : fev1PctPredicted >= 50
        ? 'GOLD 2'
        : fev1PctPredicted >= 30
          ? 'GOLD 3'
          : 'GOLD 4';

  return {
    ok: true as const,
    group,
    symptomBurden: moreSymptoms ? 'more' : 'fewer',
    exacerbationRisk: highExacerbationRisk ? 'high' : 'low',
    spirometricGrade,
    severity: group === 'E' ? 'warning' : 'normal',
    label: `GOLD Group ${group} context`,
    interpretation: `Inputs support GOLD Group ${group} using symptoms and exacerbation history. Spirometric grade is ${spirometricGrade || 'not entered'}.`,
    inputs: { mmrcGrade, catScore, moderateExacerbations, severeExacerbations, fev1PctPredicted },
    referenceLine:
      'Global Initiative for Chronic Obstructive Lung Disease (GOLD). Global Strategy for Prevention, Diagnosis and Management of COPD.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} GOLD grouping does not diagnose COPD, replace post-bronchodilator spirometry, or recommend inhalers, antibiotics, steroids, oxygen, or disposition.`,
  };
}

export function computeAaGradient(raw) {
  const ageYears = toNumber(raw.ageYears);
  const fio2Pct = toNumber(raw.fio2Pct);
  const pao2MmHg = toNumber(raw.pao2MmHg);
  const paco2MmHg = toNumber(raw.paco2MmHg);
  const atmosphericPressureMmHg = raw.atmosphericPressureMmHg
    ? toNumber(raw.atmosphericPressureMmHg)
    : 760;
  const respiratoryQuotient = raw.respiratoryQuotient ? toNumber(raw.respiratoryQuotient) : 0.8;
  const errors = [] as any[];
  if (!inRange(ageYears, 0, 120)) errors.push('Enter age from 0 to 120 years.');
  if (!inRange(fio2Pct, 21, 100)) errors.push('Enter FiO2 from 21% to 100%.');
  if (!inRange(pao2MmHg, 20, 700)) errors.push('Enter PaO2 from 20 to 700 mmHg.');
  if (!inRange(paco2MmHg, 10, 120)) errors.push('Enter PaCO2 from 10 to 120 mmHg.');
  if (!inRange(atmosphericPressureMmHg, 400, 800))
    errors.push('Atmospheric pressure must be 400 to 800 mmHg.');
  if (!inRange(respiratoryQuotient, 0.6, 1.2))
    errors.push('Respiratory quotient must be 0.6 to 1.2.');
  if (errors.length) return { ok: false as const, errors };

  const alveolarOxygen =
    (fio2Pct / 100) * (atmosphericPressureMmHg - 47) - paco2MmHg / respiratoryQuotient;
  const gradient = alveolarOxygen - pao2MmHg;
  const expectedUpperLimit = ageYears / 4 + 4;
  const elevated = gradient > expectedUpperLimit;
  return {
    ok: true as const,
    alveolarOxygen: Number(alveolarOxygen.toFixed(1)),
    gradient: Number(gradient.toFixed(1)),
    expectedUpperLimit: Number(expectedUpperLimit.toFixed(1)),
    severity: elevated ? 'warning' : 'normal',
    label: elevated ? 'Elevated A-a gradient context' : 'Expected A-a gradient context',
    interpretation: elevated
      ? 'The calculated A-a gradient is above the age-adjusted expected upper limit. Interpret with ABG quality, FiO2 accuracy, altitude, and clinical context.'
      : 'The calculated A-a gradient is within the age-adjusted expected range for entered assumptions.',
    referenceLine:
      'Alveolar gas equation: PAO2 = FiO2 x (Patm - PH2O) - PaCO2/RQ; common age-adjusted upper limit approximates age/4 + 4 mmHg.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} A-a gradient does not diagnose PE, shunt, V/Q mismatch, or respiratory failure.`,
  };
}

export function computePao2Fio2Ratio(raw) {
  const pao2MmHg = toNumber(raw.pao2MmHg);
  const fio2Pct = toNumber(raw.fio2Pct);
  const errors = [] as any[];
  if (!inRange(pao2MmHg, 20, 700)) errors.push('Enter PaO2 from 20 to 700 mmHg.');
  if (!inRange(fio2Pct, 21, 100)) errors.push('Enter FiO2 from 21% to 100%.');
  if (errors.length) return { ok: false as const, errors };
  const ratio = pao2MmHg / (fio2Pct / 100);
  const band =
    ratio <= 100
      ? 'severe'
      : ratio <= 200
        ? 'moderate'
        : ratio <= 300
          ? 'mild'
          : 'above_ards_threshold';
  return {
    ok: true as const,
    ratio: Number(ratio.toFixed(0)),
    riskBand: band,
    severity: severityForBand(band),
    label:
      band === 'severe'
        ? 'Severe oxygenation impairment threshold'
        : band === 'moderate'
          ? 'Moderate oxygenation impairment threshold'
          : band === 'mild'
            ? 'Mild oxygenation impairment threshold'
            : 'Above ARDS oxygenation threshold',
    interpretation:
      'PaO2/FiO2 ratio summarizes oxygenation relative to inspired oxygen. ARDS diagnosis requires timing, imaging, origin of edema, and PEEP/CPAP context, not this ratio alone.',
    referenceLine:
      'Berlin Definition of ARDS oxygenation thresholds: mild 201-300, moderate 101-200, severe <=100 with PEEP/CPAP requirements.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} Does not diagnose ARDS or recommend ventilator settings or escalation.`,
  };
}

export function computeRoxIndex(raw) {
  const spo2Pct = toNumber(raw.spo2Pct);
  const fio2Pct = toNumber(raw.fio2Pct);
  const respiratoryRate = toNumber(raw.respiratoryRate);
  const errors = [] as any[];
  if (!inRange(spo2Pct, 50, 100)) errors.push('Enter SpO2 from 50% to 100%.');
  if (!inRange(fio2Pct, 21, 100)) errors.push('Enter FiO2 from 21% to 100%.');
  if (!inRange(respiratoryRate, 4, 80))
    errors.push('Enter respiratory rate from 4 to 80 breaths/min.');
  if (errors.length) return { ok: false as const, errors };
  const rox = spo2Pct / (fio2Pct / 100) / respiratoryRate;
  const band = rox >= 4.88 ? 'reassuring' : rox >= 3.85 ? 'indeterminate' : 'concerning';
  return {
    ok: true as const,
    roxIndex: Number(rox.toFixed(2)),
    riskBand: band,
    severity: band === 'concerning' ? 'critical' : band === 'indeterminate' ? 'warning' : 'normal',
    label:
      band === 'reassuring'
        ? 'Higher ROX index context'
        : band === 'indeterminate'
          ? 'Intermediate ROX index context'
          : 'Lower ROX index context',
    interpretation:
      'ROX index is commonly used as a high-flow nasal cannula monitoring adjunct. Use serial trends and bedside assessment; a single value is not a disposition decision.',
    referenceLine:
      'Roca O, et al. ROX index to predict outcome of high-flow nasal cannula in pneumonia and acute hypoxemic respiratory failure cohorts.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} Does not determine intubation, NIV, ICU admission, or oxygen device changes.`,
  };
}

export function computePneumoniaSeverityIndex(raw) {
  const ageYears = toNumber(raw.ageYears);
  const sex = raw.sex;
  const errors = [] as any[];
  if (!inRange(ageYears, 0, 120)) errors.push('Enter age from 0 to 120 years.');
  if (!['female', 'male'].includes(sex)) errors.push('Select sex.');
  if (errors.length) return { ok: false as const, errors };
  let points = sex === 'female' ? ageYears - 10 : ageYears;
  const add = (condition, value) => {
    if (condition) points += value;
  };
  add(raw.nursingHomeResident, 10);
  add(raw.neoplasticDisease, 30);
  add(raw.liverDisease, 20);
  add(raw.congestiveHeartFailure, 10);
  add(raw.cerebrovascularDisease, 10);
  add(raw.renalDisease, 10);
  add(raw.alteredMentalStatus, 20);
  add(raw.respiratoryRate30OrMore, 20);
  add(raw.systolicBpUnder90, 20);
  add(raw.temperatureExtreme, 15);
  add(raw.pulse125OrMore, 10);
  add(raw.phUnder735, 30);
  add(raw.bun30OrMore, 20);
  add(raw.sodiumUnder130, 20);
  add(raw.glucose250OrMore, 10);
  add(raw.hematocritUnder30, 10);
  add(raw.pao2Under60, 10);
  add(raw.pleuralEffusion, 10);
  points = Math.max(0, Math.round(points));
  const hasRiskFactor = [
    raw.nursingHomeResident,
    raw.neoplasticDisease,
    raw.liverDisease,
    raw.congestiveHeartFailure,
    raw.cerebrovascularDisease,
    raw.renalDisease,
    raw.alteredMentalStatus,
    raw.respiratoryRate30OrMore,
    raw.systolicBpUnder90,
    raw.temperatureExtreme,
    raw.pulse125OrMore,
  ].some(Boolean);
  const riskClass =
    ageYears < 50 && !hasRiskFactor
      ? 'I'
      : points <= 70
        ? 'II'
        : points <= 90
          ? 'III'
          : points <= 130
            ? 'IV'
            : 'V';
  return {
    ok: true as const,
    points,
    riskClass,
    severity: riskClass === 'IV' || riskClass === 'V' ? 'warning' : 'normal',
    label: `PSI Risk Class ${riskClass}`,
    interpretation:
      'Pneumonia Severity Index estimates mortality risk in community-acquired pneumonia cohorts. It supports documentation and risk discussion but does not replace sepsis evaluation, oxygenation assessment, or clinician judgment.',
    referenceLine:
      'Fine MJ, Auble TE, Yealy DM, et al. A prediction rule to identify low-risk patients with community-acquired pneumonia. N Engl J Med. 1997;336:243-250.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} PSI does not diagnose pneumonia or recommend antibiotics, admission, ICU care, or discharge.`,
  };
}

export function computeAsthmaSeverityScore(raw) {
  const pefPctPersonalBest = toNumber(raw.pefPctPersonalBest);
  const spo2Pct = toNumber(raw.spo2Pct);
  const respiratoryRate = toNumber(raw.respiratoryRate);
  const errors = [] as any[];
  if (!inRange(pefPctPersonalBest, 0, 150))
    errors.push('Enter PEF percent personal best/predicted from 0 to 150.');
  if (!inRange(spo2Pct, 50, 100)) errors.push('Enter SpO2 from 50% to 100%.');
  if (!inRange(respiratoryRate, 4, 80))
    errors.push('Enter respiratory rate from 4 to 80 breaths/min.');
  if (errors.length) return { ok: false as const, errors };
  const lifeThreatening = Boolean(
    raw.silentChest || raw.alteredMentalStatus || raw.exhaustion || spo2Pct < 90,
  );
  const severe =
    lifeThreatening ||
    pefPctPersonalBest < 50 ||
    spo2Pct < 92 ||
    raw.speaksWordsOnly ||
    raw.accessoryMuscleUse;
  const moderate =
    !severe &&
    (pefPctPersonalBest < 80 || spo2Pct < 95 || raw.speaksPhrasesOnly || respiratoryRate >= 25);
  const band = lifeThreatening
    ? 'life_threatening'
    : severe
      ? 'severe'
      : moderate
        ? 'moderate'
        : 'mild';
  return {
    ok: true as const,
    riskBand: band,
    severity:
      band === 'life_threatening' || band === 'severe'
        ? 'critical'
        : band === 'moderate'
          ? 'warning'
          : 'normal',
    label:
      band === 'life_threatening'
        ? 'Life-threatening asthma features selected'
        : band === 'severe'
          ? 'Severe asthma exacerbation features selected'
          : band === 'moderate'
            ? 'Moderate asthma exacerbation features selected'
            : 'Mild asthma exacerbation context',
    interpretation:
      'This helper organizes common exacerbation severity features. Acute asthma severity is dynamic and requires repeated bedside reassessment.',
    referenceLine:
      'Severity bands summarize common acute asthma pathway features such as PEF, oxygen saturation, speech, accessory muscle use, exhaustion, altered mental status, and silent chest.',
    disclaimer: `${PULMONOLOGY_SAFETY_DISCLAIMER} Does not diagnose asthma or recommend bronchodilators, steroids, magnesium, NIV, intubation, discharge, or admission.`,
  };
}
