/**
 * Canadian C-Spine Rule (CCR) — imaging decision support in alert, stable blunt trauma.
 *
 * Reference: Stiell IG, et al. The Canadian C-spine rule for radiography in alert and stable trauma patients.
 * JAMA. 2001;286(15):1841–1848.
 *
 * Decision support only — does not clear the c-spine or replace trauma evaluation.
 */

/** @typedef {{
 *   age65OrOlder: boolean,
 *   dangerousMechanism: boolean,
 *   paresthesiasInExtremities: boolean,
 * }} CcrHighRiskInputs */

/** @typedef {{
 *   simpleRearEndMvc: boolean,
 *   sittingInEd: boolean,
 *   ambulatoryAtAnyTime: boolean,
 *   delayedNeckPainOnset: boolean,
 *   noMidlineCervicalTenderness: boolean,
 *   noDistractingPainfulInjury: boolean,
 * }} CcrLowRiskInputs */

/** @typedef {{
 *   gcs15AndStable?: boolean,
 *   bluntTraumaContext?: boolean,
 *   unreliableExamOrIntoxication?: boolean,
 *   pediatricUnder16?: boolean,
 * }} CcrApplicabilityInputs */

export const CCR_HIGH_RISK_META = [
  { key: 'age65OrOlder', label: 'Age = 65 years' },
  { key: 'dangerousMechanism', label: 'Dangerous mechanism' },
  { key: 'paresthesiasInExtremities', label: 'Paresthesias in extremities' },
];

export const CCR_LOW_RISK_META = [
  { key: 'simpleRearEndMvc', label: 'Simple rear-end MVC' },
  { key: 'sittingInEd', label: 'Sitting in ED' },
  { key: 'ambulatoryAtAnyTime', label: 'Ambulatory at any time since accident' },
  { key: 'delayedNeckPainOnset', label: 'Delayed onset of neck pain (not immediate)' },
  { key: 'noMidlineCervicalTenderness', label: 'No midline cervical tenderness' },
  { key: 'noDistractingPainfulInjury', label: 'No distracting painful injury' },
];

const HIGH_RISK_KEYS = CCR_HIGH_RISK_META.map((r) => r.key);
const LOW_RISK_KEYS = CCR_LOW_RISK_META.map((r) => r.key);

/**
 * @param {CcrHighRiskInputs} raw
 */
export function evaluateCcrHighRisk(raw) {
  const factors: any = {};
  for (const k of HIGH_RISK_KEYS) {
    factors[k] = Boolean(raw[k]);
  }
  const metKeys = HIGH_RISK_KEYS.filter((k) => factors[k]);
  return {
    anyHighRisk: metKeys.length > 0,
    factors,
    metKeys,
  };
}

/**
 * @param {CcrLowRiskInputs} raw
 */
export function evaluateCcrLowRisk(raw) {
  const factors: any = {};
  for (const k of LOW_RISK_KEYS) {
    factors[k] = Boolean(raw[k]);
  }
  const unmetKeys = LOW_RISK_KEYS.filter((k) => !factors[k]);
  return {
    allLowRisk: unmetKeys.length === 0,
    factors,
    unmetKeys,
  };
}

/**
 * @param {{
 *   highRisk: ReturnType<typeof evaluateCcrHighRisk>,
 *   lowRisk: ReturnType<typeof evaluateCcrLowRisk>,
 *   activeRotationLeft45: boolean,
 *   activeRotationRight45: boolean,
 * }} input
 * @returns {{
 *   imagingIndicatedByRule: boolean,
 *   branch: 'high-risk' | 'not-all-low-risk' | 'rom-fail' | 'rom-pass',
 *   romAssessed: boolean,
 * }}
 */
export function applyCanadianCSpineRule(input) {
  const { highRisk, lowRisk, activeRotationLeft45, activeRotationRight45 } = input;

  if (highRisk.anyHighRisk) {
    return {
      imagingIndicatedByRule: true,
      branch: 'high-risk',
      romAssessed: false,
    };
  }

  if (!lowRisk.allLowRisk) {
    return {
      imagingIndicatedByRule: true,
      branch: 'not-all-low-risk',
      romAssessed: false,
    };
  }

  const romPass = Boolean(activeRotationLeft45) && Boolean(activeRotationRight45);
  return {
    imagingIndicatedByRule: !romPass,
    branch: romPass ? 'rom-pass' : 'rom-fail',
    romAssessed: true,
  };
}

/**
 * @param {CcrApplicabilityInputs} [applicability]
 * @returns {string[]}
 */
export function ccrApplicabilityWarnings(applicability: any = {}) {
  const warnings = [] as any[];
  if (applicability.gcs15AndStable === false) {
    warnings.push('Patient is not alert and stable (GCS 15) — Canadian C-Spine Rule is not applicable.');
  }
  if (applicability.bluntTraumaContext === false) {
    warnings.push('No blunt trauma context — confirm indication for CCR.');
  }
  if (applicability.unreliableExamOrIntoxication) {
    warnings.push('Unreliable examination or intoxication — do not use CCR; pursue full trauma evaluation.');
  }
  if (applicability.pediatricUnder16) {
    warnings.push('Age under 16 — pediatric cervical spine rules may differ; CCR validation is primarily in adults.');
  }
  return warnings;
}

/**
 * @param {ReturnType<typeof applyCanadianCSpineRule>} result
 * @param {{ applicabilityWarnings?: string[] }} [opts]
 */
export function interpretCanadianCSpine(result, opts: any = {}) {
  if (!result || typeof result.imagingIndicatedByRule !== 'boolean') {
    return null;
  }

  const applicabilityWarnings = opts.applicabilityWarnings || [];
  const hasApplicabilityBlock = applicabilityWarnings.length > 0;

  const branchInterpretation = {
    'high-risk': 'At least one high-risk factor is present — cervical spine imaging is indicated by the Canadian C-Spine Rule.',
    'not-all-low-risk':
      'Not all low-risk criteria are met — cervical spine imaging is indicated by the Canadian C-Spine Rule.',
    'rom-fail':
      'All low-risk criteria are met but the patient cannot actively rotate the neck 45° left and right — imaging is indicated by the rule.',
    'rom-pass':
      'All low-risk criteria are met and active rotation 45° left and right is possible — imaging is not indicated by the Canadian C-Spine Rule (continue clinical assessment per local protocol).',
  };

  const imagingLabel = result.imagingIndicatedByRule
    ? 'Imaging indicated by CCR'
    : 'Imaging not indicated by CCR (low-risk pathway with adequate ROM)';

  const severity = result.imagingIndicatedByRule
    ? hasApplicabilityBlock
      ? 'warning'
      : 'warning'
    : 'normal';

  return {
    severity,
    label: imagingLabel,
    branch: result.branch,
    imagingIndicatedByRule: result.imagingIndicatedByRule,
    interpretation: branchInterpretation[result.branch],
    applicabilityWarnings,
    safetyDisclaimer:
      'The Canadian C-Spine Rule supports imaging decisions in alert, stable blunt trauma patients. It does not clear the cervical spine, does not rule out clinically important injury with certainty, and must not be applied to unstable patients.',
    pathwayDisclaimer:
      'Do not delay primary trauma survey, resuscitation, or urgently indicated imaging to complete this assessment. Follow institutional trauma and cervical spine protocols; clinician judgment overrides this tool.',
    referenceLine:
      'Stiell IG, et al. The Canadian C-spine rule for radiography in alert and stable trauma patients. JAMA. 2001;286(15):1841–1848.',
  };
}
