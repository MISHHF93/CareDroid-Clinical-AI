/**
 * MELD and MELD-Na — liver disease severity indices (allocation-era laboratory model).
 *
 * MELD: Kamath PS et al. Hepatology. 2001;33(2):464–470; UNOS laboratory MELD.
 * MELD-Na: Kim WR et al. Hepatology. 2008;48(3):997–1005; UNOS sodium adjustment (2016 policy).
 *
 * Decision support only — not for transplant listing recommendations.
 */

import { bilirubinUmolLToMgDl } from './childPughCalculator';

/** Safe display for lab breakdown rows (avoids throwing on non-finite edge values). */
export function formatMeldLabValue(value, decimals = 2) {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

/** µmol/L ? mg/dL (creatinine) */
export function creatinineUmolLToMgDl(umolL) {
  if (!Number.isFinite(umolL)) return NaN;
  return umolL / 88.4;
}

/**
 * Apply UNOS laboratory floors/caps before ln() terms.
 * @param {{ bilirubinMgDl: number, inr: number, creatinineMgDl: number, onDialysis: boolean }} labs
 */
export function applyMeldLabClamps(labs) {
  const { onDialysis } = labs;
  let bilirubinMgDl = labs.bilirubinMgDl;
  let inr = labs.inr;
  let creatinineMgDl = labs.creatinineMgDl;

  if (!Number.isFinite(bilirubinMgDl) || bilirubinMgDl < 1) bilirubinMgDl = 1;
  if (!Number.isFinite(inr) || inr < 1) inr = 1;

  if (onDialysis) {
    creatinineMgDl = 4;
  } else {
    if (!Number.isFinite(creatinineMgDl) || creatinineMgDl < 1) creatinineMgDl = 1;
    if (creatinineMgDl > 4) creatinineMgDl = 4;
  }

  return { bilirubinMgDl, inr, creatinineMgDl, onDialysis: Boolean(onDialysis) };
}

/**
 * @param {{ bilirubinMgDl: number, inr: number, creatinineMgDl: number, onDialysis?: boolean }} labs
 * @returns {number|null} integer 6–40 typical; null if inputs invalid
 */
export function calculateMeldScore(labs) {
  if (
    !Number.isFinite(labs.bilirubinMgDl) ||
    !Number.isFinite(labs.inr) ||
    !Number.isFinite(labs.creatinineMgDl)
  ) {
    return null;
  }

  const clamped = applyMeldLabClamps(labs);
  const { bilirubinMgDl, inr, creatinineMgDl } = clamped;

  const raw =
    10 *
    (0.957 * Math.log(creatinineMgDl) +
      0.378 * Math.log(bilirubinMgDl) +
      1.12 * Math.log(inr) +
      0.643);

  const score = Math.round(raw);
  return Math.min(40, Math.max(6, score));
}

/** Clamp serum sodium for MELD-Na per UNOS (mEq/L). */
export function clampMeldSodiumMmolL(na) {
  if (!Number.isFinite(na)) return null;
  if (na < 125) return 125;
  if (na > 140) return 140;
  return na;
}

/**
 * MELD-Na with UNOS sodium adjustment; result is not below the laboratory MELD used for allocation math.
 * @param {number} meldScore — laboratory MELD before sodium step
 * @param {number} sodiumMmolL — serum sodium (mEq/L)
 */
export function calculateMeldNaScore(meldScore, sodiumMmolL) {
  if (!Number.isFinite(meldScore) || !Number.isFinite(sodiumMmolL)) return null;

  const meldForNa = meldScore < 11 ? 11 : meldScore;
  const na = clampMeldSodiumMmolL(sodiumMmolL);
  if (na === null) return null;

  const meldNaRaw =
    meldForNa +
    1.32 * (137 - na) -
    (0.025 * meldForNa + 0.033) * (140 - na);

  const rounded = Math.round(meldNaRaw);
  const withFloor = Math.max(meldScore, rounded);
  return Math.min(40, Math.max(6, withFloor));
}

/**
 * @param {{
 *   bilirubin: string|number,
 *   bilirubinUnit: 'mg_dl'|'umol_l',
 *   inr: string|number,
 *   creatinine: string|number,
 *   creatinineUnit: 'mg_dl'|'umol_l',
 *   onDialysis: boolean,
 *   sodium?: string|number,
 * }} raw
 */
export function meldLabsFromInputs(raw) {
  const biliNum =
    typeof raw.bilirubin === 'string' ? parseFloat(raw.bilirubin.trim()) : Number(raw.bilirubin);
  const inrNum = typeof raw.inr === 'string' ? parseFloat(raw.inr.trim()) : Number(raw.inr);
  const crNum =
    typeof raw.creatinine === 'string' ? parseFloat(raw.creatinine.trim()) : Number(raw.creatinine);
  const naRaw =
    raw.sodium === undefined || raw.sodium === null || raw.sodium === ''
      ? null
      : typeof raw.sodium === 'string'
        ? parseFloat(raw.sodium.trim())
        : Number(raw.sodium);

  let bilirubinMgDl = biliNum;
  if (raw.bilirubinUnit === 'umol_l') bilirubinMgDl = bilirubinUmolLToMgDl(biliNum);

  let creatinineMgDl = crNum;
  if (raw.creatinineUnit === 'umol_l') creatinineMgDl = creatinineUmolLToMgDl(crNum);

  return {
    bilirubinMgDl,
    inr: inrNum,
    creatinineMgDl,
    onDialysis: Boolean(raw.onDialysis),
    sodiumMmolL: naRaw,
    parsed: { biliNum, inrNum, crNum, naRaw },
  };
}

/**
 * @param {number} meld
 * @param {number|null} meldNa
 */
export function interpretMeldScores(meld, meldNa = null) {
  if (!Number.isFinite(meld)) return null;

  const referenceLine =
    'Kamath PS et al. Hepatology. 2001;33(2):464–470; Kim WR et al. Hepatology. 2008;48(3):997–1005; UNOS policy summaries.';

  const scoreForBand = meldNa !== null && Number.isFinite(meldNa) ? meldNa : meld;

  let severity = 'normal';
  let mortalityBand = '';
  let interpretation = '';

  if (scoreForBand >= 40) {
    severity = 'critical';
    mortalityBand = 'Very high 90-day mortality signal (historical cohort)';
    interpretation =
      'Scores in this range have been associated with very high short-term mortality in historical transplant-era cohorts. Use for severity context only — not for transplant candidacy or listing decisions on this screen.';
  } else if (scoreForBand >= 30) {
    severity = 'critical';
    mortalityBand = 'High 90-day mortality signal (historical cohort)';
    interpretation =
      'Scores ≥30 are associated with substantially increased short-term mortality in published MELD validation data. Escalate per local hepatology / critical-care pathways as clinically indicated.';
  } else if (scoreForBand >= 20) {
    severity = 'warning';
    mortalityBand = 'Moderately increased 90-day mortality signal';
    interpretation =
      'Scores 20–29 fall in a moderate-risk band in historical MELD cohorts. Interpret alongside ascites, encephalopathy, infection, and acute-on-chronic liver failure.';
  } else if (scoreForBand >= 10) {
    severity = 'normal';
    mortalityBand = 'Lower–intermediate 90-day mortality signal';
    interpretation =
      'Scores 10–19 are generally lower than higher MELD bands but do not exclude serious decompensation. Continue clinical monitoring.';
  } else {
    severity = 'normal';
    mortalityBand = 'Lower 90-day mortality signal (historical cohort)';
    interpretation =
      'Scores below 10 are associated with comparatively lower short-term mortality in historical data; clinical judgment remains essential.';
  }

  const meldNaNote =
    meldNa !== null && Number.isFinite(meldNa) && meldNa !== meld
      ? `MELD-Na (${meldNa}) differs from laboratory MELD (${meld}) after sodium adjustment per UNOS rules.`
      : meldNa !== null && Number.isFinite(meldNa)
        ? 'MELD-Na equals laboratory MELD for these inputs (no sodium adjustment applied).'
        : null;

  return {
    severity,
    mortalityBand,
    interpretation,
    meldNaNote,
    referenceLine,
    transplantDisclaimer:
      'This tool does not recommend transplant evaluation, listing, or treatment. Follow institutional hepatology and critical-care protocols.',
  };
}

/**
 * @param {Parameters<typeof meldLabsFromInputs>[0]} raw
 * @param {{ requireSodium?: boolean }} [opts]
 */
export function validateMeldInputs(raw, opts: any = {}) {
  const errors = [] as any[];
  const { requireSodium = false } = opts;

  const biliStr =
    raw.bilirubin === undefined || raw.bilirubin === null ? '' : String(raw.bilirubin).trim();
  const inrStr = raw.inr === undefined || raw.inr === null ? '' : String(raw.inr).trim();
  const crStr =
    raw.creatinine === undefined || raw.creatinine === null ? '' : String(raw.creatinine).trim();
  const naStr =
    raw.sodium === undefined || raw.sodium === null ? '' : String(raw.sodium).trim();

  if (!biliStr) errors.push('Enter total bilirubin.');
  if (!inrStr) errors.push('Enter INR.');
  if (!raw.onDialysis && !crStr) errors.push('Enter serum creatinine or mark dialysis (≥2×/week).');
  if (requireSodium && !naStr) errors.push('Enter serum sodium for MELD-Na.');

  const labs = meldLabsFromInputs(raw);

  if (biliStr && !Number.isFinite(labs.bilirubinMgDl)) {
    errors.push('Bilirubin must be a valid number.');
  } else if (biliStr && labs.bilirubinMgDl <= 0) {
    errors.push('Bilirubin must be a positive number.');
  }
  if (inrStr && !Number.isFinite(labs.inr)) {
    errors.push('INR must be a valid number.');
  } else if (inrStr && labs.inr <= 0) {
    errors.push('INR must be a positive number.');
  }
  if (!raw.onDialysis && crStr && !Number.isFinite(labs.creatinineMgDl)) {
    errors.push('Creatinine must be a valid number unless dialysis is selected.');
  } else if (!raw.onDialysis && crStr && labs.creatinineMgDl <= 0) {
    errors.push('Creatinine must be a positive number unless dialysis is selected.');
  }
  if (naStr && !Number.isFinite(labs.sodiumMmolL)) {
    errors.push('Sodium must be a valid number.');
  } else if (naStr && ((labs.sodiumMmolL as any) < 100 || (labs.sodiumMmolL as any) > 180)) {
    errors.push('Sodium should be between 100 and 180 mEq/L (values are clamped to 125–140 for MELD-Na).');
  }

  return { ok: errors.length === 0, errors, labs };
}

/**
 * Full compute payload for UI.
 * @param {Parameters<typeof meldLabsFromInputs>[0]} raw
 * @param {{ includeMeldNa: boolean }} [opts]
 */
export function computeMeldResult(raw, opts: any = {}) {
  const { includeMeldNa = false } = opts;
  const v = validateMeldInputs(raw, { requireSodium: includeMeldNa });
  if (!v.ok) return { ok: false, errors: v.errors };

  const clamped = applyMeldLabClamps(v.labs);
  const meld = calculateMeldScore(v.labs);
  if (meld === null) return { ok: false, errors: ['Unable to calculate MELD from the values provided.'] };

  let meldNa: any = null;
  let sodiumUsed = null;
  if (includeMeldNa && Number.isFinite(v.labs.sodiumMmolL)) {
    sodiumUsed = clampMeldSodiumMmolL(v.labs.sodiumMmolL);
    meldNa = calculateMeldNaScore(meld, v.labs.sodiumMmolL);
  }

  const interp = interpretMeldScores(meld, meldNa);
  return {
    ok: true,
    meld,
    meldNa,
    clamped,
    sodiumUsed,
    sodiumEntered: v.labs.sodiumMmolL,
    meldForNa: meld < 11 ? 11 : meld,
    ...interp,
  };
}
