import { ForbiddenException } from '@nestjs/common';
import { Permission } from '../auth/enums/permission.enum';
import { UserRole } from '../users/entities/user.entity';
import { TenantIsolationGuard } from './tenant-isolation.guard';
import { SKIP_TENANT_ISOLATION_KEY, TENANT_SCOPE_KEY } from './tenant-scope.decorator';
import { TenantScopePolicy } from './tenant-context.types';

describe('TenantIsolationGuard', () => {
  const buildGuard = (policy?: TenantScopePolicy, skip = false) => {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => {
        if (key === SKIP_TENANT_ISOLATION_KEY) return skip;
        if (key === TENANT_SCOPE_KEY) return policy;
        return undefined;
      }),
    };
    return new TenantIsolationGuard(reflector as any);
  };

  const buildContext = (request: any) =>
    ({
      getType: () => 'http',
      getHandler: () => function handler() {},
      getClass: () => class Controller {},
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  const tenantContext = {
    organizationId: 'org-a',
    workspaceId: 'workspace-a',
    userId: 'user-1',
    role: UserRole.PHYSICIAN,
    subscriptionPlan: 'institutional',
    organizationRole: 'member',
    workspaceRole: 'clinician',
    workspacePermissions: [Permission.USE_AI_CHAT],
    source: 'resolved',
    isDemoTenant: false,
  };

  it('denies tenant A from accessing tenant B organization data', () => {
    const guard = buildGuard({ level: 'organization', requireOrganizationId: true });
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      tenantContext,
      params: { organizationId: 'org-b' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/organizations/org-b',
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(ForbiddenException);
  });

  it('rejects authenticated tenant-scoped requests when tenant context is missing', () => {
    const guard = buildGuard({ level: 'tenant' });
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      headers: {},
      method: 'GET',
      originalUrl: '/api/ai/usage',
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(ForbiddenException);
  });

  it('denies workspace mismatch for workspace-scoped APIs', () => {
    const guard = buildGuard({
      level: 'workspace',
      requireOrganizationId: true,
      requireWorkspaceId: true,
    });
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      tenantContext,
      params: { workspaceId: 'workspace-b' },
      headers: {},
      method: 'GET',
      originalUrl: '/api/workspaces/workspace-b/tools',
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(ForbiddenException);
  });

  it('allows required permissions from workspace effective permissions', () => {
    const guard = buildGuard({
      level: 'workspace',
      requireWorkspaceId: true,
      permissions: [Permission.USE_AI_CHAT],
    });
    const request = {
      user: { id: 'user-1', role: UserRole.STUDENT },
      tenantContext: {
        ...tenantContext,
        role: UserRole.STUDENT,
        workspacePermissions: [Permission.USE_AI_CHAT],
      },
      params: { workspaceId: 'workspace-a' },
      headers: {},
      method: 'POST',
      originalUrl: '/api/ai/query',
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
  });

  it('denies admin-scoped access for non-admin tenant members', () => {
    const guard = buildGuard({
      level: 'organization',
      requireOrganizationId: true,
      admin: 'organization',
    });
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      tenantContext,
      params: { organizationId: 'org-a' },
      headers: {},
      method: 'PATCH',
      originalUrl: '/api/organizations/org-a',
    };

    expect(() => guard.canActivate(buildContext(request))).toThrow(ForbiddenException);
  });

  it('allows admin-scoped access for permitted organization admins', () => {
    const guard = buildGuard({
      level: 'organization',
      requireOrganizationId: true,
      admin: 'organization',
    });
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      tenantContext: {
        ...tenantContext,
        organizationRole: 'admin',
      },
      params: { organizationId: 'org-a' },
      headers: {},
      method: 'PATCH',
      originalUrl: '/api/organizations/org-a',
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
  });

  it('allows explicitly skipped bootstrap routes', () => {
    const guard = buildGuard({ level: 'tenant' }, true);
    const request = {
      user: { id: 'user-1', role: UserRole.PHYSICIAN },
      headers: {},
      method: 'POST',
      originalUrl: '/api/organizations',
    };

    expect(guard.canActivate(buildContext(request))).toBe(true);
  });
});
