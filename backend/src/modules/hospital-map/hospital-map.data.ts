import {
  HospitalMapAlert,
  HospitalMapBed,
  HospitalMapDevice,
  HospitalMapFilter,
  HospitalMapFloor,
  HospitalMapRoom,
  HospitalMapSnapshot,
  HospitalMapTelemetryReading,
  HospitalMapUnit,
} from './hospital-map.types';

export const HOSPITAL_MAP_SOURCE = Object.freeze({
  source: 'demo-hospital-map',
  sourceLabel:
    'Backend demo hospital map contract - replace with real floor/device feeds before clinical use',
  demo: true,
});

const SVG_WIDTH = 1000;
const SVG_HEIGHT = 620;
const COORDINATE_SYSTEM = 'svg-viewbox-1000x620';

function minutesAgo(referenceDate: Date, minutes: number) {
  return new Date(referenceDate.getTime() - minutes * 60 * 1000).toISOString();
}

function svgLocationLabel(room: HospitalMapRoom, bed?: HospitalMapBed) {
  return bed ? `${room.roomNumber} / ${bed.label}` : room.roomNumber;
}

function roomSearchBlob(room: HospitalMapRoom, unit?: HospitalMapUnit) {
  return [room.id, room.roomNumber, unit?.name, unit?.shortCode].filter(Boolean).join(' ').toLowerCase();
}

function deviceSearchBlob(device: HospitalMapDevice, room?: HospitalMapRoom, bed?: HospitalMapBed) {
  return [
    device.id,
    device.name,
    device.type,
    device.status,
    device.freshness,
    device.serialNumber,
    device.patientLabel,
    room?.roomNumber,
    bed?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function summarizeRooms(
  rooms: HospitalMapRoom[],
  devices: HospitalMapDevice[],
  alerts: HospitalMapAlert[],
) {
  return rooms.map((room) => ({
    ...room,
    deviceCount: devices.filter((device) => device.roomId === room.id).length,
    activeAlertCount: alerts.filter(
      (alert) => alert.roomId === room.id && (alert.status || 'active') === 'active',
    ).length,
  }));
}

export function buildHospitalMapSnapshot(referenceDate = new Date()): HospitalMapSnapshot {
  const generatedAt = referenceDate.toISOString();
  const floors: HospitalMapFloor[] = [
    {
      id: 'floor-2',
      name: 'Floor 2',
      building: 'CareDroid Main Hospital',
      level: 2,
      coordinateSystem: COORDINATE_SYSTEM,
      viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
      svgWidth: SVG_WIDTH,
      svgHeight: SVG_HEIGHT,
    },
    {
      id: 'floor-3',
      name: 'Floor 3',
      building: 'CareDroid Main Hospital',
      level: 3,
      coordinateSystem: COORDINATE_SYSTEM,
      viewBox: `0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`,
      svgWidth: SVG_WIDTH,
      svgHeight: SVG_HEIGHT,
    },
  ];

  const units: HospitalMapUnit[] = [
    { id: 'icu', floorId: 'floor-2', name: 'ICU', type: 'critical-care', shortCode: 'ICU' },
    {
      id: 'ed',
      floorId: 'floor-2',
      name: 'Emergency Department',
      type: 'emergency',
      shortCode: 'ED',
    },
    {
      id: 'med-surg',
      floorId: 'floor-3',
      name: 'Medical-Surgical Unit',
      type: 'ward',
      shortCode: 'MS',
    },
  ];

  const rooms: HospitalMapRoom[] = [
    { id: 'icu-12', floorId: 'floor-2', unitId: 'icu', roomNumber: 'ICU-12', x: 84, y: 82, width: 210, height: 145 },
    { id: 'icu-14', floorId: 'floor-2', unitId: 'icu', roomNumber: 'ICU-14', x: 326, y: 82, width: 210, height: 145 },
    { id: 'icu-15', floorId: 'floor-2', unitId: 'icu', roomNumber: 'ICU-15', x: 568, y: 82, width: 210, height: 145 },
    { id: 'ed-4', floorId: 'floor-2', unitId: 'ed', roomNumber: 'ED-4', x: 84, y: 350, width: 210, height: 145 },
    { id: 'ed-6', floorId: 'floor-2', unitId: 'ed', roomNumber: 'ED-6', x: 326, y: 350, width: 210, height: 145 },
    { id: 'ms-210', floorId: 'floor-3', unitId: 'med-surg', roomNumber: '210', x: 84, y: 82, width: 210, height: 145 },
    { id: 'ms-212', floorId: 'floor-3', unitId: 'med-surg', roomNumber: '212', x: 326, y: 82, width: 210, height: 145 },
  ];

  const beds: HospitalMapBed[] = [
    { id: 'bed-icu-12-a', roomId: 'icu-12', label: 'Bed 12A', status: 'occupied', patientLabel: 'Patient A', x: 122, y: 178, width: 76, height: 24 },
    { id: 'bed-icu-14-a', roomId: 'icu-14', label: 'Bed 14A', status: 'occupied', patientLabel: 'Patient B', x: 364, y: 178, width: 76, height: 24 },
    { id: 'bed-icu-15-a', roomId: 'icu-15', label: 'Bed 15A', status: 'occupied', patientLabel: 'Patient C', x: 606, y: 178, width: 76, height: 24 },
    { id: 'bed-ed-4-a', roomId: 'ed-4', label: 'Bed ED-4A', status: 'occupied', patientLabel: 'Patient D', x: 122, y: 446, width: 86, height: 24 },
    { id: 'bed-ed-6-a', roomId: 'ed-6', label: 'Bed ED-6A', status: 'available', patientLabel: 'Unassigned', x: 364, y: 446, width: 86, height: 24 },
    { id: 'bed-ms-210-a', roomId: 'ms-210', label: 'Bed 210A', status: 'occupied', patientLabel: 'Patient E', x: 122, y: 178, width: 86, height: 24 },
    { id: 'bed-ms-212-a', roomId: 'ms-212', label: 'Bed 212A', status: 'cleaning', patientLabel: 'Unassigned', x: 364, y: 178, width: 86, height: 24 },
  ];

  const telemetry: HospitalMapTelemetryReading[] = [
    { id: 'hr-spo2-icu-12', deviceId: 'spo2-icu-12', parameter: 'heart-rate', label: 'Heart rate', value: 118, unit: 'bpm', status: 'abnormal', timestamp: minutesAgo(referenceDate, 3) },
    { id: 'spo2-icu-12-reading', deviceId: 'spo2-icu-12', parameter: 'spo2', label: 'SpO2', value: 91, unit: '%', status: 'abnormal', timestamp: minutesAgo(referenceDate, 3) },
    { id: 'bp-ed-4-reading', deviceId: 'bp-ed-4', parameter: 'blood-pressure', label: 'Blood pressure', value: '168/94', unit: 'mmHg', status: 'stale', timestamp: minutesAgo(referenceDate, 22) },
    { id: 'rr-vent-icu-12', deviceId: 'vent-icu-12', parameter: 'respiratory-rate', label: 'Respiratory rate', value: 22, unit: 'breaths/min', status: 'normal', timestamp: generatedAt },
    { id: 'temp-icu-14', deviceId: 'pump-icu-14', parameter: 'temperature', label: 'Temperature', value: 37.9, unit: 'C', status: 'warning', timestamp: minutesAgo(referenceDate, 5) },
    { id: 'glucose-ms-210-reading', deviceId: 'glucose-ms-210', parameter: 'glucose', label: 'Glucose', value: 64, unit: 'mg/dL', status: 'warning', timestamp: minutesAgo(referenceDate, 9) },
    { id: 'ecg-icu-15-status', deviceId: 'ecg-icu-15', parameter: 'ecg-status', label: 'ECG status', value: 'Disconnected', unit: 'lead state', status: 'offline', timestamp: minutesAgo(referenceDate, 54) },
    { id: 'oxygen-vent-icu-12', deviceId: 'vent-icu-12', parameter: 'oxygen-flow', label: 'Oxygen flow', value: 4, unit: 'L/min', status: 'normal', timestamp: generatedAt },
    { id: 'pump-icu-14-state', deviceId: 'pump-icu-14', parameter: 'infusion-pump-state', label: 'Infusion pump state', value: 'Running', unit: 'pump state', status: 'warning', timestamp: minutesAgo(referenceDate, 5) },
    { id: 'vent-icu-12-state', deviceId: 'vent-icu-12', parameter: 'ventilator-state', label: 'Ventilator state', value: 'Assist control', unit: 'mode', status: 'normal', timestamp: generatedAt },
  ];

  const alerts: HospitalMapAlert[] = [
    {
      id: 'alert-spo2-low',
      deviceId: 'spo2-icu-12',
      deviceName: 'Bed 12 Pulse Oximeter',
      type: 'abnormal-vitals',
      severity: 'high',
      status: 'active',
      title: 'Low oxygen saturation',
      detail: 'SpO2 reading is below the configured review threshold.',
      triggeredAt: minutesAgo(referenceDate, 3),
      lastObservedAt: minutesAgo(referenceDate, 3),
      floorId: 'floor-2',
      unitId: 'icu',
      roomId: 'icu-12',
      bedId: 'bed-icu-12-a',
      source: 'Demo telemetry rule',
    },
    {
      id: 'alert-ecg-offline',
      deviceId: 'ecg-icu-15',
      deviceName: 'ICU-15 Telemetry Patch',
      type: 'offline-device',
      severity: 'high',
      status: 'active',
      title: 'Offline device',
      detail: 'Telemetry patch has not reported for more than 45 minutes.',
      triggeredAt: minutesAgo(referenceDate, 45),
      lastObservedAt: minutesAgo(referenceDate, 54),
      floorId: 'floor-2',
      unitId: 'icu',
      roomId: 'icu-15',
      bedId: 'bed-icu-15-a',
      source: 'Demo connectivity rule',
    },
    {
      id: 'alert-pump-low-battery',
      deviceId: 'pump-icu-14',
      deviceName: 'ICU-14 Infusion Pump',
      type: 'low-battery',
      severity: 'medium',
      status: 'active',
      title: 'Low battery',
      detail: 'Battery is below the configured 20% warning threshold.',
      triggeredAt: minutesAgo(referenceDate, 5),
      lastObservedAt: minutesAgo(referenceDate, 5),
      floorId: 'floor-2',
      unitId: 'icu',
      roomId: 'icu-14',
      bedId: 'bed-icu-14-a',
      source: 'Demo battery rule',
    },
    {
      id: 'alert-glucose-calibration-overdue',
      deviceId: 'glucose-ms-210',
      deviceName: 'Room 210 Glucose Monitor',
      type: 'calibration-overdue',
      severity: 'medium',
      status: 'active',
      title: 'Calibration overdue',
      detail: 'Calibration date is past due; block live-use claims until reviewed.',
      triggeredAt: minutesAgo(referenceDate, 240),
      lastObservedAt: minutesAgo(referenceDate, 9),
      floorId: 'floor-3',
      unitId: 'med-surg',
      roomId: 'ms-210',
      bedId: 'bed-ms-210-a',
      source: 'Demo maintenance rule',
    },
  ];

  const deviceBase = [
    { id: 'vent-icu-12', name: 'ICU-12 Ventilator', type: 'Ventilator', model: 'VentPro 900', serialNumber: 'DEMO-VENT-012', firmwareVersion: '4.8.2', status: 'online', maintenanceStatus: 'ok', calibrationStatus: 'ok', battery: 76, chargingState: 'plugged-in', connectivity: 'Wi-Fi', signalStrength: 92, utilization: 88, lastSeenAt: generatedAt, freshness: 'fresh', floorId: 'floor-2', unitId: 'icu', roomId: 'icu-12', bedId: 'bed-icu-12-a', x: 216, y: 145, patientLabel: 'Patient A' },
    { id: 'spo2-icu-12', name: 'Bed 12 Pulse Oximeter', type: 'Pulse oximeter', model: 'PulseWatch 3', serialNumber: 'DEMO-SPO2-012', firmwareVersion: '2.1.0', status: 'warning', maintenanceStatus: 'ok', calibrationStatus: 'ok', battery: 64, chargingState: 'battery', connectivity: 'BLE gateway', signalStrength: 71, utilization: 74, lastSeenAt: minutesAgo(referenceDate, 3), freshness: 'fresh', floorId: 'floor-2', unitId: 'icu', roomId: 'icu-12', bedId: 'bed-icu-12-a', x: 145, y: 174, patientLabel: 'Patient A' },
    { id: 'pump-icu-14', name: 'ICU-14 Infusion Pump', type: 'Infusion pump', model: 'InfuseSafe X2', serialNumber: 'DEMO-PUMP-014', firmwareVersion: '6.0.7', status: 'warning', maintenanceStatus: 'due-soon', calibrationStatus: 'ok', battery: 18, chargingState: 'battery', connectivity: 'Wi-Fi', signalStrength: 63, utilization: 93, lastSeenAt: minutesAgo(referenceDate, 5), freshness: 'fresh', floorId: 'floor-2', unitId: 'icu', roomId: 'icu-14', bedId: 'bed-icu-14-a', x: 452, y: 142, patientLabel: 'Patient B' },
    { id: 'ecg-icu-15', name: 'ICU-15 Telemetry Patch', type: 'ECG patch', model: 'CardioPatch', serialNumber: 'DEMO-ECG-015', firmwareVersion: '3.4.1', status: 'offline', maintenanceStatus: 'ok', calibrationStatus: 'ok', battery: 8, chargingState: 'battery', connectivity: 'Cellular', signalStrength: 0, utilization: 51, lastSeenAt: minutesAgo(referenceDate, 54), freshness: 'offline', floorId: 'floor-2', unitId: 'icu', roomId: 'icu-15', bedId: 'bed-icu-15-a', x: 706, y: 172, patientLabel: 'Patient C' },
    { id: 'bp-ed-4', name: 'ED-4 Blood Pressure Monitor', type: 'Blood pressure monitor', model: 'BP Station 5', serialNumber: 'DEMO-BP-004', firmwareVersion: '5.5.0', status: 'stale', maintenanceStatus: 'ok', calibrationStatus: 'ok', battery: 48, chargingState: 'docked', connectivity: 'Wi-Fi', signalStrength: 46, utilization: 62, lastSeenAt: minutesAgo(referenceDate, 22), freshness: 'stale', floorId: 'floor-2', unitId: 'ed', roomId: 'ed-4', bedId: 'bed-ed-4-a', x: 180, y: 424, patientLabel: 'Patient D' },
    { id: 'glucose-ms-210', name: 'Room 210 Glucose Monitor', type: 'Glucose monitor', model: 'GlucoTrack', serialNumber: 'DEMO-GLU-210', firmwareVersion: '1.9.9', status: 'maintenance', maintenanceStatus: 'overdue', calibrationStatus: 'overdue', battery: 52, chargingState: 'battery', connectivity: 'BLE gateway', signalStrength: 58, utilization: 34, lastSeenAt: minutesAgo(referenceDate, 9), freshness: 'fresh', floorId: 'floor-3', unitId: 'med-surg', roomId: 'ms-210', bedId: 'bed-ms-210-a', x: 168, y: 150, patientLabel: 'Patient E' },
  ];

  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const bedById = Object.fromEntries(beds.map((bed) => [bed.id, bed]));
  const devices: HospitalMapDevice[] = deviceBase.map((device) => {
    const room = roomById[device.roomId];
    const bed = bedById[device.bedId];
    const locationSource = 'Backend demo SVG floor-plan coordinate';
    return {
      ...device,
      manufacturer: 'CareDroid Demo',
      locationSource,
      location: {
        label: room ? svgLocationLabel(room, bed) : 'Unassigned',
        x: device.x,
        y: device.y,
        source: locationSource,
        coordinateSystem: COORDINATE_SYSTEM,
      },
      activeAlerts: alerts.filter(
        (alert) => alert.deviceId === device.id && (alert.status || 'active') === 'active',
      ),
      telemetry: telemetry.filter((reading) => reading.deviceId === device.id),
    };
  });

  const maintenanceRecords = [
    { id: 'maint-pump-icu-14', deviceId: 'pump-icu-14', type: 'preventive-maintenance', status: 'due-soon', dueAt: minutesAgo(referenceDate, -1440), notes: 'Inspect battery health before next shift.' },
    { id: 'maint-glucose-ms-210', deviceId: 'glucose-ms-210', type: 'calibration', status: 'overdue', dueAt: minutesAgo(referenceDate, 240), notes: 'Calibration overdue in demo registry.' },
  ];

  const locationEvents = [
    { id: 'loc-spo2-icu-12', deviceId: 'spo2-icu-12', roomId: 'icu-12', observedAt: minutesAgo(referenceDate, 3), source: 'Demo SVG coordinate', confidence: 0.95 },
    { id: 'loc-pump-icu-14', deviceId: 'pump-icu-14', roomId: 'icu-14', observedAt: minutesAgo(referenceDate, 5), source: 'Demo SVG coordinate', confidence: 0.91 },
    { id: 'loc-ecg-icu-15', deviceId: 'ecg-icu-15', roomId: 'icu-15', observedAt: minutesAgo(referenceDate, 54), source: 'Demo SVG coordinate', confidence: 0.73 },
  ];

  return {
    ...HOSPITAL_MAP_SOURCE,
    generatedAt,
    floors,
    units,
    rooms: summarizeRooms(rooms, devices, alerts),
    beds,
    devices,
    telemetry,
    alerts,
    maintenanceRecords,
    locationEvents,
  };
}

export function filterRooms(
  rooms: HospitalMapRoom[],
  units: HospitalMapUnit[],
  filter: HospitalMapFilter = {},
) {
  const query = filter.q?.trim().toLowerCase();
  const unitById = Object.fromEntries(units.map((unit) => [unit.id, unit]));
  return rooms.filter((room) => {
    if (filter.floorId && room.floorId !== filter.floorId) return false;
    if (filter.unitId && filter.unitId !== 'all' && room.unitId !== filter.unitId) return false;
    if (!query) return true;
    return roomSearchBlob(room, unitById[room.unitId]).includes(query);
  });
}

export function filterDevices(
  devices: HospitalMapDevice[],
  rooms: HospitalMapRoom[],
  beds: HospitalMapBed[],
  filter: HospitalMapFilter = {},
) {
  const query = filter.q?.trim().toLowerCase();
  const roomById = Object.fromEntries(rooms.map((room) => [room.id, room]));
  const bedById = Object.fromEntries(beds.map((bed) => [bed.id, bed]));
  return devices.filter((device) => {
    if (filter.floorId && device.floorId !== filter.floorId) return false;
    if (filter.unitId && filter.unitId !== 'all' && device.unitId !== filter.unitId) return false;
    if (filter.roomId && device.roomId !== filter.roomId) return false;
    if (filter.status && filter.status !== 'all' && device.status !== filter.status && device.freshness !== filter.status) return false;
    if (filter.type && filter.type !== 'all' && device.type !== filter.type) return false;
    if (!query) return true;
    return deviceSearchBlob(device, roomById[device.roomId], bedById[device.bedId]).includes(query);
  });
}
