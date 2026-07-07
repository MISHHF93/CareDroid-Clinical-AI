/**
 * HAS-BLED — bleeding risk factors in patients considered for anticoagulation (e.g. atrial fibrillation).
 * One point each (maximum 9): Hypertension, Abnormal renal, Abnormal liver, Stroke, Bleeding, Labile INR,
 * Elderly (>65), Drugs, Alcohol.
 *
 * Interpretation: score ≥3 suggests higher bleeding risk warranting closer review (not alone for treatment decisions).
 *
 * Reference: Pisters R, Lane DA, Nieuwlaat R, de Vos CB, Crijns HJ, Lip GY. Europace. 2010;12(7):923–928;
 * Lip GYH et al. Eur Heart J. 2010;31(8):1004–1019 (HAS-BLED acronym and components).
 */

/** @typedef {{ hypertension: boolean, renalDysfunction: boolean, liverDysfunction: boolean, strokeHistory: boolean, bleedingHistory: boolean, labileInr: boolean, ageOver65: boolean, bleedingPredisposingDrugs: boolean, alcoholUse: boolean }} HasBledInputs */

const KEYS = [
  'hypertension',
  'renalDysfunction',
  'liverDysfunction',
  'strokeHistory',
  'bleedingHistory',
  'labileInr',
  'ageOver65',
  'bleedingPredisposingDrugs',
  'alcoholUse',
];

/**
 * @param {HasBledInputs} raw
 * @returns {Record<string, 0|1>}
 */
export function computeHasBledBreakdown(raw) {
  const breakdown: any = {};
  for (const k of KEYS) {
    breakdown[k] = raw[k] ? 1 : 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, 0|1>} breakdown
 */
export function sumHasBledScore(breakdown) {
  let s = 0;
  for (const k of KEYS) {
    const v = breakdown[k];
    if (v !== 0 && v !== 1) return null;
    s += v;
  }
  return s;
}

/**
 * @param {HasBledInputs} raw
 */
export function calculateHasBledScore(raw) {
  const breakdown = computeHasBledBreakdown(raw);
  return sumHasBledScore(breakdown);
}

/**
 * @param {number} total 0–9
 */
export function interpretHasBled(total) {
  if (!Number.isFinite(total) || total < 0 || total > 9) {
    return null;
  }

  const referenceLine =
    'Pisters R, Lane DA, Nieuwlaat R, de Vos CB, Crijns HJ, Lip GY. Europace. 2010;12(7):923–928; Lip GYH et al. Eur Heart J. 2010;31(8):1004–1019.';

  if (total >= 3) {
    return {
      severity: 'critical',
      label: 'Elevated bleeding-risk signal',
      interpretation:
        'A HAS-BLED score of 3 or more is associated with higher bleeding risk and should prompt closer clinical review and risk–benefit discussion when anticoagulation is being considered. It does not by itself mandate a specific treatment choice.',
      bleedingRiskNote:
        'Use alongside validated stroke-risk tools (e.g. CHA2DS2-VASc) and patient preferences; follow local anticoagulation safety pathways.',
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Lower HAS-BLED score band',
    interpretation:
      'Scores below 3 are often associated with comparatively lower bleeding risk on this scale, but bleeding can still occur and clinical judgment remains essential.',
    bleedingRiskNote:
      'Continue routine monitoring and documentation per protocol when anticoagulation is used.',
    referenceLine,
  };
}

export const HAS_BLED_CRITERIA_META = [
  {
    key: 'hypertension',
    shortLabel: 'H — Hypertension',
    help: 'Uncontrolled hypertension: systolic blood pressure repeatedly >160 mmHg (or poorly controlled).',
  },
  {
    key: 'renalDysfunction',
    shortLabel: 'A — Abnormal renal function',
    help: 'Chronic dialysis, renal transplant, or serum creatinine =200 µmol/L (˜2.3 mg/dL) / severe renal impairment as defined locally.',
  },
  {
    key: 'liverDysfunction',
    shortLabel: 'A — Abnormal liver function',
    help: 'Cirrhosis or significant chronic hepatic disease (e.g. bilirubin >2× ULN with relevant enzyme elevations) per original criteria.',
  },
  {
    key: 'strokeHistory',
    shortLabel: 'S — Stroke history',
    help: 'Prior stroke or transient ischaemic attack.',
  },
  {
    key: 'bleedingHistory',
    shortLabel: 'B — Bleeding tendency / history',
    help: 'Prior major bleeding, predisposition to bleeding, or relevant haematological abnormality.',
  },
  {
    key: 'labileInr',
    shortLabel: 'L — Labile INR',
    help: 'Unstable / supratherapeutic INRs if the patient is on a vitamin K antagonist (or poor time in range where used).',
  },
  {
    key: 'ageOver65',
    shortLabel: 'E — Elderly (age >65)',
    help: 'Patient age greater than 65 years.',
  },
  {
    key: 'bleedingPredisposingDrugs',
    shortLabel: 'D — Drugs predisposing to bleeding',
    help: 'Concomitant antiplatelet agents, NSAIDs, or other medications that increase bleeding risk (as applicable).',
  },
  {
    key: 'alcoholUse',
    shortLabel: 'D — Alcohol use',
    help: 'Excessive alcohol use (e.g. =8 drinks/week in the original operational definition — confirm with local guidance).',
  },
];
