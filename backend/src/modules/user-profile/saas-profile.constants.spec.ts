import { normalizeSaasRole, DEFAULT_SAAS_PROFILE } from './saas-profile.constants';

describe('normalizeSaasRole', () => {
  it('passes through a canonical SaasUserRole unchanged', () => {
    expect(normalizeSaasRole('emergency-physician')).toBe('emergency-physician');
    expect(normalizeSaasRole('nurse')).toBe('nurse');
  });

  it('maps known aliases to their canonical role', () => {
    expect(normalizeSaasRole('physician')).toBe('emergency-physician');
    expect(normalizeSaasRole('admin')).toBe('hospital-administrator');
    expect(normalizeSaasRole('registration_clerk')).toBe('registration-clerk');
    expect(normalizeSaasRole('receptionist')).toBe('registration-clerk');
    expect(normalizeSaasRole('clerk')).toBe('registration-clerk');
    expect(normalizeSaasRole('vet')).toBe('veterinarian');
  });

  it('maps the 8-row role_profiles catalog ids that spell differently than SAAS_USER_ROLES (HEAL-198)', () => {
    // SEED_ROLE_PROFILES (platform-asset-seed.data.ts) seeds a `role_profiles`
    // id 'administrator' and 'medical-student', which PATCH platform/me/role-profile
    // and tenant-provisioning.service.ts's defaultRoleProfileId() both persist
    // straight into user.profile.roleProfileId. Before this alias existed,
    // normalizeSaasRole('administrator') fell through every branch to the
    // DEFAULT_SAAS_PROFILE.role fallback ('student'), silently downgrading a
    // hospital administrator to a student-level saasRole (losing MANAGE_USERS/
    // VIEW_AUDIT_LOGS/VIEW_GOVERNANCE and landing on the generic student
    // catalog entry instead of their real command-center workspace).
    // 'medical-student' happened to already resolve to the same fallback
    // ('student'), so it was correct only by coincidence.
    expect(normalizeSaasRole('administrator')).toBe('hospital-administrator');
    expect(normalizeSaasRole('medical-student')).toBe('student');
  });

  it('falls back to the safe DEFAULT_SAAS_PROFILE.role for unrecognized input', () => {
    expect(normalizeSaasRole('totally-unrecognized-xyz')).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole('')).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole(null)).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole(undefined)).toBe(DEFAULT_SAAS_PROFILE.role);
  });

  it('is case- and whitespace-insensitive (Cycle 220 regression)', () => {
    // Every match below is a strict `===` comparison against a lowercase
    // literal, so a client sending a differently-cased role (e.g. dto.role
    // from a real API request body, persisted straight into roleProfileId
    // by user-profile.service.ts) used to silently fall through to the
    // DEFAULT_SAAS_PROFILE.role fallback ('student') instead of matching.
    expect(normalizeSaasRole('ADMIN')).toBe('hospital-administrator');
    expect(normalizeSaasRole('Admin')).toBe('hospital-administrator');
    expect(normalizeSaasRole('  admin  ')).toBe('hospital-administrator');
    expect(normalizeSaasRole('PHYSICIAN')).toBe('emergency-physician');
    expect(normalizeSaasRole('Registration_Clerk')).toBe('registration-clerk');
    expect(normalizeSaasRole('HOSPITAL-ADMINISTRATOR')).toBe('hospital-administrator');
    expect(normalizeSaasRole('Emergency-Physician')).toBe('emergency-physician');
  });
});
