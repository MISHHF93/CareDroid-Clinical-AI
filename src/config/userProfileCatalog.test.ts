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
    expect(resolveEffectiveEmergencyRole({ profile: { roleProfileId: 'nurse' } }, {})).toBe(
      EMERGENCY_ROLE_IDS.triageNurse,
    );
  });

  it("prefers a user's own specific emergency role over the catalog's generic saasRole default (HEAL-336)", () => {
    // charge_nurse and triage_nurse both normalize to the generic 'nurse'
    // saasRole (HEAL-323), whose catalog entry defaults to triage_nurse --
    // but a user who already carries a specific, valid emergency role of
    // their own (in both profile.roleProfileId and role, matching the real
    // demo-user shape from demoPersonaModel.ts) must keep it rather than
    // being silently collapsed into that generic default.
    expect(
      resolveEffectiveEmergencyRole(
        { role: 'charge_nurse', profile: { roleProfileId: 'charge_nurse' } },
        {},
      ),
    ).toBe(EMERGENCY_ROLE_IDS.chargeNurse);
  });

  it('prefers a profile\'s own specific roleProfileId over a broader account role bucket (regression: reception dev-bypass session with role "nurse" + roleProfileId "registration_clerk" was resolving to triage_nurse, showing triage\'s header KPI pair on the Reception page)', () => {
    // The account-level `role` field can be a broad SaaS-tier bucket (e.g.
    // 'nurse', which normalizeEmergencyRole() aliases to 'triage_nurse')
    // even when profile.roleProfileId already carries the user's exact,
    // specific emergency role -- the reverse of the HEAL-336 scenario
    // above, where the specific role lived in `role` and the generic
    // bucket lived in the catalog. Either way the more specific value must
    // win.
    expect(
      resolveEffectiveEmergencyRole(
        { role: 'nurse', profile: { roleProfileId: 'registration_clerk' } },
        {},
      ),
    ).toBe(EMERGENCY_ROLE_IDS.registrationClerk);
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

  // Regression for a live-reproduced bug (HEAL-347.47): /protocols and /lab
  // are standalone top-level pages (toolsConsoleRoutes.ts's
  // TOOLS_SHORTCUT_PAGE_ROUTES), not nested under /tools/ the way
  // /tools/calculators and friends are, so router.tsx's ToolsRedirect never
  // folds them into /emergency/tools. Neither appeared anywhere in
  // PERMISSION_ROUTE_MAP, so ProfileRouteGuard silently bounced every role
  // -- including physician, whose real JWT permissions include
  // USE_PROTOCOLS -- back to their landing route on direct navigation.
  // Confirmed live via Playwright: /protocols consistently redirected to
  // /emergency/whiteboard for a freshly bypassed physician session.
  it('grants a clinical tool-using role access to the standalone /protocols and /lab pages', () => {
    const profile = resolveUserProfileFromSaasRole('emergency-physician');
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.protocols)).toBe(true);
    expect(isRouteAllowedForProfile(profile, '/lab')).toBe(true);
  });

  it('does not grant /protocols to a non-clinical role without VIEW_TOOLS', () => {
    const profile = resolveUserProfileFromSaasRole('registration-clerk');
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.protocols)).toBe(false);
  });

  // Regression for a live-reproduced bug (HEAL-347.48): a sweep found 14
  // fully-built platform pages with zero PERMISSION_ROUTE_MAP coverage --
  // same bug class as HEAL-347.47's /protocols//lab gap, ~7x larger. Every
  // role was silently bounced to its landing route on direct navigation.
  it('grants platform-admin access to 12 of the 14 previously-unreachable platform pages via its own VIEW_TOOLS/VIEW_OPERATIONS/VIEW_GOVERNANCE/CONFIGURE_SYSTEM presets (HEAL-347.48)', () => {
    const profile = resolveUserProfileFromSaasRole('platform-admin');
    const routes = [
      CANONICAL_ROUTES.knowledgeHub,
      CANONICAL_ROUTES.discover,
      CANONICAL_ROUTES.workflows,
      CANONICAL_ROUTES.workflowMining,
      CANONICAL_ROUTES.featureFlags,
      CANONICAL_ROUTES.dependencyMap,
      CANONICAL_ROUTES.dependencyGraph,
      CANONICAL_ROUTES.dataLineage,
      CANONICAL_ROUTES.selfDiagnostics,
      CANONICAL_ROUTES.assetPacks,
      CANONICAL_ROUTES.humanReview,
      CANONICAL_ROUTES.security,
    ];
    routes.forEach((route) => {
      expect(isRouteAllowedForProfile(profile, route), route).toBe(true);
    });
  });

  // expansion-opportunities/product-intelligence went into the VIEW_ANALYTICS
  // bucket (business-intelligence pages), which platform-admin's own preset
  // list doesn't carry -- hospital-administrator and executive-leadership do.
  it('grants a role with VIEW_ANALYTICS access to /expansion-opportunities and /product-intelligence (HEAL-347.48)', () => {
    const profile = resolveUserProfileFromSaasRole('hospital-administrator');
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.expansionOpportunities)).toBe(true);
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.productIntelligence)).toBe(true);
  });

  // Regression for a live-reproduced bug (HEAL-347.48): CANONICAL_ROUTES.marketplace
  // ('/marketplace') has no real page of its own -- it's a redirect-only
  // alias to /plugins (routes.config.ts's IN_SHELL_ROUTE_REDIRECTS). But
  // ProfileRouteGuard wraps that redirect route too, so without a
  // PERMISSION_ROUTE_MAP entry the guard bounced every role away before the
  // redirect ever fired -- a dead nav link for everyone.
  it('grants a tool-using role access to the /marketplace redirect alias', () => {
    const profile = resolveUserProfileFromSaasRole('emergency-physician');
    expect(isRouteAllowedForProfile(profile, CANONICAL_ROUTES.marketplace)).toBe(true);
  });

  // Regression for a live-reproduced bug (HEAL-347.48): /vehicle is a
  // legacy-alias path with a correct, purpose-built PilotExtensionRouteGuard
  // redirect to /emergency/ems, but ProfileRouteGuard (which wraps that
  // guard and evaluates first) bounced a fleet-capable role to its own
  // generic landing route before the specific redirect ever got a chance to
  // run -- live-confirmed inconsistent per-role behavior on the same URL.
  it('grants a fleet-capable role access to the /vehicle legacy-alias path', () => {
    const profile = resolveUserProfileFromSaasRole('fleet-operator');
    expect(isRouteAllowedForProfile(profile, '/vehicle')).toBe(true);
  });
});
