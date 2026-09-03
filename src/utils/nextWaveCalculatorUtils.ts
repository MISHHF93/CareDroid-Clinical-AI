export const SHOCK_INDEX_DISCLAIMER =
  'Hemodynamic screening support only. Does not diagnose shock, determine resuscitation strategy, or replace urgent escalation for unstable patients.';

export const ANION_GAP_DISCLAIMER =
  'Acid-base calculation support. Does not diagnose a specific disorder or replace blood gas, lactate, renal, toxicology, or institutional metabolic-acidosis pathways.';

export const RASS_DISCLAIMER =
  'Sedation/agitation documentation support only. Does not recommend sedative dosing, restraints, airway management, or delirium treatment.';

export const RASS_OPTIONS = Object.freeze([
  {
    value: 4,
    label: '+4 Combative',
    description: 'Overtly combative or violent; immediate danger to staff.',
  },
  {
    value: 3,
    label: '+3 Very agitated',
    description: 'Pulls/removes tubes or catheters; aggressive.',
  },
  {
    value: 2,
    label: '+2 Agitated',
    description: 'Frequent non-purposeful movement or ventilator dyssynchrony.',
  },
  {
    value: 1,
    label: '+1 Restless',
    description: 'Anxious or apprehensive but movements are not aggressive.',
  },
  {
    value: 0,
    label: '0 Alert and calm',
    description: 'Spontaneously pays attention to caregiver.',
  },
  {
    value: -1,
    label: '-1 Drowsy',
    description: 'Not fully alert, but sustained awakening to voice.',
  },
  {
    value: -2,
    label: '-2 Light sedation',
    description: 'Briefly awakens to voice with eye contact.',
  },
  {
    value: -3,
    label: '-3 Moderate sedation',
    description: 'Movement or eye opening to voice, but no eye contact.',
  },
  {
    value: -4,
    label: '-4 Deep sedation',
    description: 'No response to voice, but movement or eye opening to physical stimulation.',
  },
  {
    value: -5,
    label: '-5 Unarousable',
    description: 'No response to voice or physical stimulation.',
  },
]);

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function calculateShockIndex({ heartRate, systolicBp }: any = {}) {
  const hr = toFiniteNumber(heartRate);
  const sbp = toFiniteNumber(systolicBp);
  if (hr === null || sbp === null || hr <= 0 || sbp <= 0) return null;
  return Number((hr / sbp).toFixed(2));
}

export function interpretShockIndex(index) {
  const value = toFiniteNumber(index);
  if (value === null) return null;
  if (value >= 1) {
    return {
      riskCategory: 'critical',
      severity: 'critical',
      label: 'Markedly elevated shock index',
      interpretation:
        'Shock index is 1.0 or higher. Treat this as a hemodynamic warning sign and correlate immediately with perfusion, bleeding/sepsis risk, and local escalation pathways.',
      referenceLine: 'Shock index = heart rate / systolic blood pressure.',
    };
  }
  if (value >= 0.9) {
    return {
      riskCategory: 'elevated',
      severity: 'warning',
      label: 'Elevated shock index',
      interpretation:
        'Shock index is elevated. Review trend, perfusion, volume status, medication effects, and clinical context.',
      referenceLine:
        'Values around 0.5-0.7 are often considered typical in stable adults; thresholds vary by population.',
    };
  }
  return {
    riskCategory: 'not_elevated',
    severity: 'normal',
    label: 'Shock index not elevated',
    interpretation:
      'Shock index is not elevated by common adult screening thresholds. Continue to interpret alongside the full clinical picture.',
    referenceLine: 'A normal shock index does not rule out serious illness.',
  };
}

export function calculateAnionGap({ sodium, chloride, bicarbonate, albumin }: any = {}) {
  const na = toFiniteNumber(sodium);
  const cl = toFiniteNumber(chloride);
  const hco3 = toFiniteNumber(bicarbonate);
  if (na === null || cl === null || hco3 === null) return null;
  const anionGap = Number((na - (cl + hco3)).toFixed(1));
  const alb = toFiniteNumber(albumin);
  const correctedAnionGap =
    alb !== null && alb > 0 ? Number((anionGap + 2.5 * (4 - alb)).toFixed(1)) : null;
  return { anionGap, correctedAnionGap };
}

export function interpretAnionGap(value) {
  const gap = toFiniteNumber(value);
  if (gap === null) return null;
  if (gap > 12) {
    return {
      riskCategory: 'high',
      severity: 'warning',
      label: 'High anion gap',
      interpretation:
        'The anion gap is above the common adult reference range. Correlate with pH, lactate, ketones, renal function, toxins, and local acid-base workflows.',
      referenceLine:
        'Common adult reference range often cited around 8-12 mEq/L; local laboratory ranges vary.',
    };
  }
  if (gap < 8) {
    return {
      riskCategory: 'low',
      severity: 'warning',
      label: 'Low anion gap',
      interpretation:
        'The anion gap is below the common adult reference range. Consider lab artifact, albumin, paraproteins, and clinical context.',
      referenceLine: 'Interpret with local lab ranges and albumin when available.',
    };
  }
  return {
    riskCategory: 'normal',
    severity: 'normal',
    label: 'Anion gap in common reference range',
    interpretation:
      'The anion gap falls within a common adult reference range. This does not exclude mixed or non-gap acid-base disorders.',
    referenceLine: 'Anion gap = Na - (Cl + HCO3).',
  };
}

export function interpretRassScore(score) {
  const value: any = toFiniteNumber(score);
  const option = RASS_OPTIONS.find((row) => row.value === value);
  if (!option) return null;
  let severity = 'normal';
  let riskCategory = 'calm';
  if (value >= 2 || value <= -4) {
    severity = 'critical';
    riskCategory = value >= 2 ? 'agitated' : 'deep_sedation';
  } else if (value !== 0) {
    severity = 'warning';
    riskCategory = value > 0 ? 'restless' : 'sedated';
  }
  return {
    score: value,
    label: option.label,
    interpretation: option.description,
    severity,
    riskCategory,
    referenceLine: 'RASS ranges from +4 combative to -5 unarousable.',
  };
}
