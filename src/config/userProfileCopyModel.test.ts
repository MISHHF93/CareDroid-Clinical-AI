import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import {
  isEmergencyProfileCopyComplete,
  isProfileFunctionRegistryComplete,
  isSaasProfileCopyComplete,
  PROFILE_FUNCTION_DEFINITIONS,
  resolveUserProfileCopy,
  SAAS_ROLE_FUNCTION_IDS,
  EMERGENCY_ROLE_FUNCTION_IDS,
} from './userProfileCopyModel';

describe('userProfileCopyModel', () => {
  it('covers every SaaS role with copy and functions', () => {
    expect(isSaasProfileCopyComplete()).toBe(true);
    expect(isProfileFunctionRegistryComplete()).toBe(true);

    SAAS_USER_ROLES.forEach((role) => {
      const copy = resolveUserProfileCopy({ saasRole: role });
      expect(copy.personaTitle.length).toBeGreaterThan(2);
      expect(copy.primaryFunctions.length).toBeGreaterThan(0);
      expect(copy.profileShellSubtitle.length).toBeGreaterThan(10);
    });
  });

  it('covers every emergency role with copy and functions', () => {
    expect(isEmergencyProfileCopyComplete()).toBe(true);

    Object.values(EMERGENCY_ROLE_IDS).forEach((roleId) => {
      const copy = resolveUserProfileCopy({
        saasRole: 'nurse',
        emergencyRoleId: roleId,
      });
      expect(copy.personaTitle.length).toBeGreaterThan(2);
      expect(copy.primaryFunctions.length).toBeGreaterThan(0);
    });
  });

  it('prefers emergency lane copy over generic SaaS copy in ED context', () => {
    const reception = resolveUserProfileCopy({
      saasRole: 'nurse',
      emergencyRoleId: EMERGENCY_ROLE_IDS.registrationClerk,
    });
    expect(reception.workspaceEyebrow).toContain('Reception');
    expect(reception.primaryFunctions.some((fn) => fn.id === 'register-patient')).toBe(true);
    expect(reception.primaryFunctions.some((fn) => fn.id === 'triage-acuity')).toBe(false);
  });

  it('maps physician SaaS role to provider functions', () => {
    const copy = resolveUserProfileCopy({ saasRole: 'emergency-physician' });
    expect(copy.primaryFunctions.some((fn) => fn.id === 'provider-rounds')).toBe(true);
    expect(copy.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.physician);
  });

  it('assigns every defined function to at least one role profile', () => {
    const assigned = new Set<string>();
    Object.values(SAAS_ROLE_FUNCTION_IDS).forEach((ids) => ids.forEach((id) => assigned.add(id)));
    Object.values(EMERGENCY_ROLE_FUNCTION_IDS).forEach((ids) =>
      ids.forEach((id) => assigned.add(id)),
    );
    Object.keys(PROFILE_FUNCTION_DEFINITIONS).forEach((functionId) => {
      expect(assigned.has(functionId)).toBe(true);
    });
  });
});
