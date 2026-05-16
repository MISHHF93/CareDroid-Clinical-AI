/**
 * qSOFA (quick SOFA) — bedside screening for higher risk of poor outcome in suspected infection.
 * One point each: RR ≥ 22/min, SBP ≤ 100 mmHg, altered mentation OR GCS < 15.
 *
 * Reference: Singer M, et al. The Third International Consensus Definitions for Sepsis and Septic Shock (Sepsis-3). JAMA. 2016;315(8):801-810.
 */

/**
 * @param {{ respiratoryRateGte22: boolean, systolicBpLte100: boolean, alteredMentationOrGcsLt15: boolean }} criteria
 * @returns {number} 0–3
 */
export function calculateQsofaScore(criteria) {
  const { respiratoryRateGte22, systolicBpLte100, alteredMentationOrGcsLt15 } = criteria;
  let score = 0;
  if (respiratoryRateGte22) score += 1;
  if (systolicBpLte100) score += 1;
  if (alteredMentationOrGcsLt15) score += 1;
  return score;
}

/**
 * Derive the three qSOFA criteria from vitals / mentation inputs.
 * @param {{ respiratoryRate: string|number, systolicBloodPressure: string|number, alteredMentation: boolean, gcs: string|number }} raw
 */
export function qsofaCriteriaFromInputs(raw) {
  const rr = typeof raw.respiratoryRate === 'string' ? parseFloat(raw.respiratoryRate) : Number(raw.respiratoryRate);
  const sbp = typeof raw.systolicBloodPressure === 'string' ? parseFloat(raw.systolicBloodPressure) : Number(raw.systolicBloodPressure);
  const gcsRaw = raw.gcs === '' || raw.gcs === undefined || raw.gcs === null ? null : typeof raw.gcs === 'string' ? parseFloat(raw.gcs) : Number(raw.gcs);

  const respiratoryRateGte22 = Number.isFinite(rr) && rr >= 22;
  const systolicBpLte100 = Number.isFinite(sbp) && sbp <= 100;
  const gcsLt15 = Number.isFinite(gcsRaw) && gcsRaw < 15;
  const alteredMentationOrGcsLt15 = Boolean(raw.alteredMentation) || gcsLt15;

  return {
    respiratoryRateGte22,
    systolicBpLte100,
    alteredMentationOrGcsLt15,
    parsed: { rr, sbp, gcs: gcsRaw },
  };
}

/**
 * @param {number} score 0–3
 * @returns {{ severity: 'normal'|'warning'|'critical', interpretation: string, referenceLine: string }}
 */
export function interpretQsofaScore(score) {
  const referenceLine = 'Singer M, et al. JAMA. 2016;315(8):801-810 (Sepsis-3).';
  if (score >= 2) {
    return {
      severity: 'critical',
      interpretation:
        'Score ≥2 suggests higher risk of poor outcome among patients with suspected infection; it is not diagnostic of sepsis or septic shock. Use alongside clinical judgment and further assessment (e.g., SOFA where appropriate).',
      referenceLine,
    };
  }
  if (score === 1) {
    return {
      severity: 'normal',
      interpretation:
        'One criterion present; not qSOFA-positive by the ≥2 threshold. Reassess if clinical picture changes.',
      referenceLine,
    };
  }
  return {
    severity: 'normal',
    interpretation: 'No qSOFA criteria met at this threshold set.',
    referenceLine,
  };
}

/**
 * @param {{ respiratoryRate: string|number, systolicBloodPressure: string|number, alteredMentation: boolean, gcs: string|number }} raw
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateQsofaInputs(raw) {
  const errors = [];
  const rr = typeof raw.respiratoryRate === 'string' ? raw.respiratoryRate.trim() : raw.respiratoryRate;
  const sbp = typeof raw.systolicBloodPressure === 'string' ? raw.systolicBloodPressure.trim() : raw.systolicBloodPressure;
  const gcsStr = raw.gcs === undefined || raw.gcs === null ? '' : String(raw.gcs).trim();

  if (rr === '' || Number.isNaN(parseFloat(rr))) {
    errors.push('Enter respiratory rate (breaths/min).');
  } else {
    const n = parseFloat(rr);
    if (n < 0 || n > 120) errors.push('Respiratory rate should be between 0 and 120.');
  }

  if (sbp === '' || Number.isNaN(parseFloat(sbp))) {
    errors.push('Enter systolic blood pressure (mmHg).');
  } else {
    const n = parseFloat(sbp);
    if (n < 40 || n > 300) errors.push('Systolic BP should be between 40 and 300 mmHg.');
  }

  if (gcsStr !== '') {
    const g = parseFloat(gcsStr);
    if (Number.isNaN(g) || g < 3 || g > 15) {
      errors.push('If entered, GCS must be between 3 and 15.');
    }
  }

  if (!raw.alteredMentation && gcsStr === '') {
    errors.push('Indicate altered mentation, or enter GCS (GCS < 15 counts toward mentation).');
  }

  return { ok: errors.length === 0, errors };
}
