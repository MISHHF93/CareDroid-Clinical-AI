import { Suspense, type ReactNode } from 'react';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import { Spinner } from '../components/ui/Spinner';
import './RouteLoadingFallback.css';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useUser } from '../contexts/UserContext';
import { buildAuthUrl } from '../auth/authSession';
import { requireRealAuthGate } from '../config/authGate.config';
import { isDev } from '../services/devBackendAuth';
import ErrorBoundary from '../components/ErrorBoundary';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import PilotExtensionRouteGuard from '../components/PilotExtensionRouteGuard';
import CareDroidRouteGuard from '../components/auth/CareDroidRouteGuard';
import EdApplicationEntryRedirect from '../components/EdApplicationEntryRedirect';
import { getEdApplicationHomeRoute } from '../config/edApplication.config';
import { AppShell } from '../components/AppShell';
import { DisplayShell } from '../layouts/DisplayShell';
import { ScreenModeLandingRedirect } from './screenModeRouteRedirects';
import { CARE_DROID_SCREEN_MODES } from '../config/careDroidScreenModes';
import { ED_UNIFIED_PUBLIC_ROUTES } from '../domain/constants';
import { PLATFORM_SYSTEM_CAPABILITIES } from '../data/platformSystems';

const lazyRoute = lazyWithRetry;
const lazyNamed = (loader, exportName) =>
  lazyRoute(() => loader().then((module) => ({ default: module[exportName] })));

// ── Platform entry hub ───────────────────────────────────────────────────────
const PlatformEntryHub = lazyRoute(() => import('../pages/PlatformEntryHub'));
const AuthPage = lazyRoute(() => import('../pages/auth/AuthPage'));
const TwoFactorSetupPage = lazyRoute(() => import('../pages/auth/TwoFactorSetupPage'));
const TrackMindWorkspaceHub = lazyRoute(() => import('../pages/trackmind/TrackMindWorkspaceHub'));
const TrackMindMaturityDashboard = lazyRoute(() => import('../pages/trackmind/TrackMindMaturityDashboard'));
const PlatformIntelligenceHub = lazyRoute(() => import('../pages/platform/PlatformIntelligenceHub'));

// ── Developer-only design-system catalog (item 41) ──────────────────────────
// Deliberately NOT in CANONICAL_ROUTE_MAP, any navigation config, or the
// command palette -- reachable only by direct URL, and only outside a
// production build (see the import.meta.env.DEV guard on the route below).
const DesignSystemPlayground = lazyRoute(() => import('../pages/DesignSystemPlayground'));

// ── Display / wall mode ──────────────────────────────────────────────────────
const WhiteboardDisplayRoute = lazyRoute(() => import('../features/whiteboard/WhiteboardDisplayRoute'));

// ── ED core pages ────────────────────────────────────────────────────────────
const EmergencyWhiteboard    = lazyRoute(() => import('../pages/emergency'));
const SmartIntake            = lazyRoute(() => import('../pages/emergency/SmartIntake'));
const ReceptionWorkspace = lazyRoute(() => import('../pages/emergency/ReceptionWorkspace'));
const SelfArrivalCheckIn     = lazyRoute(() => import('../pages/emergency/SelfArrivalCheckIn'));
const PatientRoomDisplay     = lazyRoute(() => import('../pages/emergency/PatientRoomDisplay'));
const EmergencyAnalytics     = lazyRoute(() => import('../pages/emergency/EmergencyAnalytics'));
const ClinicalAlertsPage     = lazyRoute(() => import('../pages/ClinicalAlertsPage'));
const EmergencySettings      = lazyRoute(() => import('../pages/emergency/EmergencySettings'));
const HelpHubPage            = lazyRoute(() => import('../pages/emergency/HelpHubPage'));
const EmergencyDepartmentPulse = lazyRoute(() => import('../pages/emergency/pulse'));
const EmergencyShiftSummary  = lazyRoute(() => import('../pages/emergency/shift'));
const EMSPipeline            = lazyRoute(() => import('../components/EMSPipeline'));
const DispatchConsole        = lazyRoute(() => import('../pages/emergency/DispatchConsole'));
const CollaborationHub       = lazyRoute(() => import('../pages/collaboration/CollaborationHub'));
const FullJourneyOperatingPage = lazyRoute(() => import('../pages/emergency/FullJourneyOperatingPage'));
const HospitalCommandCenter    = lazyRoute(() => import('../pages/emergency/HospitalCommandCenter'));
const ReferralPanel          = lazyRoute(() => import('../components/ReferralPanel'));
const IntegrationHubPage     = lazyRoute(() => import('../pages/integrations/IntegrationHubPage'));
const SharedToolSession      = lazyRoute(() => import('../pages/tools/SharedToolSession'));

// ── Emergency route pages (patients/queue/reassessment/boarding/capacity/copilot) ──
const PatientsRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'PatientsRoute');
const QueueRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'QueueRoute');
const ReassessmentRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'ReassessmentRoute');
const BoardingRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'BoardingRoute');
const CapacityRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'CapacityRoute');
const CopilotRoute = lazyNamed(() => import('../pages/emergency/emergencyRoutePages'), 'CopilotRoute');

// ── Clinical tools ───────────────────────────────────────────────────────────
const ToolsOverview       = lazyRoute(() => import('../pages/tools/ToolsOverview'));
// Specialty clinical assistant pages — routed at /emergency/tools/<specialty>/:toolId
const CardiologyAssistantPage         = lazyRoute(() => import('../pages/tools/CardiologyAssistantPage'));
const NephrologyAssistantPage         = lazyRoute(() => import('../pages/tools/NephrologyAssistantPage'));
const NeurologyAssistantPage          = lazyRoute(() => import('../pages/tools/NeurologyAssistantPage'));
const GastroenterologyAssistantPage   = lazyRoute(() => import('../pages/tools/GastroenterologyAssistantPage'));
const EndocrineMetabolicAssistantPage = lazyRoute(() => import('../pages/tools/EndocrineMetabolicAssistantPage'));
const PediatricsObgynAssistantPage    = lazyRoute(() => import('../pages/tools/PediatricsObgynAssistantPage'));
const PsychiatryAssistantPage         = lazyRoute(() => import('../pages/tools/PsychiatryAssistantPage'));
const PulmonologyAssistantPage        = lazyRoute(() => import('../pages/tools/PulmonologyAssistantPage'));



const SaasHealthCenter     = lazyRoute(() => import('../pages/saas/SaasHealthCenter'));
const PlatformSystemPage = lazyRoute(() => import('../pages/platform/PlatformSystemPage'));

// ── Physician tools ──────────────────────────────────────────────────────────
const ClinicalDocumentationAssistant = lazyRoute(() => import('../pages/ClinicalDocumentationAssistant'));


import {
  AUTH_PATH_ALIASES,
  AUTH_SIGNUP_PATH_ALIASES,
  CANONICAL_ROUTES,
  ED_CANONICAL_ROUTE_ALIASES,
  IN_SHELL_ROUTE_REDIRECTS,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
  OUTSIDE_SHELL_ROUTE_REDIRECTS,
  TRIAGE_PRETRIAGE_ROUTE,
} from '../config/routes.config';
import { COMMAND_CENTER_INTELLIGENCE_REDIRECTS } from '../config/hospitalCommandCenterViews.config';
import { resolveRegistryId } from '../data/clinicalCatalogWiring';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import ProfileRouteGuard from '../components/ProfileRouteGuard';
import TrackMindRouteGuard from '../components/TrackMindRouteGuard';
import {
  getEmergencyRoleDefinition,
  getReceptionEmbeddedIntakePath,
} from '../config/emergencyRolePermissions';
import { resolveDemoDefaultLandingRoute } from '../config/demoPersonaModel';
import { resolveAppStartupRoute } from '../config/appStartupModel';
import { EntryShell } from '../layouts/EntryShell';
import { renderToolsConsoleRoutes } from './toolsConsoleRouteTree';
import { renderGovernanceConsoleRoutes } from './governanceConsoleRouteTree';
import { renderPlatformConsoleRoutes } from './platformConsoleRouteTree';
import { renderTrainingConsoleRoutes } from './trainingConsoleRouteTree';
import { renderOperationsFleetConsoleRoutes } from './operationsFleetConsoleRouteTree';
import { renderProfileConsoleRoutes } from './profileConsoleRouteTree';
import { renderAdminConsoleRoutes } from './adminConsoleRouteTree';
import { renderPublicConsoleRoutes } from './publicConsoleRouteTree';
import { shouldSuppressPlatformSystemStub } from '../config/platformStubPolicy';

import EmergencySurfaceRedirect from '../pages/emergency/EmergencySurfaceRedirect';
import { shouldRedirectEmergencySurface } from '../services/navigateToEmergencySurface';

// ── Loading fallback ─────────────────────────────────────────────────────────

export function RouteLoadingFallback({ label = 'Loading CareDroid...' }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="route-loading-fallback"
    >
      {/* Spinner carries its own role="status" + aria-label -- hidden here so it
          doesn't create a second, competing status region / duplicate
          announcement alongside this div's own (more specific) label text. */}
      <span aria-hidden="true">
        <Spinner size="md" />
      </span>
      <span>{label}</span>
    </div>
  );
}

function LazyRoute({ children, label }) {
  return <Suspense fallback={<RouteLoadingFallback label={label} />}>{children}</Suspense>;
}

// ── Auth / identity helpers ──────────────────────────────────────────────────

function AuthPathsRedirect() {
  // HEAL-207: see resolveEmergencyDefaultRedirectDestination's header --
  // same reception-first-bypasses-role-access bug as AppStartupRedirect/
  // EmergencyDefaultRedirect, just reached via a legacy /auth-style alias.
  // HEAL: this component (and its two siblings below) used to compute and
  // <Navigate> to an in-app destination unconditionally, with no auth check
  // at all -- RequireRealSession only gets a chance to redirect an
  // unauthenticated visitor to /login AFTER first landing here and being
  // routed INTO the app shell. Confirmed live: a completely fresh page load
  // visibly flashes into /emergency/reception (full sidebar/header chrome
  // rendered) before bouncing back to /login a moment later, reproducible on
  // every load, not just under slow-network conditions -- deciding "is this
  // visitor even authenticated" here first, before computing a role-based
  // in-app destination that's about to be discarded anyway, removes the
  // flash while leaving RequireRealSession's actual gating decision
  // unchanged (same shared check, same outcome, just evaluated earlier).
  const authGate = useUnauthenticatedRedirectGate();
  const emergencyRole = useEmergencyRolePermissions();
  if (authGate) return <>{authGate}</>;
  const destination = resolveEmergencyDefaultRedirectDestination({
    receptionFirstDestination: resolveAppStartupRoute(),
    // canonicalAccess.ts's canAccessRoute() is deliberately broader (it also
    // grants admin-flagged roles wide route access for API/data-permission
    // purposes) and returns true for it_admin+Reception even though
    // EMERGENCY_ROLE_DEFINITIONS.itAdmin.routes -- the same list that
    // correctly drives it_admin's visible nav (settings/admin/audit/
    // collaboration/help only, confirmed live) -- excludes it. Check the nav-
    // authoritative list directly so this redirect agrees with what the role
    // can actually navigate to, not the broader permission surface.
    canAccessReception: getEmergencyRoleDefinition(emergencyRole.role).routes.includes(
      CANONICAL_ROUTES.emergencyReception,
    ),
    landingRoute: emergencyRole.landingRoute,
    defaultRoute: emergencyRole.defaultRoute,
  });
  return <Navigate to={destination} replace />;
}

function AppStartupRedirect() {
  const authGate = useUnauthenticatedRedirectGate();
  const { saasProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();
  // HEAL-207: this is the actual `/` route handler (not EmergencyDefaultRedirect,
  // which only handles /emergency, /dashboard, /home, /app, /mobile, and the
  // catch-all) -- it previously called resolveAppStartupRoute() with no
  // role-awareness at all, so RECEPTION_FIRST_UX's unconditional Reception
  // default reached every role unfiltered on the app's actual front door.
  // HEAL: this is also the app's actual front door for a brand-new visitor
  // -- it used to navigate into an in-app destination unconditionally, with
  // no auth check, so RequireRealSession only got a chance to bounce an
  // unauthenticated visitor to /login AFTER already landing inside the app
  // shell. See useUnauthenticatedRedirectGate's own comment for the full
  // writeup (confirmed live: this was the dominant cause of the "flashes
  // into the app then bounces back to /login" symptom on every fresh load).
  if (authGate) return <>{authGate}</>;
  const destination = resolveEmergencyDefaultRedirectDestination({
    receptionFirstDestination: resolveAppStartupRoute({
      saasRole: saasProfile?.role || saasProfile?.saasRole,
    }),
    // canonicalAccess.ts's canAccessRoute() is deliberately broader (it also
    // grants admin-flagged roles wide route access for API/data-permission
    // purposes) and returns true for it_admin+Reception even though
    // EMERGENCY_ROLE_DEFINITIONS.itAdmin.routes -- the same list that
    // correctly drives it_admin's visible nav (settings/admin/audit/
    // collaboration/help only, confirmed live) -- excludes it. Check the nav-
    // authoritative list directly so this redirect agrees with what the role
    // can actually navigate to, not the broader permission surface.
    canAccessReception: getEmergencyRoleDefinition(emergencyRole.role).routes.includes(
      CANONICAL_ROUTES.emergencyReception,
    ),
    landingRoute: emergencyRole.landingRoute,
    defaultRoute: emergencyRole.defaultRoute,
    demoDefaultLandingRoute: resolveDemoDefaultLandingRoute(),
    edApplicationHomeRoute: getEdApplicationHomeRoute(),
  });
  return <Navigate to={destination} replace />;
}

/**
 * HEAL-207: RECEPTION_FIRST_UX (receptionFirstUx.config.ts) unconditionally
 * sends every fresh session to /emergency/reception, regardless of role --
 * but roles whose own permission model excludes Reception entirely (e.g.
 * it_admin's EMERGENCY_ROLE_DEFINITIONS.routes: [settings, integrations,
 * audit, ...], explicitly documented "no patient clinical data") landed
 * there anyway, with nothing downstream correcting it. Only honor the
 * reception-first default for roles that can actually access Reception;
 * otherwise fall through to the role's own correct landing route
 * (landingRoute, the USER_PROFILE_ROUTE_DEFAULTS-derived table this exact
 * redirect used to bypass for every non-reception role).
 */
export function resolveEmergencyDefaultRedirectDestination({
  receptionFirstDestination,
  canAccessReception,
  landingRoute,
  defaultRoute,
  demoDefaultLandingRoute,
  edApplicationHomeRoute,
}: {
  receptionFirstDestination?: string | null;
  canAccessReception: boolean;
  landingRoute?: string | null;
  defaultRoute?: string | null;
  demoDefaultLandingRoute?: string | null;
  edApplicationHomeRoute?: string | null;
}): string {
  const canUseReceptionFirstDefault =
    receptionFirstDestination !== CANONICAL_ROUTES.emergencyReception || canAccessReception;

  return (
    (canUseReceptionFirstDefault ? receptionFirstDestination : null) ||
    landingRoute ||
    defaultRoute ||
    demoDefaultLandingRoute ||
    edApplicationHomeRoute ||
    CANONICAL_ROUTES.emergencyWhiteboard
  );
}

function EmergencyDefaultRedirect() {
  const authGate = useUnauthenticatedRedirectGate();
  const { saasProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();
  // HEAL: see useUnauthenticatedRedirectGate's own comment -- this handler
  // (/emergency, /dashboard, /home, /app, /mobile, and the catch-all) had
  // the identical unconditional-in-app-navigation issue as
  // AppStartupRedirect ('/') and AuthPathsRedirect.
  if (authGate) return <>{authGate}</>;

  const receptionFirstDestination = resolveAppStartupRoute({
    saasRole: saasProfile?.role || saasProfile?.saasRole,
  });

  const destination = resolveEmergencyDefaultRedirectDestination({
    receptionFirstDestination,
    // canonicalAccess.ts's canAccessRoute() is deliberately broader (it also
    // grants admin-flagged roles wide route access for API/data-permission
    // purposes) and returns true for it_admin+Reception even though
    // EMERGENCY_ROLE_DEFINITIONS.itAdmin.routes -- the same list that
    // correctly drives it_admin's visible nav (settings/admin/audit/
    // collaboration/help only, confirmed live) -- excludes it. Check the nav-
    // authoritative list directly so this redirect agrees with what the role
    // can actually navigate to, not the broader permission surface.
    canAccessReception: getEmergencyRoleDefinition(emergencyRole.role).routes.includes(
      CANONICAL_ROUTES.emergencyReception,
    ),
    landingRoute: emergencyRole.landingRoute,
    defaultRoute: emergencyRole.defaultRoute,
    demoDefaultLandingRoute: resolveDemoDefaultLandingRoute(),
    edApplicationHomeRoute: getEdApplicationHomeRoute(),
  });

  return <Navigate to={destination} replace />;
}

function EmergencyIntakeEntry() {
  const emergencyRole = useEmergencyRolePermissions();
  const [searchParams] = useSearchParams();
  if (shouldRedirectEmergencySurface('intake', emergencyRole.role)) {
    return (
      <Navigate
        to={getReceptionEmbeddedIntakePath({
          step: searchParams.get('step') || undefined,
          mode: searchParams.get('mode') || undefined,
          patientId: searchParams.get('patientId') || undefined,
          emsArrivalId: searchParams.get('emsArrivalId') || undefined,
        })}
        replace
      />
    );
  }
  return (
    <LazyRoute label="Loading intake...">
      <SmartIntake />
    </LazyRoute>
  );
}

// ── URL utility helpers (used by ToolsRedirect) ──────────────────────────────

function normalizeRedirectPath(pathname) {
  return String(pathname || '/').replace(/\/+$/, '') || '/';
}

function pathSegmentAfter(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return '';
  return pathname.slice(prefix.length).split('/').filter(Boolean)[0] || '';
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || '').trim());
  } catch {
    return String(value || '').trim();
  }
}

function canonicalToolQuery(slug) {
  const decoded = safeDecodeURIComponent(slug);
  if (!decoded) return '';
  return resolveRegistryId(decoded) || decoded;
}

export function buildEmergencyToolsRedirect(location) {
  const pathname = normalizeRedirectPath(location.pathname);
  if (
    pathname === CANONICAL_ROUTES.automation ||
    pathname === CANONICAL_ROUTES.automationAnalytics
  ) {
    return {
      pathname: CANONICAL_ROUTES.workflows,
      search: location.search || '',
      hash: location.hash || '',
    };
  }
  const params = new URLSearchParams(location.search);
  const setDefault = (key, value) => {
    if (!params.has(key)) params.set(key, value);
  };
  const setQueryFromSlug = (slug) => {
    const query = canonicalToolQuery(slug);
    if (query && !params.has('q') && !params.has('search')) params.set('q', query);
    if (query && !params.has('open') && !params.has('tool') && !params.has('calc'))
      params.set('open', query);
  };
  const setCalculatorQueryFromSlug = (slug) => {
    const query = safeDecodeURIComponent(slug);
    if (query && !params.has('q') && !params.has('search')) params.set('q', query);
    if (query && !params.has('open') && !params.has('tool') && !params.has('calc'))
      params.set('open', query);
  };

  if (pathname === CANONICAL_ROUTES.developerCatalog || pathname === '/catalog') {
    setDefault('source', 'catalog');
    setDefault('filter', 'all');
  } else if (pathname === CANONICAL_ROUTES.recommendations) {
    setDefault('source', 'recommendations');
    setDefault('filter', 'recommended');
  } else if (pathname === CANONICAL_ROUTES.discover) {
    setDefault('source', 'discover');
    setDefault('filter', 'recommended');
  } else if (pathname === CANONICAL_ROUTES.knowledgeHub || pathname === CANONICAL_ROUTES.knowledgeBase || pathname === CANONICAL_ROUTES.knowledgeGraph) {
    setDefault('source', 'knowledge');
    setDefault('filter', 'clinical-tools');
    setDefault('q', 'guideline-rag');
    setDefault('open', 'guideline-rag');
  } else if (pathname === CANONICAL_ROUTES.workflowMining) {
    setDefault('source', 'workflows');
    setDefault('filter', 'ai-workflows');
  } else if (
    pathname === CANONICAL_ROUTES.simulation ||
    pathname === '/medical-simulation' ||
    pathname === CANONICAL_ROUTES.simulationOutcomes ||
    pathname === CANONICAL_ROUTES.competencies ||
    pathname.startsWith(`${CANONICAL_ROUTES.simulation}/`)
  ) {
    const target =
      pathname === '/medical-simulation' ? CANONICAL_ROUTES.simulation : pathname;
    return {
      pathname: target,
      search: location.search || '',
      hash: location.hash || '',
    };
  } else if (
    pathname.startsWith('/fleet/') ||
    pathname.startsWith('/operations/') ||
    pathname === '/maps' ||
    pathname === '/tracking' ||
    pathname === '/live-tracking' ||
    pathname === '/digital-twin'
  ) {
    const operationsSlug =
      pathname === '/fleet/live-map'
        ? 'fleet-live-map'
        : pathname === '/maps' || pathname === '/tracking' || pathname === '/live-tracking'
        ? 'live-tracking-map'
        : safeDecodeURIComponent(
            pathname
              .replace(/^\/fleet\//, '')
              .replace(/^\/operations\//, '')
              .replace(/^\//, ''),
          ).replace(/\s+/g, '-');
    setDefault('source', 'operations');
    setDefault('filter', 'operations');
    setDefault('q', operationsSlug);
    setDefault('open', operationsSlug);
  } else if (pathname === CANONICAL_ROUTES.protocols || pathname.startsWith('/protocols/')) {
    setDefault('source', 'clinical-tools');
    setDefault('filter', 'clinical-tools');
    setDefault('q', 'protocols');
    setDefault('open', 'protocols');
  } else if (pathname === CANONICAL_ROUTES.laboratory || pathname === '/lab') {
    setDefault('source', 'laboratory');
    setDefault('filter', 'laboratory');
    setDefault('q', 'lab-interp');
    setDefault('open', 'lab-interp');
  } else if (pathname === '/pharmacy' || pathname.startsWith('/pharmacy/')) {
    setDefault('source', 'clinical-tools');
    setDefault('filter', 'clinical-tools');
    setDefault('q', 'drug-check');
    setDefault('open', 'drug-check');
  } else if (pathname === '/radiology' || pathname.startsWith('/radiology/')) {
    setDefault('source', 'workflows');
    setDefault('filter', 'ai-workflows');
    if (pathname.startsWith('/radiology/')) {
      setDefault('q', 'guideline-rag');
      setDefault('open', 'guideline-rag');
    }
  } else if (
    pathname === CANONICAL_ROUTES.calculators ||
    pathname.startsWith(`${CANONICAL_ROUTES.calculators}/`) ||
    pathname.startsWith('/tools/calculator/') ||
    pathname === '/calculators' ||
    pathname.startsWith('/calculators/') ||
    pathname === '/scores' ||
    pathname.startsWith('/scores/')
  ) {
    const slug =
      pathSegmentAfter(pathname, `${CANONICAL_ROUTES.calculators}/`) ||
      pathSegmentAfter(pathname, '/tools/calculator/') ||
      pathSegmentAfter(pathname, '/calculators/') ||
      pathSegmentAfter(pathname, '/scores/');
    setDefault('source', 'calculators');
    setDefault('filter', 'calculator');
    setCalculatorQueryFromSlug(slug);
  } else if (pathname === '/clinical-tools') {
    setDefault('source', 'clinical-tools');
    setDefault('filter', 'clinical-tools');
  } else if (pathname === '/all-tools') {
    setDefault('source', 'all-tools');
    setDefault('filter', 'all');
  } else if (pathname.startsWith('/tools/cardiology/') || pathname.startsWith('/tools/nephrology/') ||
             pathname.startsWith('/tools/neurology/') || pathname.startsWith('/tools/gastroenterology/') ||
             pathname.startsWith('/tools/endocrine/') || pathname.startsWith('/tools/pediatrics/') ||
             pathname.startsWith('/tools/pediatrics-obgyn/') ||
             pathname.startsWith('/tools/psychiatry/') || pathname.startsWith('/tools/pulmonology/')) {
    // Specialty shortcut deep-links → canonical /emergency/tools/<specialty>/:toolId routes.
    // 2026-08-25: toolRegistry.ts/clinicalIntentToolCatalog.ts (the real tool
    // catalog every one of these 9 pediatrics/OB-GYN tools is actually
    // advertised through) both use 'pediatrics-obgyn' as this specialty's
    // path segment -- but the canonical destination route below was
    // registered as /emergency/tools/pediatrics/:toolId (matching
    // PediatricsObgynDashboard.tsx's own direct links, which bypass this
    // redirect entirely and so were never affected). Since the trigger
    // condition above only matched '/tools/pediatrics/', every one of these
    // 9 real, catalog-advertised deep links fell through to the generic
    // /tools/ handler below instead of ever reaching this branch, landing on
    // a generic tool-search results page instead of the intended specialty
    // assistant page -- confirmed live via a Playwright responsive-QA run.
    // Normalizing here (not renaming the registered route or
    // PediatricsObgynDashboard's own links) is the minimal fix: it makes
    // both spellings resolve to the one destination that already exists.
    const rawSpecialty = pathname.replace(/^\/tools\//, '').split('/')[0];
    const specialty = rawSpecialty === 'pediatrics-obgyn' ? 'pediatrics' : rawSpecialty;
    const toolId = pathname.split('/').filter(Boolean)[2] || '';
    const search = params.toString();
    return {
      pathname: `/emergency/tools/${specialty}/${toolId}`,
      search: search ? `?${search}` : '',
      hash: location.hash || '',
    };
  } else if (pathname.startsWith('/tools/')) {
    const slug =
      pathname
        .replace(/^\/tools\//, '')
        .split('/')
        .filter(Boolean)
        .pop() || pathSegmentAfter(pathname, '/tools/');
    setDefault('source', 'tools');
    setDefault('filter', 'clinical-tools');
    setQueryFromSlug(slug);
  } else {
    setDefault('source', 'tools');
  }

  const search = params.toString();
  return {
    pathname: CANONICAL_ROUTES.emergencyTools,
    search: search ? `?${search}` : '',
    hash: location.hash || '',
  };
}

function ToolsRedirect() {
  const location = useLocation();
  return (
    <Navigate
      to={buildEmergencyToolsRedirect(location)}
      replace
      state={{ from: location.pathname }}
    />
  );
}

function NonEdWorkspaceRedirect({ moduleName }) {
  if (['Laboratory', 'Pharmacy', 'Radiology', 'Fleet'].includes(moduleName)) {
    return <ToolsRedirect />;
  }
  return <Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />;
}

function EmergencyAliasRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search, hash: location.hash }} replace />;
}

function CommandCenterIntelligenceRedirect({ view }: { view: 'executive' | 'ai' | 'predictive' }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (!params.has('view')) {
    params.set('view', view);
  }
  return (
    <Navigate
      to={{
        pathname: CANONICAL_ROUTES.emergencyCommandCenter,
        search: params.toString(),
        hash: location.hash,
      }}
      replace
    />
  );
}

function TriagePretriageRedirect() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (!params.has('queue') && !params.has('filter') && !params.has('queueFilter')) {
    return <Navigate to={TRIAGE_PRETRIAGE_ROUTE} replace />;
  }
  return (
    <Navigate
      to={{
        pathname: CANONICAL_ROUTES.emergencyQueues,
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
}

function PatientProfileRoute() {
  const { patientId, id } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const resolvedPatientId = patientId || id;
  if (resolvedPatientId && !params.has('patientId')) params.set('patientId', resolvedPatientId);
  return (
    <Navigate
      to={{
        pathname: CANONICAL_ROUTES.emergencyPatients,
        search: params.toString() ? `?${params.toString()}` : location.search,
        hash: location.hash,
      }}
      replace
    />
  );
}

// ── Section error-boundary layouts ───────────────────────────────────────────

function EmergencyModuleBoundary() {
  return (
    <RouteErrorBoundary fallbackTitle="Emergency module error">
      <Outlet />
    </RouteErrorBoundary>
  );
}

function ToolsSectionBoundary() {
  return (
    <RouteErrorBoundary fallbackTitle="Tools section error">
      <Outlet />
    </RouteErrorBoundary>
  );
}

function AdminSectionBoundary() {
  return (
    <RouteErrorBoundary fallbackTitle="Admin console error">
      <Outlet />
    </RouteErrorBoundary>
  );
}

// ── Root layout (AppShell wraps all standard ED routes) ──────────────────────

/** HEAL-347.13: without this, ANY visitor reached the full operational app --
 * UserContext.tsx always falls back to an anonymous open-access identity when
 * no real session exists, so there was never an actual point where an
 * unauthenticated visitor was turned away. Gated by requireRealAuthGate
 * (config/authGate.config.ts) rather than being unconditional, so a single
 * env flag can still opt out for local iteration.
 *
 * HEAL-347.14/347.16: also accepts a dev-bypass session (AuthPage.tsx's
 * explicit "Enter CareDroid now" dev-entry button) -- but ONLY when isDev
 * is true, matching the same three-layer safety this app's existing
 * dev-session mechanism already relies on (see devBackendAuth.ts's isDev
 * export doc comment). A tampered/forced client-side isDev check alone still
 * can't reach a real session this way in a real deployment, since the
 * backend's own /auth/dev-session endpoint independently refuses to issue a
 * token outside local development or an explicit ENABLE_DEV_AUTH_BYPASS
 * opt-in.
 *
 * This deliberately checks 'explicit-dev-bypass', NOT 'local-dev-demo' --
 * UserContext.tsx's OWN background bootstrap effect already establishes a
 * 'local-dev-demo' session automatically on every app mount in dev mode
 * (that's what's always let a developer skip logging in locally, unrelated
 * to this gate), so trusting that value here would make the gate pass for
 * literally every dev-mode visitor within a couple seconds regardless of
 * whether they ever clicked the bypass button -- confirmed live, caught
 * before commit. 'explicit-dev-bypass' is a marker AuthPage.tsx's button
 * handler stamps itself, which the ambient bootstrap never sets. */
function useUnauthenticatedRedirectGate(): ReactNode | null {
  const location = useLocation();
  const { authMode, isLoading, user } = useUser();

  if (!requireRealAuthGate) return null;
  if (isLoading) return <RouteLoadingFallback label="Loading CareDroid..." />;
  // Outside dev, an explicit bypass session is admitted only when it was created
  // by AuthPage's no-backend fallback -- i.e. on a frontend-only deployment where
  // POST /api/auth/dev-session reached no server at all. That is the Vercel case:
  // vercel.json builds the Vite app and its rewrites exclude /api, so there is no
  // API, and therefore no patient data behind this gate -- only the bundled demo
  // dataset. Where a backend DOES exist, this stays exactly as strict as before:
  // the marker is never set on a session that came from one, a real server's
  // 401/403 still fails the click outright, and the backend's own dev-bypass gate
  // (ENABLE_DEV_AUTH_BYPASS + ALLOW_DEMO_AUTH_IN_PRODUCTION) is untouched. Do not
  // widen this to "any explicit-dev-bypass session" -- that gate is what keeps
  // this from being a credential-free path into real patient data.
  const isLocalDemoFallback = Boolean(
    (user as { isLocalDemoFallback?: boolean } | null)?.isLocalDemoFallback,
  );
  const isDevBypassSession =
    authMode === 'explicit-dev-bypass' && (isDev || isLocalDemoFallback);
  if (authMode !== 'real' && !isDevBypassSession) {
    const returnUrl = `${location.pathname}${location.search}`;
    return <Navigate to={buildAuthUrl({ returnUrl })} replace />;
  }
  return null;
}

function RequireRealSession({ children }: { children: ReactNode }) {
  const gate = useUnauthenticatedRedirectGate();
  if (gate) return <>{gate}</>;
  return <>{children}</>;
}

function RootLayout() {
  return (
    <RequireRealSession>
      <AppShell>
        <ProfileRouteGuard>
          <PilotExtensionRouteGuard>
            <Outlet />
          </PilotExtensionRouteGuard>
        </ProfileRouteGuard>
      </AppShell>
    </RequireRealSession>
  );
}

// ── Route tree ───────────────────────────────────────────────────────────────

export function AppRoutes() {
  const signInAliases = AUTH_PATH_ALIASES.filter(
    (path) => !AUTH_SIGNUP_PATH_ALIASES.includes(path),
  );
  const legacyAuthPaths = [
    CANONICAL_ROUTES.auth,
    CANONICAL_ROUTES.authCallback,
    CANONICAL_ROUTES.authForgotPassword,
    CANONICAL_ROUTES.resetPassword,
    CANONICAL_ROUTES.verifyEmail,
    CANONICAL_ROUTES.authMagicLink,
    CANONICAL_ROUTES.authInvite,
    CANONICAL_ROUTES.welcome,
    '/biometric-setup',
  ];

  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<AppStartupRedirect />} />

      {/* HEAL-347.12: real login/register pages -- these used to be part of
          legacyAuthPaths, bouncing straight to the demo landing hub. */}
      {signInAliases.map((path) => (
        <Route
          key={`auth-login-${path}`}
          path={path}
          element={<LazyRoute label="Loading sign in..."><AuthPage initialMode="login" /></LazyRoute>}
        />
      ))}
      {AUTH_SIGNUP_PATH_ALIASES.map((path) => (
        <Route
          key={`auth-signup-${path}`}
          path={path}
          element={<LazyRoute label="Loading sign up..."><AuthPage initialMode="signup" /></LazyRoute>}
        />
      ))}

      {/* Remaining auth-family flows (forgot/reset password, email verify, magic
          link, OAuth callback, invite, 2FA/biometric setup) still redirect to the
          demo landing hub -- not yet built as real standalone pages. */}
      {legacyAuthPaths.map((path) => (
        <Route key={`legacy-auth-${path}`} path={path} element={<AuthPathsRedirect />} />
      ))}

      {renderPublicConsoleRoutes(LazyRoute, { outsideShellOnly: true })}

      {/* Shared tool deep-link (no shell) */}
      <Route
        path="/shared/tools/:shareId"
        element={
          <LazyRoute label="Loading shared tool session...">
            <SharedToolSession />
          </LazyRoute>
        }
      />

      {/* Item 41: developer-only, hidden from every navigation surface, and
          absent entirely from a production build (no route element is even
          registered when import.meta.env.DEV is false). */}
      {import.meta.env.DEV ? (
        <Route
          path="/dev/design-system"
          element={
            <LazyRoute label="Loading design-system playground...">
              <DesignSystemPlayground />
            </LazyRoute>
          }
        />
      ) : null}

      {/* ── Display / wall-mount shell ── */}
      <Route element={<DisplayShell />}>
        <Route
          path={ED_UNIFIED_PUBLIC_ROUTES.displayWhiteboard}
          element={
            <LazyRoute label="Loading display whiteboard...">
              <WhiteboardDisplayRoute />
            </LazyRoute>
          }
        />
      </Route>

      {/* ── Short public aliases (no shell) → canonical /emergency/* paths ── */}
      <Route path={ED_UNIFIED_PUBLIC_ROUTES.whiteboard}  element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyWhiteboard} />} />
      <Route path={ED_UNIFIED_PUBLIC_ROUTES.reception}   element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyReception} />} />
      <Route path={ED_UNIFIED_PUBLIC_ROUTES.ems}         element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyEms} />} />
      <Route path={ED_UNIFIED_PUBLIC_ROUTES.calculators} element={<ToolsRedirect />} />
      <Route
        path={ED_UNIFIED_PUBLIC_ROUTES.charge}
        element={<ScreenModeLandingRedirect mode={CARE_DROID_SCREEN_MODES.chargeNurse} />}
      />
      <Route
        path={ED_UNIFIED_PUBLIC_ROUTES.physician}
        element={<ScreenModeLandingRedirect mode={CARE_DROID_SCREEN_MODES.physician} />}
      />

      {/* Optional orientation — outside operational AppShell */}
      <Route
        path={CANONICAL_ROUTES.platformStart}
        element={
          <EntryShell>
            <LazyRoute label="Loading platform entry...">
              <PlatformEntryHub />
            </LazyRoute>
          </EntryShell>
        }
      />

      {/* ── Main application shell (AppShell) ── */}
      <Route element={<RootLayout />}>

        <Route element={<AdminSectionBoundary />}>
          {renderAdminConsoleRoutes(LazyRoute)}
        </Route>

        <Route element={<EmergencyModuleBoundary />}>
        {/* ── Emergency department core ── */}
        <Route path="/emergency" element={<EmergencyDefaultRedirect />} />

        {/* Short ED bookmarks → one canonical mount each */}
        {ED_CANONICAL_ROUTE_ALIASES.map(({ path, to }) => (
          <Route key={`ed-alias-${path}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
        ))}

        <Route path={CANONICAL_ROUTES.triage} element={<TriagePretriageRedirect />} />
        <Route path={CANONICAL_ROUTES.patientProfile} element={<PatientProfileRoute />} />
        <Route path="/patients" element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyPatients} />} />

        <Route
          path={CANONICAL_ROUTES.emergencyWhiteboard}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyWhiteboard}>
              <ErrorBoundary fallbackText="EmergencyWhiteboard encountered an error. Refresh to reload.">
                <LazyRoute label="Loading whiteboard...">
                  <EmergencyWhiteboard />
                </LazyRoute>
              </ErrorBoundary>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyPatients}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyPatients}>
              <EmergencySurfaceRedirect surfaceId="patients">
                <LazyRoute label="Loading patients...">
                  <PatientsRoute />
                </LazyRoute>
              </EmergencySurfaceRedirect>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyEms}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyEms}>
              <LazyRoute label="Loading EMS pipeline...">
                <EMSPipeline />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyDispatch}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyDispatch}>
              <LazyRoute label="Loading dispatch console...">
                <DispatchConsole />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCollaboration}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyCollaboration}>
              <LazyRoute label="Loading collaboration hub...">
                <CollaborationHub />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCommandCenter}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyCommandCenter}>
              <LazyRoute label="Loading Hospital Command Center...">
                <HospitalCommandCenter />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        {COMMAND_CENTER_INTELLIGENCE_REDIRECTS.map(({ path, view }) => (
          <Route
            key={`command-center-lens-${path}`}
            path={path}
            element={<CommandCenterIntelligenceRedirect view={view} />}
          />
        ))}
        <Route
          path={CANONICAL_ROUTES.emergencyEdReadiness}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyEdReadiness}>
              <LazyRoute label="Loading ED readiness...">
                <FullJourneyOperatingPage view="ed-readiness" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyDiagnostics}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyDiagnostics}>
              <LazyRoute label="Loading diagnostics...">
                <FullJourneyOperatingPage view="diagnostics" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyHandoffs}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyHandoffs}>
              <LazyRoute label="Loading handoffs...">
                <FullJourneyOperatingPage view="handoffs" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReports}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyReports}>
              <LazyRoute label="Loading reports...">
                <FullJourneyOperatingPage view="reports" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReception}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyReception}>
              <LazyRoute label="Loading reception...">
                <ReceptionWorkspace />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencySelfArrival}
          element={
            <LazyRoute label="Loading self check-in...">
              <SelfArrivalCheckIn />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyPatientRoom}
          element={
            <LazyRoute label="Loading patient room display...">
              <PatientRoomDisplay />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyIntake}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyIntake}>
              <EmergencyIntakeEntry />
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyQueues}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyQueues}>
              <EmergencySurfaceRedirect surfaceId="queues">
                <LazyRoute label="Loading queues...">
                  <QueueRoute />
                </LazyRoute>
              </EmergencySurfaceRedirect>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReassessment}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyReassessment}>
              <LazyRoute label="Loading reassessment...">
                <ReassessmentRoute />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCapacity}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyCapacity}>
              <LazyRoute label="Loading capacity...">
                <CapacityRoute />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyBoarding}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyBoarding}>
              <LazyRoute label="Loading boarding...">
                <BoardingRoute />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReferrals}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyReferrals}>
              <LazyRoute label="Loading referrals...">
                <ReferralPanel />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCopilot}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyCopilot}>
              <LazyRoute label="Loading copilot...">
                <CopilotRoute />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyDocumentation}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyDocumentation}>
              <LazyRoute label="Loading documentation assistant...">
                <ClinicalDocumentationAssistant />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyTools}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}>
              <LazyRoute label="Loading Medical Tools...">
                <ToolsOverview />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        {/* ── Specialty clinical tool detail pages (/emergency/tools/<specialty>/:toolId) ── */}
        {/*
          These eight specialty assistants keep LITERAL paths on purpose, even
          though CANONICAL_ROUTES.toolsCardiology and friends exist and match
          them exactly. They are sub-pages of the tools console and are guarded
          by CANONICAL_ROUTES.emergencyTools -- the parent permission -- which
          is deliberate: canonical access has no entries for the individual
          `/emergency/tools/<specialty>/:toolId` paths, so guarding each with
          its own constant would make canRoute() fail closed and deny every
          role a page that works today.

          Writing the constants here instead trips
          router.routeGuardPathConsistency.test.ts (HEAL-320), which requires a
          <Route path={CANONICAL_ROUTES.X}> to be guarded by the same X --
          verified by doing exactly that and watching all eight fail. Closing
          the gap properly means adding these paths to the permission map,
          which is an authorization change needing its own evidence and tests,
          not a tidy-up. Until then the literals are the honest form: they say
          "this route is governed by its parent", and the test stays meaningful
          for every route that does own its guard.
        */}
        <Route path="/emergency/tools/cardiology/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading cardiology assistant..."><CardiologyAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/nephrology/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading nephrology assistant..."><NephrologyAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/neurology/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading neurology assistant..."><NeurologyAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/gastroenterology/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading GI assistant..."><GastroenterologyAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/endocrine/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading endocrine assistant..."><EndocrineMetabolicAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/pediatrics/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading pediatrics assistant..."><PediatricsObgynAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/psychiatry/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading psychiatry assistant..."><PsychiatryAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route path="/emergency/tools/pulmonology/:toolId" element={<CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}><LazyRoute label="Loading pulmonology assistant..."><PulmonologyAssistantPage /></LazyRoute></CareDroidRouteGuard>} />
        <Route
          path={CANONICAL_ROUTES.emergencyPulse}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyPulse}>
              <LazyRoute label="Loading department pulse...">
                <EmergencyDepartmentPulse />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyShift}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyShift}>
              <LazyRoute label="Loading shift summary...">
                <EmergencyShiftSummary />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyAnalytics}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}>
              <LazyRoute label="Loading analytics...">
                <EmergencyAnalytics />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyAlerts}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyAlerts}>
              <LazyRoute label="Loading alerts...">
                <ClinicalAlertsPage />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencySettings}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencySettings}>
              <LazyRoute label="Loading settings...">
                <EmergencySettings />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyHelp}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyHelp}>
              <LazyRoute label="Loading guide...">
                <HelpHubPage />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        </Route>{/* end EmergencyModuleBoundary */}
        {renderProfileConsoleRoutes(LazyRoute)}
        {renderPublicConsoleRoutes(LazyRoute, { insideShellOnly: true })}

        {/* ── Developer / tools catalog ── */}
        <Route element={<ToolsSectionBoundary />}>
        <Route path={CANONICAL_ROUTES.developerCatalog} element={<ToolsRedirect />} />
        <Route path={CANONICAL_ROUTES.saasHealth} element={<LazyRoute label="Loading SaaS health..."><SaasHealthCenter /></LazyRoute>} />
        <Route path="/saas-health/*" element={<LazyRoute label="Loading SaaS health..."><SaasHealthCenter /></LazyRoute>} />

        {renderGovernanceConsoleRoutes(LazyRoute)}
        <Route
          path={CANONICAL_ROUTES.integrationHub}
          element={
            <LazyRoute label="Loading Integration Hub...">
              <IntegrationHubPage />
            </LazyRoute>
          }
        />
        {renderToolsConsoleRoutes(LazyRoute)}

        {PLATFORM_SYSTEM_CAPABILITIES.filter((capability) => !shouldSuppressPlatformSystemStub(capability)).map((capability) => (
          <Route
            key={capability.id}
            path={capability.route}
            element={
              <LazyRoute label={`Loading ${capability.name}...`}>
                <PlatformSystemPage />
              </LazyRoute>
            }
          />
        ))}

        </Route>{/* end ToolsSectionBoundary */}

        {renderOperationsFleetConsoleRoutes(LazyRoute)}
        {renderPlatformConsoleRoutes(LazyRoute)}
        {renderTrainingConsoleRoutes(LazyRoute)}

        {/* ── Legacy emergency route redirects (from routes.config) ── */}
        {LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (
          <Route key={`${path}-${to}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
        ))}

        {/* ── Non-ED workspace paths → tools or whiteboard ── */}
        {NON_ED_WORKSPACE_REDIRECT_ROUTES.map(({ path, moduleName }) => (
          <Route
            key={`${path}-${moduleName}`}
            path={path}
            element={<NonEdWorkspaceRedirect moduleName={moduleName} />}
          />
        ))}

        {/* ── In-shell routes not covered by PilotExtensionRouteGuard ── */}
        <Route
          path={CANONICAL_ROUTES.workspace}
          element={<EdApplicationEntryRedirect />}
        />
        {/* HEAL-347.80: plural /workspaces had chrome copy + nav active-path
            wiring but no <Route> at all -- fell through the whole tree to
            EmergencyDefaultRedirect. Mounted the same as singular /workspace. */}
        <Route
          path={CANONICAL_ROUTES.workspaces}
          element={<EdApplicationEntryRedirect />}
        />
        {/*
          Platform intelligence. TrackMind-guarded like its siblings: the 20
          module assessments are TrackMind platform data, and intelligenceView
          is the permission that gates this path.
        */}
        <Route
          path={CANONICAL_ROUTES.platformIntelligence}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.platformIntelligence}>
              <LazyRoute label="Loading platform intelligence...">
                <PlatformIntelligenceHub />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />
        {/*
          Maturity assessment. Same guard as the workspace: the model exposes
          per-domain scores and improvement priorities, so it is TrackMind data
          and follows TrackMind access, not the ED role model.
        */}
        <Route
          path={CANONICAL_ROUTES.trackMindMaturity}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.trackMindMaturity}>
              <LazyRoute label="Loading TrackMind maturity assessment...">
                <TrackMindMaturityDashboard />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />
        {/* TrackMind Operating System hub. routes.config.ts has carried this
            route and componentKey since 2026-08-26, recording that the role
            catalog, permission registry, policy modules and TrackMindRouteGuard
            were all real and only the page and the mount were missing. Guarded
            by TrackMindRouteGuard so a role without TrackMind access gets its
            own access-denied surface rather than the generic one. */}
        <Route
          path={CANONICAL_ROUTES.trackMindWorkspace}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.trackMindWorkspace}>
              <LazyRoute label="Loading TrackMind workspace...">
                <TrackMindWorkspaceHub />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />

        {/* Security settings for the signed-in user. TwoFactorEnforcementGuard
            tells high-privilege callers to "enable it in your security
            settings"; this is that screen, and it talks to the
            already-live TwoFactorController. */}
        <Route
          path="/two-factor-setup"
          element={
            <LazyRoute label="Loading security settings...">
              <TwoFactorSetupPage />
            </LazyRoute>
          }
        />

        {IN_SHELL_ROUTE_REDIRECTS.map(({ path, to }) => (
          <Route key={`in-shell-${path}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
        ))}


      </Route>{/* end RootLayout */}

      {/* ── Tool URL shortcuts (outside shell, handled by ToolsRedirect) ── */}
      <Route path="/tools/*" element={<ToolsRedirect />} />
      <Route path="/calculators" element={<ToolsRedirect />} />
      <Route path="/calculators/*" element={<ToolsRedirect />} />
      <Route path="/scores"             element={<ToolsRedirect />} />
      <Route path="/scores/*"           element={<ToolsRedirect />} />
      <Route path="/pharmacy"           element={<ToolsRedirect />} />
      <Route path="/pharmacy/*"         element={<ToolsRedirect />} />
      <Route path="/radiology"          element={<ToolsRedirect />} />
      <Route path="/radiology/*"        element={<ToolsRedirect />} />

      <Route path="/search"             element={<ToolsRedirect />} />
      <Route path="/knowledge-base"     element={<ToolsRedirect />} />

      <Route path="/operations/:tool"   element={<ToolsRedirect />} />
      <Route path="/digital-twin"       element={<ToolsRedirect />} />

      {/* ── Retired standalone surfaces → ED OS (outside PilotExtensionRouteGuard) ── */}
      {OUTSIDE_SHELL_ROUTE_REDIRECTS.map(({ path, to }) => (
        <Route key={`outside-shell-${path}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
      ))}

      {/* ── Generic fallbacks ── */}
      <Route path="/dashboard"          element={<EmergencyDefaultRedirect />} />
      <Route path="/home"               element={<EmergencyDefaultRedirect />} />
      <Route path="/app"                element={<EmergencyDefaultRedirect />} />
      <Route path="/mobile"             element={<EmergencyDefaultRedirect />} />
      <Route path="/mobile/*"           element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare" element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare/*" element={<EmergencyDefaultRedirect />} />
      <Route path="/emergency/*"        element={<EmergencyDefaultRedirect />} />
      <Route path="*"                   element={<EmergencyDefaultRedirect />} />
    </Routes>
  );
}
