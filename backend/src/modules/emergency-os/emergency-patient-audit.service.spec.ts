import { EmergencyPatientAuditService } from './emergency-patient-audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';

/**
 * HEAL: logPatientAccess() used to catch and swallow any error thrown by
 * the underlying audit write, letting every READ_PHI/WRITE_PHI-gated caller
 * in emergency-os.controller.ts proceed and serve real patient data with
 * zero record the access ever happened. A failed audit write must now
 * propagate so the caller fails closed instead of granting PHI access an
 * audit trail can't account for.
 */
describe('EmergencyPatientAuditService', () => {
  const buildService = (auditService: { log: jest.Mock } | undefined) =>
    new EmergencyPatientAuditService(auditService as any);

  it('logs a PHI-access audit entry for the given patient/resource', async () => {
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const service = buildService(auditService);

    await service.logPatientAccess({
      tenantContext: { userId: 'user-1', organizationId: 'org-1' } as any,
      patientId: 'patient-1',
      resource: 'emergency/patients/patient-1/workflow-logs',
    });

    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        organizationId: 'org-1',
        action: AuditAction.PHI_ACCESS,
        resource: 'emergency/patients/patient-1/workflow-logs',
        phiAccessed: true,
        metadata: expect.objectContaining({ patientId: 'patient-1' }),
      }),
    );
  });

  it('propagates an audit-write failure instead of silently allowing the access to proceed unaudited', async () => {
    const auditService = { log: jest.fn().mockRejectedValue(new Error('audit db unavailable')) };
    const service = buildService(auditService);

    await expect(
      service.logPatientAccess({
        tenantContext: { userId: 'user-1', organizationId: 'org-1' } as any,
        patientId: 'patient-1',
        resource: 'emergency/patients/patient-1/document-artifacts',
      }),
    ).rejects.toThrow('audit db unavailable');
  });

  it('is a no-op when no AuditService is wired (matches the @Optional() constructor)', async () => {
    const service = buildService(undefined);

    await expect(
      service.logPatientAccess({
        patientId: 'patient-1',
        resource: 'emergency/patients/patient-1',
      }),
    ).resolves.toBeUndefined();
  });
});
