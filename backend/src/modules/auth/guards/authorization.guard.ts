import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../enums/permission.enum';
import {
  PERMISSIONS_KEY,
  ANY_PERMISSIONS_KEY,
  IS_PUBLIC_KEY,
} from '../decorators/permissions.decorator';
import { hasPermissionWithHierarchy } from '../config/role-permissions.config';
import { hasSaasProfilePermission } from '../../user-profile/saas-profile-rbac.config';
import { EMERGENCY_ROLE_PERMISSION_OVERRIDES } from '../config/jwt-claims.util';
import { UserRole } from '../../users/entities/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/entities/audit-log.entity';

/**
 * Authorization Guard
 *
 * Enforces role-based access control (RBAC) by checking if the authenticated user
 * has the required permissions to access a route.
 *
 * - Works with @Permissions() and @RequirePermission() decorators
 * - Logs all permission checks to audit trail (HIPAA requirement)
 * - Returns 403 Forbidden if user lacks required permissions
 * - Considers permission hierarchy (e.g., EXPORT_PHI implies READ_PHI)
 *
 * HIPAA Compliance: Implements access control as required by HIPAA Security Rule
 * § 164.308(a)(4) - Information Access Management
 */
@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is public (no authorization needed)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const anyPermissions = this.reflector.getAllAndOverride<Permission[]>(ANY_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions decorator, allow access (authentication is still enforced by AuthGuard)
    if (!requiredPermissions && !anyPermissions) {
      return true;
    }

    // Get user from request (set by AuthGuard/JWT strategy)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole: UserRole = user.role;
    const userId: string = user.id;
    const roleProfileId: string | null = user.profile?.roleProfileId || null;

    // P0 fix: ed_manager/it_admin both persist UserRole.ADMIN on the user
    // record (see EMERGENCY_ROLE_TO_USER_ROLE in jwt-claims.util.ts), so
    // hasPermissionWithHierarchy(UserRole.ADMIN, ...) alone always grants
    // full PHI read/write/export/delete -- and since this check previously
    // OR-combined that with hasSaasProfilePermission, a roleProfileId-based
    // check could only ever ADD permissions on top of the base UserRole,
    // never restrict below it. Confirmed live-exploitable: an ed_manager or
    // it_admin persona could call any WRITE_PHI/EXPORT_PHI/DELETE_PHI-gated
    // endpoint directly despite neither role's own permission registry
    // (src/config/emergencyRolePermissions.ts) or documented intent
    // (src/config/emergencyNestPermissionMap.ts) ever granting PHI writes.
    // EMERGENCY_ROLE_PERMISSION_OVERRIDES (same table used to fix JWT claim
    // issuance for the legacy/socket auth path) takes precedence and
    // REPLACES rather than adds to the base-role grant for exactly these two
    // profiles; every other roleProfileId keeps the prior OR-combined
    // behavior unchanged.
    const permissionOverride =
      roleProfileId &&
      Object.prototype.hasOwnProperty.call(EMERGENCY_ROLE_PERMISSION_OVERRIDES, roleProfileId)
        ? EMERGENCY_ROLE_PERMISSION_OVERRIDES[
            roleProfileId as keyof typeof EMERGENCY_ROLE_PERMISSION_OVERRIDES
          ]
        : undefined;

    const hasRolePermission = (permission: Permission) =>
      permissionOverride
        ? permissionOverride.includes(permission)
        : hasPermissionWithHierarchy(userRole, permission) ||
          hasSaasProfilePermission(roleProfileId, permission);

    // Get route information for audit logging
    const handler = context.getHandler();
    const controllerClass = context.getClass();
    const route = `${controllerClass.name}.${handler.name}`;
    const method = request.method;
    const url = request.url;

    let hasAccess = false;
    let checkedPermissions: Permission[] = [];

    // Check if user has required permissions (ALL logic)
    if (requiredPermissions && requiredPermissions.length > 0) {
      checkedPermissions = requiredPermissions;
      hasAccess = requiredPermissions.every((permission) => hasRolePermission(permission));
    }

    // Check if user has any of the permissions (OR logic)
    if (anyPermissions && anyPermissions.length > 0) {
      checkedPermissions = anyPermissions;
      hasAccess = anyPermissions.some((permission) => hasRolePermission(permission));
    }

    // Log permission check to audit trail
    await this.auditService.log({
      userId,
      action: hasAccess ? AuditAction.PERMISSION_GRANTED : AuditAction.PERMISSION_DENIED,
      resource: route,
      details: {
        method,
        url,
        role: userRole,
        roleProfileId,
        requiredPermissions: checkedPermissions,
        granted: hasAccess,
        timestamp: new Date().toISOString(),
      },
      ipAddress: request.ip || request.connection.remoteAddress,
      userAgent: request.headers['user-agent'],
    });

    // Deny access if user doesn't have permission
    if (!hasAccess) {
      throw new ForbiddenException(
        `Access denied. Required permission(s): ${checkedPermissions.join(', ')}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}
