import { describe, expect, it } from 'vitest';
import { CANONICAL_ROUTES } from './routes.config';
import { EMERGENCY_ROLE_IDS } from './emergencyRolePermissions';
import { SAAS_USER_ROLES } from './saasProfileConstants';
import {
  buildUserProfileAccessSummary,
  isRouteAllowedForProfile,
  isSaasRoleCatalogComplete,
  resolveUserProfileFromSaasRole,
  USER_PROFILE_CATALOG,
} from './userProfileCatalog';
import { isProfileAssignableForOrganization } from './userProfileSegregation';
import { getVisibleNavigationForSaasRole } from './unified-navigation.config';
import {
  compileUserProfile,
  isRouteAllowedInCompiledProfile,
  isToolAllowedForCompiledProfile,
} from './userProfileCompiler';

const PROFILE_ROUTE_MATRIX: Readonly<
  Record<string, { allow: string[]; deny: string[] }>
> = Object.freeze({
  'registration-clerk': {
    allow: [
      CANONICAL_ROUTES.emergencyReception,
      CANONICAL_ROUTES.emergencyPatients,
      CANONICAL_ROUTES.emergencyPulse,
      CANONICAL_ROUTES.emergencyShift,
    ],
    deny: [
      CANONICAL_ROUTES.emergencyWhiteboard,
      CANONICAL_ROUTES.emergencyCopilot,
      CANONICAL_ROUTES.emergencyAnalytics,
      CANONICAL_ROUTES.trackMindWorkspace,
      CANONICAL_ROUTES.surveillanceNexus,
    ],
  },
  student: {
    allow: [CANONICAL_ROUTES.emergencyTools, CANONICAL_ROUTES.profile],
    deny: [CANONICAL_ROUTES.emergencyWhiteboard, CANONICAL_ROUTES.emergencySettings],
  },
  steward: {
    allow: [CANONICAL_ROUTES.trackMindWorkspace],
    deny: [CANONICAL_ROUTES.emergencyTools, CANONICAL_ROUTES.emergencyWhiteboard],
  },
  'hospital-administrator': {
    allow: [CANONICAL_ROUTES.adminOperations, CANONICAL_ROUTES.emergencyAnalytics],
    deny: [CANONICAL_ROUTES.trackMindWorkspace],
  },
});

describe('userProfileIsolation', () => {
  it('keeps student and registration-clerk personas isolated from physician whiteboard routes', () => {
    const student = resolveUserProfileFromSaasRole('student');
    const clerk = resolveUserProfileFromSaasRole('registration-clerk');
    const nurse = resolveUserProfileFromSaasRole('nurse');
    const physician = resolveUserProfileFromSaasRole('emergency-physician');

    expect(isRouteAllowedForProfile(student, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(false);
    expect(isRouteAllowedForProfile(clerk, CANONICAL_ROUTES.emergencyReception)).toBe(true);
    expect(isRouteAllowedForProfile(clerk, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(false);
    expect(isRouteAllowedForProfile(nurse, CANONICAL_ROUTES.emergencyReception)).toBe(true);
    expect(isRouteAllowedForProfile(physician, CANONICAL_ROUTES.emergencyWhiteboard)).toBe(true);
    expect(clerk.emergencyRoleId).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
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

  it('keeps the SaaS role catalog complete after registration-clerk was added', () => {
    expect(isSaasRoleCatalogComplete()).toBe(true);
    expect(SAAS_USER_ROLES).toContain('registration-clerk');
  });

  it('segregates trackmind roles from hospital tenants without trackmind pack', () => {
    const steward = USER_PROFILE_CATALOG.find((entry) => entry.saasRole === 'steward');
    expect(
      isProfileAssignableForOrganization(steward!, {
        organizationType: 'hospital',
        entitledPackIds: ['core-platform', 'reception-desk'],
      }),
    ).toBe(false);
    expect(
      isProfileAssignableForOrganization(steward!, {
        organizationType: 'racetrack',
        entitledPackIds: ['core-platform', 'trackmind'],
      }),
    ).toBe(true);
  });

  it.each(Object.entries(PROFILE_ROUTE_MATRIX))(
    'enforces route matrix for %s',
    (saasRole, matrix) => {
      const profile = resolveUserProfileFromSaasRole(saasRole);
      matrix.allow.forEach((route) => {
        expect(isRouteAllowedForProfile(profile, route)).toBe(true);
      });
      matrix.deny.forEach((route) => {
        expect(isRouteAllowedForProfile(profile, route)).toBe(false);
      });
    },
  );

  it('covers every SaaS role with a resolved navigation route set', () => {
    SAAS_USER_ROLES.forEach((role) => {
      const profile = resolveUserProfileFromSaasRole(role);
      expect(profile.navigationRoutes.length).toBeGreaterThan(0);
      expect(profile.permissionPresets.length).toBeGreaterThan(0);
    });
  });

  it('declares requiredToolIds for every catalog role', () => {
    USER_PROFILE_CATALOG.forEach((entry) => {
      expect(entry.requiredToolIds?.length, entry.saasRole).toBeGreaterThan(0);
    });
  });

  it('compiler enforces registration-clerk route and tool isolation', () => {
    const compiled = compileUserProfile({ saasRole: 'registration-clerk' });

    expect(isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.emergencyReception, compiled)).toBe(true);
    expect(isRouteAllowedInCompiledProfile(CANONICAL_ROUTES.emergencyWhiteboard, compiled)).toBe(
      false,
    );
    expect(
      isToolAllowedForCompiledProfile('protocols', { id: 'protocols', packId: 'emergency-clinical' }, 'registration-clerk'),
    ).toBe(false);
    expect(
      isToolAllowedForCompiledProfile('calculators', { id: 'calculators', packId: 'core-platform' }, 'registration-clerk'),
    ).toBe(true);
  });

  it('compiler route matrix aligns with catalog route checks', () => {
    Object.entries(PROFILE_ROUTE_MATRIX).forEach(([saasRole, matrix]) => {
      const compiled = compileUserProfile({ saasRole });
      matrix.allow.forEach((route) => {
        expect(isRouteAllowedInCompiledProfile(route, compiled)).toBe(true);
      });
      matrix.deny.forEach((route) => {
        expect(isRouteAllowedInCompiledProfile(route, compiled)).toBe(false);
      });
    });
  });
});
