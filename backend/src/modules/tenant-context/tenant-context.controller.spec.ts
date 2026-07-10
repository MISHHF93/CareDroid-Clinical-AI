import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TenantContextController } from './tenant-context.controller';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { TENANT_SCOPE_KEY } from './tenant-scope.decorator';

describe('TenantContextController', () => {
  // TenantIsolationGuard is the only guard that reads @TenantScoped/@OrganizationScoped
  // metadata, and the globally-registered instance no-ops before authentication runs
  // (see tenant-isolation.guard.ts). Routes carrying @TenantScoped({ admin: ... }) must
  // re-list TenantIsolationGuard locally, or the admin restriction is silently never enforced.
  it('re-applies TenantIsolationGuard on isolation-audit so its admin-only policy is enforced', () => {
    const handler = TenantContextController.prototype.isolationAudit;
    const guards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
    expect(guards).toContain(TenantIsolationGuard);

    const policy = Reflect.getMetadata(TENANT_SCOPE_KEY, handler);
    expect(policy).toEqual(expect.objectContaining({ admin: 'organization' }));
  });
});
