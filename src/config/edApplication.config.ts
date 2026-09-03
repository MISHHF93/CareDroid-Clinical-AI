import { CANONICAL_ROUTES } from './routes.config';
import { isInShellRoute } from './inShellRouteAllowlist';
import { getPlatformHomeRoute } from './receptionFirstUx.config';

/**
 * CareDroid is one Vite application — an emergency department operations platform.
 * Extension suites (fleet, IoT, cosmos, etc.) remain in the codebase but are not
 * separate products; they redirect into ED surfaces when single-application mode is on.
 */
export const ED_APPLICATION = Object.freeze({
  id: 'caredroid-ed',
  name: 'CareDroid',
  subtitle: 'Emergency Department Operations',
  description:
    'ED command center with whiteboard at the center: reception, triage, EMS, calculators, copilot, and admin.',
  defaultHomeRoute: CANONICAL_ROUTES.emergencyWhiteboard,
  viteEntry: 'src/app/App.tsx',
  canonicalStore: 'src/store/emergencyStore.ts',
  canonicalApiFacade: 'src/services/emergencyOsApi.ts',
});

export type EdCoreRouteKey =
  | 'reception'
  | 'whiteboard'
  | 'patients'
  | 'ems'
  | 'intake'
  | 'queues'
  | 'reassessment'
  | 'capacity'
  | 'boarding'
  | 'referrals'
  | 'copilot'
  | 'tools'
  | 'analytics'
  | 'alerts'
  | 'pulse'
  | 'shift'
  | 'settings'
  | 'help'
  | 'admin';

/** Core ED operating routes (suites 1–7) — the single application surface. */
export const ED_CORE_ROUTES: Readonly<Record<EdCoreRouteKey, string>> = Object.freeze({
  reception: CANONICAL_ROUTES.emergencyReception,
  whiteboard: CANONICAL_ROUTES.emergencyWhiteboard,
  patients: CANONICAL_ROUTES.emergencyPatients,
  ems: CANONICAL_ROUTES.emergencyEms,
  intake: CANONICAL_ROUTES.emergencyIntake,
  queues: CANONICAL_ROUTES.emergencyQueues,
  reassessment: CANONICAL_ROUTES.emergencyReassessment,
  capacity: CANONICAL_ROUTES.emergencyCapacity,
  boarding: CANONICAL_ROUTES.emergencyBoarding,
  referrals: CANONICAL_ROUTES.emergencyReferrals,
  copilot: CANONICAL_ROUTES.emergencyCopilot,
  tools: CANONICAL_ROUTES.emergencyTools,
  analytics: CANONICAL_ROUTES.emergencyAnalytics,
  alerts: CANONICAL_ROUTES.emergencyAlerts,
  pulse: CANONICAL_ROUTES.emergencyPulse,
  shift: CANONICAL_ROUTES.emergencyShift,
  settings: CANONICAL_ROUTES.emergencySettings,
  help: CANONICAL_ROUTES.emergencyHelp,
  admin: CANONICAL_ROUTES.adminOperations,
});

export type EdExtensionRedirect = Readonly<{
  prefix: string;
  to: string;
  reason: string;
}>;

/**
 * Non-ED extension paths fold back into the ED application (longest-prefix wins).
 */
export const ED_EXTENSION_ROUTE_REDIRECTS: readonly EdExtensionRedirect[] = Object.freeze([
  { prefix: '/dashboard',                 to: CANONICAL_ROUTES.emergencyCommandCenter,   reason: 'legacy-dashboard' },
  { prefix: '/app',                       to: CANONICAL_ROUTES.emergencyWhiteboard,      reason: 'legacy-app-alias' },

  { prefix: '/emergency/intake',          to: CANONICAL_ROUTES.emergencyReception,       reason: 'intake-through-reception' },
  { prefix: '/vehicle',                   to: CANONICAL_ROUTES.emergencyEms,             reason: 'fleet-extension' },
  { prefix: '/surveillance',              to: CANONICAL_ROUTES.emergencySettings,        reason: 'surveillance-extension' },
  { prefix: '/cosmos',                    to: CANONICAL_ROUTES.emergencyWhiteboard,      reason: 'cosmos-extension' },
  { prefix: '/operations-center',         to: CANONICAL_ROUTES.emergencyAnalytics,       reason: 'operations-center' },
  { prefix: '/platform-admin',            to: CANONICAL_ROUTES.emergencySettings,        reason: 'platform-admin' },
  // ── Removed redirects (real pages now exist for these paths) ───────────────
  // /enterprise-platform → EnterpriseOperatingPlatformHub. Same exit
  //   condition, same order: page first, then the shadow, then the
  //   KNOWN_MISSING_TRACKMIND_PAGES entry. Its 18-module model had been
  //   unrendered; the page labels which modules track the platform and which
  //   score themselves. /platform-admin is now the only one still shadowed,
  //   and it has no backing model at all.
  // /platform-intelligence → PlatformIntelligenceHub. Same exit condition as
  //   /trackmind below: the page now exists and is mounted behind
  //   TrackMindRouteGuard, so the shadow comes off. Its 20-module model
  //   (platformIntelligenceModel.ts) had been sitting unrendered; the page
  //   labels which modules track the platform and which score themselves.
  //   Removed from canonicalRouteRedirects.test.ts KNOWN_MISSING_TRACKMIND_PAGES
  //   in the same commit. /platform-admin and /enterprise-platform still have
  //   no page and stay shadowed.
  // /trackmind          → TrackMindWorkspaceHub. Removed once the page was
  //   built: this prefix was the LAST thing standing between a TrackMind role
  //   and its own workspace. Same silent-shadow shape as /customer-portal
  //   (347.79) -- PilotExtensionRouteGuard wraps <Outlet/> above the route
  //   tree, so /trackmind replaceState'd to /emergency/settings before the
  //   new <Route> could mount, and neither access-denied panel ever rendered.
  //   Confirmed live by stack-tracing history.replaceState, not inferred.
  //   The entry was correct while it stood -- canonicalRouteRedirects.test.ts
  //   recorded it as a known gap precisely because no <Route> existed yet;
  //   that test's KNOWN_MISSING_TRACKMIND_PAGES set drops /trackmind in the
  //   same commit. /platform-intelligence has since followed the same path;
  //   /platform-admin and /enterprise-platform still have no page and remain
  //   listed above.
  // /executive          → ExecutiveCommandCenter
  // /ai-command-center  → AiCommandCenterDashboard
  // /hospital-map       → HospitalMapDashboard
  // /medical-iot        → MedicalIotDashboard
  // /devices            → DeviceFleetManagement
  // /fleet              → FleetDashboard / FleetLiveMap
  // /simulation         → MedicalSimulationSuite (training domain)
  // /laboratory         → LaboratoryDashboard
  // /operations         → Operations page
  // /predictive-analytics → PredictiveAnalyticsDashboard
  // /marketplace        → PluginMarketplace
  // /integrations/hub   → IntegrationHubPage
  // /workspace          → EdApplicationEntryRedirect
  // /discover           → CapabilityDiscovery
  // /knowledge-graph    → ClinicalKnowledgeGraph
  // /knowledge-hub      → HealthcareKnowledgeHubPage
  // /knowledge-base     → (tools console knowledge shortcuts)
  // /live-map           → LiveTrackingMap (tools console)
  // /customer-portal    → HEAL-347.79: this entry silently shadowed
  //   IN_SHELL_ROUTE_REDIRECTS' /customer-portal -> /admin/tenant alias for
  //   EVERY role (PilotExtensionRouteGuard wraps <Outlet/> above the route
  //   tree and redirects here before the nested <Route> for /customer-portal
  //   ever mounts) -- proven live via console instrumentation, not inferred:
  //   /customer-portal jumped straight to /emergency/settings with the
  //   IN_SHELL_ROUTE_REDIRECTS-driven EmergencyAliasRedirect never firing.
  //   Same duplicate-registration bug shape as the /organization fix
  //   (HEAL-347.74), this time the OLDER table won instead of losing.
  // /workspaces          → HEAL-347.80: real <Route> now exists (mirrors
  //   singular /workspace -> EdApplicationEntryRedirect); listed in
  //   inShellRouteAllowlist.ts's PLATFORM_ENTRY_ROUTE_PREFIXES.
]);

function readEnvFlag(value: string | undefined, defaultWhenUnset: boolean): boolean {
  if (value === undefined || value === '') return defaultWhenUnset;
  return value === 'true' || value === '1';
}

/** When true, CareDroid runs as one ED application; extension URLs redirect to ED surfaces. */
export function isEdSingleApplicationMode(): boolean {
  return readEnvFlag(import.meta.env.VITE_ED_SINGLE_APPLICATION, true);
}

export function getEdApplicationHomeRoute(): string {
  return getPlatformHomeRoute() || ED_APPLICATION.defaultHomeRoute;
}

export function resolveEdExtensionRedirect(pathname = ''): string | null {
  if (!isEdSingleApplicationMode()) {
    return null;
  }

  const normalized = pathname.split('?')[0].split('#')[0];
  if (isEdCoreRoute(normalized)) {
    return null;
  }
  if (isInShellRoute(normalized)) {
    return null;
  }
  for (const entry of ED_EXTENSION_ROUTE_REDIRECTS) {
    if (normalized === entry.prefix || normalized.startsWith(`${entry.prefix}/`)) {
      return entry.to;
    }
  }

  return null;
}

export function isEdCoreRoute(pathname = ''): boolean {
  const normalized = pathname.split('?')[0].split('#')[0];
  const corePaths = Object.values(ED_CORE_ROUTES);
  return corePaths.some(
    (route) => normalized === route || normalized.startsWith(`${route}/`),
  );
}
