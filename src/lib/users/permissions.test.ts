import { describe, it, expect } from 'vitest';
import {
  CAREDROID_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasCareDroidPermission,
  getPermissionsForRole,
  canRoleReceiveCriticalAlerts,
  canRoleUseAIChief,
} from './permissions';
import type { HospitalRole } from './userTypes';

describe('ROLE_PERMISSIONS', () => {
  it('every hospital role has at least one permission', () => {
    const roles = Object.keys(ROLE_PERMISSIONS) as HospitalRole[];
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
    }
  });

  it('super_admin has every permission', () => {
    const allPerms = Object.values(CAREDROID_PERMISSIONS);
    for (const perm of allPerms) {
      expect(hasCareDroidPermission('super_admin', perm)).toBe(true);
    }
  });

  it('demo_observer has only read permissions', () => {
    const perms = getPermissionsForRole('demo_observer');
    for (const perm of perms) {
      expect(perm).toMatch(/:read$/);
    }
  });

  it('registration_clerk cannot override AI or create orders', () => {
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.TRIAGE_OVERRIDE_AI)).toBe(false);
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.ORDERS_CREATE)).toBe(false);
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.PATIENT_DISCHARGE)).toBe(false);
  });

  it('registration_clerk can read and create patients', () => {
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.PATIENT_READ)).toBe(true);
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.PATIENT_CREATE)).toBe(true);
  });

  it('triage_nurse can override AI but cannot configure it', () => {
    expect(hasCareDroidPermission('triage_nurse', CAREDROID_PERMISSIONS.TRIAGE_OVERRIDE_AI)).toBe(true);
    expect(hasCareDroidPermission('triage_nurse', CAREDROID_PERMISSIONS.AI_CONFIGURE)).toBe(false);
  });

  it('emergency_physician can discharge patients', () => {
    expect(hasCareDroidPermission('emergency_physician', CAREDROID_PERMISSIONS.PATIENT_DISCHARGE)).toBe(true);
  });

  it('it_admin has settings and users permissions but not clinical permissions', () => {
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.SETTINGS_UPDATE)).toBe(true);
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.USERS_CREATE)).toBe(true);
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.PATIENT_DISCHARGE)).toBe(false);
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.TRIAGE_OVERRIDE_AI)).toBe(false);
  });

  it('pharmacist can review medication but cannot create orders', () => {
    expect(hasCareDroidPermission('pharmacist', CAREDROID_PERMISSIONS.MEDICATION_REVIEW)).toBe(true);
    expect(hasCareDroidPermission('pharmacist', CAREDROID_PERMISSIONS.ORDERS_CREATE)).toBe(false);
  });

  it('specialist can review AI but not configure it', () => {
    expect(hasCareDroidPermission('specialist', CAREDROID_PERMISSIONS.AI_REVIEW)).toBe(true);
    expect(hasCareDroidPermission('specialist', CAREDROID_PERMISSIONS.AI_CONFIGURE)).toBe(false);
  });
});

describe('document/OCR intake permissions', () => {
  it('registration_clerk can capture and review documents', () => {
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.DOCUMENT_CAPTURE)).toBe(true);
    expect(hasCareDroidPermission('registration_clerk', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(true);
  });

  it('clinical roles can review extracted document fields', () => {
    expect(hasCareDroidPermission('triage_nurse', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(true);
    expect(hasCareDroidPermission('registered_nurse', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(true);
    expect(hasCareDroidPermission('emergency_physician', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(true);
  });

  it('paramedic can capture EMS paperwork but cannot review clinical extraction', () => {
    expect(hasCareDroidPermission('paramedic', CAREDROID_PERMISSIONS.DOCUMENT_CAPTURE)).toBe(true);
    expect(hasCareDroidPermission('paramedic', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(false);
  });

  it('it_admin can read document processing status but cannot capture or review clinical documents', () => {
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.DOCUMENT_READ)).toBe(true);
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.DOCUMENT_CAPTURE)).toBe(false);
    expect(hasCareDroidPermission('it_admin', CAREDROID_PERMISSIONS.DOCUMENT_REVIEW)).toBe(false);
  });

  it('demo_observer has read-only document access', () => {
    expect(hasCareDroidPermission('demo_observer', CAREDROID_PERMISSIONS.DOCUMENT_READ)).toBe(true);
    expect(hasCareDroidPermission('demo_observer', CAREDROID_PERMISSIONS.DOCUMENT_CAPTURE)).toBe(false);
  });
});

describe('canRoleReceiveCriticalAlerts', () => {
  it('clinical roles receive critical alerts', () => {
    expect(canRoleReceiveCriticalAlerts('triage_nurse')).toBe(true);
    expect(canRoleReceiveCriticalAlerts('charge_nurse')).toBe(true);
    expect(canRoleReceiveCriticalAlerts('emergency_physician')).toBe(true);
    expect(canRoleReceiveCriticalAlerts('paramedic')).toBe(true);
  });

  it('non-clinical roles do not receive critical alerts', () => {
    expect(canRoleReceiveCriticalAlerts('it_admin')).toBe(false);
    expect(canRoleReceiveCriticalAlerts('demo_observer')).toBe(false);
    expect(canRoleReceiveCriticalAlerts('security_officer')).toBe(false);
  });
});

describe('canRoleUseAIChief', () => {
  it('clinicians can use AI Chief', () => {
    expect(canRoleUseAIChief('triage_nurse')).toBe(true);
    expect(canRoleUseAIChief('charge_nurse')).toBe(true);
    expect(canRoleUseAIChief('emergency_physician')).toBe(true);
  });

  it('demo_observer and security_officer cannot use AI Chief', () => {
    expect(canRoleUseAIChief('demo_observer')).toBe(false);
    expect(canRoleUseAIChief('security_officer')).toBe(false);
  });

  it('quality_safety_officer can review AI', () => {
    expect(canRoleUseAIChief('quality_safety_officer')).toBe(true);
  });
});
