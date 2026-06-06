import { UserRole } from '../users/entities/user.entity';
import { TenantDataIsolationAuditService } from './tenant-data-isolation-audit.service';

describe('TenantDataIsolationAuditService', () => {
  it('reports the tenant data isolation controls for required domains', () => {
    const service = new TenantDataIsolationAuditService();

    const report = service.getAuditReport({
      organizationId: 'org-a',
      workspaceId: 'workspace-a',
      userId: 'user-1',
      role: UserRole.ADMIN,
      subscriptionPlan: 'enterprise',
      organizationRole: 'owner',
      workspaceRole: 'owner',
      workspacePermissions: [],
      source: 'resolved',
      isDemoTenant: false,
    });

    expect(report.summary.auditedDomains).toBe(6);
    expect(report.summary.crossTenantReadAllowed).toBe(false);
    expect(report.summary.crossTenantWriteAllowed).toBe(false);
    expect(report.domains.map((domain) => domain.id)).toEqual([
      'organizations',
      'users',
      'workspaces',
      'assets',
      'analytics',
      'audit-logs',
    ]);
    expect(report.domains.find((domain) => domain.id === 'audit-logs')?.controls).toContain(
      'Log, PHI, action, date-range, and statistics reads include organizationId filters.',
    );
  });
});
