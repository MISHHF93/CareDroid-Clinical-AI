export interface TelemetryRequestLike {
  user?: { id?: string; userId?: string; role?: string };
  ip?: string;
  connection?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
}

export interface MedicalIotDevice {
  id: string;
  name: string;
  type: string;
  patientLabel: string;
  status: string;
  battery: number;
  signalStrength: number;
  connectivity: string;
  lastSeenAt: string;
  freshness: string;
  assignedRoom: string;
  assignedBed: string;
  activeAlerts: string[];
  location: {
    label: string;
    floorId: string;
    room: string;
    x: number;
    y: number;
    source: string;
  };
}

export interface TelemetryVital {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  status: string;
  source: string;
  deviceId: string;
  timestamp: string;
}

export interface DeviceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  source: string;
  deviceId: string;
  status: string;
  timestamp: string;
}

export interface TelemetryTrend {
  label: string;
  unit: string;
  parameter: string;
  points: number[];
}

export interface ConnectivityTimelinePoint {
  label: string;
  online: number;
  warning: number;
  offline: number;
}

export interface MedicalIotSnapshot {
  generatedAt: string;
  devices: MedicalIotDevice[];
  vitals: TelemetryVital[];
  alerts: DeviceAlert[];
  trends: TelemetryTrend[];
  connectivityTimeline: ConnectivityTimelinePoint[];
}
