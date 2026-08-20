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
  const permissions = getRolePermissions(role);
  const emergencyRole = resolveEmergencyRoleClaim(role, input.roleProfileId);

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
