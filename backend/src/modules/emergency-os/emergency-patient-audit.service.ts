import { Injectable, Logger, Optional } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import type { TenantContext } from '../tenant-context/tenant-context.types';

@Injectable()
export class EmergencyPatientAuditService {
  private readonly logger = new Logger(EmergencyPatientAuditService.name);

  constructor(@Optional() private readonly auditService?: AuditService) {}

  async logPatientAccess(input: {
    request?: Request;
    tenantContext?: TenantContext;
    patientId: string;
    resource: string;
    action?: AuditAction;
  }): Promise<void> {
    if (!this.auditService) return;

    const userId = input.tenantContext?.userId || (input.request?.user as { id?: string })?.id;
    const ipAddress =
      (input.request?.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      input.request?.ip ||
      'unknown';
    const userAgent = String(input.request?.headers['user-agent'] || 'unknown');

    try {
      await this.auditService.log({
        userId,
        organizationId: input.tenantContext?.organizationId,
        workspaceId: input.tenantContext?.workspaceId,
        action: input.action || AuditAction.PHI_ACCESS,
        resource: input.resource,
        ipAddress,
        userAgent,
        phiAccessed: true,
        metadata: {
          patientId: input.patientId,
          module: 'emergency-os',
        },
      });
    } catch (error) {
      this.logger.warn(
        `Patient access audit skipped for ${input.patientId}: ${(error as Error).message}`,
      );
    }
  }
}