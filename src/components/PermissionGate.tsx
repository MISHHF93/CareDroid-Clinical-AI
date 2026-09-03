import React from 'react';
import { useUser } from '../contexts/UserContext';
import { resolveHospitalRole } from '../lib/users/canonicalAccess';
import useSecurityAccess from '../hooks/useSecurityAccess';
import logger from '../utils/logger';

/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Implements client-side permission checks for UI rendering.
 *
 * Note: Server-side validation is still enforced via AuthorizationGuard.
 * This component only controls UI visibility, not actual access.
 *
 * @param {Object} props
 * @param {string|string[]} props.permission - Single permission or array of permissions required
 * @param {boolean} props.requireAll - If true, user must have all permissions (AND). If false, any permission (OR). Default: false
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {React.ReactNode} props.fallback - Optional content to render if user lacks permission
 *
 * @example Single permission:
 * ```jsx
 * <PermissionGate permission="VIEW_AUDIT_LOGS">
 *   <Link to="/audit">Audit Logs</Link>
 * </PermissionGate>
 * ```
 *
 * @example Multiple permissions (ANY):
 * ```jsx
 * <PermissionGate permission={['MANAGE_USERS', 'VIEW_USERS']}>
 *   <Link to="/users">User Management</Link>
 * </PermissionGate>
 * ```
 *
 * @example Multiple permissions (ALL):
 * ```jsx
 * <PermissionGate permission={['READ_PHI', 'EXPORT_PHI']} requireAll>
 *   <Button>Export Patient Data</Button>
 * </PermissionGate>
 * ```
 *
 * @example With fallback:
 * ```jsx
 * <PermissionGate
 *   permission="ADMIN_ACCESS"
 *   fallback={<p>Admin access required</p>}
 * >
 *   <AdminPanel />
 * </PermissionGate>
 * ```
 */
const PermissionGate = ({ permission, requireAll = false, children, fallback = null }) => {
  const { can, canAny, canAll } = useSecurityAccess();

  // Handle single permission
  if (typeof permission === 'string') {
    return can(permission) ? <>{children}</> : <>{fallback}</>;
  }

  // Handle array of permissions
  if (Array.isArray(permission)) {
    const hasAccess = requireAll ? canAll(permission) : canAny(permission);

    return hasAccess ? <>{children}</> : <>{fallback}</>;
  }

  // Invalid permission prop
  logger.warn('PermissionGate: permission prop must be a string or array');
  return <>{fallback}</>;
};

/**
 * RequirePermission Component
 *
 * Alias for PermissionGate that enforces a single permission.
 * Syntactic sugar for better readability.
 *
 * @param {Object} props
 * @param {string} props.permission - Permission required
 * @param {React.ReactNode} props.children - Content to render if user has permission
 * @param {React.ReactNode} props.fallback - Optional fallback content
 */
export const RequirePermission = ({ permission, children, fallback = null }) => {
  return (
    <PermissionGate permission={permission} fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * AnyPermission Component
 *
 * Renders children if user has ANY of the specified permissions (OR logic).
 *
 * @param {Object} props
 * @param {string[]} props.permissions - Array of permissions (user needs at least one)
 * @param {React.ReactNode} props.children - Content to render
 * @param {React.ReactNode} props.fallback - Optional fallback content
 */
export const AnyPermission = ({ permissions, children, fallback = null }) => {
  return (
    <PermissionGate permission={permissions} requireAll={false} fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * AllPermissions Component
 *
 * Renders children only if user has ALL of the specified permissions (AND logic).
 *
 * @param {Object} props
 * @param {string[]} props.permissions - Array of permissions (user needs all)
 * @param {React.ReactNode} props.children - Content to render
 * @param {React.ReactNode} props.fallback - Optional fallback content
 */
export const AllPermissions = ({ permissions, children, fallback = null }) => {
  return (
    <PermissionGate permission={permissions} requireAll={true} fallback={fallback}>
      {children}
    </PermissionGate>
  );
};

/**
 * RoleGate Component
 *
 * Renders children based on user role.
 * Simpler alternative to PermissionGate when checking roles directly.
 *
 * @param {Object} props
 * @param {string|string[]} props.role - Required role(s)
 * @param {React.ReactNode} props.children - Content to render
 * @param {React.ReactNode} props.fallback - Optional fallback content
 *
 * @example
 * ```jsx
 * <RoleGate role="admin">
 *   <AdminDashboard />
 * </RoleGate>
 * ```
 *
 * @example Multiple roles:
 * ```jsx
 * <RoleGate role={['physician', 'nurse']}>
 *   <ClinicalPanel />
 * </RoleGate>
 * ```
 */
export const RoleGate = ({ role, children, fallback = null }) => {
  const { user } = useUser();

  if (!user || !user.role) {
    return <>{fallback}</>;
  }

  const hospitalRole = resolveHospitalRole(
    (user as any).compiledAccessProfile?.role?.hospitalRole ?? user.role,
  );
  const hasRole = Array.isArray(role)
    ? role.map(resolveHospitalRole).includes(hospitalRole)
    : resolveHospitalRole(role) === hospitalRole;

  return hasRole ? <>{children}</> : <>{fallback}</>;
};

/**
 * ShowForAuthenticated Component
 *
 * Shows children only if user is authenticated.
 * Does not check permissions, only authentication status.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render
 * @param {React.ReactNode} props.fallback - Optional fallback content
 *
 * @example
 * ```jsx
 * <ShowForAuthenticated fallback={<SignInPrompt />}>
 *   <UserProfile />
 * </ShowForAuthenticated>
 * ```
 */
export const ShowForAuthenticated = ({ children, fallback = null }) => {
  const { isAuthenticated } = useUser();
  return isAuthenticated ? <>{children}</> : <>{fallback}</>;
};

/**
 * HideForAuthenticated Component
 *
 * Hides children if user is authenticated.
 * Useful for login/signup prompts that should only show to guests.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to render when NOT authenticated
 *
 * @example
 * ```jsx
 * <HideForAuthenticated>
 *   <SignInButton />
 * </HideForAuthenticated>
 * ```
 */
export const HideForAuthenticated = ({ children }) => {
  const { isAuthenticated } = useUser();
  return !isAuthenticated ? <>{children}</> : null;
};

export default PermissionGate;
