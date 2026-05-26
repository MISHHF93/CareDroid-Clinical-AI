import { Injectable } from '@nestjs/common';
import { buildMedicalIotSnapshot } from './telemetry.data';
import { TelemetryAuditService } from './telemetry-audit.service';
import { TelemetryRequestLike } from './telemetry.types';

@Injectable()
export class AlertService {
  constructor(private readonly telemetryAudit: TelemetryAuditService) {}

  async getDeviceAlerts(req?: TelemetryRequestLike) {
    const snapshot = buildMedicalIotSnapshot();
    await this.telemetryAudit.recordRead(req, 'telemetry:device-alerts', {
      count: snapshot.alerts.length,
      highSeverity: snapshot.alerts.filter((alert) => alert.severity === 'high').length,
    });

    return {
      generatedAt: snapshot.generatedAt,
      alerts: snapshot.alerts,
    };
  }
}
