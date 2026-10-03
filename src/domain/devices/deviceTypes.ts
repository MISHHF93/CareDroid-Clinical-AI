/**
 * CareDroid Universal Device Framework Types
 * Vendor-neutral specification for connected medical devices, bedside monitors,
 * infusion pumps, wearables, ventilators, and smart hospital IoT infrastructure.
 */

export type MedicalDeviceCategory =
  | 'vital_signs_monitor'
  | 'infusion_pump'
  | 'ventilator'
  | 'ecg_telemetry'
  | 'defibrillator'
  | 'smart_bed'
  | 'point_of_care_ultrasound'
  | 'patient_wearable'
  | 'mobile_workstation'
  | 'environmental_sensor';

export type DeviceProtocol = 'mqtt' | 'ble' | 'websocket' | 'rest' | 'grpc' | 'opcua';

export type DeviceOperationalStatus =
  | 'online'
  | 'offline'
  | 'in_use'
  | 'standby'
  | 'calibrating'
  | 'maintenance_required'
  | 'error'
  | 'alarm_active';

export interface DeviceLocation {
  building: string;
  floor: string;
  department: string;
  room: string;
  bedId?: string;
  coordinates?: { x: number; y: number; z: number };
}

export interface DeviceBattery {
  levelPercent: number;
  isCharging: boolean;
  estimatedMinutesRemaining?: number;
  healthState: 'good' | 'degraded' | 'replace_soon';
}

export interface DeviceConnectivity {
  protocol: DeviceProtocol;
  endpointUrl: string;
  signalStrengthDbm: number;
  lastHeartbeatIso: string;
  tlsVersion: string;
  certificateExpiryIso: string;
}

export interface DeviceTelemetryReading {
  timestampIso: string;
  vitals?: {
    heartRateBpm?: number;
    spO2Percent?: number;
    systolicBpMmHg?: number;
    diastolicBpMmHg?: number;
    respiratoryRateBpm?: number;
    temperatureCelsius?: number;
  };
  infusion?: {
    drugName: string;
    rateMlPerHour: number;
    volumeInfusedMl: number;
    volumeRemainingMl: number;
    occlusionPressurePsi: number;
  };
  ventilation?: {
    pipCmH2O: number;
    peepCmH2O: number;
    fIO2Percent: number;
    tidalVolumeMl: number;
  };
  alarms?: Array<{
    alarmId: string;
    severity: 'critical' | 'warning' | 'advisory';
    message: string;
    isSilenced: boolean;
  }>;
}

export interface DeviceMaintenance {
  lastCalibratedIso: string;
  nextCalibrationDueIso: string;
  totalOperatingHours: number;
  firmwareVersion: string;
  hardwareRevision: string;
}

export interface UniversalMedicalDevice {
  id: string;
  serialNumber: string;
  name: string;
  category: MedicalDeviceCategory;
  manufacturer: string;
  model: string;
  location: DeviceLocation;
  status: DeviceOperationalStatus;
  battery: DeviceBattery;
  connectivity: DeviceConnectivity;
  latestTelemetry?: DeviceTelemetryReading;
  maintenance: DeviceMaintenance;
  assignedPatientId?: string;
  assignedEncounterId?: string;
  assignedStaffId?: string;
  supportedActions: Array<
    | 'ping'
    | 'start_stream'
    | 'stop_stream'
    | 'self_test'
    | 'silence_alarm'
    | 'calibrate'
    | 'assign_patient'
    | 'release_patient'
  >;
}

export interface DeviceActionCommand {
  deviceId: string;
  action: 'ping' | 'start_stream' | 'stop_stream' | 'self_test' | 'silence_alarm' | 'calibrate';
  parameters?: Record<string, unknown>;
  issuedByUserId: string;
  issuedByRole: string;
}

export interface DeviceActionResult {
  success: boolean;
  deviceId: string;
  action: string;
  message: string;
  timestampIso: string;
  executionDurationMs: number;
}
