import { UserRole } from '../../users/entities/user.entity';
import { Permission } from '../enums/permission.enum';
import {
  buildAccessTokenClaims,
  claimsIncludePermission,
  resolveEmergencyRoleClaim,
} from './jwt-claims.util';

describe('jwt-claims.util', () => {
  it('embeds Nest permissions for physician', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u1',
      email: 'md@example.com',
      role: UserRole.PHYSICIAN,
    });
    expect(claims.tokenUse).toBe('access');
    expect(claims.permissions).toContain(Permission.READ_PHI);
    expect(claims.permissions).toContain(Permission.WRITE_PHI);
    expect(claims.permissions).toContain(Permission.USE_AI_CHAT);
    expect(claims.emergencyRole).toBe('physician');
  });

  it('defaults nurse Nest role to charge_nurse emergency claim', () => {
    expect(resolveEmergencyRoleClaim(UserRole.NURSE, null)).toBe('charge_nurse');
  });

  it('honors roleProfileId when it is a known emergency role (reception golden path)', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u2',
      email: 'clerk@example.com',
      role: UserRole.NURSE,
      roleProfileId: 'registration_clerk',
    });
    expect(claims.emergencyRole).toBe('registration_clerk');
    expect(claims.permissions).toContain(Permission.WRITE_PHI);
  });

  it('honors it_admin emergency claim id on admin Nest role', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u-it',
      email: 'it@example.com',
      role: UserRole.ADMIN,
      roleProfileId: 'it_admin',
    });
    expect(claims.emergencyRole).toBe('it_admin');
    expect(claims.permissions).toContain(Permission.CONFIGURE_SYSTEM);
  });

  // P0 regression guard: it_admin/ed_manager both use UserRole.ADMIN as their
  // JWT container, but neither should inherit that role's full PHI grant --
  // this codebase's own emergencyNestPermissionMap.ts already documented
  // it_admin as "no clinical PHI grants" and ed_manager as "limited write"
  // (i.e. READ_PHI only), but nothing enforced it until now. The pre-fix
  // behavior (both silently getting READ/WRITE/EXPORT/DELETE PHI) is exactly
  // what this test would have caught if it existed before the fix.
  it('it_admin gets zero PHI permissions despite UserRole.ADMIN normally granting full PHI access', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u-it2',
      email: 'it2@example.com',
      role: UserRole.ADMIN,
      roleProfileId: 'it_admin',
    });
    expect(claims.permissions).not.toContain(Permission.READ_PHI);
    expect(claims.permissions).not.toContain(Permission.WRITE_PHI);
    expect(claims.permissions).not.toContain(Permission.EXPORT_PHI);
    expect(claims.permissions).not.toContain(Permission.DELETE_PHI);
  });

  it('ed_manager gets READ_PHI only -- never WRITE/EXPORT/DELETE -- despite UserRole.ADMIN normally granting all four', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u-em',
      email: 'edmanager@example.com',
      role: UserRole.ADMIN,
      roleProfileId: 'ed_manager',
    });
    expect(claims.emergencyRole).toBe('ed_manager');
    expect(claims.permissions).toContain(Permission.READ_PHI);
    expect(claims.permissions).not.toContain(Permission.WRITE_PHI);
    expect(claims.permissions).not.toContain(Permission.EXPORT_PHI);
    expect(claims.permissions).not.toContain(Permission.DELETE_PHI);
  });

  it('a genuine admin persona (no it_admin/ed_manager override) keeps full UserRole.ADMIN PHI access unchanged', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u-admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
      roleProfileId: 'admin',
    });
    expect(claims.emergencyRole).toBe('admin');
    expect(claims.permissions).toContain(Permission.READ_PHI);
    expect(claims.permissions).toContain(Permission.WRITE_PHI);
    expect(claims.permissions).toContain(Permission.EXPORT_PHI);
    expect(claims.permissions).toContain(Permission.DELETE_PHI);
  });

  it('ignores unknown roleProfileId strings', () => {
    expect(resolveEmergencyRoleClaim(UserRole.PHYSICIAN, 'not-a-real-role')).toBe('physician');
  });

  it('student maps to read_only_viewer and lacks WRITE_PHI', () => {
    const claims = buildAccessTokenClaims({
      userId: 'u3',
      email: 'student@example.com',
      role: UserRole.STUDENT,
    });
    expect(claims.emergencyRole).toBe('read_only_viewer');
    expect(claims.permissions).not.toContain(Permission.WRITE_PHI);
    expect(claims.permissions).toContain(Permission.USE_AI_CHAT);
  });

  it('READ_ONLY_VIEWER Nest role grants READ_PHI without WRITE_PHI -- the gap STUDENT/NURSE misprovisioning left open', () => {
    // Before UserRole.READ_ONLY_VIEWER existed, a real "read-only viewer" account
    // had no correct underlying Nest role to be assigned: STUDENT (the prior test
    // above) maps its emergencyRole label to 'read_only_viewer' but grants NO
    // READ_PHI at all, so it couldn't even view the Whiteboard; the only role that
    // actually had READ_PHI was NURSE, which also grants WRITE_PHI. This is the
    // first Nest role where the 'read_only_viewer' emergencyRole label and the
    // actual server-enforced permissions agree with each other.
    const claims = buildAccessTokenClaims({
      userId: 'u4',
      email: 'viewer@example.com',
      role: UserRole.READ_ONLY_VIEWER,
    });
    expect(claims.emergencyRole).toBe('read_only_viewer');
    expect(claims.permissions).toContain(Permission.READ_PHI);
    expect(claims.permissions).not.toContain(Permission.WRITE_PHI);
    expect(claims.permissions).not.toContain(Permission.EXPORT_PHI);
    expect(claims.permissions).not.toContain(Permission.DELETE_PHI);
  });

  it('claimsIncludePermission prefers explicit permissions array', () => {
    expect(
      claimsIncludePermission(
        { role: UserRole.STUDENT, permissions: [Permission.READ_PHI] },
        Permission.READ_PHI,
      ),
    ).toBe(true);
    expect(
      claimsIncludePermission(
        { role: UserRole.STUDENT, permissions: [Permission.READ_PHI] },
        Permission.WRITE_PHI,
      ),
    ).toBe(false);
  });
});
