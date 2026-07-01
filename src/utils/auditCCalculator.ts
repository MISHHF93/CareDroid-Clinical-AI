/**
 * AUDIT-C — Alcohol Use Disorders Identification Test (consumption subset).
 *
 * Reference: Bush K, et al. The AUDIT alcohol consumption questions (AUDIT-C): an effective brief
 * screening test for problem drinking. Arch Intern Med. 1998;158(16):1789–1795.
 * WHO AUDIT screening guidance.
 *
 * Screening only — does not diagnose alcohol use disorder or provide detox advice.
 */

/** @typedef {'never' | 'monthly_or_less' | 'two_to_four_per_month' | 'two_to_three_per_week' | 'four_plus_per_week'} DrinkingFrequency */
/** @typedef {'one_or_two' | 'three_or_four' | 'five_or_six' | 'seven_to_nine' | 'ten_plus'} DrinksPerDay */
/** @typedef {'never' | 'less_than_monthly' | 'monthly' | 'weekly' | 'daily_or_almost_daily'} BingeFrequency */

/** @typedef {{
 *   drinkingFrequency: DrinkingFrequency,
 *   drinksPerDay: DrinksPerDay,
 *   bingeFrequency: BingeFrequency,
 * }} AuditCInputs */

/** @typedef {'negative' | 'positive_women' | 'positive_men'} AuditCScreeningResult */

export const AUDIT_C_FREQUENCY_OPTIONS = [
  { value: 'never', label: 'Never', points: 0 },
  { value: 'monthly_or_less', label: 'Monthly or less', points: 1 },
  { value: 'two_to_four_per_month', label: '2–4 times a month', points: 2 },
  { value: 'two_to_three_per_week', label: '2–3 times a week', points: 3 },
  { value: 'four_plus_per_week', label: '4 or more times a week', points: 4 },
];

export const AUDIT_C_DRINKS_PER_DAY_OPTIONS = [
  { value: 'one_or_two', label: '1 or 2', points: 0 },
  { value: 'three_or_four', label: '3 or 4', points: 1 },
  { value: 'five_or_six', label: '5 or 6', points: 2 },
  { value: 'seven_to_nine', label: '7 to 9', points: 3 },
  { value: 'ten_plus', label: '10 or more', points: 4 },
];

export const AUDIT_C_BINGE_OPTIONS = [
  { value: 'never', label: 'Never', points: 0 },
  { value: 'less_than_monthly', label: 'Less than monthly', points: 1 },
  { value: 'monthly', label: 'Monthly', points: 2 },
  { value: 'weekly', label: 'Weekly', points: 3 },
  { value: 'daily_or_almost_daily', label: 'Daily or almost daily', points: 4 },
];

const FREQUENCY_POINTS = Object.fromEntries(AUDIT_C_FREQUENCY_OPTIONS.map((o) => [o.value, o.points]));
const DRINKS_POINTS = Object.fromEntries(AUDIT_C_DRINKS_PER_DAY_OPTIONS.map((o) => [o.value, o.points]));
const BINGE_POINTS = Object.fromEntries(AUDIT_C_BINGE_OPTIONS.map((o) => [o.value, o.points]));

export const AUDIT_C_WOMEN_POSITIVE_THRESHOLD = 3;
export const AUDIT_C_MEN_POSITIVE_THRESHOLD = 4;

/**
 * @param {AuditCInputs} inputs
 */
export function computeAuditCBreakdown(inputs) {
  return {
    drinkingFrequency: FREQUENCY_POINTS[inputs.drinkingFrequency] ?? 0,
    drinksPerDay: DRINKS_POINTS[inputs.drinksPerDay] ?? 0,
    bingeFrequency: BINGE_POINTS[inputs.bingeFrequency] ?? 0,
  };
}

/**
 * @param {Record<string, number>} breakdown
 */
export function sumAuditCScore(breakdown) {
  const total =
    breakdown.drinkingFrequency + breakdown.drinksPerDay + breakdown.bingeFrequency;
  if (!Number.isFinite(total) || total < 0 || total > 12) return null;
  return total;
}

/**
 * @param {number} score
 * @returns {AuditCScreeningResult}
 */
export function categorizeAuditCScreening(score) {
  if (!Number.isFinite(score) || score < 0 || score > 12) return null;
  if (score < AUDIT_C_WOMEN_POSITIVE_THRESHOLD) return 'negative';
  if (score < AUDIT_C_MEN_POSITIVE_THRESHOLD) return 'positive_women';
  return 'positive_men';
}

/**
 * @param {number} score
 */
export function interpretAuditCScore(score) {
  if (!Number.isFinite(score) || score < 0 || score > 12) return null;

  const screeningResult = categorizeAuditCScreening(score) as any;
  const referenceLine =
    'Bush K, et al. The AUDIT alcohol consumption questions (AUDIT-C): an effective brief screening test for problem drinking. Arch Intern Med. 1998;158(16):1789–1795.';

  const labels = {
    negative: `Negative AUDIT-C screen (score ${score}; below ${AUDIT_C_WOMEN_POSITIVE_THRESHOLD} for women and below ${AUDIT_C_MEN_POSITIVE_THRESHOLD} for men)`,
    positive_women: `Positive AUDIT-C screen for women (score ${score} = ${AUDIT_C_WOMEN_POSITIVE_THRESHOLD}); below men's threshold of ${AUDIT_C_MEN_POSITIVE_THRESHOLD}`,
    positive_men: `Positive AUDIT-C screen (score ${score} = ${AUDIT_C_MEN_POSITIVE_THRESHOLD} for men; also = ${AUDIT_C_WOMEN_POSITIVE_THRESHOLD} for women)`,
  };

  const discussion = {
    negative:
      'A score below sex-specific cutoffs lowers concern for hazardous drinking on this brief screen, but does not exclude alcohol-related harm. Use clinical judgment and local pathways if concerns remain.',
    positive_women:
      `A score of ${score} meets the AUDIT-C positive threshold for women (=${AUDIT_C_WOMEN_POSITIVE_THRESHOLD}). Discuss further assessment (e.g. full AUDIT or structured clinical interview) per institutional guidance. This tool does not diagnose alcohol use disorder.`,
    positive_men:
      `A score of ${score} meets the AUDIT-C positive threshold for men (=${AUDIT_C_MEN_POSITIVE_THRESHOLD}) and for women (=${AUDIT_C_WOMEN_POSITIVE_THRESHOLD}). Discuss further assessment per institutional guidance. This tool does not diagnose alcohol use disorder.`,
  };

  const severity =
    screeningResult === 'positive_men'
      ? 'warning'
      : screeningResult === 'positive_women'
        ? 'warning'
        : 'normal';

  return {
    severity,
    totalScore: score,
    screeningResult,
    label: labels[screeningResult],
    interpretation: `${labels[screeningResult]}. Per AUDIT-C guidance, scores =${AUDIT_C_WOMEN_POSITIVE_THRESHOLD} (women) or =${AUDIT_C_MEN_POSITIVE_THRESHOLD} (men) suggest further alcohol assessment.`,
    screeningDiscussion: discussion[screeningResult],
    screeningDisclaimer:
      'Screening only. AUDIT-C is a brief alcohol consumption screen. Apply the sex-appropriate positive threshold (=3 women, =4 men). It does not diagnose alcohol use disorder and does not provide withdrawal-management advice.',
    safetyDisclaimer:
      'Screening results reflect the answers entered and may omit important context. Do not use this score alone to rule in or rule out alcohol use disorder or to mandate treatment.',
    pathwayDisclaimer:
      'Follow local behavioral health and substance-use pathways for positive screens. This tool does not recommend specific medications or treatment programs.',
    referenceLine,
  };
}

/**
 * @param {string} value
 * @param {readonly { value: string }[]} options
 * @param {string} fieldLabel
 * @param {string[]} errors
 */
function requireOption(value, options, fieldLabel, errors) {
  if (!value || !options.some((o) => o.value === value)) {
    errors.push(`Select ${fieldLabel}.`);
  }
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateAuditCInputs(raw) {
  const errors = [] as any[];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing AUDIT-C input object'] };
  }

  const drinkingFrequency = raw.drinkingFrequency;
  const drinksPerDay = raw.drinksPerDay;
  const bingeFrequency = raw.bingeFrequency;

  requireOption(drinkingFrequency, AUDIT_C_FREQUENCY_OPTIONS, 'drinking frequency', errors);
  requireOption(drinksPerDay, AUDIT_C_DRINKS_PER_DAY_OPTIONS, 'typical drinks per drinking day', errors);
  requireOption(bingeFrequency, AUDIT_C_BINGE_OPTIONS, 'binge drinking frequency (6+ drinks)', errors);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  /** @type {AuditCInputs} */
  const inputs = {
    drinkingFrequency,
    drinksPerDay,
    bingeFrequency,
  };

  return { valid: true, errors: [], inputs };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computeAuditCResult(raw) {
  const v = validateAuditCInputs(raw);
  if (!v.valid) return { ok: false, errors: v.errors };

  const breakdown = computeAuditCBreakdown(v.inputs);
  const total = sumAuditCScore(breakdown);
  const interp = interpretAuditCScore(total);
  if (!interp) return { ok: false, errors: ['Unable to calculate AUDIT-C score.'] };

  return {
    ok: true,
    inputs: v.inputs,
    breakdown,
    ...interp,
  };
}
