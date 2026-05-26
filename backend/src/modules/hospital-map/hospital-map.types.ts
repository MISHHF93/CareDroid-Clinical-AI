export interface HospitalMapRequestLike {
  user?: { id?: string; userId?: string; role?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

export interface HospitalMapFloor {
  id: string;
  name: string;
  building: string;
  level: number;
  coordinateSystem: string;
  viewBox: string;
  svgWidth: number;
  svgHeight: number;
}

export interface HospitalMapUnit {
  id: string;
  floorId: string;
  name: string;
  type: string;
  shortCode: string;
}

export interface HospitalMapRoom {
  id: string;
  floorId: string;
  unitId: string;
  roomNumber: string;
  x: number;
  y: number;
  width: number;
  height: number;
  deviceCount?: number;
  activeAlertCount?: number;
}

export interface HospitalMapBed {
  id: string;
  roomId: string;
  label: string;
  status: string;
  patientLabel: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HospitalMapTelemetryReading {
  id: string;
  deviceId: string;
  parameter: string;
  label: string;
  value: string | number;
  unit: string;
  status: string;
  timestamp: string;
}

export interface HospitalMapAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  title: string;
  detail: string;
  triggeredAt: string;
  lastObservedAt: string;
  floorId: string;
  unitId: string;
  roomId: string;
  bedId: string;
  source: string;
}

export interface HospitalMapDevice {
  id: string;
  name: string;
  type: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  firmwareVersion: string;
  status: string;
  maintenanceStatus: string;
  calibrationStatus: string;
  battery: number;
  chargingState: string;
  connectivity: string;
  signalStrength: number;
  utilization: number;
  lastSeenAt: string;
  freshness: string;
  floorId: string;
  unitId: string;
  roomId: string;
  bedId: string;
  x: number;
  y: number;
  patientLabel: string;
  locationSource: string;
  location: {
    label: string;
    x: number;
    y: number;
    source: string;
    coordinateSystem: string;
  };
  activeAlerts: HospitalMapAlert[];
  telemetry: HospitalMapTelemetryReading[];
}

export interface HospitalMapSnapshot {
  source: string;
  sourceLabel: string;
  demo: boolean;
  generatedAt: string;
  floors: HospitalMapFloor[];
  units: HospitalMapUnit[];
  rooms: HospitalMapRoom[];
  beds: HospitalMapBed[];
  devices: HospitalMapDevice[];
  telemetry: HospitalMapTelemetryReading[];
  alerts: HospitalMapAlert[];
  locationEvents: Array<Record<string, unknown>>;
  maintenanceRecords: Array<Record<string, unknown>>;
}

export interface HospitalMapFilter {
  floorId?: string;
  unitId?: string;
  roomId?: string;
  status?: string;
  type?: string;
  q?: string;
}
