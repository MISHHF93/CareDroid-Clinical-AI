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
  if (['online', 'fresh', 'ok', 'available'].includes(status)) return 'good';
  if (['warning', 'stale', 'due-soon', 'maintenance'].includes(status)) return 'warning';
  if (['offline', 'overdue', 'critical'].includes(status)) return 'critical';
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
    stale: devices.filter((device) => device.freshness === 'stale' || device.status === 'stale').length,
    lowBattery: devices.filter((device) => Number(device.battery) < 20).length,
    activeAlerts: alerts.filter((alert) => alert.status === 'active').length,
    maintenanceDue: devices.filter((device) =>
      ['due-soon', 'overdue'].includes(device.maintenanceStatus)
    ).length,
    calibrationOverdue: devices.filter((device) => device.calibrationStatus === 'overdue').length,
  };
}

async function fetchHospitalMapSnapshotFromApi(options = {}) {
  const { signal } = options;
  const [floorResult, deviceResult] = await Promise.all([
    fetchLiveTrackingCapability('hospitalMap', '/api/hospital-map/floors', { signal }),
    fetchLiveTrackingCapability('deviceFleet', '/api/hospital-map/devices', { signal }),
  ]);

  if (!floorResult.ok || !deviceResult.ok) return null;

  return {
    ok: true,
    unsupported: false,
    snapshot: {
      source: 'backend-demo-hospital-map',
      sourceLabel:
        floorResult.sourceLabel ||
        'Backend demo hospital map contract - replace with real floor/device feeds before clinical use',
      generatedAt: floorResult.generatedAt || deviceResult.generatedAt || new Date().toISOString(),
      floors: floorResult.payload?.floors || [],
      units: floorResult.payload?.units || [],
      rooms: floorResult.payload?.rooms || [],
      beds: floorResult.payload?.beds || [],
      devices: deviceResult.payload?.devices || [],
      alerts: deviceResult.payload?.alerts || [],
    },
    backendStatus: HOSPITAL_MAP_BACKEND_STATUS,
    message:
      deviceResult.message ||
      'Hospital map uses backend demo floor and device coordinates only; verify status in the system of record.',
  };
}

export async function fetchHospitalMapSnapshot(options = {}) {
  const apiSnapshot = await fetchHospitalMapSnapshotFromApi(options);
  if (apiSnapshot) return apiSnapshot;

  return {
    ok: true,
    unsupported: true,
    snapshot: buildDemoHospitalMapSnapshot(),
    backendStatus: HOSPITAL_MAP_BACKEND_STATUS,
    message:
      'Dedicated hospital map and device fleet backend endpoints are not implemented yet; showing clearly labeled demo telemetry.',
  };
}
