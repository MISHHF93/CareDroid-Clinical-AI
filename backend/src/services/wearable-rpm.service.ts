import { getEnvironmentConfig } from '../config/environment.config';

export interface WearableReading {
  patientId: string;
  deviceId: string;
  recordedAt?: string;
  heartRate?: number;
  oxygenSaturation?: number;
  respiratoryRate?: number;
  temperature?: number;
  fallDetected?: boolean;
}

export class WearableRPMService {
  private connected = false;
  private readonly latestReadings = new Map<string, WearableReading>();
  private readonly config = getEnvironmentConfig().wearables;

  async connect(): Promise<void> {
    this.connected = this.config.enabled;
  }

  ingestReading(reading: WearableReading): WearableReading {
    const normalized = {
      ...reading,
      recordedAt: reading.recordedAt || new Date().toISOString(),
    };
    this.latestReadings.set(reading.patientId, normalized);
    return { ...normalized };
  }

  getLatestReading(patientId: string): WearableReading | null {
    const reading = this.latestReadings.get(patientId);
    return reading ? { ...reading } : null;
  }

  checkHealth() {
    return {
      status: this.connected ? 'ready' : 'not_connected',
      trackedPatients: this.latestReadings.size,
      configured: this.config.enabled,
      healthkitConfigured: Boolean(this.config.healthkitTeamId),
    };
  }
}

export const wearableRPMService = new WearableRPMService();
