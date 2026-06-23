import { describe, expect, it } from 'vitest';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import {
  buildUserProfileAccessSummary,
  isRouteAllowedForProfile,
  isSaasRoleCatalogComplete,
  resolveEffectiveEmergencyRole,
  resolveUserProfileFromSaasRole,
  USER_PROFILE_CATALOG,
} from './userProfileCatalog';
import { CANONICAL_ROUTES } from './routes.config';

describe('userProfileCatalog', () => {
  it('covers every canonical SaaS role', () => {
    expect(isSaasRoleCatalogComplete()).toBe(true);
    expect(USER_PROFILE_CATALOG.length).toBe(SAAS_USER_ROLES.length);
  });

  it('maps emergency physician to physician emergency role and routes', () => {
    const profile = resolveUserProfileFromSaasRole('emergency-physician');
    expect(profile.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.physician);
    expect(profile.navigationRoutes).toContain(CANONICAL_ROUTES.emergencyWhiteboard);
    expect(profile.navigationRoutes).toContain(CANONICAL_ROUTES.emergencyTools);
  });

  it('does not grant whiteboard to student profile', () => {
    const profile = resolveUserProfileFromSaasRole('student');
    expect(profile.emergencyRoleId).toBeNull();
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(false);
  });

  it('resolves catalog-first emergency role with org override', () => {
    expect(
      resolveEffectiveEmergencyRole(
        { profile: { roleProfileId: 'nurse' } },
        { roles: { emergencyRoleMapping: { nurse: 'charge_nurse' } } },
      ),
    ).toBe(EMERGENCY_ROLE_IDS.chargeNurse);
    expect(
      resolveEffectiveEmergencyRole({ profile: { roleProfileId: 'nurse' } }, {}),
    ).toBe(EMERGENCY_ROLE_IDS.triageNurse);
  });

  it('builds access summary for admin assignment preview', () => {
    const summary = buildUserProfileAccessSummary('platform-admin');
    expect(summary.emergencyRole).toBe(EMERGENCY_ROLE_IDS.admin);
    expect(summary.trackMindRole).toBe('platform_super_admin');
    expect(summary.permissionPresets).toContain('CONFIGURE_SYSTEM');
  });

  it('includes all profile hub sub-routes in base profile access', () => {
    const profile = resolveUserProfileFromSaasRole('student');
    expect(isRouteAllowedForProfile(profile, '/profile/preferences')).toBe(true);
    expect(isRouteAllowedForProfile(profile, '/profile/security')).toBe(true);
    expect(isRouteAllowedForProfile(profile, '/profile/workspaces')).toBe(true);
    expect(isRouteAllowedForProfile(profile, '/profile/activity')).toBe(true);
  });
});
