import {
  hasSaasProfilePermission,
  resolveSaasProfileAllowedPacks,
  resolveSaasProfilePermissions,
} from './saas-profile-rbac.config';
import { Permission } from '../auth/enums/permission.enum';

describe('saas-profile-rbac.config', () => {
  it('maps registration clerk to limited PHI permissions', () => {
    const permissions = resolveSaasProfilePermissions('registration-clerk');
    expect(permissions).toEqual(
      expect.arrayContaining([Permission.READ_PHI, Permission.WRITE_PHI]),
    );
    expect(permissions).not.toContain(Permission.USE_AI_CHAT);
    expect(hasSaasProfilePermission('registration-clerk', Permission.READ_PHI)).toBe(true);
    expect(hasSaasProfilePermission('registration-clerk', Permission.CONFIGURE_SYSTEM)).toBe(false);
  });

  it('maps reception desk pack policy for registration clerk', () => {
    expect(resolveSaasProfileAllowedPacks('registration-clerk')).toEqual(
      expect.arrayContaining(['core-platform', 'reception-desk']),
    );
  });

  it('normalizes receptionist aliases to registration clerk permissions', () => {
    expect(resolveSaasProfilePermissions('receptionist')).toEqual(
      resolveSaasProfilePermissions('registration-clerk'),
    );
  });

  // Regression coverage for a real privilege-escalation bug found via a systematic
  // wrong-role authorization check (2026-08-16, authorization.wrong-role.systematic.spec.ts):
  // hasSaasProfilePermission(null, ...) used to fall through normalizeSaasRole's
  // "unrecognized profile string" default and silently grant every 'student'
  // permission (USE_CALCULATORS/USE_DRUG_CHECKER/USE_LAB_INTERPRETER/USE_PROTOCOLS/
  // USE_AI_CHAT) to ANY user with no roleProfileId at all -- including
  // UserRole.READ_ONLY_VIEWER, whose entire purpose is to grant nothing beyond
  // READ_PHI. AuthorizationGuard.hasRolePermission ORs this function's result with
  // the user's base-role permissions unconditionally, so this was a real,
  // unauthenticated-by-design privilege escalation for any account without a
  // profile assigned, not a theoretical one.
  it('contributes zero permissions when no roleProfileId is provided at all, unlike a malformed one', () => {
    expect(resolveSaasProfilePermissions(null)).toEqual([]);
    expect(resolveSaasProfilePermissions(undefined)).toEqual([]);
    expect(hasSaasProfilePermission(null, Permission.USE_CALCULATORS)).toBe(false);
    expect(hasSaasProfilePermission(null, Permission.USE_AI_CHAT)).toBe(false);
    expect(hasSaasProfilePermission(undefined, Permission.USE_DRUG_CHECKER)).toBe(false);

    // A genuinely-provided-but-unrecognized profile string still falls back to
    // 'student' (Cycle 220's own deliberate, tested contract) -- only the
    // "no profile at all" case changed.
    expect(hasSaasProfilePermission('totally-unrecognized-xyz', Permission.USE_CALCULATORS)).toBe(true);
  });
});
