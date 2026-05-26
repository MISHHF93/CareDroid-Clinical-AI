import { Injectable } from '@nestjs/common';
import { buildMedicalIotSnapshot } from './telemetry.data';
import { TelemetryAuditService } from './telemetry-audit.service';
import { TelemetryRequestLike } from './telemetry.types';

@Injectable()
export class TelemetryService {
  constructor(private readonly telemetryAudit: TelemetryAuditService) {}

  async getLiveTelemetry(req?: TelemetryRequestLike) {
    const snapshot = buildMedicalIotSnapshot();
    await this.telemetryAudit.recordRead(req, 'telemetry:vitals-live', {
      count: snapshot.vitals.length,
      parameters: snapshot.vitals.map((vital) => vital.id),
      trendCount: snapshot.trends.length,
    });

    return {
      generatedAt: snapshot.generatedAt,
      vitals: snapshot.vitals,
      trends: snapshot.trends,
      connectivityTimeline: snapshot.connectivityTimeline,
    };
  }

  async getSnapshot(req?: TelemetryRequestLike) {
    const snapshot = buildMedicalIotSnapshot();
    await this.telemetryAudit.recordRead(req, 'telemetry:medical-iot-snapshot', {
      devices: snapshot.devices.length,
      vitals: snapshot.vitals.length,
      alerts: snapshot.alerts.length,
    });
    return snapshot;
  }
}
