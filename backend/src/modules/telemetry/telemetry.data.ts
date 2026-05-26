import { MedicalIotSnapshot } from './telemetry.types';

export const TELEMETRY_SOURCE = Object.freeze({
  demo: true,
  source: 'demo-medical-iot-telemetry',
  sourceLabel:
    'Backend demo Medical IoT telemetry - replace with real device feeds before clinical use',
  generatedBy: 'backend-telemetry-demo-service',
});

function minutesAgo(referenceDate: Date, minutes: number) {
  return new Date(referenceDate.getTime() - minutes * 60 * 1000).toISOString();
}

export function buildMedicalIotSnapshot(referenceDate = new Date()): MedicalIotSnapshot {
  const generatedAt = referenceDate.toISOString();

  const alerts = [
    {
      id: 'spo2-low',
      severity: 'high' as const,
      title: 'Low oxygen saturation',
      detail: 'SpO2 reading below configured review threshold.',
      source: 'Bed 12 Pulse Oximeter',
      deviceId: 'spo2-bed-12',
      status: 'active',
      timestamp: generatedAt,
    },
    {
      id: 'bp-offline',
      severity: 'medium' as const,
      title: 'Offline device warning',
      detail: 'Home BP cuff has not reported for more than 45 minutes.',
      source: 'Home BP Cuff',
      deviceId: 'bp-home-7',
      status: 'active',
      timestamp: minutesAgo(referenceDate, 54),
    },
    {
      id: 'glucose-warning',
      severity: 'medium' as const,
      title: 'Glucose warning',
      detail: 'Glucose monitor reading is below the configured review threshold.',
      source: 'Room 4 Glucose Monitor',
      deviceId: 'cgm-room-4',
      status: 'active',
      timestamp: minutesAgo(referenceDate, 7),
    },
  ];

  const devices = [
    {
      id: 'spo2-bed-12',
      name: 'Bed 12 Pulse Oximeter',
      type: 'Pulse oximeter',
      patientLabel: 'Patient A',
      status: 'online',
      battery: 82,
      signalStrength: 91,
      connectivity: 'Wi-Fi',
      lastSeenAt: generatedAt,
      freshness: 'fresh',
      assignedRoom: 'ICU-12',
      assignedBed: 'Bed 12A',
      activeAlerts: alerts
        .filter((alert) => alert.deviceId === 'spo2-bed-12')
        .map((alert) => alert.title),
      location: {
        label: 'ICU / Bed 12A',
        floorId: 'floor-2',
        room: 'ICU-12',
        x: 24,
        y: 34,
        source: 'Backend demo bedside gateway coordinate',
      },
    },
    {
      id: 'cgm-room-4',
      name: 'Room 4 Glucose Monitor',
      type: 'Continuous glucose monitor',
      patientLabel: 'Patient B',
      status: 'warning',
      battery: 28,
      signalStrength: 64,
      connectivity: 'Bluetooth',
      lastSeenAt: minutesAgo(referenceDate, 7),
      freshness: 'fresh',
      assignedRoom: 'MS-4',
      assignedBed: 'Room 4',
      activeAlerts: alerts
        .filter((alert) => alert.deviceId === 'cgm-room-4')
        .map((alert) => alert.title),
      location: {
        label: 'Medical-Surgical Unit / Room 4',
        floorId: 'floor-3',
        room: 'MS-4',
        x: 58,
        y: 46,
        source: 'Backend demo Bluetooth gateway coordinate',
      },
    },
    {
      id: 'bp-home-7',
      name: 'Home BP Cuff',
      type: 'Blood pressure device',
      patientLabel: 'Patient C',
      status: 'offline',
      battery: 11,
      signalStrength: 0,
      connectivity: 'Cellular',
      lastSeenAt: minutesAgo(referenceDate, 54),
      freshness: 'offline',
      assignedRoom: 'Home-7',
      assignedBed: 'Remote monitoring',
      activeAlerts: alerts
        .filter((alert) => alert.deviceId === 'bp-home-7')
        .map((alert) => alert.title),
      location: {
        label: 'Remote monitoring / Home zone 7',
        floorId: 'remote',
        room: 'Home-7',
        x: 78,
        y: 70,
        source: 'Backend demo remote patient coordinate',
      },
    },
    {
      id: 'ecg-icu-12',
      name: 'ICU-12 ECG Patch',
      type: 'ECG patch',
      patientLabel: 'Patient A',
      status: 'online',
      battery: 68,
      signalStrength: 86,
      connectivity: 'BLE gateway',
      lastSeenAt: minutesAgo(referenceDate, 2),
      freshness: 'fresh',
      assignedRoom: 'ICU-12',
      assignedBed: 'Bed 12A',
      activeAlerts: [],
      location: {
        label: 'ICU / Bed 12A',
        floorId: 'floor-2',
        room: 'ICU-12',
        x: 30,
        y: 38,
        source: 'Backend demo ECG gateway coordinate',
      },
    },
  ];

  const vitals = [
    {
      id: 'hr',
      label: 'HR',
      value: 118,
      unit: 'bpm',
      status: 'abnormal',
      source: 'ICU-12 ECG Patch',
      deviceId: 'ecg-icu-12',
      timestamp: minutesAgo(referenceDate, 2),
    },
    {
      id: 'spo2',
      label: 'SpO2',
      value: 91,
      unit: '% room air',
      status: 'abnormal',
      source: 'Bed 12 Pulse Oximeter',
      deviceId: 'spo2-bed-12',
      timestamp: generatedAt,
    },
    {
      id: 'bp',
      label: 'BP',
      value: '168/94',
      unit: 'mmHg',
      status: 'warning',
      source: 'Home BP Cuff',
      deviceId: 'bp-home-7',
      timestamp: minutesAgo(referenceDate, 54),
    },
    {
      id: 'respiratory-rate',
      label: 'RR',
      value: 22,
      unit: 'breaths/min',
      status: 'normal',
      source: 'ICU-12 respiratory device',
      deviceId: 'spo2-bed-12',
      timestamp: generatedAt,
    },
    {
      id: 'temperature',
      label: 'Temperature',
      value: 37.9,
      unit: 'C',
      status: 'warning',
      source: 'Room 4 ambient sensor',
      deviceId: 'cgm-room-4',
      timestamp: minutesAgo(referenceDate, 5),
    },
    {
      id: 'glucose',
      label: 'Glucose',
      value: 64,
      unit: 'mg/dL',
      status: 'warning',
      source: 'Room 4 Glucose Monitor',
      deviceId: 'cgm-room-4',
      timestamp: minutesAgo(referenceDate, 7),
    },
    {
      id: 'ecg',
      label: 'ECG',
      value: 'Sinus tachy',
      unit: 'rhythm',
      status: 'abnormal',
      source: 'ICU-12 ECG Patch',
      deviceId: 'ecg-icu-12',
      timestamp: minutesAgo(referenceDate, 2),
    },
  ];

  return {
    generatedAt,
    devices,
    vitals,
    alerts,
    trends: [
      { label: 'HR', unit: 'bpm', parameter: 'hr', points: [88, 96, 104, 111, 118] },
      { label: 'SpO2', unit: '%', parameter: 'spo2', points: [96, 95, 94, 93, 91] },
      { label: 'BP systolic', unit: 'mmHg', parameter: 'bp', points: [138, 144, 152, 160, 168] },
      {
        label: 'RR',
        unit: 'breaths/min',
        parameter: 'respiratory-rate',
        points: [16, 18, 20, 21, 22],
      },
      {
        label: 'Temperature',
        unit: 'C',
        parameter: 'temperature',
        points: [36.9, 37.1, 37.4, 37.7, 37.9],
      },
      { label: 'Glucose', unit: 'mg/dL', parameter: 'glucose', points: [102, 88, 76, 69, 64] },
      { label: 'ECG rate', unit: 'bpm', parameter: 'ecg', points: [90, 98, 106, 113, 118] },
    ],
    connectivityTimeline: [
      { label: '00:00', online: 4, warning: 0, offline: 0 },
      { label: '00:15', online: 4, warning: 1, offline: 0 },
      { label: '00:30', online: 3, warning: 1, offline: 1 },
      { label: '00:45', online: 2, warning: 1, offline: 1 },
      { label: 'Now', online: 2, warning: 1, offline: 1 },
    ],
  };
}
