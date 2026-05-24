import { buildDemoHospitalMapSnapshot } from '../data/demoHospitalMapData';

export const HOSPITAL_MAP_BACKEND_STATUS = Object.freeze({
  implemented: false,
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

export async function fetchHospitalMapSnapshot() {
  return {
    ok: true,
    unsupported: true,
    snapshot: buildDemoHospitalMapSnapshot(),
    backendStatus: HOSPITAL_MAP_BACKEND_STATUS,
    message:
      'Dedicated hospital map and device fleet backend endpoints are not implemented yet; showing clearly labeled demo telemetry.',
  };
}
