/**
 * GAD-7 — Generalized Anxiety Disorder 7-item anxiety symptom screen (0–21).
 *
 * Reference: Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing
 * generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092–1097.
 *
 * Screening / decision support only — does not diagnose anxiety disorders or recommend medications.
 */

/** @typedef {'none_minimal' | 'mild' | 'moderate' | 'severe'} Gad7SeverityCategory */

export const GAD7_LIKERT_OPTIONS = [
  { value: 0, label: 'Not at all', points: 0 },
  { value: 1, label: 'Several days', points: 1 },
  { value: 2, label: 'More than half the days', points: 2 },
  { value: 3, label: 'Nearly every day', points: 3 },
];

/** @typedef {0 | 1 | 2 | 3} Gad7ItemScore */

/** @typedef {{
 *   q1: Gad7ItemScore,
 *   q2: Gad7ItemScore,
 *   q3: Gad7ItemScore,
 *   q4: Gad7ItemScore,
 *   q5: Gad7ItemScore,
 *   q6: Gad7ItemScore,
 *   q7: Gad7ItemScore,
 * }} Gad7Inputs */

export const GAD7_ITEMS = [
  { key: 'q1', number: 1, label: 'Feeling nervous, anxious, or on edge' },
  { key: 'q2', number: 2, label: 'Not being able to stop or control worrying' },
  { key: 'q3', number: 3, label: 'Worrying too much about different things' },
  { key: 'q4', number: 4, label: 'Trouble relaxing' },
  { key: 'q5', number: 5, label: 'Being so restless that it is hard to sit still' },
  { key: 'q6', number: 6, label: 'Becoming easily annoyed or irritable' },
  { key: 'q7', number: 7, label: 'Feeling afraid, as if something awful might happen' },
];

/**
 * @param {Gad7Inputs} inputs
 */
export function computeGad7Breakdown(inputs) {
  /** @type {Record<string, number>} */
  const breakdown = {};
  for (const item of GAD7_ITEMS) {
    breakdown[item.key] = inputs[item.key] ?? 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, number>} breakdown
 */
export function sumGad7Score(breakdown) {
  const total = GAD7_ITEMS.reduce((sum, item) => sum + (breakdown[item.key] ?? 0), 0);
  if (!Number.isFinite(total) || total < 0 || total > 21) return null;
  return total;
}

/**
 * @param {number} score
 * @returns {Gad7SeverityCategory | null}
 */
export function categorizeGad7Severity(score) {
  if (!Number.isFinite(score) || score < 0 || score > 21) return null;
  if (score <= 4) return 'none_minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  return 'severe';
}

const SEVERITY_LABELS = {
  none_minimal: 'Minimal (0–4)',
  mild: 'Mild (5–9)',
  moderate: 'Moderate (10–14)',
  severe: 'Severe (15–21)',
};

/**
 * @param {number} total
 */
export function interpretGad7Score(total) {
  if (!Number.isFinite(total) || total < 0 || total > 21) return null;

  const severityCategory = categorizeGad7Severity(total);
  if (!severityCategory) return null;

  const referenceLine =
    'Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092–1097.';

  const severityLabel = SEVERITY_LABELS[severityCategory];
  const label = `GAD-7 total ${total}/21 — ${severityLabel} anxiety symptom severity range`;

  let uiSeverity = 'normal';
  if (severityCategory === 'moderate') uiSeverity = 'warning';
  if (severityCategory === 'severe') uiSeverity = 'warning';

  const severeSymptoms = severityCategory === 'severe';

  const interpretation = severeSymptoms
    ? `Total score ${total}/21 falls in the ${severityLabel} range on this symptom screen and usually warrants prompt clinical evaluation per institutional guidance. Higher scores suggest more frequent anxiety symptoms over the past two weeks; use clinical judgment and local pathways for follow-up. If suicidal thoughts are present, follow suicide-risk protocols — this screen does not assess self-harm.`
    : `Total score ${total}/21 falls in the ${severityLabel} range on this symptom screen. Higher scores suggest more frequent anxiety symptoms over the past two weeks; use clinical judgment and local pathways for follow-up.`;

  const moderateSymptoms = severityCategory === 'moderate';

  const acuteDistressSafetyAlert = severeSymptoms
    ? {
        elevated: true,
        headline: 'Elevated anxiety symptom burden — consider urgent evaluation',
        message:
          'Severe-range scores warrant prompt clinical follow-up. For acute panic, overwhelming distress, or inability to function safely, follow local psychiatric emergency pathways. If the patient has thoughts of self-harm or suicide, urgent safety assessment is required (e.g. 988 Suicide & Crisis Lifeline in the U.S. when applicable). This calculator does not provide emergency services or treatment recommendations.',
      }
    : {
        elevated: false,
        headline: null,
        message: null,
      };

  const moderateSymptomEscalation =
    moderateSymptoms && !severeSymptoms
      ? {
          warranted: true,
          message:
            'Moderate-range scores on this screen often warrant clinical follow-up per institutional guidance. This tool does not establish an anxiety disorder diagnosis. A low or moderate score does not rule out suicide risk — use PHQ-9 question 9 and local suicide-risk pathways when self-harm is a concern.',
        }
      : { warranted: false, message: null };

  const screeningDiscussion = {
    none_minimal:
      'Scores in the minimal range suggest few anxiety symptoms on this screen over the past two weeks. A low score does not exclude clinically significant anxiety or comorbid conditions in other contexts.',
    mild:
      'Scores in the mild range may warrant watchful waiting or repeat screening depending on context, functional impairment, and patient preference. This tool does not establish an anxiety disorder diagnosis.',
    moderate:
      'Scores in the moderate range often prompt clinical follow-up (e.g. repeat assessment, structured interview, or referral) per institutional guidance. This tool does not establish an anxiety disorder diagnosis.',
    severe:
      'Scores in the severe range indicate frequent anxiety symptoms on this screen and usually warrant prompt clinical evaluation per institutional guidance. This tool does not establish an anxiety disorder diagnosis.',
  };

  return {
    severity: uiSeverity,
    totalScore: total,
    severityCategory,
    severityLabel,
    label,
    interpretation,
    screeningDiscussion: screeningDiscussion[severityCategory],
    screeningDisclaimer:
      'GAD-7 is a brief anxiety symptom screen over the past two weeks. It does not diagnose generalized anxiety disorder or any other condition and does not recommend specific medications or psychotherapy regimens.',
    safetyDisclaimer:
      'Screening results reflect the answers entered and may omit important context. Do not use this score alone to rule in or rule out an anxiety disorder or to determine treatment without clinician review.',
    clinicianReviewDisclaimer:
      'All results require interpretation by a qualified clinician in the context of the full assessment, comorbidities, and local protocols.',
    pathwayDisclaimer:
      'Follow institutional behavioral health pathways when indicated. For suicidal ideation, use suicide-risk protocols (e.g. PHQ-9 question 9 pathways). This tool does not replace emergency services for acute psychiatric crises, panic, or overwhelming distress.',
    acuteDistressSafetyAlert,
    moderateSymptomEscalation,
    referenceLine,
  };
}

/**
 * @param {unknown} value
 * @returns {value is Gad7ItemScore}
 */
function isValidItemScore(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 0 || n === 1 || n === 2 || n === 3;
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validateGad7Inputs(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing GAD-7 input object'] };
  }

  /** @type {Partial<Gad7Inputs>} */
  const inputs = {};

  for (const item of GAD7_ITEMS) {
    const value = raw[item.key];
    if (!isValidItemScore(value)) {
      errors.push(`Select a response for question ${item.number}.`);
    } else {
      inputs[item.key] = typeof value === 'string' ? Number(value) : value;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], inputs: /** @type {Gad7Inputs} */ (inputs) };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computeGad7Result(raw) {
  const v = validateGad7Inputs(raw);
  if (!v.valid) return { ok: false, errors: v.errors };

  const breakdown = computeGad7Breakdown(v.inputs);
  const total = sumGad7Score(breakdown);
  const interp = interpretGad7Score(total);
  if (!interp) return { ok: false, errors: ['Unable to calculate GAD-7 score.'] };

  return {
    ok: true,
    inputs: v.inputs,
    breakdown,
    ...interp,
  };
}
