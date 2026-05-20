/**
 * ABCD² score — short-term stroke risk after TIA (clinical decision support).
 *
 * Reference: Johnston SC, et al. Validation and refinement of predictive models
 * to determine risk of stroke in patients with TIA. Lancet. 2007;369(9558):283–292.
 */

export const ABCD2_STROKE_DISCLAIMER =
  'TIA / stroke risk stratification only. Does not diagnose stroke or TIA and does not recommend specific antithrombotic therapy, admission, or imaging. If acute stroke, crescendo symptoms, or new focal deficit is present, activate emergency stroke pathways immediately — do not delay urgent evaluation to complete scoring.';

/** @typedef {'other' | 'speech_disturbance' | 'unilateral_weakness'} Abcd2ClinicalFeature */

/** @typedef {'under_10' | 'ten_to_59' | 'sixty_plus'} Abcd2DurationBand */

/** @typedef {'low' | 'moderate' | 'high'} Abcd2RiskCategory */

export const ABCD2_CLINICAL_FEATURE_OPTIONS = Object.freeze([
  { value: 'other', label: 'Other / no weakness or speech disturbance', points: 0 },
  {
    value: 'speech_disturbance',
    label: 'Speech disturbance without unilateral weakness',
    points: 1,
  },
  { value: 'unilateral_weakness', label: 'Unilateral weakness', points: 2 },
]);

export const ABCD2_DURATION_OPTIONS = Object.freeze([
  { value: 'under_10', label: '< 10 minutes', points: 0 },
  { value: 'ten_to_59', label: '10–59 minutes', points: 1 },
  { value: 'sixty_plus', label: '≥ 60 minutes', points: 2 },
]);

/**
 * @param {number} systolicBpMmHg
 * @param {number} diastolicBpMmHg
 */
export function isAbcd2BloodPressureElevated(systolicBpMmHg, diastolicBpMmHg) {
  return systolicBpMmHg >= 140 || diastolicBpMmHg >= 90;
}

/**
 * @param {Abcd2ClinicalFeature} feature
 */
export function abcd2ClinicalFeaturePoints(feature) {
  const row = ABCD2_CLINICAL_FEATURE_OPTIONS.find((o) => o.value === feature);
  return row?.points ?? null;
}

/**
 * @param {Abcd2DurationBand} band
 */
export function abcd2DurationPoints(band) {
  const row = ABCD2_DURATION_OPTIONS.find((o) => o.value === band);
  return row?.points ?? null;
}

/**
 * @param {number} score 0–7
 * @returns {Abcd2RiskCategory | null}
 */
export function abcd2RiskCategoryFromScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 7) return null;
  if (score <= 3) return 'low';
  if (score <= 5) return 'moderate';
  return 'high';
}

/**
 * @param {{
 *   age60OrOlder?: boolean,
 *   systolicBpMmHg?: number,
 *   diastolicBpMmHg?: number,
 *   clinicalFeature?: Abcd2ClinicalFeature,
 *   durationBand?: Abcd2DurationBand,
 *   diabetes?: boolean,
 * }} raw
 */
export function calculateAbcd2Score(raw) {
  const clinicalPts = abcd2ClinicalFeaturePoints(raw.clinicalFeature);
  const durationPts = abcd2DurationPoints(raw.durationBand);
  const sbp = Number(raw.systolicBpMmHg);
  const dbp = Number(raw.diastolicBpMmHg);

  if (clinicalPts === null || durationPts === null) return null;
  if (!Number.isFinite(sbp) || !Number.isFinite(dbp) || sbp < 0 || dbp < 0) return null;

  let score = clinicalPts + durationPts;
  if (raw.age60OrOlder) score += 1;
  if (isAbcd2BloodPressureElevated(sbp, dbp)) score += 1;
  if (raw.diabetes) score += 1;

  return score;
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateAbcd2Inputs(raw) {
  const errors = [];
  const sbp = Number(raw.systolicBpMmHg);
  const dbp = Number(raw.diastolicBpMmHg);
  if (!Number.isFinite(sbp) || sbp < 0) {
    errors.push('Enter a valid systolic blood pressure (mmHg).');
  }
  if (!Number.isFinite(dbp) || dbp < 0) {
    errors.push('Enter a valid diastolic blood pressure (mmHg).');
  }
  if (abcd2ClinicalFeaturePoints(raw.clinicalFeature) === null) {
    errors.push('Select a clinical features category.');
  }
  if (abcd2DurationPoints(raw.durationBand) === null) {
    errors.push('Select symptom duration.');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * @param {Abcd2RiskCategory} riskCategory
 */
function riskCategoryLabel(riskCategory) {
  if (riskCategory === 'high') return 'High short-term risk';
  if (riskCategory === 'moderate') return 'Moderate short-term risk';
  return 'Low short-term risk';
}

/**
 * @param {number} score 0–7
 */
export function interpretAbcd2Score(score) {
  const riskCategory = abcd2RiskCategoryFromScore(score);
  if (!riskCategory) return null;

  const referenceLine =
    'Johnston SC, et al. Validation and refinement of predictive models to determine risk of stroke in patients with TIA. Lancet. 2007;369(9558):283–292.';

  const disclaimer = ABCD2_STROKE_DISCLAIMER;

  const strokeRiskContextByScore = {
    0: 'Approximate 2-day stroke risk ~1% in validation cohorts',
    1: 'Approximate 2-day stroke risk ~1–2%',
    2: 'Approximate 2-day stroke risk ~2%',
    3: 'Approximate 2-day stroke risk ~3%',
    4: 'Approximate 2-day stroke risk ~4%',
    5: 'Approximate 2-day stroke risk ~6%',
    6: 'Approximate 2-day stroke risk ~8%',
    7: 'Approximate 2-day stroke risk ~11% in validation cohorts',
  };

  const interpretations = {
    low: 'Scores of 0–3 fall in the lower short-term stroke-risk stratum after TIA in validation studies. Risk stratification for discussion and follow-up planning only.',
    moderate:
      'Scores of 4–5 fall in the moderate short-term stroke-risk stratum in validation studies. Does not direct admission, imaging timing, or antithrombotic therapy.',
    high: 'Scores of 6–7 fall in the higher short-term stroke-risk stratum in validation studies. Urgent stroke evaluation pathways may already be indicated by presentation — this score does not replace them.',
  };

  const severity = riskCategory === 'high' ? 'critical' : riskCategory === 'moderate' ? 'warning' : 'normal';

  return {
    severity,
    riskCategory,
    riskCategoryLabel: riskCategoryLabel(riskCategory),
    label: `ABCD² score ${score}`,
    riskBand: `${score} of 7 points`,
    strokeRiskContext: strokeRiskContextByScore[score] ?? '—',
    interpretation: interpretations[riskCategory],
    disclaimer,
    referenceLine,
  };
}
