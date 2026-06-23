import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import {
  buildUserProfileAccessSummary,
  isRouteAllowedForProfile,
  resolveUserProfileFromSaasRole,
  USER_PROFILE_CATALOG,
} from './userProfileCatalog';
import { getVisibleNavigationForSaasRole } from './unified-navigation.config';

describe('userProfileIsolation', () => {
  it('keeps student and registration-clerk personas isolated from physician whiteboard routes', () => {
    const student = resolveUserProfileFromSaasRole('student');
    const nurse = resolveUserProfileFromSaasRole('nurse');
    const physician = resolveUserProfileFromSaasRole('emergency-physician');

    expect(isRouteAllowedForProfile(student, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(false);
    expect(isRouteAllowedForProfile(nurse, CANONICAL_ROUTES.emergencyReception)).toBe(true);
    expect(isRouteAllowedForProfile(physician, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(true);
    expect(nurse.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.triageNurse);
  });

  it('limits trackmind-only personas from emergency mutation surfaces', () => {
    const steward = buildUserProfileAccessSummary('steward');
    const physician = buildUserProfileAccessSummary('emergency-physician');

    expect(steward.emergencyRole).toBeNull();
    expect(steward.trackMindRole).toBe('steward');
    expect(physician.emergencyRole).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(steward.navigationRoutes).not.toContain(CANONICAL_ROUTES.emergencyTools);
  });

  it('builds distinct navigation sets per SaaS role without universal leakage', () => {
    const studentNav = new Set(
      getVisibleNavigationForSaasRole('student').map((item) => item.route),
    );
    const adminNav = new Set(
      getVisibleNavigationForSaasRole('platform-admin').map((item) => item.route),
    );

    expect(studentNav.has(CANONICAL_ROUTES.emergencySettings)).toBe(false);
    expect(adminNav.has(CANONICAL_ROUTES.emergencyReception)).toBe(true);
  });

  it('assigns public-display style isolation to auditor-regulator', () => {
    const auditor = resolveUserProfileFromSaasRole('auditor-regulator');
    expect(auditor.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.readOnlyViewer);
    expect(auditor.defaultScreenMode).toBe('read-only-whiteboard');
  });

  it('documents profile benefits for every catalog role', () => {
    USER_PROFILE_CATALOG.forEach((entry) => {
      expect(entry.profileBenefits.length).toBeGreaterThan(10);
      expect(SAAS_USER_ROLES).toContain(entry.saasRole);
    });
  });
});
