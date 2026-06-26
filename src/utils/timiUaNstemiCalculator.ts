/**
 * TIMI risk score for unstable angina / NSTEMI (UA/NSTEMI).
 * Seven binary criteria, one point each (0–7).
 *
 * Reference: Antman EM, Cohen M, Bernink PJ, et al. The TIMI risk score for unstable angina/non-ST
 * elevation MI: A method to provide prognostic information for decision-makers. JAMA. 2000;284(7):835–842.
 */

/** @typedef {{
 *   age65OrOlder: boolean,
 *   threeOrMoreCadRiskFactors: boolean,
 *   knownCadStenosis50: boolean,
 *   aspirinLast7Days: boolean,
 *   severeAngina: boolean,
 *   stDeviation: boolean,
 *   elevatedCardiacMarkers: boolean,
 * }} TimiUaNstemiInputs */

export const TIMI_UA_NSTEMI_CRITERIA_META = [
  {
    key: 'age65OrOlder',
    shortLabel: 'Age ≥ 65 years',
    help: 'Patient age 65 years or older at presentation.',
  },
  {
    key: 'threeOrMoreCadRiskFactors',
    shortLabel: '≥ 3 CAD risk factors',
    help: 'Family history of CAD, hypertension, hypercholesterolaemia, diabetes mellitus, or current smoker (≥3 present).',
  },
  {
    key: 'knownCadStenosis50',
    shortLabel: 'Known CAD (stenosis ≥ 50%)',
    help: 'Prior coronary artery stenosis of 50% or more on angiography.',
  },
  {
    key: 'aspirinLast7Days',
    shortLabel: 'Aspirin use in past 7 days',
    help: 'Aspirin therapy within the 7 days before presentation.',
  },
  {
    key: 'severeAngina',
    shortLabel: 'Severe angina',
    help: 'At least two anginal episodes within 24 hours or angina at rest within the prior 24 hours.',
  },
  {
    key: 'stDeviation',
    shortLabel: 'ST-segment deviation ≥ 0.5 mm',
    help: 'ST-segment deviation of 0.5 mm or more on the admission ECG (not due to LVH or digoxin).',
  },
  {
    key: 'elevatedCardiacMarkers',
    shortLabel: 'Elevated cardiac markers',
    help: 'Elevated troponin or CK-MB above the local laboratory upper limit of normal.',
  },
];

const KEYS = TIMI_UA_NSTEMI_CRITERIA_META.map((r) => r.key);

/**
 * @param {TimiUaNstemiInputs} raw
 * @returns {Record<string, 0|1>}
 */
export function computeTimiBreakdown(raw) {
  const breakdown: any = {};
  for (const k of KEYS) {
    breakdown[k] = raw[k] ? 1 : 0;
  }
  return breakdown;
}

/**
 * @param {Record<string, 0|1>} breakdown
 */
export function sumTimiScore(breakdown) {
  let s = 0;
  for (const k of KEYS) {
    const v = breakdown[k];
    if (v !== 0 && v !== 1) return null;
    s += v;
  }
  return s;
}

/**
 * @param {TimiUaNstemiInputs} raw
 */
export function calculateTimiUaNstemiScore(raw) {
  const breakdown = computeTimiBreakdown(raw);
  return sumTimiScore(breakdown);
}

/**
 * 14-day composite (death, MI, urgent revascularisation) from validation cohort — decision support only.
 * @param {number} score 0–7
 */
export function interpretTimiUaNstemi(score) {
  if (!Number.isFinite(score) || score < 0 || score > 7) {
    return null;
  }

  const referenceLine =
    'Antman EM, Cohen M, Bernink PJ, et al. The TIMI risk score for unstable angina/non-ST elevation MI. JAMA. 2000;284(7):835–842.';

  const acsDisclaimer =
    'For patients with suspected acute coronary syndrome (UA/NSTEMI) only — not for STEMI. This score does not confirm ACS, does not establish a diagnosis, and does not recommend antiplatelet, anticoagulant, or invasive strategy — follow institutional ACS pathways and cardiology consultation.';

  if (score >= 5) {
    return {
      severity: 'critical',
      label: 'Higher TIMI risk band',
      riskBand: '5–7 points',
      approximateEventRate: 'Approximately 26–41% 14-day death, MI, or urgent revascularisation in the original validation cohort',
      interpretation:
        'A TIMI score of 5 or more is associated with a substantially higher rate of adverse events at 14 days in the UA/NSTEMI validation study. Use for risk stratification and documentation; escalate monitoring and specialist review per local ACS protocol.',
      acsDisclaimer,
      referenceLine,
    };
  }

  if (score >= 3) {
    return {
      severity: 'warning',
      label: 'Intermediate TIMI risk band',
      riskBand: '3–4 points',
      approximateEventRate: 'Approximately 13–20% 14-day death, MI, or urgent revascularisation in the original validation cohort',
      interpretation:
        'Scores of 3–4 fall in an intermediate-risk band in the TIMI UA/NSTEMI cohort. Interpret with serial ECGs, biomarkers, and clinical course; follow your unit’s intermediate-risk ACS pathway.',
      acsDisclaimer,
      referenceLine,
    };
  }

  return {
    severity: 'normal',
    label: 'Lower TIMI risk band',
    riskBand: '0–2 points',
    approximateEventRate: 'Approximately 4.7–8.3% 14-day death, MI, or urgent revascularisation in the original validation cohort',
    interpretation:
      'Scores of 0–2 are associated with comparatively lower 14-day event rates in the validation study, but adverse events still occur. Continue ACS evaluation and serial reassessment per protocol.',
    acsDisclaimer,
    referenceLine,
  };
}
