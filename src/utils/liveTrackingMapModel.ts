export type TrackingLayer = 'all' | 'fleet' | 'iot';

export type UnifiedTrackingMarker = Readonly<{
  id: string;
  layer: 'fleet' | 'iot';
  label: string;
  status: string;
  x: number;
  y: number;
  subtitle: string;
  freshness?: string;
}>;

const IOT_STATUS_TONE: Record<string, string> = {
  online: 'good',
  warning: 'warning',
  critical: 'critical',
  offline: 'critical',
};

const FLEET_STATUS_TONE: Record<string, string> = {
  active: 'brand',
  occupied: 'action',
  available: 'good',
  maintenance: 'critical',
};

export function buildFleetTrackingMarkers(
  vehicles: readonly {
    id: string;
    label: string;
    status: string;
    freshness?: string;
    mapPosition?: { x: number; y: number };
    destination?: string;
    etaMinutes?: number | null;
  }[] = [],
): UnifiedTrackingMarker[] {
  return vehicles.map((vehicle, index) => ({
    id: `fleet-${vehicle.id}`,
    layer: 'fleet',
    label: vehicle.label,
    status: vehicle.status,
    x: vehicle.mapPosition?.x ?? 12 + (index % 6) * 14,
    y: vehicle.mapPosition?.y ?? 18 + Math.floor(index / 6) * 16,
    subtitle: [
      vehicle.destination,
      vehicle.etaMinutes != null ? `ETA ${vehicle.etaMinutes}m` : null,
    ]
      .filter(Boolean)
      .join(' · '),
    freshness: vehicle.freshness,
  }));
}

export function buildIotTrackingMarkers(
  devices: readonly {
    id: string;
    name: string;
    status: string;
    type?: string;
    assignedRoom?: string;
    freshness?: string;
    location?: { x?: number; y?: number; label?: string };
  }[] = [],
): UnifiedTrackingMarker[] {
  return devices.map((device, index) => ({
    id: `iot-${device.id}`,
    layer: 'iot',
    label: device.name,
    status: device.status,
    x: device.location?.x ?? 20 + (index % 5) * 15,
    y: device.location?.y ?? 24 + Math.floor(index / 5) * 14,
    subtitle: [device.type, device.assignedRoom || device.location?.label, device.status]
      .filter(Boolean)
      .join(' · '),
    freshness: device.freshness,
  }));
}

export function filterTrackingMarkers(
  markers: readonly UnifiedTrackingMarker[],
  layer: TrackingLayer = 'all',
  statusFilter: string = 'all',
): UnifiedTrackingMarker[] {
  return markers.filter((marker) => {
    if (layer !== 'all' && marker.layer !== layer) return false;
    if (statusFilter !== 'all' && marker.status !== statusFilter) return false;
    return true;
  });
}

export function markerAccent(marker: UnifiedTrackingMarker): string {
  if (marker.layer === 'fleet') {
    return FLEET_STATUS_TONE[marker.status] || 'neutral';
  }
  return IOT_STATUS_TONE[marker.status] || 'neutral';
}
