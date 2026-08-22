/**
 * Architect Mode Stage D — JWT claim builder.
 * Expands Nest UserRole into explicit permission claims so guards and
 * legacy Express middleware can enforce without re-deriving role tables only.
 *
 * Optional emergencyRole (from profile.roleProfileId when it matches a known ED role)
 * is recorded for FE operational UX; Nest Permission remains server authority.
 */
import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import { getRolePermissions } from './role-permissions.config';

/** Known FE emergency role ids (mirror src/config/emergencyRoleScreenMatrix). */
export const EMERGENCY_ROLE_CLAIM_IDS = [
  'admin',
  'it_admin',
  'ed_manager',
  'charge_nurse',
  'triage_nurse',
  'physician',
  'registration_clerk',
  'ems_user',
  'dispatcher',
  'ems_coordinator',
  'read_only_viewer',
  'public_display',
] as const;

export type EmergencyRoleClaimId = (typeof EMERGENCY_ROLE_CLAIM_IDS)[number];

const EMERGENCY_ROLE_SET = new Set<string>(EMERGENCY_ROLE_CLAIM_IDS);

/** Default emergency operational role for each Nest UserRole when profile has no override. */
export const NEST_ROLE_DEFAULT_EMERGENCY_ROLE: Record<UserRole, EmergencyRoleClaimId> = {
  [UserRole.PHYSICIAN]: 'physician',
  [UserRole.NURSE]: 'charge_nurse',
  [UserRole.ADMIN]: 'admin',
  [UserRole.STUDENT]: 'read_only_viewer',
  [UserRole.READ_ONLY_VIEWER]: 'read_only_viewer',
};

/**
 * Inverse of NEST_ROLE_DEFAULT_EMERGENCY_ROLE: which Nest UserRole (and
 * therefore which `permissions` claim set, since buildAccessTokenClaims
 * derives permissions from `role` alone) a demo persona switch should carry.
 * Mirrors src/config/emergencyNestPermissionMap.ts's EMERGENCY_TO_NEST_ROLE_MAP
 * `nestUserRole` assignments -- kept as an independent backend copy since the
 * frontend module isn't importable from this build.
 */
export const EMERGENCY_ROLE_TO_USER_ROLE: Record<EmergencyRoleClaimId, UserRole> = {
  admin: UserRole.ADMIN,
  it_admin: UserRole.ADMIN,
  ed_manager: UserRole.ADMIN,
  charge_nurse: UserRole.NURSE,
  triage_nurse: UserRole.NURSE,
  physician: UserRole.PHYSICIAN,
  registration_clerk: UserRole.NURSE,
  ems_user: UserRole.NURSE,
  dispatcher: UserRole.NURSE,
  ems_coordinator: UserRole.NURSE,
  read_only_viewer: UserRole.READ_ONLY_VIEWER,
  public_display: UserRole.STUDENT,
};

/**
 * P0 fix: ed_manager and it_admin both use UserRole.ADMIN as their JWT auth
 * container (see EMERGENCY_ROLE_TO_USER_ROLE above) purely so token issuance
 * has a UserRole to work with -- but buildAccessTokenClaims used to derive
 * `permissions` from that UserRole ALONE, so both silently inherited
 * UserRole.ADMIN's full READ/WRITE/EXPORT/DELETE PHI + platform-governance
 * permission set. That directly contradicted this codebase's own documented
 * intent everywhere else: src/config/emergencyRolePermissions.ts's action
 * lists for both roles have no PHI-write actions at all; the frontend's own
 * "should-be" model (src/config/emergencyNestPermissionMap.ts) explicitly
 * scopes it_admin to zero PHI ("technical administration only") and
 * ed_manager to READ_PHI only ("limited write") -- and that file's own doc
 * comment says JWT issuance "should expand claims from this map, not from
 * UserRole alone," which was never actually wired in until now. Confirmed
 * live-exploitable: authenticated as either role, POST/PATCH endpoints
 * gated on WRITE_PHI/EXPORT_PHI/DELETE_PHI succeeded via direct API call
 * even though neither role's UI ever exposes a PHI-mutating control.
 *
 * Deliberately a narrow override keyed by emergencyRole, not a change to
 * getRolePermissions/RolePermissions[UserRole.ADMIN] itself -- every other
 * emergency role (including a genuine 'admin' persona) keeps its existing,
 * unrestricted UserRole-derived permission set unchanged. Permission lists
 * below are ported verbatim from emergencyNestPermissionMap.ts's own
 * it_admin/ed_manager entries (the values that file already declared as the
 * correct target, just never enforced).
 */
export const EMERGENCY_ROLE_PERMISSION_OVERRIDES: Partial<
  Record<EmergencyRoleClaimId, Permission[]>
> = {
  it_admin: [
    Permission.CONFIGURE_SYSTEM,
    Permission.MANAGE_USERS,
    Permission.VIEW_USERS,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_GOVERNANCE,
    Permission.VIEW_ANALYTICS,
  ],
  ed_manager: [
    Permission.READ_PHI,
    Permission.USE_AI_CHAT,
    Permission.VIEW_ANALYTICS,
    Permission.VIEW_OPERATIONS,
    Permission.VIEW_GOVERNANCE,
    Permission.VIEW_AUDIT_LOGS,
    Permission.VIEW_SENTINEL_COMMAND,
    Permission.ACK_SENTINEL_ALARMS,
    Permission.VIEW_SENTINEL_ANALYTICS,
  ],
};

export type CareDroidAccessTokenClaims = {
  sub: string;
  email: string;
  role: UserRole;
  roleProfileId: string | null;
  /** Explicit Nest permissions for this role (server authority). */
  permissions: Permission[];
  /** Operational ED role for FE UX; not a second auth authority. */
  emergencyRole: EmergencyRoleClaimId;
  tokenUse: 'access' | 'refresh';
};

export function resolveEmergencyRoleClaim(
  nestRole: UserRole,
  roleProfileId?: string | null,
): EmergencyRoleClaimId {
  const profile = String(roleProfileId || '')
    .trim()
    .toLowerCase();
  if (profile && EMERGENCY_ROLE_SET.has(profile)) {
    return profile as EmergencyRoleClaimId;
  }
  return NEST_ROLE_DEFAULT_EMERGENCY_ROLE[nestRole] ?? 'read_only_viewer';
}

export function buildAccessTokenClaims(input: {
  userId: string;
  email: string;
  role: UserRole;
  roleProfileId?: string | null;
  tokenUse?: 'access' | 'refresh';
}): CareDroidAccessTokenClaims {
  const role = input.role;
  const emergencyRole = resolveEmergencyRoleClaim(role, input.roleProfileId);
  const permissions =
    EMERGENCY_ROLE_PERMISSION_OVERRIDES[emergencyRole] ?? getRolePermissions(role);

  return {
    sub: input.userId,
    email: input.email,
    role,
    roleProfileId: input.roleProfileId ?? null,
    permissions,
    emergencyRole,
    tokenUse: input.tokenUse ?? 'access',
  };
}

export function claimsIncludePermission(
  claims: Pick<CareDroidAccessTokenClaims, 'permissions' | 'role'>,
  permission: Permission,
): boolean {
  if (Array.isArray(claims.permissions) && claims.permissions.length > 0) {
    return claims.permissions.includes(permission);
  }
  // Fallback for legacy tokens without permissions array
  return getRolePermissions(claims.role).includes(permission);
}
