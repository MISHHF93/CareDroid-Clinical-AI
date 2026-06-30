import { CANONICAL_ROUTES } from './routes.config';
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
  { prefix: '/start',                     to: ED_APPLICATION.defaultHomeRoute,           reason: 'platform-entry-hub' },
  { prefix: '/dashboard',                 to: CANONICAL_ROUTES.emergencyWhiteboard,      reason: 'legacy-dashboard' },
  { prefix: '/app',                       to: CANONICAL_ROUTES.emergencyWhiteboard,      reason: 'legacy-app-alias' },
  { prefix: '/integrations/hub',          to: `${CANONICAL_ROUTES.emergencySettings}#integrations`, reason: 'integration-hub' },

  { prefix: '/emergency/intake',          to: CANONICAL_ROUTES.emergencyReception,       reason: 'intake-through-reception' },
  { prefix: '/vehicle',                   to: CANONICAL_ROUTES.emergencyEms,             reason: 'fleet-extension' },
  { prefix: '/surveillance',              to: CANONICAL_ROUTES.emergencySettings,        reason: 'surveillance-extension' },
  { prefix: '/cosmos',                    to: CANONICAL_ROUTES.emergencyWhiteboard,      reason: 'cosmos-extension' },
  { prefix: '/workspaces',                to: CANONICAL_ROUTES.emergencySettings,        reason: 'workspace-platform' },
  { prefix: '/workspace',                 to: CANONICAL_ROUTES.emergencySettings,        reason: 'workspace-platform' },
  { prefix: '/discover',                  to: CANONICAL_ROUTES.emergencySettings,        reason: 'discovery-platform' },
  { prefix: '/knowledge-graph',           to: CANONICAL_ROUTES.emergencyTools,           reason: 'knowledge-extension' },
  { prefix: '/knowledge-hub',             to: CANONICAL_ROUTES.emergencyTools,           reason: 'knowledge-extension' },
  { prefix: '/knowledge-base',            to: CANONICAL_ROUTES.emergencyTools,           reason: 'knowledge-extension' },
  { prefix: '/digital-twin-intelligence', to: CANONICAL_ROUTES.emergencySettings,        reason: 'digital-twin' },
  { prefix: '/digital-twin',              to: CANONICAL_ROUTES.emergencySettings,        reason: 'digital-twin' },
  { prefix: '/live-map',                  to: CANONICAL_ROUTES.emergencyEms,             reason: 'live-map-fallback' },
  { prefix: '/operations-center',         to: CANONICAL_ROUTES.emergencyAnalytics,       reason: 'operations-center' },
  { prefix: '/platform-intelligence',     to: CANONICAL_ROUTES.emergencySettings,        reason: 'platform-intelligence' },
  { prefix: '/platform-admin',            to: CANONICAL_ROUTES.emergencySettings,        reason: 'platform-admin' },
  { prefix: '/enterprise-platform',       to: CANONICAL_ROUTES.emergencySettings,        reason: 'enterprise-platform' },
  { prefix: '/trackmind',                 to: CANONICAL_ROUTES.emergencySettings,        reason: 'trackmind-extension' },
  { prefix: '/customer-portal',           to: CANONICAL_ROUTES.emergencySettings,        reason: 'customer-portal' },
  // ── Removed redirects (real pages now exist for these paths) ───────────────
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
