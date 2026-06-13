import { getEnvironmentConfig } from '../config/environment.config';

export interface IoTTelemetryEvent {
  sourceId: string;
  patientId?: string;
  roomId?: string;
  metric: string;
  value: number | string | boolean;
  observedAt?: string;
}

export class IoTDigitalTwinService {
  private readonly telemetry = new Map<string, IoTTelemetryEvent[]>();
  private readonly mqttConfig = getEnvironmentConfig().mqtt;

  ingestTelemetry(event: IoTTelemetryEvent): IoTTelemetryEvent {
    const normalized = {
      ...event,
      observedAt: event.observedAt || new Date().toISOString(),
    };
    const key = event.patientId || event.roomId || event.sourceId;
    const events = this.telemetry.get(key) || [];
    this.telemetry.set(key, [...events.slice(-49), normalized]);
    return { ...normalized };
  }

  getTwinSnapshot(entityId: string) {
    const events = this.telemetry.get(entityId) || [];
    return {
      entityId,
      eventCount: events.length,
      latestEvent: events.at(-1) || null,
      synchronizedAt: new Date().toISOString(),
      status: events.length ? 'active' : 'ready',
    };
  }

  checkHealth() {
    return {
      status: 'ready',
      trackedEntities: this.telemetry.size,
      mqttConfigured: this.mqttConfig.enabled,
      mqttBrokerUrl: this.mqttConfig.brokerUrl || null,
    };
  }
}

export const iotDigitalTwinService = new IoTDigitalTwinService();
