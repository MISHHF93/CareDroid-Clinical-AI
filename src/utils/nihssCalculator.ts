/**
 * NIH Stroke Scale (NIHSS) — summed neurologic deficit score (0–42).
 *
 * Reference: Brott T, et al. Measurements of acute cerebral infarction: a clinical examination scale.
 * Stroke. 1989;20(7):864–870; NINDS NIH Stroke Scale training materials.
 *
 * Decision support only — does not replace urgent stroke evaluation or institutional stroke protocols.
 */

/** @typedef {{
 *   loc: number,
 *   locQuestions: number,
 *   locCommands: number,
 *   bestGaze: number,
 *   visualFields: number,
 *   facialPalsy: number,
 *   motorArmLeft: number,
 *   motorArmRight: number,
 *   motorLegLeft: number,
 *   motorLegRight: number,
 *   limbAtaxia: number,
 *   sensory: number,
 *   bestLanguage: number,
 *   dysarthria: number,
 *   extinctionInattention: number,
 * }} NihssItemScores */

export const NIHSS_ITEM_META = [
  { key: 'loc', label: '1a — Level of consciousness', min: 0, max: 3, untestableCode: null },
  { key: 'locQuestions', label: '1b — LOC questions', min: 0, max: 2, untestableCode: null },
  { key: 'locCommands', label: '1c — LOC commands', min: 0, max: 2, untestableCode: null },
  { key: 'bestGaze', label: '2 — Best gaze', min: 0, max: 2, untestableCode: null },
  { key: 'visualFields', label: '3 — Visual fields', min: 0, max: 3, untestableCode: null },
  { key: 'facialPalsy', label: '4 — Facial palsy', min: 0, max: 3, untestableCode: null },
  { key: 'motorArmLeft', label: '5a — Motor arm (left)', min: 0, max: 4, untestableCode: 9 },
  { key: 'motorArmRight', label: '5b — Motor arm (right)', min: 0, max: 4, untestableCode: 9 },
  { key: 'motorLegLeft', label: '6a — Motor leg (left)', min: 0, max: 4, untestableCode: 9 },
  { key: 'motorLegRight', label: '6b — Motor leg (right)', min: 0, max: 4, untestableCode: 9 },
  { key: 'limbAtaxia', label: '7 — Limb ataxia', min: 0, max: 2, untestableCode: 9 },
  { key: 'sensory', label: '8 — Sensory', min: 0, max: 2, untestableCode: null },
  { key: 'bestLanguage', label: '9 — Best language', min: 0, max: 3, untestableCode: null },
  { key: 'dysarthria', label: '10 — Dysarthria', min: 0, max: 1, untestableCode: 9 },
  {
    key: 'extinctionInattention',
    label: '11 — Extinction / inattention',
    min: 0,
    max: 2,
    untestableCode: null,
  },
];

/**
 * Untestable (9) contributes 0 to the total per standard NIHSS summation.
 * @param {number} itemScore
 * @param {{ untestableCode: number|null }} meta
 */
export function nihssItemPoints(itemScore, meta) {
  if (meta.untestableCode !== null && itemScore === meta.untestableCode) {
    return 0;
  }
  return itemScore;
}

/**
 * @param {Record<string, number>} raw
 * @returns {{ valid: boolean, errors: string[], scores?: NihssItemScores }}
 */
export function validateNihssInputs(raw) {
  const errors = [] as any[];
  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['Missing NIHSS input object'] };
  }

  /** @type {NihssItemScores} */
  const scores: any = {};

  for (const meta of NIHSS_ITEM_META) {
    const value = Number(raw[meta.key]);
    const allowed =
      meta.untestableCode !== null
        ? value === meta.untestableCode || (value >= meta.min && value <= meta.max)
        : value >= meta.min && value <= meta.max;

    if (!Number.isFinite(value) || !allowed) {
      errors.push(
        `${meta.label}: score must be ${meta.min}–${meta.max}` +
          (meta.untestableCode !== null ? ` or ${meta.untestableCode} if untestable` : '') +
          '.',
      );
    } else {
      scores[meta.key] = value;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], scores };
}

/**
 * @param {NihssItemScores} scores
 * @returns {{ total: number, breakdown: Record<string, number>, points: Record<string, number> }}
 */
export function computeNihssTotal(scores) {
  const breakdown = { ...scores };
  const points: any = {};
  let total = 0;

  for (const meta of NIHSS_ITEM_META) {
    const itemScore = scores[meta.key];
    const pts = nihssItemPoints(itemScore, meta);
    points[meta.key] = pts;
    total += pts;
  }

  return { total, breakdown, points };
}

/**
 * @param {number} total
 * @returns {'none' | 'minor' | 'moderate' | 'moderate-severe' | 'severe'}
 */
export function categorizeNihssSeverity(total) {
  if (!Number.isFinite(total) || total < 0) return null;
  if (total === 0) return 'none';
  if (total <= 4) return 'minor';
  if (total <= 15) return 'moderate';
  if (total <= 20) return 'moderate-severe';
  return 'severe';
}

/**
 * @param {number} total
 */
export function interpretNihssSeverity(total) {
  if (!Number.isFinite(total) || total < 0 || total > 42) {
    return null;
  }

  const band = categorizeNihssSeverity(total);

  const labelByBand = {
    none: 'No measurable deficit on NIHSS (score 0)',
    minor: 'Minor deficit severity band (NIHSS 1–4)',
    moderate: 'Moderate deficit severity band (NIHSS 5–15)',
    'moderate-severe': 'Moderate-to-severe deficit severity band (NIHSS 16–20)',
    severe: 'Severe deficit severity band (NIHSS 21–42)',
  };

  const severity =
    band === 'severe' || band === 'moderate-severe'
      ? 'critical'
      : band === 'moderate'
        ? 'warning'
        : 'normal';

  return {
    severity,
    label: labelByBand[band as any],
    severityBand: band,
    totalScore: total,
    interpretation: `Total NIHSS ${total} — ${labelByBand[band as any]}. This describes neurologic deficit severity on examination; it does not confirm acute ischemic stroke, hemorrhage, or large-vessel occlusion, and must not be used alone to direct reperfusion therapy.`,
    safetyDisclaimer:
      'NIHSS is for structured neurologic assessment and documentation. It does not replace urgent stroke evaluation, neuroimaging, last-known-well timing, or institutional acute stroke protocols. Do not delay emergency stroke care to complete scoring.',
    pathwayDisclaimer:
      'Follow local stroke pathways and treating team judgment for thrombolysis, thrombectomy, blood pressure management, and disposition. This tool does not recommend specific treatments.',
    referenceLine: 'NIH Stroke Scale — NINDS / Brott T, et al. Stroke. 1989;20(7):864–870.',
  };
}
