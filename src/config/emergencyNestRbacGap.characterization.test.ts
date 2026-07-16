/**
 * Architect Mode Stage B — documents the FE emergency role vs Nest UserRole gap.
 * Fails if Nest-facing vocabulary silently expands without the mapping module (Stage D).
 */
import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { EMERGENCY_ROLE_ID } from './emergencyRoleScreenMatrix';
import { ROLE_PERMISSION_GRANTS } from './emergencyPermissionRegistry';

/** Nest UserRole values from backend/src/modules/users/entities/user.entity.ts */
const NEST_USER_ROLES = ['physician', 'nurse', 'student', 'admin'] as const;

describe('Emergency ↔ Nest RBAC gap characterization', () => {
  it('exposes operational emergency role ids on the FE (incl. it_admin)', () => {
    const ids = Object.values(EMERGENCY_ROLE_IDS);
    expect(ids.length).toBeGreaterThanOrEqual(12);
    expect(ids).toEqual(
      expect.arrayContaining([
        'admin',
        'it_admin',
        'registration_clerk',
        'triage_nurse',
        'charge_nurse',
        'physician',
        'ems_user',
        'public_display',
      ]),
    );
    // Screen-matrix role id set must include it_admin for grants + Nest map
    expect(Object.values(EMERGENCY_ROLE_ID)).toContain('it_admin');
    expect(ROLE_PERMISSION_GRANTS[EMERGENCY_ROLE_ID.itAdmin]).toBeDefined();
  });

  it('proves Nest UserRole vocabulary is smaller than FE emergency roles (mapping required)', () => {
    const emergencyCount = Object.keys(ROLE_PERMISSION_GRANTS).length;
    expect(NEST_USER_ROLES.length).toBe(4);
    expect(emergencyCount).toBeGreaterThan(NEST_USER_ROLES.length);
  });

  it('keeps registration_clerk as the Reception reference role id', () => {
    expect(EMERGENCY_ROLE_IDS.registrationClerk).toBe('registration_clerk');
    expect(EMERGENCY_ROLE_ID.registrationClerk).toBe('registration_clerk');
    expect(ROLE_PERMISSION_GRANTS[EMERGENCY_ROLE_ID.registrationClerk]).toBeDefined();
  });

  it('does not treat Nest roles as a drop-in replacement for emergency role grants', () => {
    // Only physician and admin strings overlap naively; nurse/student are not FE emergency ids.
    const emergencyIds = new Set(Object.values(EMERGENCY_ROLE_ID));
    const naiveOverlap = NEST_USER_ROLES.filter((r) => emergencyIds.has(r as never));
    expect(naiveOverlap).toEqual(expect.arrayContaining(['physician', 'admin']));
    expect(naiveOverlap).not.toContain('registration_clerk');
    expect(emergencyIds.has('nurse' as never)).toBe(false);
  });
});
