/**
 * GRACE 2.0 ACS admission risk — logistic mortality models (continuous admission variables).
 *
 * Coefficients align with the GRACE 2.0 admission models used in RiskScorescvd / GRACE publications
 * (Fox KAA et al.; GRACE Investigators. BMJ. 2006;332:1091–1100; updated GRACE 2.0 risk tools).
 *
 * Decision support only — not for treatment recommendations or ACS diagnosis.
 */

export const GRACE_MODEL_VERSION = '2.0-admission-logistic';

/** @typedef {'I' | 'II' | 'III' | 'IV'} GraceKillipClass */

/** @typedef {{
 *   ageYears: number,
 *   heartRateBpm: number,
 *   systolicBpMmHg: number,
 *   creatinineMgDl: number,
 *   killipClass: GraceKillipClass,
 *   cardiacArrestAtAdmission: boolean,
 *   stSegmentDeviation: boolean,
 *   elevatedCardiacEnzymes: boolean,
 * }} GraceAcsInputs */

const KILLIP_NUMERIC = { I: 1, II: 2, III: 3, IV: 4 };

/** In-hospital death (admission) model */
const IN_HOSPITAL = {
  intercept: -4.3602,
  age: 0.0529,
  heartRate: 0.0053,
  systolicBp: -0.0147,
  creatinine: 0.2144,
  killip: 0.632,
  cardiacArrest: 1.386,
  stDeviation: 0.389,
  elevatedEnzymes: 0.833,
};

/** Death from discharge to 6 months model */
const SIX_MONTH = {
  intercept: -7.7035,
  age: 0.0531,
  heartRate: 0.0087,
  systolicBp: -0.0168,
  creatinine: 0.1823,
  killip: 0.6931,
  cardiacArrest: 1.4586,
  stDeviation: 0.47,
  elevatedEnzymes: 0.8755,
};

/**
 * µmol/L ? mg/dL (creatinine).
 * @param {number} umolL
 */
export function creatinineUmolLToMgDl(umolL) {
  if (!Number.isFinite(umolL)) return NaN;
  return umolL / 88.4;
}

/**
 * @param {number} xb
 * @returns {number} probability 0–1
 */
export function logisticProbability(xb) {
  if (!Number.isFinite(xb)) return NaN;
  const expXb = Math.exp(xb);
  return expXb / (1 + expXb);
}

/**
 * @param {GraceAcsInputs} inputs
 * @param {typeof IN_HOSPITAL} model
 */
function buildLinearPredictor(inputs, model) {
  const killip = KILLIP_NUMERIC[inputs.killipClass];
  const ca = inputs.cardiacArrestAtAdmission ? 1 : 0;
  const st = inputs.stSegmentDeviation ? 1 : 0;
  const enzymes = inputs.elevatedCardiacEnzymes ? 1 : 0;

  return (
    model.intercept +
    model.age * inputs.ageYears +
    model.heartRate * inputs.heartRateBpm +
    model.systolicBp * inputs.systolicBpMmHg +
    model.creatinine * inputs.creatinineMgDl +
    model.killip * killip +
    model.cardiacArrest * ca +
    model.stDeviation * st +
    model.elevatedEnzymes * enzymes
  );
}

/**
 * @param {number} pct
 * @returns {'low' | 'intermediate' | 'high'}
 */
export function categorizeSixMonthMortalityPct(pct) {
  if (!Number.isFinite(pct)) return null;
  if (pct < 3) return 'low';
  if (pct <= 8) return 'intermediate';
  return 'high';
}

/**
 * @param {GraceAcsInputs} raw
 * @returns {{ valid: boolean, errors: string[], inputs?: GraceAcsInputs }}
 */
export function validateGraceAcsInputs(raw) {
  const errors = [] as any[];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing input object'] };
  }

  const ageYears = Number(raw.ageYears);
  if (!Number.isFinite(ageYears) || ageYears < 18 || ageYears > 120) {
    errors.push('Age must be between 18 and 120 years.');
  }

  const heartRateBpm = Number(raw.heartRateBpm);
  if (!Number.isFinite(heartRateBpm) || heartRateBpm < 20 || heartRateBpm > 300) {
    errors.push('Heart rate must be between 20 and 300 beats/min.');
  }

  const systolicBpMmHg = Number(raw.systolicBpMmHg);
  if (!Number.isFinite(systolicBpMmHg) || systolicBpMmHg < 50 || systolicBpMmHg > 300) {
    errors.push('Systolic blood pressure must be between 50 and 300 mmHg.');
  }

  const creatinineMgDl = Number(raw.creatinineMgDl);
  if (!Number.isFinite(creatinineMgDl) || creatinineMgDl <= 0 || creatinineMgDl > 25) {
    errors.push('Creatinine must be a positive value in mg/dL (typically = 25).');
  }

  const killipClass = raw.killipClass;
  if (!KILLIP_NUMERIC[killipClass]) {
    errors.push('Killip class must be I, II, III, or IV.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    inputs: {
      ageYears,
      heartRateBpm,
      systolicBpMmHg,
      creatinineMgDl,
      killipClass,
      cardiacArrestAtAdmission: Boolean(raw.cardiacArrestAtAdmission),
      stSegmentDeviation: Boolean(raw.stSegmentDeviation),
      elevatedCardiacEnzymes: Boolean(raw.elevatedCardiacEnzymes),
    },
  };
}

/**
 * @param {GraceAcsInputs} inputs
 * @returns {{
 *   modelVersion: string,
 *   inHospitalMortalityPct: number,
 *   sixMonthMortalityPct: number,
 *   sixMonthRiskCategory: 'low' | 'intermediate' | 'high',
 * }}
 */
export function computeGraceAcsRisk(inputs) {
  const xbInHosp = buildLinearPredictor(inputs, IN_HOSPITAL);
  const xbSixMo = buildLinearPredictor(inputs, SIX_MONTH);
  const inHospitalMortalityPct = logisticProbability(xbInHosp) * 100;
  const sixMonthMortalityPct = logisticProbability(xbSixMo) * 100;

  return {
    modelVersion: GRACE_MODEL_VERSION,
    inHospitalMortalityPct,
    sixMonthMortalityPct,
    sixMonthRiskCategory: categorizeSixMonthMortalityPct(sixMonthMortalityPct),
  };
}

/**
 * @param {{ inHospitalMortalityPct: number, sixMonthMortalityPct: number, sixMonthRiskCategory: string }} result
 */
export function interpretGraceAcsRisk(result) {
  if (!result || !Number.isFinite(result.sixMonthMortalityPct)) {
    return null;
  }

  const inHosp = result.inHospitalMortalityPct;
  const sixMo = result.sixMonthMortalityPct;
  const category = result.sixMonthRiskCategory;

  const categoryLabel =
    category === 'low'
      ? 'Low estimated risk (6-month mortality < 3%)'
      : category === 'intermediate'
        ? 'Intermediate estimated risk (6-month mortality 3–8%)'
        : 'High estimated risk (6-month mortality > 8%)';

  const severity =
    category === 'high' ? 'critical' : category === 'intermediate' ? 'warning' : 'normal';

  return {
    severity,
    label: categoryLabel,
    riskCategory: category,
    interpretation: `Estimated in-hospital mortality ˜ ${inHosp.toFixed(1)}%; estimated mortality from discharge to 6 months ˜ ${sixMo.toFixed(1)}% (${categoryLabel.toLowerCase()}). These are population-derived GRACE ACS prognostic estimates for shared decision-making and documentation — not a diagnosis and not a treatment directive.`,
    safetyDisclaimer:
      'GRACE ACS risk stratification supports prognosis discussion in suspected or confirmed ACS. It does not confirm or exclude acute coronary syndrome, does not replace serial ECGs, biomarkers, or imaging, and must not be used alone to withhold or initiate reperfusion, antithrombotic therapy, or invasive strategy. Apply local ACS pathways and clinician judgment.',
    pathwayDisclaimer:
      'Use local acute coronary syndrome protocols for diagnosis, reperfusion eligibility, antithrombotic choices, and disposition. Unstable ACS, STEMI, shock, or arrest require emergency pathways without delay. This tool does not recommend specific treatments or procedures.',
    referenceLine:
      'GRACE / GRACE 2.0 — Global Registry of Acute Coronary Events (Fox KAA et al., BMJ 2006; GRACE 2.0 risk models).',
  };
}
