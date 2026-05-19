import { SetMetadata } from '@nestjs/common';
import { Permission } from '../enums/permission.enum';

/**
 * Permissions Decorator
 *
 * Marks routes with required permissions for authorization checks.
 * Used in conjunction with AuthorizationGuard to enforce RBAC.
 *
 * @param permissions - Single permission or array of permissions required to access the route
 *
 * @example Single permission:
 * ```typescript
 * @Permissions(Permission.READ_PHI)
 * @Get('patients/:id')
 * getPatient(@Param('id') id: string) { ... }
 * ```
 *
 * @example Multiple permissions (user must have ALL):
 * ```typescript
 * @Permissions([Permission.READ_PHI, Permission.EXPORT_PHI])
 * @Get('patients/:id/export')
 * exportPatient(@Param('id') id: string) { ... }
 * ```
 */
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: (Permission | Permission[])[]) => {
  // Flatten array in case of nested arrays
  const flatPermissions = permissions.flat();
  return SetMetadata(PERMISSIONS_KEY, flatPermissions);
};

/**
 * RequirePermission Decorator (Alias for single permission)
 *
 * Syntactic sugar for requiring a single permission.
 *
 * @param permission - Permission required to access the route
 *
 * @example
 * ```typescript
 * @RequirePermission(Permission.MANAGE_USERS)
 * @Post('users')
 * createUser(@Body() createUserDto: CreateUserDto) { ... }
 * ```
 */
export const RequirePermission = (permission: Permission) => {
  return SetMetadata(PERMISSIONS_KEY, [permission]);
};

/**
 * AnyPermission Decorator
 *
 * User must have at least ONE of the specified permissions (OR logic).
 *
 * @param permissions - Array of permissions (user needs at least one)
 *
 * @example User needs either VIEW or MANAGE permission:
 * ```typescript
 * @AnyPermission([Permission.VIEW_USERS, Permission.MANAGE_USERS])
 * @Get('users')
 * getUsers() { ... }
 * ```
 */
export const ANY_PERMISSIONS_KEY = 'anyPermissions';
export const AnyPermission = (...permissions: Permission[]) => {
  return SetMetadata(ANY_PERMISSIONS_KEY, permissions);
};

/**
 * Public Decorator
 *
 * Marks a route as publicly accessible (no authentication required).
 * Bypasses both AuthGuard and AuthorizationGuard.
 *
 * @example
 * ```typescript
 * @Public()
 * @Get('health')
 * healthCheck() {
 *   return { status: 'ok' };
 * }
 * ```
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
