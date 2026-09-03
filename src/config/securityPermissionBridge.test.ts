import { describe, expect, it } from 'vitest';
import { EMERGENCY_PERMISSION_KEYS } from './emergencyPermissionRegistry';
import { CAREDROID_PERMISSIONS } from '../lib/users/permissions';
import { BACKEND_PERMISSION_KEYS } from './securityModel';
import { normalizePermission } from './securityPermissionBridge';

describe('securityPermissionBridge', () => {
  it('bridges triage acuity to clinical write permissions', () => {
    const normalized = normalizePermission(EMERGENCY_PERMISSION_KEYS.triageAssignAcuity);
    expect(normalized.caredroid).toEqual(
      expect.arrayContaining([
        CAREDROID_PERMISSIONS.TRIAGE_CREATE,
        CAREDROID_PERMISSIONS.TRIAGE_UPDATE,
      ]),
    );
    expect(normalized.backend).toContain(BACKEND_PERMISSION_KEYS.WRITE_PHI);
  });

  it('bridges analytics view to backend analytics permission', () => {
    const normalized = normalizePermission(EMERGENCY_PERMISSION_KEYS.analyticsView);
    expect(normalized.caredroid).toContain(CAREDROID_PERMISSIONS.ANALYTICS_READ);
    expect(normalized.backend).toContain(BACKEND_PERMISSION_KEYS.VIEW_ANALYTICS);
  });

  it('passes through backend RBAC keys unchanged', () => {
    const normalized = normalizePermission('VIEW_AUDIT_LOGS');
    expect(normalized.emergency).toBeNull();
    expect(normalized.backend).toEqual([BACKEND_PERMISSION_KEYS.VIEW_AUDIT_LOGS]);
  });
});
