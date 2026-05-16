/**
 * NEWS2 — National Early Warning Score 2 (Royal College of Physicians standard).
 * Aggregate score from RR, SpO2 (Scale 1 or 2), supplemental oxygen, SBP, pulse,
 * consciousness, and temperature; escalation bands follow RCP trigger guidance.
 *
 * SpO2 Scale 2 must only be used for patients with a prescribed target range (typically 88–92%),
 * e.g. confirmed hypercapnic respiratory failure, under a competent clinician’s direction.
 *
 * Reference: Royal College of Physicians. National Early Warning Score (NEWS) 2.
 */

/** @typedef {'1' | '2'} News2Spo2Scale */

/**
 * @param {number} rr
 * @returns {number|null}
 */
export function scoreRespiratoryRate(rr) {
  if (!Number.isFinite(rr)) return null;
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 1;
  return 3;
}

/**
 * SpO2 Scale 1 (most patients) — oxygen delivery scored separately (+0 air / +2 oxygen).
 * @param {number} spo2
 */
export function scoreSpo2Scale1(spo2) {
  if (!Number.isFinite(spo2)) return null;
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

/**
 * SpO2 Scale 2 (target SpO2 88–92%, e.g. hypercapnic respiratory failure pathway).
 * @param {number} spo2
 * @param {boolean} supplementalOxygen
 */
export function scoreSpo2Scale2(spo2, supplementalOxygen) {
  if (!Number.isFinite(spo2)) return null;
  if (spo2 <= 83) return 3;
  if (spo2 <= 85) return 2;
  if (spo2 <= 87) return 1;
  if (spo2 <= 92) return 0;
  if (!supplementalOxygen) return 0;
  if (spo2 <= 94) return 1;
  if (spo2 <= 96) return 2;
  return 3;
}

/** Air vs supplemental oxygen (NEWS2 “Air or oxygen?” row). */
export function scoreSupplementalOxygen(supplementalOxygen) {
  return supplementalOxygen ? 2 : 0;
}

/**
 * @param {number} sbp systolic only
 */
export function scoreSystolicBp(sbp) {
  if (!Number.isFinite(sbp)) return null;
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

/**
 * @param {number} pulse
 */
export function scorePulse(pulse) {
  if (!Number.isFinite(pulse)) return null;
  if (pulse <= 40) return 3;
  if (pulse <= 50) return 1;
  if (pulse <= 90) return 0;
  if (pulse <= 110) return 1;
  if (pulse <= 130) return 2;
  return 3;
}

/** @param {boolean} newConfusion ACVPU — new confusion vs alert */
export function scoreConsciousness(newConfusion) {
  return newConfusion ? 3 : 0;
}

/**
 * @param {number} tempCelsius
 */
export function scoreTemperature(tempCelsius) {
  if (!Number.isFinite(tempCelsius)) return null;
  if (tempCelsius <= 35.0) return 3;
  if (tempCelsius <= 36.0) return 1;
  if (tempCelsius <= 38.0) return 0;
  if (tempCelsius <= 39.0) return 1;
  if (tempCelsius <= 40.0) return 2;
  return 3;
}

/**
 * @param {{
 *   respiratoryRate: string|number,
 *   spo2: string|number,
 *   spo2Scale: News2Spo2Scale|string,
 *   supplementalOxygen: boolean,
 *   systolicBp: string|number,
 *   pulse: string|number,
 *   newConfusion: boolean,
 *   temperature: string|number,
 * }} raw
 */
export function computeNews2Breakdown(raw) {
  const rr = toNum(raw.respiratoryRate);
  const spo2 = toNum(raw.spo2);
  const sbp = toNum(raw.systolicBp);
  const pulse = toNum(raw.pulse);
  const temp = toNum(raw.temperature);
  const scale = raw.spo2Scale === '2' || raw.spo2Scale === 2 ? '2' : '1';
  const onO2 = Boolean(raw.supplementalOxygen);
  const confused = Boolean(raw.newConfusion);

  const spo2Score = scale === '1' ? scoreSpo2Scale1(spo2) : scoreSpo2Scale2(spo2, onO2);
  const oxygenScore = scoreSupplementalOxygen(onO2);

  return {
    respiratoryRate: scoreRespiratoryRate(rr),
    spo2: spo2Score,
    supplementalOxygen: oxygenScore,
    systolicBp: scoreSystolicBp(sbp),
    pulse: scorePulse(pulse),
    consciousness: scoreConsciousness(confused),
    temperature: scoreTemperature(temp),
    spo2ScaleUsed: scale,
    parsed: { rr, spo2, sbp, pulse, temp },
  };
}

function toNum(v) {
  if (v === '' || v === undefined || v === null) return NaN;
  const n = typeof v === 'string' ? parseFloat(v.trim()) : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * @param {Record<string, number|null>} breakdown from computeNews2Breakdown
 */
export function sumNews2Score(breakdown) {
  const keys = [
    'respiratoryRate',
    'spo2',
    'supplementalOxygen',
    'systolicBp',
    'pulse',
    'consciousness',
    'temperature',
  ];
  let sum = 0;
  for (const k of keys) {
    const v = breakdown[k];
    if (v === null || v === undefined || Number.isNaN(v)) return null;
    sum += v;
  }
  return sum;
}

/**
 * @param {number} total
 * @param {Record<string, number|null>} breakdown
 */
export function interpretNews2Risk(total, breakdown) {
  const hasRed = ['respiratoryRate', 'spo2', 'systolicBp', 'pulse', 'consciousness', 'temperature'].some(
    (k) => breakdown[k] === 3
  );

  const referenceLine =
    'Royal College of Physicians. National Early Warning Score (NEWS) 2 — standard observation chart and escalation thresholds.';

  if (total >= 7) {
    return {
      riskBand: 'high',
      severity: 'critical',
      label: 'High risk band (aggregate)',
      interpretation:
        'Aggregate score 7 or more aligns with RCP NEWS2 guidance for a high-level clinical alert — urgent or emergency response by a team that includes staff with critical care skills. Escalation and diagnosis remain clinical decisions.',
      escalationHint:
        'Escalate per local policy; response team must be able to manage acute deterioration including airway support.',
      hasRed,
      referenceLine,
    };
  }

  if (total >= 5) {
    return {
      riskBand: 'medium',
      severity: 'warning',
      label: 'Medium risk band (aggregate)',
      interpretation:
        'Aggregate score 5–6 matches the RCP threshold for urgent clinical review by staff competent in assessment and treatment of acutely ill patients; it does not by itself define a diagnosis.',
      escalationHint: 'Increase monitoring frequency and arrange urgent ward-based or acute-team review per protocol.',
      hasRed,
      referenceLine,
    };
  }

  if (hasRed) {
    return {
      riskBand: 'low_medium_red',
      severity: 'warning',
      label: 'Single-parameter red score',
      interpretation:
        'A score of 3 in one physiological parameter (red score) should prompt urgent evaluation by a ward-based clinician to determine cause and monitoring frequency, even when the aggregate score is below 5. This pattern is not equivalent to a specific diagnosis.',
      escalationHint:
        'Does not automatically equal the same response as aggregate ≥5, but must not be ignored — clinical review is required.',
      hasRed: true,
      referenceLine,
    };
  }

  return {
    riskBand: 'low',
    severity: 'normal',
    label: 'Lower aggregate band',
    interpretation:
      'Aggregate score 0–4 with no single-parameter red score suggests a lower immediate escalation concern on this chart; continue routine observations per local policy and reassess if the clinical picture changes.',
    escalationHint: 'Continue scheduled observations; reassess if the clinical picture changes.',
    hasRed: false,
    referenceLine,
  };
}

/**
 * @param {{ respiratoryRate: string|number, spo2: string|number, spo2Scale: string|number, supplementalOxygen: boolean, systolicBp: string|number, pulse: string|number, newConfusion: boolean, temperature: string|number }} raw
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateNews2Inputs(raw) {
  const errors = [];

  const rr = typeof raw.respiratoryRate === 'string' ? raw.respiratoryRate.trim() : raw.respiratoryRate;
  if (rr === '' || Number.isNaN(parseFloat(rr))) errors.push('Enter respiratory rate (breaths/min).');
  else {
    const n = parseFloat(rr);
    if (n < 0 || n > 60) errors.push('Respiratory rate should be between 0 and 60.');
  }

  const spo2 = typeof raw.spo2 === 'string' ? raw.spo2.trim() : raw.spo2;
  if (spo2 === '' || Number.isNaN(parseFloat(spo2))) errors.push('Enter SpO₂ (%).');
  else {
    const n = parseFloat(spo2);
    if (n < 70 || n > 100) errors.push('SpO₂ should be between 70 and 100%.');
  }

  const scaleOk = raw.spo2Scale === '1' || raw.spo2Scale === '2' || raw.spo2Scale === 1 || raw.spo2Scale === 2;
  if (!scaleOk) errors.push('Select SpO₂ Scale 1 or Scale 2.');

  const sbp = typeof raw.systolicBp === 'string' ? raw.systolicBp.trim() : raw.systolicBp;
  if (sbp === '' || Number.isNaN(parseFloat(sbp))) errors.push('Enter systolic blood pressure (mmHg).');
  else {
    const n = parseFloat(sbp);
    if (n < 50 || n > 280) errors.push('Systolic BP should be between 50 and 280 mmHg.');
  }

  const pulse = typeof raw.pulse === 'string' ? raw.pulse.trim() : raw.pulse;
  if (pulse === '' || Number.isNaN(parseFloat(pulse))) errors.push('Enter pulse (beats/min).');
  else {
    const n = parseFloat(pulse);
    if (n < 20 || n > 220) errors.push('Pulse should be between 20 and 220 bpm.');
  }

  const temp = typeof raw.temperature === 'string' ? raw.temperature.trim() : raw.temperature;
  if (temp === '' || Number.isNaN(parseFloat(temp))) errors.push('Enter temperature (°C).');
  else {
    const n = parseFloat(temp);
    if (n < 30 || n > 43) errors.push('Temperature should be between 30 and 43 °C.');
  }

  return { ok: errors.length === 0, errors };
}
