import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { getVisibleNavigation } from '../../config/unified-navigation.config';
import { EMERGENCY_ACTIONS, normalizeEmergencyRole } from '../../config/emergencyRolePermissions';
import { DEMO_USERS, getDemoUserById } from './demoUsers';
import {
  canAccessRoute,
  canMutateWithCompiledProfile,
  compileCareDroidAccessProfile,
  getCanonicalRoleMapping,
  normalizeCareDroidProfile,
  resolveHospitalRole,
} from './canonicalAccess';
import { HOSPITAL_SITES, CITY_ZONES, DEPARTMENTS } from './hospitalNetwork';

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
      emergencyRoleId: 'admin',
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
});
