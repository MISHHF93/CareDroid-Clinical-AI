/**
 * NEXUS C-Spine Rule — cervical spine imaging decision support in blunt trauma.
 *
 * Reference: Hoffman JR, et al. Validity of a set of clinical criteria to rule out injury
 * to the cervical spine in patients with blunt trauma. N Engl J Med. 2000;343(2):94–99.
 *
 * Decision support only — does not clear the cervical spine or replace trauma evaluation.
 */

export const NEXUS_CSPINE_DISCLAIMER =
  'Trauma imaging decision support only. Does not clear the cervical spine, rule out injury with certainty, or mandate or defer radiography. Does not override clinician judgment or institutional trauma protocols.';

export const NEXUS_CRITERIA_META = [
  {
    key: 'midlineTenderness',
    label: 'Midline cervical spine tenderness',
    help: 'Posterior midline cervical-spine tenderness on palpation.',
  },
  {
    key: 'intoxication',
    label: 'Intoxication',
    help: 'Evidence of intoxication (e.g. alcohol, drugs) affecting reliable examination.',
  },
  {
    key: 'neurologicDeficit',
    label: 'Focal neurologic deficit',
    help: 'Focal neurologic deficit on examination.',
  },
  {
    key: 'distractingInjury',
    label: 'Distracting painful injury',
    help: 'Clinically significant distracting painful injury that may mask cervical symptoms.',
  },
  {
    key: 'normalAlertness',
    label: 'Normal alertness',
    help: 'Normal level of alertness (not somnolent, obtunded, or unreliable for exam).',
  },
];

/**
 * NEXUS low-risk (imaging not indicated by rule) requires ALL of:
 * - No midline tenderness
 * - No intoxication
 * - No focal neurologic deficit
 * - No distracting painful injury
 * - Normal alertness
 *
 * @param {{
 *   midlineTenderness?: boolean,
 *   intoxication?: boolean,
 *   neurologicDeficit?: boolean,
 *   distractingInjury?: boolean,
 *   normalAlertness?: boolean,
 * }} raw
 */
export function evaluateNexusCSpine(raw) {
  const midlineTenderness = Boolean(raw.midlineTenderness);
  const intoxication = Boolean(raw.intoxication);
  const neurologicDeficit = Boolean(raw.neurologicDeficit);
  const distractingInjury = Boolean(raw.distractingInjury);
  const normalAlertness = Boolean(raw.normalAlertness);

  /** @type {string[]} */
  const triggeredCriteria = [] as any[];

  if (midlineTenderness) triggeredCriteria.push('Midline cervical spine tenderness');
  if (intoxication) triggeredCriteria.push('Intoxication');
  if (neurologicDeficit) triggeredCriteria.push('Focal neurologic deficit');
  if (distractingInjury) triggeredCriteria.push('Distracting painful injury');
  if (!normalAlertness) triggeredCriteria.push('Altered alertness');

  const imagingIndicatedByRule = triggeredCriteria.length > 0;
  const lowRiskByRule = !imagingIndicatedByRule;

  return {
    midlineTenderness,
    intoxication,
    neurologicDeficit,
    distractingInjury,
    normalAlertness,
    imagingIndicatedByRule,
    lowRiskByRule,
    triggeredCriteria,
    ...interpretNexusCSpine({ imagingIndicatedByRule, lowRiskByRule, triggeredCriteria }),
  };
}

/**
 * @param {{
 *   imagingIndicatedByRule: boolean,
 *   lowRiskByRule: boolean,
 *   triggeredCriteria: string[],
 * }} input
 */
export function interpretNexusCSpine(input) {
  const { imagingIndicatedByRule, triggeredCriteria } = input;

  const referenceLine =
    'Hoffman JR, et al. Validity of a set of clinical criteria to rule out injury to the cervical spine in patients with blunt trauma. N Engl J Med. 2000;343(2):94–99.';

  const disclaimer = NEXUS_CSPINE_DISCLAIMER;

  if (imagingIndicatedByRule) {
    return {
      severity: 'warning',
      riskStratumLabel: 'NEXUS criteria present — not low-risk by rule',
      interpretation: `One or more NEXUS criteria are present (${triggeredCriteria.join('; ')}). In the derivation cohort, cervical spine imaging was obtained when criteria were not all absent. This is informational imaging decision support only — it does not direct radiography, CT, or clearance.`,
      disclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    riskStratumLabel: 'NEXUS low-risk stratum (all criteria absent)',
    interpretation:
      'All five NEXUS criteria are absent in this assessment — the patient meets the low-risk stratum in the validated rule. This does not clear the cervical spine or exclude injury with absolute certainty. Continue clinical judgment and local trauma protocols.',
    disclaimer,
    referenceLine,
  };
}
