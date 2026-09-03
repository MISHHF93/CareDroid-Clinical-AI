/**
 * Psychiatry and behavioral-health screening helpers.
 *
 * Screening decision support only. These helpers do not diagnose psychiatric,
 * cognitive, sleep, trauma, or substance-use disorders, do not recommend
 * medications or treatment plans, and require qualified human review.
 */

export const PSYCHIATRY_SCREENING_SAFETY_DISCLAIMER =
  'Mental-health screening decision support only. Does not diagnose, does not recommend medications or treatment, and does not replace qualified clinician review, local behavioral-health pathways, emergency services, or crisis response.';

export const CRISIS_SENSITIVE_SAFETY_MESSAGE =
  'If self-harm, suicidal ideation, intent, plan, recent suicidal behavior, or immediate danger is present, stop routine screening and arrange immediate safety assessment. Use local psychiatric emergency pathways, emergency services (e.g. 911 in the U.S. when applicable), and crisis resources such as the 988 Suicide & Crisis Lifeline in the U.S. when applicable.';

const YES_NO_OPTIONS = ['yes', 'no'];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

function requireYesNo(raw, key, label, errors) {
  const value = raw[key];
  if (!YES_NO_OPTIONS.includes(value)) errors.push(`Select ${label}.`);
  return value;
}

function requireIntegerRange(raw, key, label, min, max, errors) {
  const value = toNumber(raw[key]);
  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`Enter ${label} from ${min} to ${max}.`);
  }
  return value;
}

function result(label, interpretation, severity, referenceLine, extra: any = {}) {
  return {
    ok: true as const,
    label,
    interpretation,
    severity,
    disclaimer: PSYCHIATRY_SCREENING_SAFETY_DISCLAIMER,
    referenceLine,
    ...extra,
  };
}

export function computeCageResult(raw) {
  const errors = [] as any[];
  const keys = [
    ['cutDown', 'whether the patient felt they should cut down'],
    ['annoyed', 'whether criticism annoyed the patient'],
    ['guilty', 'whether the patient felt guilty'],
    ['eyeOpener', 'whether an eye-opener drink was reported'],
  ];
  const answers: any = {};
  for (const [key, label] of keys) answers[key] = requireYesNo(raw, key, label, errors);
  if (errors.length) return { ok: false as const, errors };

  const score = Object.values(answers).filter((value: any) => value === 'yes').length;
  const positive = score >= 2;
  return result(
    positive ? `CAGE positive screen (${score}/4)` : `CAGE lower-risk screen (${score}/4)`,
    positive
      ? 'Two or more yes responses is a positive CAGE screen and warrants clinician-reviewed substance-use assessment per local workflow. It does not diagnose alcohol use disorder and does not provide withdrawal or medication advice.'
      : 'Fewer than two yes responses lowers concern on this brief alcohol screen, but does not exclude alcohol-related harm or withdrawal risk when clinical concerns are present.',
    positive ? 'warning' : 'normal',
    'Ewing JA. Detecting alcoholism: The CAGE questionnaire. JAMA. 1984;252(14):1905-1907.',
    {
      score,
      positive,
      components: answers,
      safetyAlert:
        'Assess intoxication, withdrawal risk, co-ingestions, trauma, pregnancy, and immediate safety using local protocols when clinically relevant.',
    },
  );
}

export function computeMmseResult(raw) {
  const errors = [] as any[];
  const domains = {
    orientationTime: requireIntegerRange(
      raw,
      'orientationTime',
      'orientation to time',
      0,
      5,
      errors,
    ),
    orientationPlace: requireIntegerRange(
      raw,
      'orientationPlace',
      'orientation to place',
      0,
      5,
      errors,
    ),
    registration: requireIntegerRange(raw, 'registration', 'registration', 0, 3, errors),
    attentionCalculation: requireIntegerRange(
      raw,
      'attentionCalculation',
      'attention/calculation',
      0,
      5,
      errors,
    ),
    recall: requireIntegerRange(raw, 'recall', 'recall', 0, 3, errors),
    language: requireIntegerRange(raw, 'language', 'language', 0, 8, errors),
    visuospatial: requireIntegerRange(raw, 'visuospatial', 'visuospatial copying', 0, 1, errors),
  };
  if (errors.length) return { ok: false as const, errors };

  const score = Object.values(domains).reduce<number>((sum, value) => sum + (value as number), 0);
  const severity = score < 18 ? 'critical' : score < 24 ? 'warning' : 'normal';
  const label =
    score < 18
      ? `MMSE lower score range (${score}/30)`
      : score < 24
        ? `MMSE below common screening threshold (${score}/30)`
        : `MMSE common screening range (${score}/30)`;

  return result(
    label,
    'MMSE total is a cognitive screening score only. Interpret with education, language, sensory limitations, delirium risk, depression, medications, and baseline function. This tool does not diagnose dementia, delirium, or capacity.',
    severity,
    'Folstein MF, Folstein SE, McHugh PR. Mini-mental state. J Psychiatr Res. 1975;12(3):189-198.',
    {
      score,
      components: domains,
      safetyAlert:
        'Acute confusion, rapidly changing mental status, intoxication, trauma, infection, hypoxia, or neurologic deficit requires urgent medical evaluation before routine cognitive screening.',
    },
  );
}

export function computeMocaPlaceholderWorkflow(raw) {
  const errors = [] as any[];
  const officialFormAvailable = requireYesNo(
    raw,
    'officialFormAvailable',
    'whether the official MoCA form is available',
    errors,
  );
  const trainedAdministrator = requireYesNo(
    raw,
    'trainedAdministrator',
    'whether a trained administrator will perform the MoCA',
    errors,
  );
  const accommodationsReviewed = requireYesNo(
    raw,
    'accommodationsReviewed',
    'whether language, vision, hearing, motor, and education context was reviewed',
    errors,
  );
  const humanReviewPlan = requireYesNo(
    raw,
    'humanReviewPlan',
    'whether clinician review is planned',
    errors,
  );
  if (errors.length) return { ok: false as const, errors };

  const blocked =
    officialFormAvailable === 'no' || trainedAdministrator === 'no' || humanReviewPlan === 'no';
  return result(
    blocked
      ? 'MoCA workflow blocked pending governance'
      : 'MoCA workflow ready for governed administration',
    blocked
      ? 'This placeholder does not administer or score MoCA. Use the official MoCA instrument, required permissions/training, validated language version, and clinician review before documenting results.'
      : 'Proceed only with the official MoCA workflow and clinician review. This placeholder does not display items, calculate a score, diagnose cognitive impairment, or recommend treatment.',
    blocked ? 'critical' : 'normal',
    'Nasreddine ZS, et al. The Montreal Cognitive Assessment, MoCA: a brief screening tool for mild cognitive impairment. J Am Geriatr Soc. 2005;53(4):695-699.',
    {
      score: blocked ? 'blocked' : 'ready',
      components: {
        officialFormAvailable,
        trainedAdministrator,
        accommodationsReviewed,
        humanReviewPlan,
      },
    },
  );
}

export function computePcl5Result(raw) {
  const errors = [] as any[];
  const eventCriterionReviewed = requireYesNo(
    raw,
    'eventCriterionReviewed',
    'whether trauma exposure context was reviewed',
    errors,
  );
  const currentSafetyConcern = requireYesNo(
    raw,
    'currentSafetyConcern',
    'whether current self-harm, suicidal ideation, or danger is present',
    errors,
  );
  const items: any = {};
  for (let i = 1; i <= 20; i += 1) {
    items[`q${i}`] = requireIntegerRange(raw, `q${i}`, `PCL-5 item ${i}`, 0, 4, errors);
  }
  if (errors.length) return { ok: false as const, errors };

  const score = Object.values(items).reduce<number>((sum, value) => sum + (value as number), 0);
  const elevated = score >= 31;
  const crisisSensitive = currentSafetyConcern === 'yes';
  const severity = crisisSensitive ? 'critical' : elevated ? 'warning' : 'normal';

  return result(
    crisisSensitive
      ? `PCL-5 safety concern present (${score}/80)`
      : elevated
        ? `PCL-5 elevated symptom range (${score}/80)`
        : `PCL-5 non-elevated screening range (${score}/80)`,
    'PCL-5 total is PTSD symptom screening support only and requires trauma-exposure context and clinician review. It does not diagnose PTSD, establish causality, or recommend treatment.',
    severity,
    'Weathers FW, et al. The PTSD Checklist for DSM-5 (PCL-5). National Center for PTSD. 2013.',
    {
      score,
      elevated,
      crisisSensitive,
      components: { eventCriterionReviewed, currentSafetyConcern },
      itemScores: items,
      safetyAlert: crisisSensitive ? CRISIS_SENSITIVE_SAFETY_MESSAGE : null,
    },
  );
}

export function computeMdqResult(raw) {
  const errors = [] as any[];
  const symptomCount = requireIntegerRange(raw, 'symptomCount', 'MDQ symptom count', 0, 13, errors);
  const samePeriod = requireYesNo(
    raw,
    'samePeriod',
    'whether symptoms occurred during the same period',
    errors,
  );
  const impairment = raw.impairment;
  if (!['none', 'minor', 'moderate', 'serious'].includes(impairment)) {
    errors.push('Select level of functional impairment.');
  }
  const urgentSafetyConcern = requireYesNo(
    raw,
    'urgentSafetyConcern',
    'whether psychosis, unsafe behavior, suicidal ideation, or danger is present',
    errors,
  );
  if (errors.length) return { ok: false as const, errors };

  const positive =
    symptomCount >= 7 && samePeriod === 'yes' && ['moderate', 'serious'].includes(impairment);
  const crisisSensitive = urgentSafetyConcern === 'yes';
  return result(
    crisisSensitive
      ? 'MDQ urgent safety concern present'
      : positive
        ? `MDQ positive screen (${symptomCount}/13 symptoms)`
        : `MDQ not positive by common screen criteria (${symptomCount}/13 symptoms)`,
    'MDQ is bipolar-spectrum screening support only. A positive screen requires clinician assessment and differential review; it does not diagnose bipolar disorder, mania, hypomania, psychosis, or medication need.',
    crisisSensitive ? 'critical' : positive ? 'warning' : 'normal',
    'Hirschfeld RMA, et al. Development and validation of a screening instrument for bipolar spectrum disorder: the Mood Disorder Questionnaire. Am J Psychiatry. 2000;157(11):1873-1875.',
    {
      score: symptomCount,
      positive,
      crisisSensitive,
      components: { symptomCount, samePeriod, impairment, urgentSafetyConcern },
      safetyAlert: crisisSensitive ? CRISIS_SENSITIVE_SAFETY_MESSAGE : null,
    },
  );
}

export function computeEpworthSleepinessResult(raw) {
  const errors = [] as any[];
  const items: any = {};
  for (let i = 1; i <= 8; i += 1) {
    items[`q${i}`] = requireIntegerRange(raw, `q${i}`, `Epworth situation ${i}`, 0, 3, errors);
  }
  const safetySensitiveActivity = requireYesNo(
    raw,
    'safetySensitiveActivity',
    'whether safety-sensitive sleepiness is present',
    errors,
  );
  if (errors.length) return { ok: false as const, errors };

  const score = Object.values(items).reduce<number>((sum, value) => sum + (value as number), 0);
  const severity =
    safetySensitiveActivity === 'yes'
      ? 'critical'
      : score >= 16
        ? 'warning'
        : score >= 11
          ? 'warning'
          : 'normal';
  const label =
    score >= 16
      ? `Epworth very elevated sleepiness range (${score}/24)`
      : score >= 11
        ? `Epworth elevated sleepiness range (${score}/24)`
        : `Epworth usual sleepiness range (${score}/24)`;

  return result(
    safetySensitiveActivity === 'yes' ? `${label} with safety-sensitive activity concern` : label,
    'Epworth Sleepiness Scale is sleepiness screening support only. It does not diagnose obstructive sleep apnea, narcolepsy, medication effect, or other causes of hypersomnolence and does not determine driving or work clearance.',
    severity,
    'Johns MW. A new method for measuring daytime sleepiness: the Epworth sleepiness scale. Sleep. 1991;14(6):540-545.',
    {
      score,
      components: { safetySensitiveActivity },
      itemScores: items,
      safetyAlert:
        safetySensitiveActivity === 'yes'
          ? 'Sleepiness during driving, operating machinery, clinical duties, or other safety-sensitive activity requires prompt human review and local safety policy.'
          : null,
    },
  );
}

export function computeColumbiaSuicideSeverityWorkflow(raw) {
  const errors = [] as any[];
  const ideation = requireYesNo(raw, 'ideation', 'whether suicidal ideation is disclosed', errors);
  const intentOrPlan = requireYesNo(
    raw,
    'intentOrPlan',
    'whether suicidal intent or plan is disclosed',
    errors,
  );
  const behavior = requireYesNo(
    raw,
    'behavior',
    'whether recent suicidal behavior or preparatory behavior is disclosed',
    errors,
  );
  const currentUnsafe = requireYesNo(
    raw,
    'currentUnsafe',
    'whether the person cannot be kept safe right now',
    errors,
  );
  const directHumanReview = requireYesNo(
    raw,
    'directHumanReview',
    'whether direct human review is arranged',
    errors,
  );
  if (errors.length) return { ok: false as const, errors };

  const crisisSensitive = [ideation, intentOrPlan, behavior, currentUnsafe].includes('yes');
  const reviewGap = directHumanReview === 'no';
  const severity = crisisSensitive || reviewGap ? 'critical' : 'warning';

  return result(
    crisisSensitive
      ? 'Columbia suicide severity workflow: immediate safety review'
      : 'Columbia suicide severity workflow: continue clinician review',
    'This is a workflow entry for suicide-risk documentation and routing, not an official C-SSRS administration or score. Any ideation, intent, plan, behavior, inability to maintain safety, or missing direct review requires urgent local safety workflow.',
    severity,
    'Posner K, et al. The Columbia-Suicide Severity Rating Scale: initial validity and internal consistency findings. Am J Psychiatry. 2011;168(12):1266-1277.',
    {
      score: crisisSensitive ? 'safety-review' : 'screening-review',
      crisisSensitive,
      components: { ideation, intentOrPlan, behavior, currentUnsafe, directHumanReview },
      safetyAlert: CRISIS_SENSITIVE_SAFETY_MESSAGE,
    },
  );
}
