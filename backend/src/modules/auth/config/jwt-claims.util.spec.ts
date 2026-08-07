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
