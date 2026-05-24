import { fetchLiveTrackingCapability } from './liveTrackingApi';

export const MEDICAL_IOT_BACKEND_STATUS = Object.freeze({
  implemented: true,
  demoContractOnly: true,
  plannedEndpoint: '/api/medical-iot/snapshot',
  plannedEndpoints: Object.freeze([
    '/api/devices/live',
    '/api/telemetry/live',
    '/api/alerts/devices',
    '/api/medical-iot/snapshot',
  ]),
  plannedModules: Object.freeze([
    'device-service',
    'telemetry-service',
    'vitals-stream-service',
    'alert-service',
    'device-registry-service',
  ]),
});

export const MEDICAL_IOT_EMPTY_SNAPSHOT = Object.freeze({
  source: 'empty',
  sourceLabel: 'No device telemetry available',
  generatedAt: null,
  devices: Object.freeze([]),
  vitals: Object.freeze([]),
  alerts: Object.freeze([]),
  trends: Object.freeze([]),
  connectivityTimeline: Object.freeze([]),
});

export function buildDemoMedicalIotSnapshot(referenceDate = new Date()) {
  const generatedAt = referenceDate.toISOString();
  return {
    source: 'demo-telemetry',
    sourceLabel: 'Demo telemetry - backend Medical IoT module not connected',
    generatedAt,
    devices: [
      {
        id: 'spo2-bed-12',
        name: 'Bed 12 Pulse Oximeter',
        type: 'Pulse oximeter',
        patientLabel: 'Patient A',
        status: 'online',
        battery: 82,
        connectivity: 'Wi-Fi',
        lastSeenAt: generatedAt,
        freshness: 'fresh',
        location: {
          label: 'ICU / Bed 12A',
          floorId: 'floor-2',
          room: 'ICU-12',
          x: 24,
          y: 34,
          source: 'Demo bedside gateway coordinate',
        },
      },
      {
        id: 'cgm-room-4',
        name: 'Room 4 Glucose Monitor',
        type: 'Continuous glucose monitor',
        patientLabel: 'Patient B',
        status: 'warning',
        battery: 28,
        connectivity: 'Bluetooth',
        lastSeenAt: new Date(referenceDate.getTime() - 7 * 60 * 1000).toISOString(),
        freshness: 'fresh',
        location: {
          label: 'Medical-Surgical Unit / Room 4',
          floorId: 'floor-3',
          room: 'MS-4',
          x: 58,
          y: 46,
          source: 'Demo Bluetooth gateway coordinate',
        },
      },
      {
        id: 'bp-home-7',
        name: 'Home BP Cuff',
        type: 'Blood pressure device',
        patientLabel: 'Patient C',
        status: 'offline',
        battery: 11,
        connectivity: 'Cellular',
        lastSeenAt: new Date(referenceDate.getTime() - 54 * 60 * 1000).toISOString(),
        freshness: 'offline',
        location: {
          label: 'Remote monitoring / Home zone 7',
          floorId: 'remote',
          room: 'Home-7',
          x: 78,
          y: 70,
          source: 'Demo remote patient coordinate',
        },
      },
    ],
    vitals: [
      {
        id: 'spo2',
        label: 'SpO2',
        value: '91%',
        unit: 'room air',
        status: 'abnormal',
        source: 'Bed 12 Pulse Oximeter',
        timestamp: generatedAt,
      },
      {
        id: 'glucose',
        label: 'Glucose',
        value: '64',
        unit: 'mg/dL',
        status: 'warning',
        source: 'Room 4 Glucose Monitor',
        timestamp: new Date(referenceDate.getTime() - 7 * 60 * 1000).toISOString(),
      },
      {
        id: 'bp',
        label: 'Blood pressure',
        value: '168/94',
        unit: 'mmHg',
        status: 'warning',
        source: 'Home BP Cuff',
        timestamp: new Date(referenceDate.getTime() - 54 * 60 * 1000).toISOString(),
      },
      {
        id: 'ecg',
        label: 'ECG / HR',
        value: '118',
        unit: 'bpm sinus tachy',
        status: 'abnormal',
        source: 'Telemetry patch',
        timestamp: new Date(referenceDate.getTime() - 2 * 60 * 1000).toISOString(),
      },
    ],
    alerts: [
      {
        id: 'spo2-low',
        severity: 'high',
        title: 'Low oxygen saturation',
        detail: 'SpO2 reading below configured review threshold.',
        source: 'Bed 12 Pulse Oximeter',
        timestamp: generatedAt,
      },
      {
        id: 'bp-offline',
        severity: 'medium',
        title: 'Offline device warning',
        detail: 'Home BP cuff has not reported for more than 45 minutes.',
        source: 'Home BP Cuff',
        timestamp: new Date(referenceDate.getTime() - 54 * 60 * 1000).toISOString(),
      },
    ],
    trends: [
      { label: 'SpO2', unit: '%', points: [96, 95, 94, 93, 91] },
      { label: 'Glucose', unit: 'mg/dL', points: [102, 88, 76, 69, 64] },
      { label: 'Heart rate', unit: 'bpm', points: [88, 96, 104, 111, 118] },
    ],
    connectivityTimeline: [
      { label: '00:00', online: 4, warning: 0, offline: 0 },
      { label: '00:15', online: 4, warning: 1, offline: 0 },
      { label: '00:30', online: 3, warning: 1, offline: 1 },
      { label: '00:45', online: 2, warning: 1, offline: 1 },
      { label: 'Now', online: 1, warning: 1, offline: 1 },
    ],
  };
}

async function fetchMedicalIotSnapshotFromApi(options = {}) {
  const { signal } = options;
  const [devicesResult, telemetryResult, alertsResult] = await Promise.all([
    fetchLiveTrackingCapability('medicalDeviceRegistry', '/api/devices/live', { signal }),
    fetchLiveTrackingCapability('telemetryLive', '/api/telemetry/live', { signal }),
    fetchLiveTrackingCapability('deviceAlerting', '/api/alerts/devices', { signal }),
  ]);

  if (!devicesResult.ok || !telemetryResult.ok || !alertsResult.ok) return null;

  const generatedAt =
    telemetryResult.payload?.generatedAt ||
    devicesResult.payload?.generatedAt ||
    telemetryResult.generatedAt ||
    new Date().toISOString();

  return {
    ok: true,
    unsupported: false,
    snapshot: {
      source: 'backend-demo-telemetry',
      sourceLabel:
        telemetryResult.sourceLabel ||
        'Backend demo Medical IoT contract - replace with real device feeds before clinical use',
      generatedAt,
      devices: devicesResult.payload?.devices || [],
      vitals: telemetryResult.payload?.vitals || [],
      alerts: alertsResult.payload?.alerts || [],
      trends: telemetryResult.payload?.trends || [],
      connectivityTimeline: telemetryResult.payload?.connectivityTimeline || [],
    },
    backendStatus: MEDICAL_IOT_BACKEND_STATUS,
    message:
      telemetryResult.message ||
      'Medical IoT uses backend demo telemetry only; do not treat it as live patient monitoring.',
  };
}

export async function fetchMedicalIotSnapshot(options = {}) {
  const apiSnapshot = await fetchMedicalIotSnapshotFromApi(options);
  if (apiSnapshot) return apiSnapshot;

  return {
    ok: true,
    unsupported: true,
    snapshot: buildDemoMedicalIotSnapshot(),
    backendStatus: MEDICAL_IOT_BACKEND_STATUS,
    message:
      'Dedicated Medical IoT backend endpoints are not implemented yet; showing clearly labeled demo telemetry.',
  };
}

export function formatTelemetryTime(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Invalid timestamp';
  return date.toLocaleString();
}
