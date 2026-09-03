/**
 * Unified security access service — single entry for permission, route, PHI, and mutation checks.
 */

import {
  canAccessRoute as canAccessCompiledRoute,
  canMutateWithCompiledProfile,
  compileCareDroidAccessProfile,
  hasAnyPermission as hasAnyCompiledPermission,
  hasPermission as hasCompiledPermission,
  type CompiledCareDroidAccessProfile,
} from '../lib/users/canonicalAccess';
import { ROUTE_PERMISSION_MAP } from '../config/emergencyPermissionRegistry';
import { type EmergencyPermissionContext } from '../config/emergencyPermissionRegistry';
import {
  canPerformEmergencyAction,
  hasEmergencyActionPermission,
} from '../config/emergencyRolePermissions';
import { normalizeApiPath } from '../config/api.config';
import {
  expandPermissionAliases,
  normalizePermission,
  permissionRequiresPhiRead,
} from '../config/securityPermissionBridge';
import {
  BACKEND_PERMISSION_KEYS,
  CAREDROID_PHI_READ_PERMISSIONS,
  PHI_ACTION_BACKEND_PERMISSION,
  SECURITY_CONTRACT,
  type PhiAccessAction,
} from '../config/securityModel';
import { hasBackendRolePermission } from '../lib/users/backendRolePermissions';

export type SecurityAccessContext = Readonly<{
  compiledProfile?: CompiledCareDroidAccessProfile | null;
  emergencyRole?: string | null;
  permissionsOverrides?: Record<string, string[]>;
  permissionContext?: EmergencyPermissionContext;
  explicitPermissions?: readonly string[];
  readOnly?: boolean;
}>;

function resolveCompiledProfile(ctx: SecurityAccessContext): CompiledCareDroidAccessProfile | null {
  if (ctx.compiledProfile?.user) return ctx.compiledProfile;
  return null;
}

function hasExplicitPermission(ctx: SecurityAccessContext, permission: string): boolean {
  const aliases = expandPermissionAliases(permission);
  const explicit = ctx.explicitPermissions || [];
  if (aliases.some((alias) => explicit.includes(alias))) return true;
  return false;
}

function hasCompiledPermissionBridge(
  profile: CompiledCareDroidAccessProfile,
  permission: string,
): boolean {
  const normalized = normalizePermission(permission);
  const permissions = profile.permissions || [];

  if (normalized.caredroid.length > 0) {
    return normalized.caredroid.some((key) => hasCompiledPermission(profile, key));
  }

  if (normalized.backend.length > 0) {
    return normalized.backend.some((key) => permissions.includes(key));
  }

  return expandPermissionAliases(permission).some((alias) => permissions.includes(alias));
}

export function checkPermission(ctx: SecurityAccessContext, permission: string): boolean {
  if (!permission) return false;

  if (hasExplicitPermission(ctx, permission)) return true;

  const profile = resolveCompiledProfile(ctx);
  if (profile && hasCompiledPermissionBridge(profile, permission)) return true;

  const emergencyKey = normalizePermission(permission).emergency;
  if (emergencyKey && ctx.emergencyRole) {
    return hasEmergencyActionPermission(
      ctx.emergencyRole,
      emergencyKey,
      ctx.permissionsOverrides || {},
      ctx.permissionContext || {},
    );
  }

  if (profile && permissionRequiresPhiRead(permission)) {
    return hasAnyCompiledPermission(profile, CAREDROID_PHI_READ_PERMISSIONS);
  }

  const roleKey =
    ctx.emergencyRole ||
    profile?.role?.emergencyRoleId ||
    profile?.role?.backendRole ||
    profile?.user?.role;
  if (hasBackendRolePermission(roleKey, permission)) return true;

  return false;
}

export function checkAnyPermission(
  ctx: SecurityAccessContext,
  permissions: readonly string[],
): boolean {
  return permissions.some((permission) => checkPermission(ctx, permission));
}

export function checkAllPermissions(
  ctx: SecurityAccessContext,
  permissions: readonly string[],
): boolean {
  return permissions.every((permission) => checkPermission(ctx, permission));
}

export function canAccessRoute(ctx: SecurityAccessContext, path: string): boolean {
  const profile = resolveCompiledProfile(ctx);
  if (!profile) return false;
  if (!canAccessCompiledRoute(profile, path)) return false;

  const routePermission = ROUTE_PERMISSION_MAP[path];
  if (!routePermission) return true;

  return checkPermission(
    {
      ...ctx,
      compiledProfile: profile,
    },
    routePermission,
  );
}

export function canMutateEmergency(ctx: SecurityAccessContext, emergencyKey: string): boolean {
  if (ctx.readOnly) return false;
  const profile = resolveCompiledProfile(ctx);
  if (profile && !canMutateWithCompiledProfile(profile, emergencyKey)) return false;
  if (!ctx.emergencyRole) return false;
  return canPerformEmergencyAction(
    ctx.emergencyRole,
    emergencyKey,
    ctx.permissionsOverrides || {},
    ctx.permissionContext || {},
  );
}

export function buildEmergencySecurityContext(
  input: Readonly<{
    compiledProfile?: CompiledCareDroidAccessProfile | null;
    emergencyRole?: string | null;
    permissionsOverrides?: Record<string, string[]>;
    permissionContext?: EmergencyPermissionContext;
    readOnly?: boolean;
    explicitPermissions?: readonly string[];
  }>,
): SecurityAccessContext {
  return {
    compiledProfile: input.compiledProfile,
    emergencyRole: input.emergencyRole,
    permissionsOverrides: input.permissionsOverrides || {},
    permissionContext: input.permissionContext || {},
    readOnly: input.readOnly ?? false,
    explicitPermissions: input.explicitPermissions,
  };
}

export function checkEmergencyPermission(
  ctx: SecurityAccessContext,
  action: string,
  contextOverride: EmergencyPermissionContext = {},
): boolean {
  return checkPermission(
    {
      ...ctx,
      permissionContext: { ...ctx.permissionContext, ...contextOverride },
    },
    action,
  );
}

export function checkEmergencyMutation(
  ctx: SecurityAccessContext,
  action: string,
  contextOverride: EmergencyPermissionContext = {},
): boolean {
  return canMutateEmergency(
    {
      ...ctx,
      permissionContext: { ...ctx.permissionContext, ...contextOverride },
    },
    action,
  );
}

export function canAccessPhi(
  ctx: SecurityAccessContext,
  action: PhiAccessAction = 'view',
): boolean {
  const requiredBackend = PHI_ACTION_BACKEND_PERMISSION[action];
  if (checkPermission(ctx, requiredBackend)) return true;

  const profile = resolveCompiledProfile(ctx);
  if (!profile) return false;

  if (action === 'view') {
    return hasAnyCompiledPermission(profile, CAREDROID_PHI_READ_PERMISSIONS);
  }

  return hasAnyCompiledPermission(profile, [
    ...CAREDROID_PHI_READ_PERMISSIONS,
    'patient:update',
    'patient:create',
    'patient:discharge',
    'patient:assign',
  ] as const);
}

export function isProtectedApiPath(path: string): boolean {
  const apiPath = normalizeApiPath(path);
  return apiPath.startsWith('/api/') && !isPublicApiPath(apiPath);
}

const PUBLIC_API_PATTERNS = SECURITY_CONTRACT.publicApiPrefixes.map((prefix) => {
  if (prefix === '/api/config/system') return /^\/api\/config\/system$/;
  return new RegExp(`^${prefix.replace(/\//g, '\\/')}(\\/|$)`);
});

export function isPublicApiPath(path: string): boolean {
  const apiPath = normalizeApiPath(path);
  return PUBLIC_API_PATTERNS.some((pattern) => pattern.test(apiPath));
}

export function buildSecurityContextFromUser(
  user: Record<string, unknown> | null | undefined,
): SecurityAccessContext {
  if (!user) return {};
  const compiled =
    (user.compiledAccessProfile as CompiledCareDroidAccessProfile | undefined) ||
    (user.caredroidProfile ? compileCareDroidAccessProfile(user.caredroidProfile as any) : null);

  return {
    compiledProfile: compiled,
    emergencyRole:
      (user.profile as any)?.emergencyRoleId ||
      (user.profile as any)?.roleProfileId ||
      (user.role as string | undefined) ||
      compiled?.role?.emergencyRoleId ||
      null,
    explicitPermissions: Array.isArray(user.permissions) ? user.permissions : [],
    readOnly: compiled?.readOnly ?? false,
  };
}

export function requiresPhiAudit(action: PhiAccessAction): boolean {
  return action === 'view' || action === 'export';
}

export function phiBackendPermissionForAction(action: PhiAccessAction): string {
  return PHI_ACTION_BACKEND_PERMISSION[action] || BACKEND_PERMISSION_KEYS.READ_PHI;
}
