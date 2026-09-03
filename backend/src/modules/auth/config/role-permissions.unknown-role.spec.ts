import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import {
  RolePermissions,
  getEffectivePermissions,
  hasPermissionWithHierarchy,
} from './role-permissions.config';

/**
 * A principal whose role the permission table does not know must be DENIED,
 * not crash the guard. Until 2026-09-03 `hasPermissionWithHierarchy` indexed
 * straight into RolePermissions, so an undefined or unmapped role threw
 * `Cannot read properties of undefined (reading 'includes')` from inside
 * AuthorizationGuard -- every gated route answered 500 instead of 403, which
 * is how the tool-orchestrator e2e suite (a fake JWT user with no role) had
 * been red on main.
 */
describe('hasPermissionWithHierarchy with a role outside the table', () => {
  const unknownRoles = [undefined, null, '', 'not-a-role', 'registration_clerk', 'ADMIN'];

  it.each(unknownRoles)('denies every permission for role %p instead of throwing', (role) => {
    for (const permission of Object.values(Permission)) {
      expect(() =>
        hasPermissionWithHierarchy(role as unknown as UserRole, permission),
      ).not.toThrow();
      expect(hasPermissionWithHierarchy(role as unknown as UserRole, permission)).toBe(false);
    }
  });

  it.each(unknownRoles)('reports no effective permissions for role %p', (role) => {
    expect(getEffectivePermissions(role as unknown as UserRole)).toEqual([]);
  });

  it('still grants every known role its own direct permissions', () => {
    for (const role of Object.values(UserRole)) {
      for (const permission of RolePermissions[role]) {
        expect(hasPermissionWithHierarchy(role, permission)).toBe(true);
      }
    }
  });
});
