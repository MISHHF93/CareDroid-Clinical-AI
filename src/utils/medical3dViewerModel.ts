export type AnatomyModelMarker = Readonly<{
  id: string;
  label: string;
  x: number;
  y: number;
  category: string;
  status: 'available' | 'demo' | 'restricted';
}>;

export const DEMO_ANATOMY_MODELS: AnatomyModelMarker[] = [
  { id: 'heart', label: 'Cardiac volume', x: 52, y: 38, category: 'Cardiology', status: 'demo' },
  { id: 'lung-l', label: 'Left lung field', x: 38, y: 42, category: 'Pulmonary', status: 'demo' },
  { id: 'lung-r', label: 'Right lung field', x: 64, y: 42, category: 'Pulmonary', status: 'demo' },
  {
    id: 'liver',
    label: 'Hepatic segment',
    x: 48,
    y: 58,
    category: 'Abdominal',
    status: 'available',
  },
  { id: 'brain', label: 'Neuro axis', x: 52, y: 18, category: 'Neurology', status: 'restricted' },
  { id: 'femur', label: 'Lower extremity', x: 50, y: 78, category: 'MSK', status: 'available' },
];

export function modelStatusLabel(status: AnatomyModelMarker['status']) {
  if (status === 'available') return 'Available';
  if (status === 'restricted') return 'Restricted';
  return 'Demo shell';
}

export function modelStatusTone(
  status: AnatomyModelMarker['status'],
): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'available') return 'good';
  if (status === 'demo') return 'warning';
  if (status === 'restricted') return 'critical';
  return 'neutral';
}
