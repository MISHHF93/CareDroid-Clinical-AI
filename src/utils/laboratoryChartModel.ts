export type LabChartDatum = Readonly<{ name: string; value: number }>;

export type LabResultRow = Readonly<{
  id: string;
  test: string;
  value: string;
  unit: string;
  status: 'normal' | 'abnormal' | 'critical' | 'pending';
  patient: string;
  collectedAt: string;
}>;

export const DEMO_LAB_RESULTS: LabResultRow[] = [
  {
    id: 'lab-001',
    test: 'Lactate',
    value: '4.2',
    unit: 'mmol/L',
    status: 'critical',
    patient: 'Bay 3',
    collectedAt: '12m ago',
  },
  {
    id: 'lab-002',
    test: 'Troponin I',
    value: '0.08',
    unit: 'ng/mL',
    status: 'abnormal',
    patient: 'ICU-12',
    collectedAt: '18m ago',
  },
  {
    id: 'lab-003',
    test: 'Creatinine',
    value: '1.1',
    unit: 'mg/dL',
    status: 'normal',
    patient: 'OBS-2',
    collectedAt: '25m ago',
  },
  {
    id: 'lab-004',
    test: 'WBC',
    value: '14.8',
    unit: 'K/uL',
    status: 'abnormal',
    patient: 'Bay 7',
    collectedAt: '31m ago',
  },
  {
    id: 'lab-005',
    test: 'BNP',
    value: '220',
    unit: 'pg/mL',
    status: 'abnormal',
    patient: 'Med-Surg B',
    collectedAt: '42m ago',
  },
  {
    id: 'lab-006',
    test: 'ABG pH',
    value: '7.48',
    unit: '',
    status: 'abnormal',
    patient: 'ICU-14',
    collectedAt: '55m ago',
  },
];

export function buildLabStatusChart(
  results: readonly LabResultRow[] = DEMO_LAB_RESULTS,
): LabChartDatum[] {
  const counts = results.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function buildSpecimenQueueChart(
  results: readonly LabResultRow[] = DEMO_LAB_RESULTS,
): LabChartDatum[] {
  return [
    { name: 'Critical', value: results.filter((row) => row.status === 'critical').length },
    { name: 'Abnormal', value: results.filter((row) => row.status === 'abnormal').length },
    { name: 'Pending', value: results.filter((row) => row.status === 'pending').length },
    { name: 'Normal', value: results.filter((row) => row.status === 'normal').length },
  ].filter((row) => row.value > 0);
}

export function labStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'normal') return 'good';
  if (status === 'abnormal' || status === 'pending') return 'warning';
  if (status === 'critical') return 'critical';
  return 'neutral';
}
