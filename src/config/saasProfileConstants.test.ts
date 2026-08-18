import { normalizeSaasRole, DEFAULT_SAAS_PROFILE } from './saasProfileConstants';

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
    // SEED_ROLE_PROFILES (backend platform-asset-seed.data.ts) seeds a
    // `role_profiles` id 'administrator' and 'medical-student', which
    // PATCH platform/me/role-profile and tenant-provisioning.service.ts's
    // defaultRoleProfileId() both persist straight into
    // user.profile.roleProfileId. Before this alias existed,
    // normalizeSaasRole('administrator') fell through every branch to the
    // DEFAULT_SAAS_PROFILE.role fallback ('student'), silently downgrading a
    // hospital administrator to a student-level saasRole (losing their real
    // command-center workspace/permissions for the generic student catalog
    // entry). 'medical-student' happened to already resolve to the same
    // fallback, so it was correct only by coincidence.
    expect(normalizeSaasRole('administrator')).toBe('hospital-administrator');
    expect(normalizeSaasRole('medical-student')).toBe('student');
  });

  it('is case- and whitespace-insensitive (HEAL-203, mirrors the backend copy\'s Cycle 220 regression)', () => {
    // This frontend mirror never received the backend's own case/whitespace
    // fix -- every comparison here was a strict `===` against a lowercase
    // literal, so a differently-cased role from profileRouteLaunch.ts's
    // context?.roleProfile?.id / context?.user?.role (session/API-sourced,
    // client-controlled) silently fell through to 'student' on the frontend
    // even where the backend would have resolved it correctly -- a real
    // frontend/backend behavioral split, not just a hypothetical one.
    expect(normalizeSaasRole('ADMIN')).toBe('hospital-administrator');
    expect(normalizeSaasRole('Admin')).toBe('hospital-administrator');
    expect(normalizeSaasRole('  admin  ')).toBe('hospital-administrator');
    expect(normalizeSaasRole('Administrator')).toBe('hospital-administrator');
    expect(normalizeSaasRole('PHYSICIAN')).toBe('emergency-physician');
    expect(normalizeSaasRole('Registration_Clerk')).toBe('registration-clerk');
    expect(normalizeSaasRole('HOSPITAL-ADMINISTRATOR')).toBe('hospital-administrator');
    expect(normalizeSaasRole('Emergency-Physician')).toBe('emergency-physician');
  });

  it('maps EMERGENCY_ROLE_IDS hospital roles that had no alias at all (HEAL-323)', () => {
    // Before this, all 9 fell through to DEFAULT_SAAS_PROFILE.role
    // ('student') -- confirmed live: a charge_nurse demo persona's
    // effectiveProfile/accessSummary/navigationRoutes all silently
    // downgraded to the generic student catalog entry.
    expect(normalizeSaasRole('it_admin')).toBe('platform-admin');
    expect(normalizeSaasRole('ed_manager')).toBe('hospital-administrator');
    expect(normalizeSaasRole('charge_nurse')).toBe('nurse');
    expect(normalizeSaasRole('triage_nurse')).toBe('nurse');
    expect(normalizeSaasRole('ems_user')).toBe('fleet-operator');
    expect(normalizeSaasRole('dispatcher')).toBe('fleet-operator');
    expect(normalizeSaasRole('ems_coordinator')).toBe('fleet-operator');
    expect(normalizeSaasRole('read_only_viewer')).toBe('student');
    expect(normalizeSaasRole('public_display')).toBe('student');
  });

  it('falls back to the safe DEFAULT_SAAS_PROFILE.role for unrecognized input', () => {
    expect(normalizeSaasRole('totally-unrecognized-xyz')).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole('')).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole(null)).toBe(DEFAULT_SAAS_PROFILE.role);
    expect(normalizeSaasRole(undefined)).toBe(DEFAULT_SAAS_PROFILE.role);
  });
});
