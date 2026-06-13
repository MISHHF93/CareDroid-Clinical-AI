import type { Vitals } from '../types/emergency';

export type NEWS2Range = {
  min: number;
  max: number;
  score: number;
};

export type NEWS2Option = {
  label: string;
  score: number;
};

export type NEWS2Item =
  | {
      id: 'rr' | 'spo2_scale1' | 'sbp' | 'hr' | 'temp';
      label: string;
      ranges: NEWS2Range[];
      input: 'number';
      unit: string;
      storeField: keyof Vitals;
      note?: string;
    }
  | {
      id: 'air' | 'consciousness';
      label: string;
      options: NEWS2Option[];
      input: 'select';
    };

export type NEWS2Values = {
  rr?: number;
  spo2_scale1?: number;
  air?: string;
  sbp?: number;
  hr?: number;
  consciousness?: string;
  temp?: number;
};

export const NEWS2_ITEMS: NEWS2Item[] = [
  {
    id: 'rr',
    label: 'Respiration Rate (/min)',
    ranges: [
      { min: 0, max: 8, score: 3 },
      { min: 9, max: 11, score: 1 },
      { min: 12, max: 20, score: 0 },
      { min: 21, max: 24, score: 2 },
      { min: 25, max: 999, score: 3 },
    ],
    input: 'number',
    unit: '/min',
    storeField: 'rr',
  },
  {
    id: 'spo2_scale1',
    label: 'SpO2 Scale 1 (%)',
    note: 'Use for patients NOT requiring supplemental O2 target',
    ranges: [
      { min: 0, max: 91, score: 3 },
      { min: 92, max: 93, score: 2 },
      { min: 94, max: 95, score: 1 },
      { min: 96, max: 100, score: 0 },
    ],
    input: 'number',
    unit: '%',
    storeField: 'spo2',
  },
  {
    id: 'air',
    label: 'Air or Oxygen',
    options: [
      { label: 'Air', score: 0 },
      { label: 'On supplemental oxygen', score: 2 },
    ],
    input: 'select',
  },
  {
    id: 'sbp',
    label: 'Systolic BP (mmHg)',
    ranges: [
      { min: 0, max: 90, score: 3 },
      { min: 91, max: 100, score: 2 },
      { min: 101, max: 110, score: 1 },
      { min: 111, max: 219, score: 0 },
      { min: 220, max: 999, score: 3 },
    ],
    input: 'number',
    unit: 'mmHg',
    storeField: 'sbp',
  },
  {
    id: 'hr',
    label: 'Heart Rate (/min)',
    ranges: [
      { min: 0, max: 40, score: 3 },
      { min: 41, max: 50, score: 1 },
      { min: 51, max: 90, score: 0 },
      { min: 91, max: 110, score: 1 },
      { min: 111, max: 130, score: 2 },
      { min: 131, max: 999, score: 3 },
    ],
    input: 'number',
    unit: '/min',
    storeField: 'hr',
  },
  {
    id: 'consciousness',
    label: 'Consciousness',
    options: [
      { label: 'Alert (A)', score: 0 },
      { label: 'Confused (C)', score: 3 },
      { label: 'Responds to Voice (V)', score: 3 },
      { label: 'Responds to Pain (P)', score: 3 },
      { label: 'Unresponsive (U)', score: 3 },
    ],
    input: 'select',
  },
  {
    id: 'temp',
    label: 'Temperature (°C)',
    ranges: [
      { min: 0, max: 35.0, score: 3 },
      { min: 35.1, max: 36.0, score: 1 },
      { min: 36.1, max: 38.0, score: 0 },
      { min: 38.1, max: 39.0, score: 1 },
      { min: 39.1, max: 99, score: 2 },
    ],
    input: 'number',
    unit: '°C',
    storeField: 'temp',
  },
];

export function valueFromVitals(vitals?: Vitals): NEWS2Values {
  return {
    rr: numberValue(vitals?.rr ?? vitals?.respiratoryRate),
    spo2_scale1: numberValue(vitals?.spo2 ?? vitals?.oxygenSaturation),
    air: 'Air',
    sbp: numberValue(vitals?.sbp ?? vitals?.bpSystolic),
    hr: numberValue(vitals?.hr ?? vitals?.heartRate),
    consciousness: vitals?.gcs !== undefined && vitals.gcs < 15 ? 'Confused (C)' : 'Alert (A)',
    temp: numberValue(vitals?.temp ?? vitals?.temperature),
  };
}

export function scoreRange(value: number | undefined, ranges: NEWS2Range[]): number {
  if (value === undefined || Number.isNaN(value)) return 0;
  return ranges.find((range) => value >= range.min && value <= range.max)?.score ?? 0;
}

export function scoreNews2Item(item: NEWS2Item, values: NEWS2Values): number {
  if (item.input === 'select') {
    return item.options.find((option) => option.label === values[item.id])?.score ?? 0;
  }
  return scoreRange(values[item.id], item.ranges);
}

export function scoreNews2(values: NEWS2Values): { total: number; itemScores: Record<string, number>; hasSingleRed: boolean } {
  const itemScores = Object.fromEntries(NEWS2_ITEMS.map((item) => [item.id, scoreNews2Item(item, values)]));
  const total = Object.values(itemScores).reduce((sum, score) => sum + score, 0);
  return {
    total,
    itemScores,
    hasSingleRed: Object.values(itemScores).some((score) => score === 3),
  };
}

export function news2Response(total: number, hasSingleRed = false): {
  band: 'Low' | 'Medium' | 'High';
  recommendation: string;
  color: string;
  alertSeverity?: 'Warning' | 'Critical';
} {
  if (total >= 7) {
    return {
      band: 'High',
      recommendation: 'High — Emergency clinical review',
      color: '#EF4444',
      alertSeverity: 'Critical',
    };
  }
  if (total >= 5 || hasSingleRed) {
    return {
      band: 'Medium',
      recommendation: 'Medium — Urgent ward review',
      color: '#F59E0B',
      alertSeverity: 'Warning',
    };
  }
  return {
    band: 'Low',
    recommendation: 'Low — Ward-based monitoring',
    color: '#10B981',
  };
}

export function calculateNews2FromVitals(vitals: Vitals): ReturnType<typeof scoreNews2> & {
  values: NEWS2Values;
  response: ReturnType<typeof news2Response>;
} {
  const values = valueFromVitals(vitals);
  const result = scoreNews2(values);
  return {
    ...result,
    values,
    response: news2Response(result.total, result.hasSingleRed),
  };
}

function numberValue(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}
