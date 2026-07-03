import { Suspense } from 'react';
import { MEDICAL_THEME } from '../config/medicalTheme.constants';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { UserIdentityProvider, useUserIdentity } from '../contexts/UserIdentityContext';
import ErrorBoundary from '../components/ErrorBoundary';
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

// ── Display / wall mode ──────────────────────────────────────────────────────
const WhiteboardDisplayRoute = lazyRoute(() => import('../features/whiteboard/WhiteboardDisplayRoute'));

// ── ED core pages ────────────────────────────────────────────────────────────
const EmergencyWhiteboard    = lazyRoute(() => import('../pages/emergency'));
const SmartIntake            = lazyRoute(() => import('../pages/emergency/SmartIntake'));
const ReceptionWorkspace     = lazyRoute(() => import('../pages/emergency/ReceptionWorkspace'));
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
const FullJourneyOperatingPage = lazyRoute(() => import('../pages/emergency/FullJourneyOperatingPage'));
const HospitalCommandCenter    = lazyRoute(() => import('../pages/emergency/HospitalCommandCenter'));
const ReferralPanel          = lazyRoute(() => import('../components/ReferralPanel'));
const IntegrationHubPage     = lazyRoute(() => import('../pages/integrations/IntegrationHubPage'));
const SharedToolSession      = lazyRoute(() => import('../pages/tools/SharedToolSession'));

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
import TrackMindRouteGuard from '../components/TrackMindRouteGuard';
import ProfileRouteGuard from '../components/ProfileRouteGuard';
import {
  getEmergencyRoleHomeRoute,
  getReceptionEmbeddedIntakePath,
} from '../config/emergencyRolePermissions';
import { getPlatformHomeRoute, isReceptionFirstUxEnabled } from '../config/receptionFirstUx.config';
import { resolvePlatformLanding } from '../config/platformEntryModel';
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

import {
  PatientsRoute,
  QueueRoute,
  ReassessmentRoute,
  BoardingRoute,
  CapacityRoute,
  CopilotRoute,
} from '../pages/emergency/emergencyRoutePages';

import EmergencySurfaceRedirect from '../pages/emergency/EmergencySurfaceRedirect';
import { shouldRedirectEmergencySurface } from '../services/navigateToEmergencySurface';

// ── Loading fallback ─────────────────────────────────────────────────────────

function RouteLoadingFallback({ label = 'Loading CareDroid...' }) {
  return (
    <div role="status" style={{ padding: 24, color: MEDICAL_THEME.inkSubtle }}>
      {label}
    </div>
  );
}

function LazyRoute({ children, label }) {
  return <Suspense fallback={<RouteLoadingFallback label={label} />}>{children}</Suspense>;
}

// ── Auth / identity helpers ──────────────────────────────────────────────────

function AuthPathsRedirect() {
  return <Navigate to={resolveAppStartupRoute()} replace />;
}

function AppStartupRedirect() {
  const { saasProfile } = useUserIdentity();
  const destination = resolveAppStartupRoute({
    saasRole: saasProfile?.role || saasProfile?.saasRole,
  });
  return <Navigate to={destination} replace />;
}

function EmergencyDefaultRedirect() {
  const { saasProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();

  const destination =
    resolveAppStartupRoute({
      saasRole: saasProfile?.role || saasProfile?.saasRole,
    }) ||
    emergencyRole.landingRoute ||
    emergencyRole.defaultRoute ||
    resolveDemoDefaultLandingRoute() ||
    getEdApplicationHomeRoute();

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
    pathname === CANONICAL_ROUTES.competencies
  ) {
    const simulationSlug =
      pathname === CANONICAL_ROUTES.simulationOutcomes
        ? 'simulation-outcomes'
        : pathname === CANONICAL_ROUTES.competencies
        ? 'competency-platform'
        : 'simulation-suite';
    setDefault('source', 'simulation');
    setDefault('filter', 'simulations');
    setDefault('q', simulationSlug);
    setDefault('open', simulationSlug);
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
             pathname.startsWith('/tools/psychiatry/') || pathname.startsWith('/tools/pulmonology/')) {
    // Specialty shortcut deep-links → canonical /emergency/tools/<specialty>/:toolId routes
    const specialty = pathname.replace(/^\/tools\//, '').split('/')[0];
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

// ── Root layout (AppShell wraps all standard ED routes) ──────────────────────

function RootLayout() {
  return (
    <AppShell>
      <ProfileRouteGuard>
        <PilotExtensionRouteGuard>
          <Outlet />
        </PilotExtensionRouteGuard>
      </ProfileRouteGuard>
    </AppShell>
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
    '/two-factor-setup',
    '/biometric-setup',
    ...signInAliases,
    ...AUTH_SIGNUP_PATH_ALIASES,
  ];

  return (
    <Routes>
      {/* Root */}
      <Route path="/" element={<AppStartupRedirect />} />

      {/* Auth — redirect to demo landing, no auth shell needed */}
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

        {renderAdminConsoleRoutes(LazyRoute)}

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
                <PatientsRoute />
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
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyEms}>
              <LazyRoute label="Loading ED readiness...">
                <FullJourneyOperatingPage view="ed-readiness" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyDiagnostics}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyTools}>
              <LazyRoute label="Loading diagnostics...">
                <FullJourneyOperatingPage view="diagnostics" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyHandoffs}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyShift}>
              <LazyRoute label="Loading handoffs...">
                <FullJourneyOperatingPage view="handoffs" />
              </LazyRoute>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReports}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}>
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
                <QueueRoute />
              </EmergencySurfaceRedirect>
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReassessment}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyReassessment}>
              <ReassessmentRoute />
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCapacity}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyCapacity}>
              <CapacityRoute />
            </CareDroidRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyBoarding}
          element={
            <CareDroidRouteGuard path={CANONICAL_ROUTES.emergencyBoarding}>
              <BoardingRoute />
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
              <CopilotRoute />
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
        {renderProfileConsoleRoutes(LazyRoute)}
        {renderPublicConsoleRoutes(LazyRoute, { insideShellOnly: true })}

        {/* ── Developer / tools catalog ── */}
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
