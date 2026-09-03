export type RadiologyChartDatum = Readonly<{ name: string; value: number }>;

export type RadiologyStudyRow = Readonly<{
  id: string;
  study: string;
  modality: 'CT' | 'MRI' | 'X-ray' | 'Ultrasound';
  status: 'critical' | 'preliminary' | 'finalized' | 'pending_read';
  patient: string;
  orderedAt: string;
}>;

export const DEMO_RADIOLOGY_STUDIES: RadiologyStudyRow[] = [
  {
    id: 'rad-001',
    study: 'CT Head w/o contrast',
    modality: 'CT',
    status: 'critical',
    patient: 'Bay 3',
    orderedAt: '9m ago',
  },
  {
    id: 'rad-002',
    study: 'CXR portable',
    modality: 'X-ray',
    status: 'preliminary',
    patient: 'ICU-12',
    orderedAt: '22m ago',
  },
  {
    id: 'rad-003',
    study: 'CT C-spine',
    modality: 'CT',
    status: 'finalized',
    patient: 'OBS-2',
    orderedAt: '38m ago',
  },
  {
    id: 'rad-004',
    study: 'RUQ ultrasound',
    modality: 'Ultrasound',
    status: 'pending_read',
    patient: 'Bay 7',
    orderedAt: '14m ago',
  },
  {
    id: 'rad-005',
    study: 'MRI brain w/ contrast',
    modality: 'MRI',
    status: 'pending_read',
    patient: 'Med-Surg B',
    orderedAt: '51m ago',
  },
  {
    id: 'rad-006',
    study: 'CT chest/abd/pelvis',
    modality: 'CT',
    status: 'preliminary',
    patient: 'ICU-14',
    orderedAt: '33m ago',
  },
];

export function buildRadiologyStatusChart(
  studies: readonly RadiologyStudyRow[] = DEMO_RADIOLOGY_STUDIES,
): RadiologyChartDatum[] {
  const counts = studies.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

export function buildRadiologyModalityChart(
  studies: readonly RadiologyStudyRow[] = DEMO_RADIOLOGY_STUDIES,
): RadiologyChartDatum[] {
  return [
    { name: 'CT', value: studies.filter((row) => row.modality === 'CT').length },
    { name: 'MRI', value: studies.filter((row) => row.modality === 'MRI').length },
    { name: 'X-ray', value: studies.filter((row) => row.modality === 'X-ray').length },
    { name: 'Ultrasound', value: studies.filter((row) => row.modality === 'Ultrasound').length },
  ].filter((row) => row.value > 0);
}

export function radiologyStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'finalized') return 'good';
  if (status === 'preliminary' || status === 'pending_read') return 'warning';
  if (status === 'critical') return 'critical';
  return 'neutral';
}
