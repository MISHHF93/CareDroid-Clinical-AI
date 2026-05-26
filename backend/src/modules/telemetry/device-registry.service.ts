import { Injectable } from '@nestjs/common';
import { buildMedicalIotSnapshot } from './telemetry.data';
import { TelemetryAuditService } from './telemetry-audit.service';
import { TelemetryRequestLike } from './telemetry.types';

@Injectable()
export class DeviceRegistryService {
  constructor(private readonly telemetryAudit: TelemetryAuditService) {}

  async getLiveDevices(req?: TelemetryRequestLike) {
    const snapshot = buildMedicalIotSnapshot();
    await this.telemetryAudit.recordRead(req, 'telemetry:devices-live', {
      count: snapshot.devices.length,
      online: snapshot.devices.filter((device) => device.status === 'online').length,
      offline: snapshot.devices.filter((device) => device.status === 'offline').length,
    });

    return {
      generatedAt: snapshot.generatedAt,
      devices: snapshot.devices,
      summary: {
        total: snapshot.devices.length,
        online: snapshot.devices.filter((device) => device.status === 'online').length,
        warning: snapshot.devices.filter((device) => device.status === 'warning').length,
        offline: snapshot.devices.filter((device) => device.status === 'offline').length,
        lowBattery: snapshot.devices.filter((device) => device.battery < 20).length,
      },
    };
  }
}
