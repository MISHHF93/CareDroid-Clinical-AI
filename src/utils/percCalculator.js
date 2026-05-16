/**
 * PERC — Pulmonary Embolism Rule-out Criteria.
 * All eight criteria must be met (favorable findings) for PERC to be satisfied.
 * Valid only when pre-test probability of PE is already low (~≤15%).
 *
 * Reference: Kline JA, Courtney DM, Kabrhel C, et al. Prospective multicenter
 * evaluation of the pulmonary embolism rule-out criteria. J Thromb Haemost.
 * 2008;6(5):772–780; Kline JA et al. Ann Emerg Med. 2004;44(4 Suppl):S26–S27.
 */

/** @typedef {{
 *   ageUnder50: boolean,
 *   heartRateUnder100: boolean,
 *   spo2AtLeast95: boolean,
 *   noUnilateralLegSwelling: boolean,
 *   noHemoptysis: boolean,
 *   noRecentSurgeryOrTrauma: boolean,
 *   noPriorDvtOrPe: boolean,
 *   noEstrogenUse: boolean,
 * }} PercInputs */

export const PERC_CRITERIA_META = [
  {
    key: 'ageUnder50',
    shortLabel: 'Age < 50 years',
    help: 'Patient is younger than 50 years at presentation.',
  },
  {
    key: 'heartRateUnder100',
    shortLabel: 'Pulse < 100/min',
    help: 'Heart rate is less than 100 beats per minute.',
  },
  {
    key: 'spo2AtLeast95',
    shortLabel: 'SpO₂ ≥ 95% on room air',
    help: 'Oxygen saturation at least 95% while breathing room air.',
  },
  {
    key: 'noUnilateralLegSwelling',
    shortLabel: 'No unilateral leg swelling',
    help: 'No swelling of one leg greater than the other (clinical DVT sign absent).',
  },
  {
    key: 'noHemoptysis',
    shortLabel: 'No hemoptysis',
    help: 'No coughing blood reported or observed.',
  },
  {
    key: 'noRecentSurgeryOrTrauma',
    shortLabel: 'No surgery or trauma (past 4 weeks)',
    help: 'No surgery or trauma requiring hospitalisation within the previous 4 weeks.',
  },
  {
    key: 'noPriorDvtOrPe',
    shortLabel: 'No prior DVT or PE',
    help: 'No previous objectively diagnosed deep vein thrombosis or pulmonary embolism.',
  },
  {
    key: 'noEstrogenUse',
    shortLabel: 'No estrogen use',
    help: 'Not using oral contraceptives, hormone replacement, or other estrogen therapy.',
  },
];

const KEYS = PERC_CRITERIA_META.map((r) => r.key);

/**
 * @param {PercInputs} raw
 * @returns {Record<string, boolean>}
 */
export function evaluatePercCriteria(raw) {
  const evaluated = {};
  for (const k of KEYS) {
    evaluated[k] = Boolean(raw[k]);
  }
  return evaluated;
}

/**
 * PERC is satisfied only when every criterion is met.
 * @param {PercInputs} raw
 * @returns {{ satisfied: boolean, criteria: Record<string, boolean>, unmetKeys: string[] }}
 */
export function evaluatePerc(raw) {
  const criteria = evaluatePercCriteria(raw);
  const unmetKeys = KEYS.filter((k) => !criteria[k]);
  return {
    satisfied: unmetKeys.length === 0,
    criteria,
    unmetKeys,
  };
}

/**
 * @param {{ satisfied: boolean, unmetKeys: string[] }} result
 * @param {{ lowPretestProbabilityAcknowledged?: boolean }} [opts]
 */
export function interpretPerc(result, opts = {}) {
  if (!result || typeof result.satisfied !== 'boolean') {
    return null;
  }

  const referenceLine =
    'Kline JA, Courtney DM, Kabrhel C, et al. J Thromb Haemost. 2008;6(5):772–780; Kline JA et al. Ann Emerg Med. 2004.';

  const safetyDisclaimer =
    'PERC applies only when pre-test probability of pulmonary embolism is already low (typically ~15% or less by clinical gestalt or a validated pre-test tool). It does not rule out PE, does not replace clinical judgment, and must not be used in moderate- or high-risk patients.';

  const exclusionDisclaimer =
    'A satisfied PERC assessment in an appropriate low-risk patient may support avoiding further PE testing per local protocol — it is not binary proof that pulmonary embolism is absent. If any criterion is unmet, PERC is not satisfied for that purpose.';

  if (!opts.lowPretestProbabilityAcknowledged) {
    return {
      severity: 'warning',
      label: 'Confirm low pre-test probability first',
      percStatus: result.satisfied ? 'Criteria met on paper' : 'Criteria not all met',
      interpretation:
        'Before applying PERC, explicitly confirm that pre-test probability of PE is low. If pre-test probability is not low, do not use PERC to defer evaluation.',
      safetyDisclaimer,
      exclusionDisclaimer,
      referenceLine,
    };
  }

  if (result.satisfied) {
    return {
      severity: 'normal',
      label: 'PERC satisfied (all eight criteria met)',
      percStatus: 'PERC satisfied',
      interpretation:
        'All eight PERC criteria are met in this entry. In validation studies of low pre-test probability patients, a negative PERC was associated with a very low short-term PE rate — still document shared decision-making and follow local pathways. This is not definitive exclusion of pulmonary embolism.',
      safetyDisclaimer,
      exclusionDisclaimer,
      referenceLine,
    };
  }

  const unmetLabels = PERC_CRITERIA_META.filter((r) => result.unmetKeys.includes(r.key)).map(
    (r) => r.shortLabel
  );

  return {
    severity: 'warning',
    label: 'PERC not satisfied',
    percStatus: 'PERC not satisfied',
    interpretation:
      unmetLabels.length > 0
        ? `One or more criteria are not met (${unmetLabels.join('; ')}). PERC cannot be used to support deferring PE evaluation on this basis alone. Continue assessment per institutional acute chest pain / PE protocol.`
        : 'One or more criteria are not met. PERC cannot be used to support deferring PE evaluation on this basis alone.',
    safetyDisclaimer,
    exclusionDisclaimer,
    referenceLine,
  };
}
