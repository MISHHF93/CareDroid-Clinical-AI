export type IotChartDatum = Readonly<{ name: string; value: number }>;

export type IotMapMarker = Readonly<{
  id: string;
  label: string;
  x: number;
  y: number;
  status: string;
  category: string;
  room: string;
  alarms: number;
}>;

const CATEGORY_LABELS: Record<string, string> = {
  monitor: 'Monitors',
  infusion: 'Infusion',
  ventilator: 'Ventilators',
  wearable: 'Wearables',
  imaging: 'Imaging',
  portable: 'Portable',
};

export function resolveDeviceCategory(type: string = ''): string {
  const normalized = type.toLowerCase();
  if (
    normalized.includes('glucose') ||
    normalized.includes('wearable') ||
    normalized.includes('patch')
  ) {
    return 'wearable';
  }
  if (normalized.includes('infusion') || normalized.includes('pump')) return 'infusion';
  if (normalized.includes('ventilat')) return 'ventilator';
  if (
    normalized.includes('pulse') ||
    normalized.includes('oximeter') ||
    normalized.includes('monitor')
  ) {
    return 'monitor';
  }
  if (normalized.includes('imaging') || normalized.includes('radiology')) return 'imaging';
  return 'portable';
}

export function categoryIconKey(category: string): string {
  if (category === 'monitor') return 'activity';
  if (category === 'infusion') return 'send';
  if (category === 'ventilator') return 'capacity';
  if (category === 'wearable') return 'stethoscope';
  if (category === 'imaging') return 'chart-bar';
  return 'route';
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] || category;
}

export function buildDeviceStatusChart(
  devices: readonly { status: string }[] = [],
): IotChartDatum[] {
  const counts = devices.reduce<Record<string, number>>((acc, device) => {
    const key = device.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value);
}

export function buildDeviceCategoryChart(
  devices: readonly { category: string }[] = [],
): IotChartDatum[] {
  const counts = devices.reduce<Record<string, number>>((acc, device) => {
    const key = categoryLabel(device.category || 'portable');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value);
}

export function buildConnectivityChart(
  timeline: readonly { label: string; online?: number; warning?: number; offline?: number }[] = [],
): IotChartDatum[] {
  const latest = timeline[timeline.length - 1];
  if (!latest) return [];

  return [
    { name: 'Online', value: latest.online ?? 0 },
    { name: 'Warning', value: latest.warning ?? 0 },
    { name: 'Offline', value: latest.offline ?? 0 },
  ].filter((row) => row.value > 0);
}

export function buildIotMapMarkers(
  devices: readonly {
    id: string;
    name: string;
    status: string;
    category: string;
    room: string;
    alarms?: number;
    x?: number;
    y?: number;
  }[] = [],
): IotMapMarker[] {
  return devices.map((device, index) => ({
    id: device.id,
    label: device.name,
    status: device.status,
    category: device.category,
    room: device.room,
    alarms: device.alarms ?? 0,
    x: device.x ?? 12 + (index % 6) * 14,
    y: device.y ?? 16 + Math.floor(index / 6) * 14,
  }));
}

export function deviceStatusTone(status: string): 'good' | 'warning' | 'critical' | 'neutral' {
  if (status === 'online') return 'good';
  if (status === 'warning') return 'warning';
  if (status === 'critical' || status === 'offline') return 'critical';
  return 'neutral';
}
