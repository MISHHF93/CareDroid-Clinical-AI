import { Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

type RequestLike = {
  user?: { id?: string; userId?: string; role?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
};

const source = Object.freeze({
  demo: true,
  source: 'demo-live-tracking',
  sourceLabel:
    'Demo live tracking contract - replace with real telemetry feeds before clinical use',
  generatedBy: 'backend-live-tracking-demo-service',
});

const routePaths = [
  {
    id: 'route-north',
    name: 'North clinic route',
    vehicleId: 'VH-101',
    status: 'active',
    etaMinutes: 18,
    stopsRemaining: 2,
    path: [
      { x: 24, y: 40 },
      { x: 38, y: 28 },
      { x: 58, y: 22 },
      { x: 74, y: 18 },
    ],
  },
  {
    id: 'route-south',
    name: 'South home-health loop',
    vehicleId: 'VH-118',
    status: 'active',
    etaMinutes: 34,
    stopsRemaining: 4,
    path: [
      { x: 20, y: 62 },
      { x: 35, y: 72 },
      { x: 52, y: 80 },
      { x: 70, y: 78 },
    ],
  },
  {
    id: 'route-center',
    name: 'City center courier',
    vehicleId: 'VH-312',
    status: 'delayed',
    etaMinutes: 9,
    stopsRemaining: 1,
    path: [
      { x: 52, y: 58 },
      { x: 62, y: 48 },
      { x: 68, y: 42 },
      { x: 82, y: 36 },
    ],
  },
];

function isoMinutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function fleetVehicles() {
  return [
    {
      id: 'VH-101',
      label: 'Van 101 - North route',
      status: 'occupied',
      freshness: 'fresh',
      maintenanceStatus: 'ok',
      etaMinutes: 18,
      energyType: 'electric',
      energyPercent: 72,
      utilizationPercent: 88,
      driver: 'A. Rivera',
      coordinates: { latitude: 40.7558, longitude: -73.9864 },
      mapPosition: { x: 38, y: 28 },
      heading: 74,
      speedMph: 22,
      routeId: 'route-north',
      destination: 'CareDroid North Clinic',
      lastSeenAt: isoMinutesAgo(2),
      locationSource: 'Backend demo GPS coordinate',
    },
    {
      id: 'VH-204',
      label: 'Truck 204 - Depot',
      status: 'available',
      freshness: 'fresh',
      maintenanceStatus: 'ok',
      etaMinutes: null,
      energyType: 'diesel',
      energyPercent: 91,
      utilizationPercent: 42,
      driver: null,
      coordinates: { latitude: 40.7411, longitude: -73.9903 },
      mapPosition: { x: 52, y: 58 },
      heading: 0,
      speedMph: 0,
      routeId: null,
      destination: 'Depot',
      lastSeenAt: isoMinutesAgo(4),
      locationSource: 'Backend demo depot coordinate',
    },
    {
      id: 'VH-118',
      label: 'Van 118 - South loop',
      status: 'active',
      freshness: 'fresh',
      maintenanceStatus: 'ok',
      etaMinutes: 34,
      energyType: 'electric',
      energyPercent: 54,
      utilizationPercent: 76,
      driver: 'J. Kim',
      coordinates: { latitude: 40.7306, longitude: -73.9972 },
      mapPosition: { x: 35, y: 72 },
      heading: 142,
      speedMph: 18,
      routeId: 'route-south',
      destination: 'Home health stop S-4',
      lastSeenAt: isoMinutesAgo(7),
      locationSource: 'Backend demo GPS coordinate',
    },
    {
      id: 'VH-077',
      label: 'Truck 077 - Workshop',
      status: 'maintenance',
      freshness: 'offline',
      maintenanceStatus: 'scheduled_service',
      etaMinutes: null,
      energyType: 'diesel',
      energyPercent: 38,
      utilizationPercent: 0,
      driver: null,
      coordinates: { latitude: 40.7444, longitude: -74.0059 },
      mapPosition: { x: 18, y: 54 },
      heading: 0,
      speedMph: 0,
      routeId: null,
      destination: 'Workshop',
      lastSeenAt: isoMinutesAgo(92),
      locationSource: 'Backend demo maintenance yard coordinate',
    },
    {
      id: 'VH-312',
      label: 'Van 312 - City center',
      status: 'occupied',
      freshness: 'stale',
      maintenanceStatus: 'warning',
      etaMinutes: 9,
      energyType: 'electric',
      energyPercent: 31,
      utilizationPercent: 92,
      driver: 'M. Okafor',
      coordinates: { latitude: 40.7484, longitude: -73.9857 },
      mapPosition: { x: 68, y: 42 },
      heading: 251,
      speedMph: 13,
      routeId: 'route-center',
      destination: 'Hospital courier bay',
      lastSeenAt: isoMinutesAgo(16),
      locationSource: 'Backend demo GPS coordinate',
    },
  ];
}

function hospitalSnapshot() {
  const generatedAt = new Date().toISOString();
  const floors = [
    { id: 'floor-1', name: 'Emergency', level: 1, label: 'Emergency department' },
    { id: 'floor-2', name: 'ICU', level: 2, label: 'Critical care' },
    { id: 'floor-3', name: 'Medical-Surgical', level: 3, label: 'Med/Surg' },
  ];
  const units = [
    { id: 'icu', floorId: 'floor-2', name: 'ICU', color: '#38bdf8' },
    { id: 'ed', floorId: 'floor-1', name: 'Emergency', color: '#f59e0b' },
    { id: 'ms', floorId: 'floor-3', name: 'Med/Surg', color: '#22c55e' },
  ];
  const rooms = [
    {
      id: 'icu-12',
      floorId: 'floor-2',
      unitId: 'icu',
      name: 'ICU 12',
      x: 20,
      y: 28,
      width: 24,
      height: 20,
    },
    {
      id: 'icu-14',
      floorId: 'floor-2',
      unitId: 'icu',
      name: 'ICU 14',
      x: 52,
      y: 28,
      width: 24,
      height: 20,
    },
    {
      id: 'ed-bay-3',
      floorId: 'floor-1',
      unitId: 'ed',
      name: 'ED Bay 3',
      x: 18,
      y: 58,
      width: 22,
      height: 18,
    },
    {
      id: 'ms-4',
      floorId: 'floor-3',
      unitId: 'ms',
      name: 'Room 4',
      x: 56,
      y: 58,
      width: 22,
      height: 18,
    },
  ];
  const beds = [
    { id: 'bed-12a', roomId: 'icu-12', label: 'Bed 12A', x: 28, y: 36 },
    { id: 'bed-14b', roomId: 'icu-14', label: 'Bed 14B', x: 62, y: 36 },
    { id: 'bed-ed3', roomId: 'ed-bay-3', label: 'ED Bay 3', x: 28, y: 66 },
    { id: 'bed-ms4', roomId: 'ms-4', label: 'MS 4', x: 66, y: 66 },
  ];
  const devices = [
    {
      id: 'vent-icu-12',
      name: 'ICU 12 Ventilator',
      type: 'Ventilator',
      status: 'online',
      freshness: 'fresh',
      floorId: 'floor-2',
      unitId: 'icu',
      roomId: 'icu-12',
      bedId: 'bed-12a',
      battery: 100,
      maintenanceStatus: 'ok',
      calibrationStatus: 'ok',
      lastSeenAt: generatedAt,
      location: { label: 'ICU / Bed 12A', x: 28, y: 36, source: 'Backend demo floor coordinate' },
      telemetry: { mode: 'Assist control', fio2: '40%', peep: '5' },
    },
    {
      id: 'pump-icu-14',
      name: 'ICU 14 Infusion Pump',
      type: 'Infusion pump',
      status: 'warning',
      freshness: 'stale',
      floorId: 'floor-2',
      unitId: 'icu',
      roomId: 'icu-14',
      bedId: 'bed-14b',
      battery: 18,
      maintenanceStatus: 'due-soon',
      calibrationStatus: 'ok',
      lastSeenAt: isoMinutesAgo(23),
      location: { label: 'ICU / Bed 14B', x: 62, y: 36, source: 'Backend demo floor coordinate' },
      telemetry: { infusion: 'Dose check required' },
    },
    {
      id: 'monitor-ed-3',
      name: 'ED Bay 3 Monitor',
      type: 'Bedside monitor',
      status: 'offline',
      freshness: 'offline',
      floorId: 'floor-1',
      unitId: 'ed',
      roomId: 'ed-bay-3',
      bedId: 'bed-ed3',
      battery: 9,
      maintenanceStatus: 'overdue',
      calibrationStatus: 'overdue',
      lastSeenAt: isoMinutesAgo(71),
      location: { label: 'ED / Bay 3', x: 28, y: 66, source: 'Backend demo floor coordinate' },
      telemetry: { connection: 'No signal' },
    },
  ];
  const alerts = [
    {
      id: 'pump-icu-14-low-battery',
      deviceId: 'pump-icu-14',
      severity: 'medium',
      status: 'active',
      title: 'Low battery',
      detail: 'Infusion pump battery below review threshold.',
      timestamp: isoMinutesAgo(23),
    },
    {
      id: 'monitor-ed-3-offline',
      deviceId: 'monitor-ed-3',
      severity: 'high',
      status: 'active',
      title: 'Offline monitor',
      detail: 'Bedside monitor has not reported recently.',
      timestamp: isoMinutesAgo(71),
    },
  ];
  return { generatedAt, floors, units, rooms, beds, devices, alerts };
}

function medicalIotSnapshot() {
  const generatedAt = new Date().toISOString();
  const devices = [
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
      connectivity: 'Bluetooth',
      lastSeenAt: isoMinutesAgo(7),
      freshness: 'fresh',
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
      connectivity: 'Cellular',
      lastSeenAt: isoMinutesAgo(54),
      freshness: 'offline',
      location: {
        label: 'Remote monitoring / Home zone 7',
        floorId: 'remote',
        room: 'Home-7',
        x: 78,
        y: 70,
        source: 'Backend demo remote patient coordinate',
      },
    },
  ];
  const vitals = [
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
      timestamp: isoMinutesAgo(7),
    },
    {
      id: 'bp',
      label: 'Blood pressure',
      value: '168/94',
      unit: 'mmHg',
      status: 'warning',
      source: 'Home BP Cuff',
      timestamp: isoMinutesAgo(54),
    },
  ];
  const alerts = [
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
      timestamp: isoMinutesAgo(54),
    },
  ];
  return {
    generatedAt,
    devices,
    vitals,
    alerts,
    trends: [
      { label: 'SpO2', unit: '%', points: [96, 95, 94, 93, 91] },
      { label: 'Glucose', unit: 'mg/dL', points: [102, 88, 76, 69, 64] },
      { label: 'Heart rate', unit: 'bpm', points: [88, 96, 104, 111, 118] },
    ],
    connectivityTimeline: [
      { label: '00:00', online: 4, warning: 0, offline: 0 },
      { label: '00:15', online: 4, warning: 1, offline: 0 },
      { label: '00:30', online: 3, warning: 1, offline: 1 },
      { label: 'Now', online: 1, warning: 1, offline: 1 },
    ],
  };
}

@Injectable()
export class LiveTrackingService {
  constructor(private readonly auditService: AuditService) {}

  private async recordRead(req: RequestLike, resource: string, metadata: Record<string, unknown>) {
    await this.auditService.log({
      userId: req.user?.id || req.user?.userId,
      action: AuditAction.CLINICAL_DATA_ACCESS,
      resource,
      ipAddress: req.ip || req.connection?.remoteAddress || '0.0.0.0',
      userAgent: String(req.headers?.['user-agent'] || 'unknown'),
      phiAccessed: true,
      metadata: {
        ...metadata,
        demo: true,
        trackingSupportOnly: true,
        auditedAt: new Date().toISOString(),
      },
    });
  }

  private envelope<T>(data: T, message: string) {
    return {
      success: true,
      ...source,
      generatedAt: new Date().toISOString(),
      message,
      data,
    };
  }

  async getFleetVehicles(req: RequestLike) {
    const vehicles = fleetVehicles();
    await this.recordRead(req, 'live-tracking:fleet-vehicles', { count: vehicles.length });
    return this.envelope(
      {
        vehicles,
        summary: {
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter((vehicle) =>
            ['active', 'occupied'].includes(vehicle.status),
          ).length,
          availableVehicles: vehicles.filter((vehicle) => vehicle.status === 'available').length,
          staleVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'stale').length,
          offlineVehicles: vehicles.filter((vehicle) => vehicle.freshness === 'offline').length,
          updatedAt: new Date().toISOString(),
          source: 'demo-backend-fleet-live-tracking',
        },
      },
      'Backend demo fleet vehicles returned. Not a live GPS feed.',
    );
  }

  async getFleetRoutes(req: RequestLike) {
    await this.recordRead(req, 'live-tracking:fleet-routes', { count: routePaths.length });
    return this.envelope(
      { routes: routePaths },
      'Backend demo active routes returned. Verify dispatch status in the system of record.',
    );
  }

  async getHospitalFloors(req: RequestLike) {
    const snapshot = hospitalSnapshot();
    await this.recordRead(req, 'live-tracking:hospital-floors', { count: snapshot.floors.length });
    return this.envelope(
      {
        floors: snapshot.floors,
        units: snapshot.units,
        rooms: snapshot.rooms,
        beds: snapshot.beds,
      },
      'Backend demo hospital floor plan returned. Not a bedside alarm source.',
    );
  }

  async getHospitalDevices(req: RequestLike) {
    const snapshot = hospitalSnapshot();
    await this.recordRead(req, 'live-tracking:hospital-devices', {
      count: snapshot.devices.length,
    });
    return this.envelope(
      { devices: snapshot.devices, alerts: snapshot.alerts },
      'Backend demo hospital devices returned. Not a replacement for bedside alarms.',
    );
  }

  async getDevicesLive(req: RequestLike) {
    const snapshot = medicalIotSnapshot();
    await this.recordRead(req, 'live-tracking:devices-live', { count: snapshot.devices.length });
    return this.envelope(
      { devices: snapshot.devices, generatedAt: snapshot.generatedAt },
      'Backend demo device registry returned. Not live patient telemetry.',
    );
  }

  async getTelemetryLive(req: RequestLike) {
    const snapshot = medicalIotSnapshot();
    await this.recordRead(req, 'live-tracking:telemetry-live', { count: snapshot.vitals.length });
    return this.envelope(
      {
        generatedAt: snapshot.generatedAt,
        vitals: snapshot.vitals,
        trends: snapshot.trends,
        connectivityTimeline: snapshot.connectivityTimeline,
      },
      'Backend demo telemetry returned. Monitoring support only.',
    );
  }

  async getDeviceAlerts(req: RequestLike) {
    const snapshot = medicalIotSnapshot();
    await this.recordRead(req, 'live-tracking:device-alerts', { count: snapshot.alerts.length });
    return this.envelope(
      { alerts: snapshot.alerts },
      'Backend demo device alerts returned. Not a clinical alarm source.',
    );
  }
}
