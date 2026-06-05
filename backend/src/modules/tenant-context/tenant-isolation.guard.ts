import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasPermissionWithHierarchy } from '../auth/config/role-permissions.config';
import { Permission } from '../auth/enums/permission.enum';
import { UserRole } from '../users/entities/user.entity';
import { OrganizationMembershipRole } from '../organizations/entities/organization-membership.entity';
import { WorkspaceMembershipRole } from '../workspaces/entities/workspace-membership.entity';
import {
  SKIP_TENANT_ISOLATION_KEY,
  TENANT_SCOPE_KEY,
} from './tenant-scope.decorator';
import { extractTenantScopeFromRequest, isTenantBootstrapPath } from './tenant-scope.utils';
import {
  TenantAdminScope,
  TenantContextRequest,
  TenantScopePolicy,
} from './tenant-context.types';

const DEFAULT_POLICY: TenantScopePolicy = {
  level: 'tenant',
};

const ORG_ADMIN_ROLES = new Set<string>([
  OrganizationMembershipRole.ADMIN,
  OrganizationMembershipRole.OWNER,
]);

const WORKSPACE_ADMIN_ROLES = new Set<string>([
  WorkspaceMembershipRole.ADMIN,
  WorkspaceMembershipRole.OWNER,
]);

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<TenantContextRequest>();
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_ISOLATION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip || isTenantBootstrapPath(request)) return true;

    // Global guards run before route AuthGuard. Method-level usage enforces after auth.
    if (!request.user) return true;

    const policy =
      this.reflector.getAllAndOverride<TenantScopePolicy>(TENANT_SCOPE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || DEFAULT_POLICY;

    const tenantContext = request.tenantContext;
    if (!tenantContext?.organizationId || !tenantContext.workspaceId) {
      throw new ForbiddenException('Tenant context is required for this request.');
    }

    const scope = request.tenantScope || extractTenantScopeFromRequest(request);
    request.tenantScope = scope;

    const requireOrganizationId =
      policy.requireOrganizationId ?? ['organization', 'workspace'].includes(policy.level);
    const requireWorkspaceId = policy.requireWorkspaceId ?? policy.level === 'workspace';

    const organizationId = scope.organizationId || tenantContext.organizationId;
    const workspaceId = scope.workspaceId || tenantContext.workspaceId;

    if (requireOrganizationId && !organizationId) {
      throw new ForbiddenException('organizationId is required for this tenant-scoped request.');
    }
    if (requireWorkspaceId && !workspaceId) {
      throw new ForbiddenException('workspaceId is required for this tenant-scoped request.');
    }

    if (organizationId && organizationId !== tenantContext.organizationId) {
      throw new ForbiddenException('Cross-tenant organization access denied.');
    }
    if (requireWorkspaceId && workspaceId !== tenantContext.workspaceId) {
      throw new ForbiddenException('Cross-tenant workspace access denied.');
    }

    this.assertPermissions(request, policy);
    this.assertAdminScope(tenantContext, policy.admin);

    return true;
  }

  private assertPermissions(request: TenantContextRequest, policy: TenantScopePolicy) {
    const requiredPermissions = policy.permissions || [];
    if (!requiredPermissions.length) return;

    const role = request.tenantContext?.role || request.user?.role;
    const workspacePermissions = new Set(request.tenantContext?.workspacePermissions || []);
    const hasAllPermissions = requiredPermissions.every((permission) => {
      const normalized = permission as Permission;
      return (
        workspacePermissions.has(permission) ||
        (Boolean(role) && hasPermissionWithHierarchy(role as UserRole, normalized))
      );
    });

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Tenant permission denied. Required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }
  }

  private assertAdminScope(
    tenantContext: TenantContextRequest['tenantContext'],
    admin?: boolean | TenantAdminScope,
  ) {
    if (!admin) return;

    const globalAdmin = tenantContext?.role === UserRole.ADMIN;
    const organizationAdmin = ORG_ADMIN_ROLES.has(String(tenantContext?.organizationRole || ''));
    const workspaceAdmin = WORKSPACE_ADMIN_ROLES.has(String(tenantContext?.workspaceRole || ''));
    const adminScope = admin === true ? 'any' : admin;

    const allowed =
      globalAdmin ||
      (adminScope === 'organization' && organizationAdmin) ||
      (adminScope === 'workspace' && workspaceAdmin) ||
      (adminScope === 'any' && (organizationAdmin || workspaceAdmin));

    if (!allowed) {
      throw new ForbiddenException('Tenant admin access is required for this request.');
    }
  }
}
