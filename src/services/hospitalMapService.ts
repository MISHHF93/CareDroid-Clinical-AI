import { buildDemoHospitalMapSnapshot } from '../data/demoHospitalMapData';
import { fetchLiveTrackingCapability } from './liveTrackingApi';

export const HOSPITAL_MAP_BACKEND_STATUS = Object.freeze({
  implemented: true,
  demoContractOnly: true,
  plannedEndpoints: Object.freeze([
    '/api/hospital-map/floors',
    '/api/hospital-map/units',
    '/api/hospital-map/rooms',
    '/api/hospital-map/devices',
    '/api/devices',
    '/api/devices/:id/telemetry',
    '/api/devices/:id/location-history',
    '/api/devices/:id/maintenance',
    '/api/telemetry/live',
    '/api/alerts/devices',
  ]),
  plannedModules: Object.freeze([
    'hospital-map',
    'device-registry',
    'telemetry',
    'alerting',
    'device-fleet',
    'maintenance',
    'location-tracking',
  ]),
});

export function formatHospitalMapTime(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toLocaleString();
}

export function getDeviceStatusTone(status) {
  if (['online', 'fresh', 'ok', 'available', 'normal'].includes(status)) return 'good';
  if (['warning', 'stale', 'due-soon', 'maintenance'].includes(status)) return 'warning';
  if (['offline', 'overdue', 'critical', 'abnormal'].includes(status)) return 'critical';
  return 'neutral';
}

export function summarizeHospitalMapSnapshot(snapshot) {
  const devices = snapshot?.devices || [];
  const alerts = snapshot?.alerts || [];
  return {
    floors: snapshot?.floors?.length || 0,
    rooms: snapshot?.rooms?.length || 0,
    beds: snapshot?.beds?.length || 0,
    devices: devices.length,
    offline: devices.filter((device) => device.status === 'offline').length,
    stale: devices.filter((device) => device.freshness === 'stale' || device.status === 'stale')
      .length,
    lowBattery: devices.filter((device) => Number(device.battery) < 20).length,
    activeAlerts: alerts.filter((alert) => alert.status === 'active').length,
    maintenanceDue: devices.filter((device) =>
      ['due-soon', 'overdue'].includes(device.maintenanceStatus),
    ).length,
    calibrationOverdue: devices.filter((device) => device.calibrationStatus === 'overdue').length,
  };
}

function titleFromKey(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeTelemetry(device) {
  const telemetry = device?.telemetry;
  if (Array.isArray(telemetry)) return telemetry;
  if (!telemetry || typeof telemetry !== 'object') return [];

  return Object.entries(telemetry).map(([key, value]) => ({
    id: `${device.id || 'device'}-${key}`,
    deviceId: device.id,
    parameter: key.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`),
    label: titleFromKey(key),
    value,
    unit: '',
    status: device.freshness || device.status || 'unknown',
    timestamp: device.lastSeenAt,
  }));
}

function normalizeAlert(alert, deviceById) {
  const device = deviceById[alert.deviceId] || {};
  const triggeredAt =
    alert.triggeredAt || alert.timestamp || alert.lastObservedAt || device.lastSeenAt || null;
  return {
    ...alert,
    deviceName: alert.deviceName || device.name || alert.source || 'Unknown device',
    triggeredAt,
    lastObservedAt: alert.lastObservedAt || triggeredAt,
    floorId: alert.floorId || device.floorId || null,
    unitId: alert.unitId || device.unitId || null,
    roomId: alert.roomId || device.roomId || null,
    bedId: alert.bedId || device.bedId || null,
  };
}

function normalizeDevice(device, alerts) {
  const location = device.location || {};
  const activeAlerts = alerts.filter(
    (alert) => alert.deviceId === device.id && (alert.status || 'active') === 'active',
  );
  return {
    ...device,
    x: device.x ?? location.x ?? 0,
    y: device.y ?? location.y ?? 0,
    locationSource: device.locationSource || location.source || 'Backend demo floor coordinate',
    patientLabel: device.patientLabel || 'Patient placeholder unavailable',
    serialNumber: device.serialNumber || 'Backend demo',
    firmwareVersion: device.firmwareVersion || 'Unknown',
    chargingState: device.chargingState || 'unknown',
    connectivity: device.connectivity || 'Unknown',
    signalStrength: device.signalStrength ?? 0,
    utilization: device.utilization ?? 0,
    activeAlerts,
    telemetry: normalizeTelemetry(device),
  };
}

function normalizeRoom(room, devices, alerts) {
  const roomDevices = devices.filter((device) => device.roomId === room.id);
  const activeAlertCount = alerts.filter(
    (alert) => alert.roomId === room.id && (alert.status || 'active') === 'active',
  ).length;
  return {
    ...room,
    roomNumber: room.roomNumber || room.name || room.label || room.id,
    deviceCount: room.deviceCount ?? roomDevices.length,
    activeAlertCount: room.activeAlertCount ?? activeAlertCount,
  };
}

export function normalizeHospitalMapBackendSnapshot({
  floorPayload = {} as any,
  devicePayload = {} as any,
  sourceLabel,
  generatedAt,
}: { floorPayload?: any; devicePayload?: any; sourceLabel?: any; generatedAt?: any } = {}) {
  const rawDevices = devicePayload.devices || [];
  const deviceById = Object.fromEntries(rawDevices.map((device) => [device.id, device]));
  const alerts = (devicePayload.alerts || []).map((alert) => normalizeAlert(alert, deviceById));
  const devices = rawDevices.map((device) => normalizeDevice(device, alerts));

  return {
    source: 'backend-demo-hospital-map',
    sourceLabel:
      sourceLabel ||
      'Backend demo hospital map contract - replace with real floor/device feeds before clinical use',
    generatedAt: generatedAt || new Date().toISOString(),
    floors: floorPayload.floors || [],
    units: floorPayload.units || [],
    rooms: (floorPayload.rooms || []).map((room) => normalizeRoom(room, devices, alerts)),
    beds: floorPayload.beds || [],
    devices,
    alerts,
  };
}

async function fetchHospitalMapSnapshotFromApi(options = {} as any) {
  const { signal } = options;
  const [floorResult, deviceResult] = await Promise.all([
    fetchLiveTrackingCapability('hospitalMap', '/api/hospital-map/floors', { signal }),
    fetchLiveTrackingCapability('deviceFleet', '/api/hospital-map/devices', { signal }),
  ]);

  if (!floorResult.ok || !deviceResult.ok) return null;

  return {
    ok: true,
    unsupported: false,
    snapshot: normalizeHospitalMapBackendSnapshot({
      floorPayload: floorResult.payload,
      devicePayload: deviceResult.payload,
      sourceLabel: floorResult.sourceLabel || deviceResult.sourceLabel,
      generatedAt: floorResult.generatedAt || deviceResult.generatedAt,
    }),
    backendStatus: HOSPITAL_MAP_BACKEND_STATUS,
    message:
      deviceResult.message ||
      'Hospital map uses backend demo floor and device coordinates only; verify status in the system of record.',
  };
}

export async function fetchHospitalMapSnapshot(options = {} as any) {
  const apiSnapshot = await fetchHospitalMapSnapshotFromApi(options);
  if (apiSnapshot) return apiSnapshot;

  return {
    ok: true,
    unsupported: true,
    snapshot: buildDemoHospitalMapSnapshot(),
    backendStatus: HOSPITAL_MAP_BACKEND_STATUS,
    message:
      'Hospital map backend endpoints are unavailable; showing clearly labeled local demo telemetry.',
  };
}
