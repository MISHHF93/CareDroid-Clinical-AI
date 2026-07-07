import { describe, it, expect } from 'vitest';
import {
  CAREDROID_ROLE_LABELS,
  ROLE_TO_EMERGENCY_ROLE,
  ALL_CAREDROID_ROLES,
  toEmergencyRoleId,
  isReadOnlyRole,
  isClinicalRole,
  isAdminRole,
  getRoleLabel,
  getDashboardWidgets,
} from './roleAccess';

describe('role labels', () => {
  it('every CareDroid role has a label', () => {
    for (const role of ALL_CAREDROID_ROLES) {
      expect(CAREDROID_ROLE_LABELS[role]).toBeTruthy();
    }
  });

  it('getRoleLabel falls back to the role key for unknown roles', () => {
    expect(getRoleLabel('emergency_physician')).toBe('Emergency Physician');
  });
});

describe('ROLE_TO_EMERGENCY_ROLE', () => {
  it('every CareDroid role maps to a valid emergency role', () => {
    const validEmergencyRoles = [
      'admin', 'ed_manager', 'charge_nurse', 'triage_nurse', 'physician',
      'registration_clerk', 'ems_user', 'read_only_viewer', 'public_display',
    ];
    for (const role of ALL_CAREDROID_ROLES) {
      expect(validEmergencyRoles).toContain(ROLE_TO_EMERGENCY_ROLE[role]);
    }
  });

  it('super_admin maps to admin', () => {
    expect(toEmergencyRoleId('super_admin')).toBe('admin');
  });

  it('paramedic maps to ems_user', () => {
    expect(toEmergencyRoleId('paramedic')).toBe('ems_user');
  });

  it('demo_observer maps to read_only_viewer', () => {
    expect(toEmergencyRoleId('demo_observer')).toBe('read_only_viewer');
  });

  it('emergency_physician maps to physician', () => {
    expect(toEmergencyRoleId('emergency_physician')).toBe('physician');
  });
});

describe('role classification helpers', () => {
  it('demo_observer is read-only', () => {
    expect(isReadOnlyRole('demo_observer')).toBe(true);
  });

  it('triage_nurse is not read-only', () => {
    expect(isReadOnlyRole('triage_nurse')).toBe(false);
  });

  it('emergency_physician is clinical', () => {
    expect(isClinicalRole('emergency_physician')).toBe(true);
  });

  it('it_admin is not clinical', () => {
    expect(isClinicalRole('it_admin')).toBe(false);
  });

  it('super_admin is admin', () => {
    expect(isAdminRole('super_admin')).toBe(true);
  });

  it('triage_nurse is not admin', () => {
    expect(isAdminRole('triage_nurse')).toBe(false);
  });
});

describe('getDashboardWidgets', () => {
  it('every role has at least one primary widget', () => {
    for (const role of ALL_CAREDROID_ROLES) {
      const { primary } = getDashboardWidgets(role);
      expect(primary.length).toBeGreaterThan(0);
    }
  });

  it('triage_nurse sees triage-queue in primary widgets', () => {
    const { primary } = getDashboardWidgets('triage_nurse');
    expect(primary).toContain('triage-queue');
  });

  it('hospital_admin sees analytics in primary widgets', () => {
    const { primary } = getDashboardWidgets('hospital_admin');
    expect(primary).toContain('analytics');
  });

  it('registration_clerk sees incomplete-registration', () => {
    const { secondary } = getDashboardWidgets('registration_clerk');
    expect(secondary).toContain('incomplete-registration');
  });
});
