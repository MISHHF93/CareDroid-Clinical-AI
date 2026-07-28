import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { getVisibleNavigation } from '../../config/unified-navigation.config';
import { EMERGENCY_ACTIONS, normalizeEmergencyRole } from '../../config/emergencyRolePermissions';
import { DEMO_USERS, getDemoUserById } from './demoUsers';
import {
  canAccessRoute,
  canMutatePatient,
  canMutateWithCompiledProfile,
  canOwnAlert,
  canPerformClinicalAction,
  canReviewAI,
  canSeeNavigationItem,
  compileCareDroidAccessProfile,
  getCanonicalRoleMapping,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  normalizeCareDroidProfile,
  resolveHospitalRole,
} from './canonicalAccess';
import { HOSPITAL_SITES, CITY_ZONES, DEPARTMENTS } from './hospitalNetwork';
import { CAREDROID_PERMISSIONS } from './permissions';
import {
  isAlertVisibleToCompiledProfile,
  getVisibleScenariosForRole,
  filterAiRecommendationsByProfile,
  getCanonicalAiRecommendationRoute,
} from './aiChiefRouting';

describe('canonical CareDroid access', () => {
  it('does not overprivilege generic nurse aliases as charge nurse', () => {
    expect(resolveHospitalRole('nurse')).toBe('registered_nurse');
    expect(getCanonicalRoleMapping('nurse').emergencyRoleId).toBe('triage_nurse');
    expect(normalizeEmergencyRole('nurse')).toBe('triage_nurse');
  });

  it('maps physician, triage, admin, and observer roles across systems', () => {
    expect(getCanonicalRoleMapping('emergency_physician')).toMatchObject({
      emergencyRoleId: 'physician',
      saasRole: 'emergency-physician',
      backendRole: 'physician',
    });
    expect(getCanonicalRoleMapping('triage_nurse')).toMatchObject({
      emergencyRoleId: 'triage_nurse',
      saasRole: 'nurse',
      backendRole: 'nurse',
    });
    expect(getCanonicalRoleMapping('it_admin')).toMatchObject({
      emergencyRoleId: 'it_admin',
      saasRole: 'platform-admin',
      backendRole: 'admin',
    });
    expect(getCanonicalRoleMapping('demo_observer')).toMatchObject({
      emergencyRoleId: 'read_only_viewer',
      backendRole: 'student',
      readOnly: true,
    });
  });

  it('compiles route access and dashboard personalization from one profile', () => {
    const profile = getDemoUserById('demo-maya-chen');
    expect(profile).toBeTruthy();
    const compiled = compileCareDroidAccessProfile(profile!);

    expect(compiled.user.organizationId).toBe('org-virtual-city-health');
    expect(compiled.role.backendRole).toBe('physician');
    expect(canAccessRoute(compiled, CANONICAL_ROUTES.emergencyPatients)).toBe(true);
    expect(compiled.dashboardWidgets.primaryWidgets).toContain('assigned-patients');
  });

  it('blocks read-only profiles from mutation and write-only route escalation', () => {
    const profile = getDemoUserById('demo-viewer');
    expect(profile).toBeTruthy();
    const compiled = compileCareDroidAccessProfile(profile!);

    expect(compiled.readOnly).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.triage)).toBe(false);
    expect(canAccessRoute(compiled, CANONICAL_ROUTES.emergencyIntake)).toBe(false);
  });

  it('keeps navigation visible routes aligned with canAccessRoute', () => {
    for (const profile of DEMO_USERS) {
      const compiled = compileCareDroidAccessProfile(profile);
      const nav = getVisibleNavigation(compiled.role.emergencyRoleId, { compiledProfile: compiled });
      expect(nav.length).toBeGreaterThan(0);
      for (const item of nav) {
        expect(canAccessRoute(compiled, item.route)).toBe(true);
      }
    }
  });

  it('registered_nurse cannot perform triage acuity assignment or create patients', () => {
    const profile = normalizeCareDroidProfile({
      id: 'test-registered-nurse',
      employeeId: 'EMP-test-rn',
      fullName: 'Test Registered Nurse',
      preferredName: 'Test',
      email: 'test.rn@test.caredroid.local',
      phone: '555-0199',
      avatarUrl: '',
      role: 'registered_nurse',
      title: 'Registered Nurse',
      department: DEPARTMENTS.EMERGENCY,
      hospitalSite: HOSPITAL_SITES.CENTRAL_CITY,
      cityZone: CITY_ZONES.CENTRAL,
      shiftStatus: 'on_shift',
      shiftStart: '07:00',
      shiftEnd: '15:00',
      licenseNumber: 'RN-test',
      specialties: ['Emergency Nursing'],
      availabilityStatus: 'available',
      escalationLevel: 'none',
    });
    const compiled = compileCareDroidAccessProfile(profile);

    expect(compiled.role.hospitalRole).toBe('registered_nurse');
    expect(compiled.role.clinical).toBe(true);
    expect(compiled.readOnly).toBe(false);

    // Must NOT be able to assign triage acuity or create patients (no TRIAGE_CREATE/PATIENT_CREATE)
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.triage)).toBe(false);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.createPatient)).toBe(false);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.verifyIntake)).toBe(false);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.dischargePatient)).toBe(false);

    // CAN perform bedside nursing actions (has PATIENT_UPDATE, AI_REQUEST)
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.writeVitals)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.writeNote)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.manageFlags)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.useCopilot)).toBe(true);
  });

  it('charge_nurse can triage and create patients; read-only profiles cannot', () => {
    const charge = getDemoUserById('demo-omar-patel')!; // charge_nurse
    const compiled = compileCareDroidAccessProfile(charge);

    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.triage)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.createPatient)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.writeVitals)).toBe(true);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.dischargePatient)).toBe(false);
  });

  it('saasRole is ems-user for paramedic and demo-observer for demo_observer', () => {
    expect(getCanonicalRoleMapping('paramedic').saasRole).toBe('ems-user');
    expect(getCanonicalRoleMapping('demo_observer').saasRole).toBe('demo-observer');
  });

  it('it_admin cannot access patient clinical data routes or triage', () => {
    const admin = getDemoUserById('demo-riley-thompson')!; // it_admin
    const compiled = compileCareDroidAccessProfile(admin);

    expect(compiled.readOnly).toBe(false);
    expect(compiled.role.clinical).toBe(false);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.triage)).toBe(false);
    expect(canMutateWithCompiledProfile(compiled, EMERGENCY_ACTIONS.dischargePatient)).toBe(false);
    expect(canAccessRoute(compiled, CANONICAL_ROUTES.emergencyPatients)).toBe(false);
  });

  it('exposes shared permission helpers from the compiled profile', () => {
    const physician = compileCareDroidAccessProfile(getDemoUserById('demo-maya-chen')!);

    expect(hasPermission(physician, CAREDROID_PERMISSIONS.PATIENT_READ)).toBe(true);
    expect(hasAnyPermission(physician, [CAREDROID_PERMISSIONS.AUDIT_READ, CAREDROID_PERMISSIONS.AI_REVIEW])).toBe(true);
    expect(hasAllPermissions(physician, [CAREDROID_PERMISSIONS.PATIENT_READ, CAREDROID_PERMISSIONS.AI_REQUEST])).toBe(true);
    expect(canReviewAI(physician)).toBe(true);
    expect(canMutatePatient(physician)).toBe(true);
    expect(canPerformClinicalAction(physician, EMERGENCY_ACTIONS.writeNote)).toBe(true);
  });

  it('registration clerk cannot review AI, own clinical alerts, or perform clinical actions', () => {
    const clerk = compileCareDroidAccessProfile(getDemoUserById('demo-grace-kim')!);

    expect(canReviewAI(clerk)).toBe(false);
    expect(canOwnAlert(clerk, 'triage_nurse')).toBe(false);
    expect(canPerformClinicalAction(clerk, EMERGENCY_ACTIONS.triage)).toBe(false);
    expect(canMutatePatient(clerk)).toBe(true);
  });

  it('canSeeNavigationItem follows the same route and permission logic', () => {
    const viewer = compileCareDroidAccessProfile(getDemoUserById('demo-viewer')!);

    expect(
      canSeeNavigationItem(viewer, {
        route: CANONICAL_ROUTES.emergencyWhiteboard,
        requiredPermissions: [CAREDROID_PERMISSIONS.PATIENT_READ],
        readOnlyAllowed: true,
      }),
    ).toBe(true);
    expect(
      canSeeNavigationItem(viewer, {
        route: CANONICAL_ROUTES.emergencyIntake,
        requiredPermissions: [CAREDROID_PERMISSIONS.PATIENT_CREATE],
        readOnlyAllowed: false,
      }),
    ).toBe(false);
  });
});

describe('canOwnAlert', () => {
  it('charge_nurse can own a charge_nurse alert', () => {
    const charge = getDemoUserById('demo-omar-patel')!;
    const compiled = compileCareDroidAccessProfile(charge);
    expect(canOwnAlert(compiled, 'charge_nurse')).toBe(true);
  });

  it('charge_nurse cannot own a triage_nurse alert when ownerRole is specified', () => {
    const charge = getDemoUserById('demo-omar-patel')!;
    const compiled = compileCareDroidAccessProfile(charge);
    expect(canOwnAlert(compiled, 'triage_nurse')).toBe(false);
  });

  it('canOwnAlert with no ownerRole returns true for any acknowledger', () => {
    const physician = getDemoUserById('demo-maya-chen')!;
    const compiled = compileCareDroidAccessProfile(physician);
    expect(canOwnAlert(compiled)).toBe(true);
  });

  it('demo_observer cannot own any alert (read-only)', () => {
    const viewer = getDemoUserById('demo-viewer')!;
    const compiled = compileCareDroidAccessProfile(viewer);
    expect(canOwnAlert(compiled)).toBe(false);
    expect(canOwnAlert(compiled, 'charge_nurse')).toBe(false);
  });

  it('it_admin cannot own clinical alerts (no ALERT_ACKNOWLEDGE permission)', () => {
    const admin = getDemoUserById('demo-riley-thompson')!;
    const compiled = compileCareDroidAccessProfile(admin);
    expect(compiled.alertCapabilities.canAcknowledge).toBe(false);
    expect(canOwnAlert(compiled)).toBe(false);
  });
});

describe('resolveHospitalRole alias resolution', () => {
  it('maps emergency role aliases to canonical HospitalRole', () => {
    expect(resolveHospitalRole('nurse')).toBe('registered_nurse');
    expect(resolveHospitalRole('physician')).toBe('emergency_physician');
    // 'admin' resolves to super_admin (its own declared alias, matching
    // EMERGENCY_ROLE_IDS.admin's full-access intent) — NOT it_admin, which
    // never declares 'admin' among its own aliases (['it-admin',
    // 'technical-admin'] only). A hardcoded seed previously shadowed this
    // and silently downgraded the literal 'admin' role's access everywhere
    // this alias table is consulted; fixed Cycle 217.
    expect(resolveHospitalRole('admin')).toBe('super_admin');
    expect(resolveHospitalRole('triage_nurse')).toBe('triage_nurse');
  });

  it('maps saasRole aliases to canonical HospitalRole', () => {
    // 'platform-admin' saasRole is shared by super_admin and it_admin; super_admin wins (first in catalog)
    expect(resolveHospitalRole('platform-admin')).toBe('super_admin');
    // it_admin resolves via its own alias
    expect(resolveHospitalRole('it-admin')).toBe('it_admin');
    expect(resolveHospitalRole('ems-user')).toBe('paramedic');
  });

  it('falls back to demo_observer for unknown roles', () => {
    expect(resolveHospitalRole('unknown_role_xyz')).toBe('demo_observer');
    expect(resolveHospitalRole('')).toBe('demo_observer');
  });
});

describe('AI Chief routing integration with canonical compiled profiles', () => {
  it('charge_nurse sees triage_breach and critical clinical scenarios', () => {
    const charge = getDemoUserById('demo-omar-patel')!;
    const compiled = compileCareDroidAccessProfile(charge);
    const scenarios = getVisibleScenariosForRole(compiled.role.hospitalRole);
    expect(scenarios).toContain('triage_breach');
    expect(scenarios).toContain('critical_chest_pain');
  });

  it('demo_observer cannot see any AI Chief scenario via compiled profile check', () => {
    const viewer = getDemoUserById('demo-viewer')!;
    const compiled = compileCareDroidAccessProfile(viewer);
    expect(isAlertVisibleToCompiledProfile('critical_chest_pain', compiled)).toBe(false);
    expect(getVisibleScenariosForRole(compiled.role.hospitalRole).length).toBe(0);
  });

  it('filterAiRecommendationsByProfile removes scenarios not visible to current role', () => {
    const physician = getDemoUserById('demo-maya-chen')!;
    const viewer = getDemoUserById('demo-viewer')!;
    const recs = [
      { scenario: 'critical_chest_pain' as const, text: 'CP alert' },
      { scenario: 'bed_capacity_breach' as const, text: 'Capacity alert' },
    ];
    const forPhysician = filterAiRecommendationsByProfile(recs, physician!);
    expect(forPhysician.some((r) => r.scenario === 'critical_chest_pain')).toBe(true);
    expect(filterAiRecommendationsByProfile(recs, viewer!).length).toBe(0);
  });

  it('getCanonicalAiRecommendationRoute enriches route with compiled profile site/department', () => {
    const triage = getDemoUserById('demo-sofia-alvarez')!;
    const route = getCanonicalAiRecommendationRoute('critical_chest_pain', triage);
    expect(route.ownerRole).toBe('triage_nurse');
    expect(route.owningDepartment).toBe(triage.departmentId);
    expect(route.owningSite).toBe(triage.hospitalSiteId);
    expect(route.visibleToUsers).toContain(triage.id);
  });
});
