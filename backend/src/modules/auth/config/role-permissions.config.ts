import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';

/**
 * Role-Permission Mapping Configuration
 *
 * Defines which permissions are granted to each role in the system.
 * Follows the principle of least privilege - users only get permissions
 * necessary for their role.
 *
 * HIPAA Compliance: Implements role-based access control (RBAC) as required
 * by HIPAA Security Rule § 164.308(a)(4)(i) - Information Access Management
 */

export const RolePermissions: Record<UserRole, Permission[]> = {
  /**
   * STUDENT Role
   * - Limited access for medical students and trainees
   * - Can use clinical tools for learning
   * - Cannot access real PHI
   * - Cannot perform administrative tasks
   */
  [UserRole.STUDENT]: [
    // Clinical Tools (Educational Use)
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,
  ],

  /**
   * NURSE Role
   * - Bedside clinical access
   * - Can read and write PHI
   * - Can use all clinical tools
   * - Can trigger emergency protocols
   * - Cannot manage users or system
   */
  [UserRole.NURSE]: [
    // PHI Access
    Permission.READ_PHI,
    Permission.WRITE_PHI,

    // Clinical Tools
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,

    // Emergency Response
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
  ],

  /**
   * PHYSICIAN Role
   * - Full clinical access
   * - Can read, write, export, and delete PHI
   * - Can use all clinical tools
   * - Can override safety checks (attending physicians)
   * - Can trigger emergency protocols
   * - Can view audit logs for their patients
   * - Cannot manage system or users (not IT admin)
   */
  [UserRole.PHYSICIAN]: [
    // PHI Access (Full)
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.EXPORT_PHI,
    Permission.DELETE_PHI,

    // Clinical Tools (Full Access)
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,

    // Emergency & Safety
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
    Permission.OVERRIDE_SAFETY_CHECKS,

    // Audit (Limited - own patients only)
    Permission.VIEW_AUDIT_LOGS,
  ],

  /**
   * ADMIN Role
   * - System administrator
   * - Full access to all features
   * - Can manage users, roles, encryption
   * - Can view and export audit logs
   * - Can configure system
   * - Can enforce MFA policies
   */
  [UserRole.ADMIN]: [
    // PHI Access (Full)
    Permission.READ_PHI,
    Permission.WRITE_PHI,
    Permission.EXPORT_PHI,
    Permission.DELETE_PHI,

    // Clinical Tools (Full Access)
    Permission.USE_CALCULATORS,
    Permission.USE_DRUG_CHECKER,
    Permission.USE_LAB_INTERPRETER,
    Permission.USE_PROTOCOLS,
    Permission.USE_AI_CHAT,

    // User Management (Full)
    Permission.MANAGE_USERS,
    Permission.MANAGE_ROLES,
    Permission.VIEW_USERS,

    // Audit & Compliance (Full)
    Permission.VIEW_AUDIT_LOGS,
    Permission.EXPORT_AUDIT_LOGS,
    Permission.VERIFY_AUDIT_INTEGRITY,

    // System Administration (Full)
    Permission.CONFIGURE_SYSTEM,
    Permission.MANAGE_ENCRYPTION,
    Permission.MANAGE_SUBSCRIPTIONS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_CONSENT,
    Permission.MANAGE_PRIVACY,

    // Emergency & Safety
    Permission.TRIGGER_EMERGENCY_PROTOCOL,
    Permission.OVERRIDE_SAFETY_CHECKS,

    // Two-Factor Authentication
    Permission.ENFORCE_MFA,
    Permission.MANAGE_MFA,
  ],
};

/**
 * Check if a role has a specific permission
 *
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns true if role has permission, false otherwise
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const rolePermissions = RolePermissions[role];
  return rolePermissions.includes(permission);
}

/**
 * Check if a role has ALL of the specified permissions
 *
 * @param role - User role to check
 * @param permissions - Array of permissions to verify
 * @returns true if role has all permissions, false otherwise
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role];
  return permissions.every((permission) => rolePermissions.includes(permission));
}

/**
 * Check if a role has ANY of the specified permissions
 *
 * @param role - User role to check
 * @param permissions - Array of permissions to verify
 * @returns true if role has at least one permission, false otherwise
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  const rolePermissions = RolePermissions[role];
  return permissions.some((permission) => rolePermissions.includes(permission));
}

/**
 * Get all permissions for a specific role
 *
 * @param role - User role
 * @returns Array of permissions
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return RolePermissions[role] || [];
}

/**
 * Permission Hierarchy Configuration
 * Defines which permissions imply others (permission inheritance)
 *
 * Example: EXPORT_PHI implies READ_PHI (can't export what you can't read)
 */
export const PermissionHierarchy: Partial<Record<Permission, Permission[]>> = {
  // Export implies read
  [Permission.EXPORT_PHI]: [Permission.READ_PHI],

  // Write implies read
  [Permission.WRITE_PHI]: [Permission.READ_PHI],

  // Delete implies read and write
  [Permission.DELETE_PHI]: [Permission.READ_PHI, Permission.WRITE_PHI],

  // Manage users implies view users
  [Permission.MANAGE_USERS]: [Permission.VIEW_USERS],

  // Manage roles implies view users
  [Permission.MANAGE_ROLES]: [Permission.VIEW_USERS],

  // Export audit logs implies view audit logs
  [Permission.EXPORT_AUDIT_LOGS]: [Permission.VIEW_AUDIT_LOGS],

  // Manage MFA implies view users
  [Permission.MANAGE_MFA]: [Permission.VIEW_USERS],
};

/**
 * Check if a user has a permission, considering permission hierarchy
 *
 * @param role - User role to check
 * @param permission - Permission to verify
 * @returns true if role has permission (directly or via hierarchy), false otherwise
 */
export function hasPermissionWithHierarchy(role: UserRole, permission: Permission): boolean {
  const rolePermissions = RolePermissions[role];

  // Direct permission check
  if (rolePermissions.includes(permission)) {
    return true;
  }

  // Check if any of the user's permissions imply the requested permission
  for (const userPermission of rolePermissions) {
    const impliedPermissions = PermissionHierarchy[userPermission] || [];
    if (impliedPermissions.includes(permission)) {
      return true;
    }
  }

  return false;
}

/**
 * Get effective permissions for a role (including inherited permissions)
 *
 * @param role - User role
 * @returns Array of all effective permissions
 */
export function getEffectivePermissions(role: UserRole): Permission[] {
  const directPermissions = RolePermissions[role] || [];
  const effectivePermissions = new Set(directPermissions);

  // Add implied permissions
  for (const permission of directPermissions) {
    const impliedPermissions = PermissionHierarchy[permission] || [];
    impliedPermissions.forEach((p) => effectivePermissions.add(p));
  }

  return Array.from(effectivePermissions);
}
