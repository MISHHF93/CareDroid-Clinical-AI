export type MapCoordinate = Readonly<{ x: number; y: number }>;

export function buildRoutePolyline(path: readonly MapCoordinate[] = []): string {
  return path.map((point) => `${point.x},${point.y}`).join(' ');
}

export function vehicleMarkerTone(
  status: string,
  freshness: string = 'fresh',
): 'brand' | 'action' | 'good' | 'warning' | 'critical' | 'neutral' {
  if (freshness === 'offline') return 'critical';
  if (freshness === 'stale') return 'warning';
  if (status === 'maintenance') return 'critical';
  if (status === 'occupied') return 'action';
  if (status === 'active') return 'brand';
  if (status === 'available') return 'good';
  return 'neutral';
}

export function routeStatusColor(status: string): string {
  if (status === 'delayed') return 'var(--app-chart-5)';
  return 'var(--app-chart-1)';
}

export function alertSeverityTone(
  severity: string,
): 'neutral' | 'warning' | 'critical' {
  if (severity === 'critical' || severity === 'high') return 'critical';
  if (severity === 'medium') return 'warning';
  return 'neutral';
}