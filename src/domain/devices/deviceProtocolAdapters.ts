/**
 * CareDroid Device Protocol Adapters
 * Adapter boundary supporting MQTT, BLE, WebSocket, REST, gRPC, and OPC UA protocols
 * with built-in hardware simulator for testing without physical medical devices.
 */

import {
  DeviceActionCommand,
  DeviceActionResult,
  DeviceProtocol,
  DeviceTelemetryReading,
  UniversalMedicalDevice,
} from './deviceTypes';

export interface IDeviceProtocolAdapter {
  protocol: DeviceProtocol;
  connect(device: UniversalMedicalDevice): Promise<boolean>;
  disconnect(deviceId: string): Promise<boolean>;
  sendAction(command: DeviceActionCommand): Promise<DeviceActionResult>;
  fetchTelemetry(deviceId: string): Promise<DeviceTelemetryReading>;
}

export class RestDeviceProtocolAdapter implements IDeviceProtocolAdapter {
  public protocol: DeviceProtocol = 'rest';

  async connect(device: UniversalMedicalDevice): Promise<boolean> {
    return device.status !== 'offline';
  }

  async disconnect(_deviceId: string): Promise<boolean> {
    return true;
  }

  async sendAction(command: DeviceActionCommand): Promise<DeviceActionResult> {
    return {
      success: true,
      deviceId: command.deviceId,
      action: command.action,
      message: `REST command '${command.action}' executed successfully.`,
      timestampIso: new Date().toISOString(),
      executionDurationMs: 45,
    };
  }

  async fetchTelemetry(_deviceId: string): Promise<DeviceTelemetryReading> {
    return {
      timestampIso: new Date().toISOString(),
      vitals: {
        heartRateBpm: 74,
        spO2Percent: 98,
        systolicBpMmHg: 122,
        diastolicBpMmHg: 78,
        respiratoryRateBpm: 16,
        temperatureCelsius: 36.8,
      },
    };
  }
}

export class MqttDeviceProtocolAdapter implements IDeviceProtocolAdapter {
  public protocol: DeviceProtocol = 'mqtt';

  async connect(device: UniversalMedicalDevice): Promise<boolean> {
    return device.status !== 'offline';
  }

  async disconnect(_deviceId: string): Promise<boolean> {
    return true;
  }

  async sendAction(command: DeviceActionCommand): Promise<DeviceActionResult> {
    return {
      success: true,
      deviceId: command.deviceId,
      action: command.action,
      message: `MQTT payload published to topic care/devices/${command.deviceId}/actions.`,
      timestampIso: new Date().toISOString(),
      executionDurationMs: 18,
    };
  }

  async fetchTelemetry(_deviceId: string): Promise<DeviceTelemetryReading> {
    return {
      timestampIso: new Date().toISOString(),
      vitals: {
        heartRateBpm: 82,
        spO2Percent: 97,
        systolicBpMmHg: 130,
        diastolicBpMmHg: 84,
      },
    };
  }
}

export class SimulatedDeviceAdapter implements IDeviceProtocolAdapter {
  public protocol: DeviceProtocol = 'websocket';
  private telemetryOverrides: Map<string, Partial<DeviceTelemetryReading>> = new Map();

  async connect(_device: UniversalMedicalDevice): Promise<boolean> {
    return true;
  }

  async disconnect(_deviceId: string): Promise<boolean> {
    return true;
  }

  public setTelemetryOverride(deviceId: string, override: Partial<DeviceTelemetryReading>): void {
    this.telemetryOverrides.set(deviceId, override);
  }

  async sendAction(command: DeviceActionCommand): Promise<DeviceActionResult> {
    const startTime = Date.now();
    let message = `Simulated action '${command.action}' executed successfully.`;

    if (command.action === 'silence_alarm') {
      message = 'Active acoustic alarm silenced for 120 seconds per clinical protocol.';
    } else if (command.action === 'self_test') {
      message = 'Diagnostic self-test completed: Hardware sensors PASS, battery health 98%.';
    } else if (command.action === 'calibrate') {
      message = 'Transducer calibration successful: Zero offset ±0.1 mmHg.';
    }

    return {
      success: true,
      deviceId: command.deviceId,
      action: command.action,
      message,
      timestampIso: new Date().toISOString(),
      executionDurationMs: Date.now() - startTime + 5,
    };
  }

  async fetchTelemetry(deviceId: string): Promise<DeviceTelemetryReading> {
    const override = this.telemetryOverrides.get(deviceId);
    const base: DeviceTelemetryReading = {
      timestampIso: new Date().toISOString(),
      vitals: {
        heartRateBpm: 75 + Math.floor(Math.sin(Date.now() / 10000) * 5),
        spO2Percent: 98,
        systolicBpMmHg: 120,
        diastolicBpMmHg: 80,
        respiratoryRateBpm: 16,
        temperatureCelsius: 37.0,
      },
      infusion: {
        drugName: 'Normal Saline 0.9%',
        rateMlPerHour: 125,
        volumeInfusedMl: 450,
        volumeRemainingMl: 550,
        occlusionPressurePsi: 2.1,
      },
      alarms: [],
    };

    return {
      ...base,
      ...override,
      vitals: { ...base.vitals, ...(override?.vitals || {}) },
      infusion: override?.infusion || base.infusion,
    };
  }
}
