import { Injectable, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { TelemetryRequestLike } from './telemetry.types';

@Injectable()
export class TelemetryAuditService {
  constructor(@Optional() private readonly auditService?: AuditService) {}

  async recordRead(
    req: TelemetryRequestLike | undefined,
    resource: string,
    metadata: Record<string, unknown>,
  ) {
    if (!this.auditService) return;

    await this.auditService.log({
      userId: req?.user?.id || req?.user?.userId,
      action: AuditAction.CLINICAL_DATA_ACCESS,
      resource,
      ipAddress: req?.ip || req?.connection?.remoteAddress || '0.0.0.0',
      userAgent: String(req?.headers?.['user-agent'] || 'unknown'),
      phiAccessed: true,
      metadata: {
        ...metadata,
        demo: true,
        monitoringSupportOnly: true,
        auditedAt: new Date().toISOString(),
      },
    });
  }
}
