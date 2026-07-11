/**
 * PHQ-9 — Patient Health Questionnaire depression symptom screen (9 items, 0–27).
 *
 * Reference: Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression
 * severity measure. J Gen Intern Med. 2001;16(9):606–613.
 *
 * Screening / decision support only — does not diagnose depression or recommend medications.
 * Question 9 (self-harm ideation) requires elevated safety handling when score ≥ 1.
 */

/** @typedef {'none_minimal' | 'mild' | 'moderate' | 'moderately_severe' | 'severe'} Phq9SeverityCategory */

export const PHQ9_LIKERT_OPTIONS = [
  { value: 0, label: 'Not at all', points: 0 },
  { value: 1, label: 'Several days', points: 1 },
  { value: 2, label: 'More than half the days', points: 2 },
  { value: 3, label: 'Nearly every day', points: 3 },
];

/** @typedef {0 | 1 | 2 | 3} Phq9ItemScore */

/** @typedef {{
 *   q1: Phq9ItemScore,
 *   q2: Phq9ItemScore,
 *   q3: Phq9ItemScore,
 *   q4: Phq9ItemScore,
 *   q5: Phq9ItemScore,
 *   q6: Phq9ItemScore,
 *   q7: Phq9ItemScore,
 *   q8: Phq9ItemScore,
 *   q9: Phq9ItemScore,
 * }} Phq9Inputs */

export const PHQ9_ITEMS = [
  {
    key: 'q1',
    number: 1,
    label: 'Little interest or pleasure in doing things',
  },
  {
    key: 'q2',
    number: 2,
    label: 'Feeling down, depressed, or hopeless',
  },
  {
    key: 'q3',
    number: 3,
    label: 'Trouble falling or staying asleep, or sleeping too much',
  },
  {
    key: 'q4',
    number: 4,
    label: 'Feeling tired or having little energy',
  },
  {
    key: 'q5',
    number: 5,
    label: 'Poor appetite or overeating',
  },
  {
    key: 'q6',
    number: 6,
    label:
      'Feeling bad about yourself — or that you are a failure or have let yourself or your family down',
  },
  {
    key: 'q7',
    number: 7,
    label: 'Trouble concentrating on things, such as reading the newspaper or watching television',
  },
  {
    key: 'q8',
    number: 8,
    label:
      'Moving or speaking so slowly that other people could have noticed — or the opposite, being so fidgety or restless that you have been moving around a lot more than usual',
  },
  {
    key: 'q9',
    number: 9,
    label: 'Thoughts that you would be better off dead, or of hurting yourself in some way',
    isSafetyItem: true,
  },
];

export const PHQ9_QUESTION9_ELEVATED_THRESHOLD = 1;

/**
 * @param {Phq9Inputs} inputs
 */
export function computePhq9Breakdown(inputs) {
  /** @type {Record<string, number>} */
  const breakdown: any = {};
  for (const item of PHQ9_ITEMS) {
    breakdown[item.key] = inputs[item.key] ?? 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, number>} breakdown
 */
export function sumPhq9Score(breakdown) {
  const total = PHQ9_ITEMS.reduce((sum, item) => sum + (breakdown[item.key] ?? 0), 0);
  if (!Number.isFinite(total) || total < 0 || total > 27) return null;
  return total;
}

/**
 * @param {number} score
 * @returns {Phq9SeverityCategory | null}
 */
export function categorizePhq9Severity(score) {
  if (!Number.isFinite(score) || score < 0 || score > 27) return null;
  if (score <= 4) return 'none_minimal';
  if (score <= 9) return 'mild';
  if (score <= 14) return 'moderate';
  if (score <= 19) return 'moderately_severe';
  return 'severe';
}

/**
 * @param {number} question9Score
 */
export function isPhq9Question9Elevated(question9Score) {
  return Number.isFinite(question9Score) && question9Score >= PHQ9_QUESTION9_ELEVATED_THRESHOLD;
}

const SEVERITY_LABELS = {
  none_minimal: 'None–minimal (0–4)',
  mild: 'Mild (5–9)',
  moderate: 'Moderate (10–14)',
  moderately_severe: 'Moderately severe (15–19)',
  severe: 'Severe (20–27)',
};

/**
 * @param {number} total
 * @param {number} question9Score
 */
export function interpretPhq9Score(total, question9Score) {
  if (!Number.isFinite(total) || total < 0 || total > 27) return null;

  const severityCategory = categorizePhq9Severity(total);
  if (!severityCategory) return null;

  const question9Elevated = isPhq9Question9Elevated(question9Score);
  const referenceLine =
    'Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606–613.';

  const severityLabel = SEVERITY_LABELS[severityCategory];
  const label = question9Elevated
    ? `Question 9 elevated — urgent safety review (PHQ-9 total ${total}/27; ${severityLabel} symptom severity range)`
    : `PHQ-9 total ${total}/27 — ${severityLabel} symptom severity range`;

  const highSymptomBurden =
    severityCategory === 'moderately_severe' || severityCategory === 'severe';

  let uiSeverity = 'normal';
  if (severityCategory === 'moderate') uiSeverity = 'warning';
  if (highSymptomBurden) uiSeverity = 'warning';
  if (question9Elevated) uiSeverity = 'critical';

  const interpretation = question9Elevated
    ? `Question 9 indicates possible self-harm or suicidal ideation (score ${question9Score}) and requires immediate clinical attention per institutional safety protocols — prioritize safety assessment before routine disposition. Total score ${total}/27 falls in the ${severityLabel} range on this symptom screen.`
    : `Total score ${total}/27 falls in the ${severityLabel} range on this symptom screen. Higher scores suggest more frequent depressive symptoms over the past two weeks; use clinical judgment and local pathways for follow-up.`;

  const highSymptomEscalation =
    highSymptomBurden && !question9Elevated
      ? {
          warranted: true,
          message:
            'Elevated total scores on this screen warrant timely clinical evaluation and safety assessment per institutional protocols. A score of zero on question 9 does not rule out suicide risk or the need for urgent care in other contexts.',
        }
      : { warranted: false, message: null };

  const screeningDiscussion = {
    none_minimal:
      'Scores in the none–minimal range suggest few depressive symptoms on this screen over the past two weeks. A low score does not exclude important mood concerns or safety risk in other contexts.',
    mild:
      'Scores in the mild range may warrant watchful waiting or repeat screening depending on context, functional impairment, and patient preference. This tool does not establish a depression diagnosis.',
    moderate:
      'Scores in the moderate range often prompt clinical follow-up (e.g. repeat assessment, structured interview, or referral) per institutional guidance. This tool does not establish a depression diagnosis.',
    moderately_severe:
      'Scores in the moderately severe range usually warrant timely clinical evaluation and follow-up planning per institutional guidance. This tool does not establish a depression diagnosis.',
    severe:
      'Scores in the severe range indicate frequent depressive symptoms on this screen and usually warrant prompt clinical evaluation per institutional guidance. This tool does not establish a depression diagnosis.',
  };

  const question9SafetyAlert = question9Elevated
    ? {
        elevated: true,
        headline: 'Question 9 — possible self-harm or suicidal ideation',
        message:
          'Any non-zero score on question 9 requires urgent safety assessment. Do not delay evaluation or use this screen alone to clear safety concerns. Follow local psychiatric emergency pathways, ensure immediate access to crisis resources (e.g. 988 Suicide & Crisis Lifeline in the U.S. when applicable), and arrange direct clinical review. This calculator does not provide emergency services or treatment recommendations.',
      }
    : {
        elevated: false,
        headline: null,
        message: null,
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
      'PHQ-9 is a brief depression symptom screen over the past two weeks. It does not diagnose major depressive disorder or any other condition and does not recommend specific medications or psychotherapy regimens.',
    safetyDisclaimer:
      'Screening results reflect the answers entered and may omit important context. Do not use this score alone to rule in or rule out depression or to determine treatment without clinician review.',
    clinicianReviewDisclaimer:
      'All results require interpretation by a qualified clinician in the context of the full assessment, comorbidities, and local protocols.',
    pathwayDisclaimer:
      'Follow institutional behavioral health and suicide-risk pathways when indicated. This tool does not replace emergency services for acute safety concerns.',
    question9Score,
    question9Elevated,
    question9SafetyAlert,
    highSymptomEscalation,
    referenceLine,
  };
}

/**
 * @param {unknown} value
 * @returns {value is Phq9ItemScore}
 */
function isValidItemScore(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  return n === 0 || n === 1 || n === 2 || n === 3;
}

/**
 * @param {Record<string, unknown>} raw
 */
export function validatePhq9Inputs(raw) {
  const errors = [] as any[];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing PHQ-9 input object'] };
  }

  /** @type {Partial<Phq9Inputs>} */
  const inputs: any = {};

  for (const item of PHQ9_ITEMS) {
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

  return { valid: true, errors: [], inputs: (inputs as any) };
}

/**
 * @param {Record<string, unknown>} raw
 */
export function computePhq9Result(raw) {
  const v = validatePhq9Inputs(raw);
  if (!v.valid) return { ok: false as const, errors: v.errors };

  const breakdown = computePhq9Breakdown(v.inputs);
  const total = sumPhq9Score(breakdown);
  const interp = interpretPhq9Score(total, breakdown.q9);
  if (!interp) return { ok: false as const, errors: ['Unable to calculate PHQ-9 score.'] };

  return {
    ok: true as const,
    inputs: v.inputs,
    breakdown,
    ...interp,
  };
}
