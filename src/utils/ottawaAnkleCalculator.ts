/**
 * Ottawa Ankle Rule and Ottawa foot rules — radiography decision support after acute injury.
 *
 * Reference: Stiell IG, et al. Implementation of the Ottawa ankle rules. JAMA. 1994;271(11):827–832;
 * Stiell IG, et al. Multicentre trial to introduce the Ottawa ankle rules. BMJ. 1995;311(7005):594–597.
 *
 * Decision support only — not fracture clearance; does not replace clinical judgment.
 */

/** @typedef {{
 *   painMalleolarZone: boolean,
 *   tendernessLateralMalleolus: boolean,
 *   tendernessMedialMalleolus: boolean,
 *   painMidfootZone: boolean,
 *   tendernessNavicular: boolean,
 *   tendernessFifthMetatarsalBase: boolean,
 *   unableToBearWeightBothTimes: boolean,
 * }} OttawaAnkleExamInputs */

/** @typedef {{
 *   acuteAnkleFootInjury?: boolean,
 *   neurovascularCompromise?: boolean,
 *   openFractureOrGrossDeformity?: boolean,
 *   severeTraumaOrMultisystem?: boolean,
 *   pediatricUnder18?: boolean,
 * }} OttawaApplicabilityInputs */

/**
 * @param {OttawaApplicabilityInputs} [applicability]
 * @returns {string[]}
 */
export function ottawaApplicabilityWarnings(applicability: any = {}) {
  const warnings = [] as any[];
  if (applicability.acuteAnkleFootInjury === false) {
    warnings.push('Not an acute ankle/foot injury context — Ottawa rules may not apply.');
  }
  if (applicability.neurovascularCompromise) {
    warnings.push(
      'Suspected neurovascular compromise — do not rely on Ottawa rules; pursue urgent evaluation and imaging per protocol.',
    );
  }
  if (applicability.openFractureOrGrossDeformity) {
    warnings.push(
      'Open fracture or gross deformity — Ottawa rules must not delay appropriate trauma care and imaging.',
    );
  }
  if (applicability.severeTraumaOrMultisystem) {
    warnings.push(
      'Severe or multisystem trauma — full trauma evaluation takes precedence over rule-out radiography pathways.',
    );
  }
  if (applicability.pediatricUnder18) {
    warnings.push(
      'Age under 18 — validated primarily in adults; consider pediatric-specific guidelines.',
    );
  }
  return warnings;
}

/**
 * @param {boolean} hardStopPresent
 */
export function ottawaRulesApplicable(hardStopPresent) {
  return !hardStopPresent;
}

/**
 * @param {OttawaAnkleExamInputs} exam
 * @returns {{ ankleRadiographIndicated: boolean, positiveCriteria: string[] }}
 */
export function evaluateOttawaAnkleRule(exam) {
  const positiveCriteria = [] as any[];
  if (!exam.painMalleolarZone) {
    return { ankleRadiographIndicated: false, positiveCriteria: [] };
  }

  if (exam.tendernessLateralMalleolus) {
    positiveCriteria.push('Bone tenderness posterior edge/tip of lateral malleolus');
  }
  if (exam.tendernessMedialMalleolus) {
    positiveCriteria.push('Bone tenderness posterior edge/tip of medial malleolus');
  }
  if (exam.unableToBearWeightBothTimes) {
    positiveCriteria.push('Unable to bear weight for 4 steps immediately and at evaluation');
  }

  return {
    ankleRadiographIndicated: positiveCriteria.length > 0,
    positiveCriteria,
  };
}

/**
 * @param {OttawaAnkleExamInputs} exam
 * @returns {{ footRadiographIndicated: boolean, positiveCriteria: string[] }}
 */
export function evaluateOttawaFootRule(exam) {
  const positiveCriteria = [] as any[];
  if (!exam.painMidfootZone) {
    return { footRadiographIndicated: false, positiveCriteria: [] };
  }

  if (exam.tendernessNavicular) {
    positiveCriteria.push('Bone tenderness at navicular');
  }
  if (exam.tendernessFifthMetatarsalBase) {
    positiveCriteria.push('Bone tenderness at base of fifth metatarsal');
  }
  if (exam.unableToBearWeightBothTimes) {
    positiveCriteria.push('Unable to bear weight for 4 steps immediately and at evaluation');
  }

  return {
    footRadiographIndicated: positiveCriteria.length > 0,
    positiveCriteria,
  };
}

/**
 * @param {OttawaAnkleExamInputs} exam
 * @param {{ applicabilityWarnings?: string[], rulesApplicable?: boolean }} [opts]
 */
export function applyOttawaAnkleFootRules(exam, opts: any = {}) {
  const ankle = evaluateOttawaAnkleRule(exam);
  const foot = evaluateOttawaFootRule(exam);
  const applicabilityWarnings = opts.applicabilityWarnings || [];
  const rulesApplicable = opts.rulesApplicable !== false;

  return {
    rulesApplicable,
    ankleRadiographIndicated: rulesApplicable && ankle.ankleRadiographIndicated,
    footRadiographIndicated: rulesApplicable && foot.footRadiographIndicated,
    anklePositiveCriteria: ankle.positiveCriteria,
    footPositiveCriteria: foot.positiveCriteria,
    applicabilityWarnings,
  };
}

/**
 * @param {ReturnType<typeof applyOttawaAnkleFootRules>} result
 */
export function interpretOttawaAnkleFootRules(result) {
  if (!result) return null;

  if (!result.rulesApplicable) {
    return {
      severity: 'critical',
      label: 'Ottawa rules not applicable — urgent evaluation',
      ankleRadiographIndicated: null,
      footRadiographIndicated: null,
      interpretation:
        'One or more applicability limits apply (e.g. neurovascular compromise, open fracture, gross deformity, severe trauma). Do not use Ottawa rules to defer appropriate care; follow institutional trauma and orthopedic protocols.',
      applicabilityWarnings: result.applicabilityWarnings,
      safetyDisclaimer:
        'Ottawa ankle and foot rules are for acute ankle/foot injury without hard-stop features. They do not rule out fracture with certainty and do not replace clinician judgment.',
      pathwayDisclaimer:
        'Clinician judgment and local protocols override this tool. Address neurovascular status, open injury, and deformity immediately.',
      referenceLine:
        'Stiell IG, et al. Ottawa ankle rules. JAMA. 1994;271(11):827–832; Stiell IG, et al. BMJ. 1995;311(7005):594–597.',
    };
  }

  const ankleText = result.ankleRadiographIndicated
    ? 'Ankle radiograph indicated by Ottawa Ankle Rule'
    : 'Ankle radiograph not indicated by Ottawa Ankle Rule';
  const footText = result.footRadiographIndicated
    ? 'Foot radiograph indicated by Ottawa foot rules'
    : 'Foot radiograph not indicated by Ottawa foot rules';

  const severity =
    result.ankleRadiographIndicated || result.footRadiographIndicated ? 'warning' : 'normal';

  const detailParts = [] as any[];
  if (result.anklePositiveCriteria.length) {
    detailParts.push(`Ankle criteria met: ${result.anklePositiveCriteria.join('; ')}`);
  }
  if (result.footPositiveCriteria.length) {
    detailParts.push(`Foot criteria met: ${result.footPositiveCriteria.join('; ')}`);
  }

  return {
    severity,
    label: `${ankleText}; ${footText}`,
    ankleRadiographIndicated: result.ankleRadiographIndicated,
    footRadiographIndicated: result.footRadiographIndicated,
    interpretation: `${ankleText}. ${footText}.${
      detailParts.length ? ` ${detailParts.join('. ')}.` : ''
    } A negative result does not exclude fracture — document shared decision-making per local pathway.`,
    applicabilityWarnings: result.applicabilityWarnings,
    safetyDisclaimer:
      'For acute ankle/foot injury only. Ottawa rules support radiography decisions; they do not prove absence of injury, do not address Maisonneuve or proximal injuries, and must not override clinician judgment.',
    pathwayDisclaimer:
      'Follow institutional musculoskeletal and emergency medicine protocols for imaging, splinting, and follow-up.',
    referenceLine:
      'Stiell IG, et al. Ottawa ankle rules. JAMA. 1994;271(11):827–832; Stiell IG, et al. BMJ. 1995;311(7005):594–597.',
  };
}
