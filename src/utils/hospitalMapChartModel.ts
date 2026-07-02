export type HospitalChartDatum = Readonly<{ name: string; value: number }>;

export type HospitalRoomMarker = Readonly<{
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  deviceCount: number;
  alertCount: number;
  tone: 'good' | 'warning' | 'critical' | 'neutral';
}>;

export type HospitalDeviceMarker = Readonly<{
  id: string;
  label: string;
  x: number;
  y: number;
  status: string;
  roomId?: string;
}>;

export function buildUnitOccupancyChart(
  units: readonly { name: string; occupied: number; total: number }[] = [],
): HospitalChartDatum[] {
  return units
    .map((unit) => ({
      name: unit.name.length > 14 ? `${unit.name.slice(0, 14)}…` : unit.name,
      value: unit.total > 0 ? Math.round((unit.occupied / unit.total) * 100) : 0,
    }))
    .filter((row) => row.value >= 0);
}

export function resolveRoomTone(deviceCount: number, alertCount: number): HospitalRoomMarker['tone'] {
  if (alertCount > 0) return 'critical';
  if (deviceCount > 2) return 'warning';
  if (deviceCount > 0) return 'good';
  return 'neutral';
}

export function buildRoomMarkers(
  rooms: readonly {
    id: string;
    roomNumber?: string;
    name?: string;
    label?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    deviceCount?: number;
    activeAlertCount?: number;
  }[] = [],
): HospitalRoomMarker[] {
  return rooms.map((room) => ({
    id: room.id,
    label: room.roomNumber || room.name || room.label || room.id,
    x: room.x ?? 0,
    y: room.y ?? 0,
    width: room.width ?? 180,
    height: room.height ?? 120,
    deviceCount: room.deviceCount ?? 0,
    alertCount: room.activeAlertCount ?? 0,
    tone: resolveRoomTone(room.deviceCount ?? 0, room.activeAlertCount ?? 0),
  }));
}

export function buildDeviceMarkers(
  devices: readonly {
    id: string;
    name: string;
    x?: number;
    y?: number;
    status?: string;
    roomId?: string;
    location?: { x?: number; y?: number };
  }[] = [],
): HospitalDeviceMarker[] {
  return devices.map((device) => ({
    id: device.id,
    label: device.name,
    x: device.x ?? device.location?.x ?? 0,
    y: device.y ?? device.location?.y ?? 0,
    status: device.status || 'unknown',
    roomId: device.roomId,
  }));
}