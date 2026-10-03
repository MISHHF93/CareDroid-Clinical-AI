/**
 * CareDroid Universal Device Registry Service
 * Central service for discovery, telemetry aggregation, patient association,
 * operational health tracking, and remote command orchestration of medical IoT devices.
 */

import {
  DeviceActionCommand,
  DeviceActionResult,
  DeviceOperationalStatus,
  DeviceTelemetryReading,
  MedicalDeviceCategory,
  UniversalMedicalDevice,
} from './deviceTypes';
import {
  IDeviceProtocolAdapter,
  MqttDeviceProtocolAdapter,
  RestDeviceProtocolAdapter,
  SimulatedDeviceAdapter,
} from './deviceProtocolAdapters';

export class UniversalDeviceRegistry {
  private static instance: UniversalDeviceRegistry;
  private devices: Map<string, UniversalMedicalDevice> = new Map();
  private adapters: Map<string, IDeviceProtocolAdapter> = new Map();
  private simulationAdapter: SimulatedDeviceAdapter;

  constructor() {
    this.simulationAdapter = new SimulatedDeviceAdapter();
    this.adapters.set('rest', new RestDeviceProtocolAdapter());
    this.adapters.set('mqtt', new MqttDeviceProtocolAdapter());
    this.adapters.set('websocket', this.simulationAdapter);
    this.seedDefaultDevices();
  }

  public static getInstance(): UniversalDeviceRegistry {
    if (!UniversalDeviceRegistry.instance) {
      UniversalDeviceRegistry.instance = new UniversalDeviceRegistry();
    }
    return UniversalDeviceRegistry.instance;
  }

  public registerDevice(device: UniversalMedicalDevice): void {
    this.devices.set(device.id, { ...device });
  }

  public getDevice(id: string): UniversalMedicalDevice | undefined {
    return this.devices.get(id);
  }

  public listDevices(filter?: {
    category?: MedicalDeviceCategory;
    status?: DeviceOperationalStatus;
    department?: string;
  }): UniversalMedicalDevice[] {
    let result = Array.from(this.devices.values());
    if (filter?.category) {
      result = result.filter((d) => d.category === filter.category);
    }
    if (filter?.status) {
      result = result.filter((d) => d.status === filter.status);
    }
    if (filter?.department) {
      result = result.filter((d) => d.location.department === filter.department);
    }
    return result;
  }

  public updateTelemetry(deviceId: string, reading: DeviceTelemetryReading): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.latestTelemetry = reading;
      device.connectivity.lastHeartbeatIso = reading.timestampIso;
      if (reading.alarms && reading.alarms.length > 0) {
        device.status = 'alarm_active';
      } else if (device.assignedPatientId) {
        device.status = 'in_use';
      } else {
        device.status = 'online';
      }
    }
  }

  public assignToPatient(deviceId: string, patientId: string, encounterId?: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.assignedPatientId = patientId;
    device.assignedEncounterId = encounterId;
    device.status = 'in_use';
    return true;
  }

  public releaseFromPatient(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    device.assignedPatientId = undefined;
    device.assignedEncounterId = undefined;
    device.status = 'online';
    return true;
  }

  public async executeCommand(command: DeviceActionCommand): Promise<DeviceActionResult> {
    const device = this.devices.get(command.deviceId);
    if (!device) {
      return {
        success: false,
        deviceId: command.deviceId,
        action: command.action,
        message: `Device '${command.deviceId}' not found in universal registry.`,
        timestampIso: new Date().toISOString(),
        executionDurationMs: 0,
      };
    }

    if (!device.supportedActions.includes(command.action)) {
      return {
        success: false,
        deviceId: command.deviceId,
        action: command.action,
        message: `Action '${command.action}' is not supported by device model ${device.model}.`,
        timestampIso: new Date().toISOString(),
        executionDurationMs: 0,
      };
    }

    const adapter = this.adapters.get(device.connectivity.protocol) || this.simulationAdapter;
    const result = await adapter.sendAction(command);

    if (command.action === 'silence_alarm' && device.latestTelemetry?.alarms) {
      for (const alarm of device.latestTelemetry.alarms) {
        alarm.isSilenced = true;
      }
      device.status = device.assignedPatientId ? 'in_use' : 'online';
    }

    return result;
  }

  public getSimulationAdapter(): SimulatedDeviceAdapter {
    return this.simulationAdapter;
  }

  public getFleetHealthSummary(): {
    totalDevices: number;
    online: number;
    inUse: number;
    alarmsActive: number;
    maintenanceRequired: number;
    averageBatteryPercent: number;
  } {
    const all = Array.from(this.devices.values());
    const totalDevices = all.length;
    let online = 0;
    let inUse = 0;
    let alarmsActive = 0;
    let maintenanceRequired = 0;
    let totalBattery = 0;

    for (const d of all) {
      if (d.status === 'online') online++;
      if (d.status === 'in_use') inUse++;
      if (d.status === 'alarm_active') alarmsActive++;
      if (d.status === 'maintenance_required' || d.battery.healthState === 'replace_soon') {
        maintenanceRequired++;
      }
      totalBattery += d.battery.levelPercent;
    }

    return {
      totalDevices,
      online,
      inUse,
      alarmsActive,
      maintenanceRequired,
      averageBatteryPercent: totalDevices > 0 ? Math.round(totalBattery / totalDevices) : 100,
    };
  }

  private seedDefaultDevices(): void {
    const defaultDevices: UniversalMedicalDevice[] = [
      {
        id: 'dev-mon-ed-bay-1',
        serialNumber: 'CD-MON-99014',
        name: 'Trauma Bay 1 Bedside Vital Signs Monitor',
        category: 'vital_signs_monitor',
        manufacturer: 'CareDroid Hardware Systems',
        model: 'OmniSense VitalPro 400',
        location: {
          building: 'Main Hospital',
          floor: 'Level 1',
          department: 'Emergency Department',
          room: 'Resuscitation Room 1',
          bedId: 'Bay 1',
        },
        status: 'in_use',
        battery: {
          levelPercent: 100,
          isCharging: true,
          healthState: 'good',
        },
        connectivity: {
          protocol: 'websocket',
          endpointUrl: 'wss://ed-iot.internal/v1/devices/dev-mon-ed-bay-1',
          signalStrengthDbm: -45,
          lastHeartbeatIso: new Date().toISOString(),
          tlsVersion: 'TLS 1.3',
          certificateExpiryIso: '2027-12-31T23:59:59Z',
        },
        latestTelemetry: {
          timestampIso: new Date().toISOString(),
          vitals: {
            heartRateBpm: 88,
            spO2Percent: 97,
            systolicBpMmHg: 124,
            diastolicBpMmHg: 82,
            respiratoryRateBpm: 18,
            temperatureCelsius: 37.1,
          },
          alarms: [],
        },
        maintenance: {
          lastCalibratedIso: '2026-08-15T00:00:00Z',
          nextCalibrationDueIso: '2027-02-15T00:00:00Z',
          totalOperatingHours: 4210,
          firmwareVersion: '3.4.1',
          hardwareRevision: 'B2',
        },
        assignedPatientId: 'pt-10492',
        assignedEncounterId: 'enc-8812',
        supportedActions: [
          'ping',
          'start_stream',
          'stop_stream',
          'self_test',
          'silence_alarm',
          'calibrate',
        ],
      },
      {
        id: 'dev-pump-ed-04',
        serialNumber: 'CD-PUMP-44120',
        name: 'Smart Infusion Pump #4',
        category: 'infusion_pump',
        manufacturer: 'CareDroid Therapeutics',
        model: 'InfuseSafe SmartCart 2',
        location: {
          building: 'Main Hospital',
          floor: 'Level 1',
          department: 'Emergency Department',
          room: 'Acute Care Bay 4',
          bedId: 'Bay 4',
        },
        status: 'in_use',
        battery: {
          levelPercent: 92,
          isCharging: true,
          healthState: 'good',
        },
        connectivity: {
          protocol: 'mqtt',
          endpointUrl: 'mqtts://broker.internal:8883/devices/dev-pump-ed-04',
          signalStrengthDbm: -52,
          lastHeartbeatIso: new Date().toISOString(),
          tlsVersion: 'TLS 1.3',
          certificateExpiryIso: '2027-08-30T23:59:59Z',
        },
        latestTelemetry: {
          timestampIso: new Date().toISOString(),
          infusion: {
            drugName: 'Norepinephrine 4mg/250ml D5W',
            rateMlPerHour: 15,
            volumeInfusedMl: 45,
            volumeRemainingMl: 205,
            occlusionPressurePsi: 3.2,
          },
          alarms: [],
        },
        maintenance: {
          lastCalibratedIso: '2026-07-01T00:00:00Z',
          nextCalibrationDueIso: '2027-01-01T00:00:00Z',
          totalOperatingHours: 1980,
          firmwareVersion: '2.1.0',
          hardwareRevision: 'C1',
        },
        assignedPatientId: 'pt-10492',
        supportedActions: ['ping', 'start_stream', 'stop_stream', 'silence_alarm', 'calibrate'],
      },
      {
        id: 'dev-vent-icu-02',
        serialNumber: 'CD-VENT-11008',
        name: 'Critical Care Transport Ventilator',
        category: 'ventilator',
        manufacturer: 'CareDroid Critical Care',
        model: 'RespiraFlow Pro-X',
        location: {
          building: 'Main Hospital',
          floor: 'Level 1',
          department: 'Emergency Department',
          room: 'Resuscitation Room 2',
          bedId: 'Bay 2',
        },
        status: 'online',
        battery: {
          levelPercent: 100,
          isCharging: true,
          healthState: 'good',
        },
        connectivity: {
          protocol: 'websocket',
          endpointUrl: 'wss://ed-iot.internal/v1/devices/dev-vent-icu-02',
          signalStrengthDbm: -48,
          lastHeartbeatIso: new Date().toISOString(),
          tlsVersion: 'TLS 1.3',
          certificateExpiryIso: '2027-10-15T23:59:59Z',
        },
        latestTelemetry: {
          timestampIso: new Date().toISOString(),
          ventilation: {
            pipCmH2O: 22,
            peepCmH2O: 5,
            fIO2Percent: 40,
            tidalVolumeMl: 480,
          },
          alarms: [],
        },
        maintenance: {
          lastCalibratedIso: '2026-09-01T00:00:00Z',
          nextCalibrationDueIso: '2027-03-01T00:00:00Z',
          totalOperatingHours: 3200,
          firmwareVersion: '4.0.2',
          hardwareRevision: 'A4',
        },
        supportedActions: [
          'ping',
          'start_stream',
          'stop_stream',
          'self_test',
          'silence_alarm',
          'calibrate',
        ],
      },
      {
        id: 'dev-us-pocus-01',
        serialNumber: 'CD-POCUS-7731',
        name: 'Point-of-Care Ultrasound Roving Scanner',
        category: 'point_of_care_ultrasound',
        manufacturer: 'CareDroid Sonography',
        model: 'EchoEcho Handheld Probe Gen-3',
        location: {
          building: 'Main Hospital',
          floor: 'Level 1',
          department: 'Emergency Department',
          room: 'Physician Workstation East',
        },
        status: 'online',
        battery: {
          levelPercent: 78,
          isCharging: false,
          estimatedMinutesRemaining: 180,
          healthState: 'good',
        },
        connectivity: {
          protocol: 'rest',
          endpointUrl: 'https://pocus.internal/api/dev-us-pocus-01',
          signalStrengthDbm: -60,
          lastHeartbeatIso: new Date().toISOString(),
          tlsVersion: 'TLS 1.3',
          certificateExpiryIso: '2027-06-20T23:59:59Z',
        },
        maintenance: {
          lastCalibratedIso: '2026-06-15T00:00:00Z',
          nextCalibrationDueIso: '2026-12-15T00:00:00Z',
          totalOperatingHours: 850,
          firmwareVersion: '1.9.0',
          hardwareRevision: 'B1',
        },
        supportedActions: ['ping', 'self_test', 'calibrate'],
      },
    ];

    for (const d of defaultDevices) {
      this.registerDevice(d);
    }
  }
}

export const universalDeviceRegistry = UniversalDeviceRegistry.getInstance();
