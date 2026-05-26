import { Injectable, Optional } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { FleetRequestLike } from './fleet.types';

@Injectable()
export class FleetAuditService {
  constructor(@Optional() private readonly auditService?: AuditService) {}

  async recordRead(
    req: FleetRequestLike | undefined,
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
      phiAccessed: false,
      metadata: {
        ...metadata,
        demo: true,
        trackingSupportOnly: true,
        auditedAt: new Date().toISOString(),
      },
    });
  }
}
