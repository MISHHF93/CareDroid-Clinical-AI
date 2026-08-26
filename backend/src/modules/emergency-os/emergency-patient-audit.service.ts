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

    // HEAL: this used to catch and swallow any error from the audit write,
    // logging a warning but letting the caller proceed anyway. Every call
    // site (emergency-os.controller.ts) is a READ_PHI/WRITE_PHI-gated
    // endpoint that awaits this BEFORE returning the actual patient data,
    // specifically so the access is on record before it's served (see the
    // "logs a HIPAA patient-access audit entry" specs) -- a failed audit
    // write should deny the request an audit trail can't account for, not
    // silently grant PHI access with zero record it happened. Matches
    // AuthorizationGuard's own permission-check audit log, which is
    // likewise never wrapped in a swallowing catch.
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
      this.logger.error(
        `Patient access audit FAILED for ${input.patientId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
