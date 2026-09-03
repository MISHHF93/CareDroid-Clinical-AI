/**
 * STOP-Bang questionnaire for obstructive sleep apnea (OSA) screening.
 *
 * Reference: Chung F, et al. STOP questionnaire: a tool to screen patients for obstructive sleep apnea.
 * Anesthesiology. 2008;108(5):812–821. Bang component: Chung F, et al. High STOP-Bang score indicates
 * a high probability of obstructive sleep apnea. Br J Anaesth. 2012;108(5):768–775.
 *
 * Screening tool only — does not diagnose OSA or recommend CPAP or surgery.
 */

/** @typedef {{
 *   snoring: boolean,
 *   tiredness: boolean,
 *   observedApnea: boolean,
 *   hypertension: boolean,
 *   bmiOver35: boolean,
 *   ageOver50: boolean,
 *   largeNeckCircumference: boolean,
 *   maleSex: boolean,
 * }} StopBangInputs */

/** @typedef {'low' | 'intermediate' | 'high'} OsaRiskCategory */

export const STOP_BANG_CRITERIA_META = [
  {
    key: 'snoring',
    shortLabel: 'Snoring (loud enough to be heard through closed doors)',
    help: 'S — Do you snore loudly (louder than talking or loud enough to be heard through closed doors)?',
    letter: 'S',
  },
  {
    key: 'tiredness',
    shortLabel: 'Tiredness / daytime sleepiness',
    help: 'T — Do you often feel tired, fatigued, or sleepy during the daytime?',
    letter: 'T',
  },
  {
    key: 'observedApnea',
    shortLabel: 'Observed apneas during sleep',
    help: 'O — Has anyone observed you stop breathing or choking/gasping during sleep?',
    letter: 'O',
  },
  {
    key: 'hypertension',
    shortLabel: 'Hypertension',
    help: 'P — Do you have or are you being treated for high blood pressure?',
    letter: 'P',
  },
  {
    key: 'bmiOver35',
    shortLabel: 'BMI > 35 kg/m²',
    help: 'B — Body mass index greater than 35 kg/m².',
    letter: 'B',
  },
  {
    key: 'ageOver50',
    shortLabel: 'Age > 50 years',
    help: 'A — Age greater than 50 years.',
    letter: 'A',
  },
  {
    key: 'largeNeckCircumference',
    shortLabel: 'Large neck circumference',
    help: 'N — Neck circumference greater than 40 cm (15¾ in); original validation used sex-specific cutoffs (>43 cm male, >41 cm female).',
    letter: 'N',
  },
  {
    key: 'maleSex',
    shortLabel: 'Male sex',
    help: 'G — Male gender (sex assigned or self-reported male for screening context).',
    letter: 'G',
  },
];

const CRITERIA_KEYS = STOP_BANG_CRITERIA_META.map((r) => r.key);

/**
 * @param {StopBangInputs} raw
 * @returns {Record<string, 0|1>}
 */
export function computeStopBangBreakdown(raw) {
  const breakdown: any = {};
  for (const k of CRITERIA_KEYS) {
    breakdown[k] = raw[k] ? 1 : 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, 0|1>} breakdown
 */
export function sumStopBangScore(breakdown) {
  let total = 0;
  for (const k of CRITERIA_KEYS) {
    const v = breakdown[k];
    if (v !== 0 && v !== 1) return null;
    total += v;
  }
  return total;
}

/**
 * @param {StopBangInputs} raw
 */
export function calculateStopBangScore(raw) {
  const breakdown = computeStopBangBreakdown(raw);
  return sumStopBangScore(breakdown);
}

/**
 * @param {number} score 0–8
 * @returns {OsaRiskCategory}
 */
export function categorizeStopBangOsaRisk(score) {
  if (!Number.isFinite(score) || score < 0 || score > 8) return null;
  if (score <= 2) return 'low';
  if (score <= 4) return 'intermediate';
  return 'high';
}

/**
 * @param {number} score
 */
export function interpretStopBangScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 8) return null;

  const osaRiskCategory = categorizeStopBangOsaRisk(score) as any;
  const referenceLine =
    'Chung F, et al. STOP questionnaire: a tool to screen patients for obstructive sleep apnea. Anesthesiology. 2008;108(5):812–821.';

  const screeningDisclaimer = 'Screening tool only.';

  const categoryLabels = {
    low: 'Low risk of moderate-to-severe OSA (typical screening band: score 0–2)',
    intermediate: 'Intermediate risk of moderate-to-severe OSA (typical screening band: score 3–4)',
    high: 'High risk of moderate-to-severe OSA (typical screening band: score 5–8)',
  };

  const discussion = {
    low: 'A low STOP-Bang score lowers pre-test probability of moderate-to-severe OSA in many validation cohorts but does not exclude disease. Consider symptoms, examination, and institutional sleep pathways if clinical suspicion remains.',
    intermediate:
      'An intermediate score warrants discussion of sleep symptoms and whether formal sleep evaluation (e.g. home sleep apnea test or polysomnography) is appropriate per local pathways. This tool does not order testing or prescribe therapy.',
    high: 'A high score is associated with substantially increased probability of moderate-to-severe OSA in validation studies. Discuss referral for sleep assessment with the treating clinician; avoid using this score alone to initiate CPAP or surgery without diagnostic evaluation.',
  };

  const severity =
    osaRiskCategory === 'high'
      ? 'critical'
      : osaRiskCategory === 'intermediate'
        ? 'warning'
        : 'normal';

  return {
    severity,
    totalScore: score,
    osaRiskCategory,
    label: categoryLabels[osaRiskCategory],
    interpretation: `STOP-Bang score ${score} of 8 — ${categoryLabels[osaRiskCategory].toLowerCase()}.`,
    osaRiskDiscussion: discussion[osaRiskCategory],
    screeningDisclaimer,
    safetyDisclaimer:
      'STOP-Bang is a screening questionnaire for obstructive sleep apnea risk. It does not diagnose OSA, does not replace polysomnography or home sleep testing, and must not be used alone to rule in or rule out sleep-disordered breathing.',
    pathwayDisclaimer:
      'Follow institutional sleep medicine and perioperative pathways for patients with suspected OSA. This tool does not recommend CPAP, oral appliances, surgery, or specific sleep studies.',
    referenceLine,
  };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateStopBangInputs(raw) {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing STOP-Bang input object'] };
  }

  /** @type {StopBangInputs} */
  const inputs = {
    snoring: Boolean(raw.snoring),
    tiredness: Boolean(raw.tiredness),
    observedApnea: Boolean(raw.observedApnea),
    hypertension: Boolean(raw.hypertension),
    bmiOver35: Boolean(raw.bmiOver35),
    ageOver50: Boolean(raw.ageOver50),
    largeNeckCircumference: Boolean(raw.largeNeckCircumference),
    maleSex: Boolean(raw.maleSex),
  };

  return { valid: true, errors: [], inputs };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computeStopBangResult(raw) {
  const v = validateStopBangInputs(raw);
  if (!v.valid) return { ok: false as const, errors: v.errors };

  const breakdown = computeStopBangBreakdown(v.inputs);
  const total = sumStopBangScore(breakdown);
  const interp = interpretStopBangScore(total);
  if (!interp) return { ok: false as const, errors: ['Unable to calculate STOP-Bang score.'] };

  return {
    ok: true as const,
    inputs: v.inputs,
    breakdown,
    ...interp,
  };
}
