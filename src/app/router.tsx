import { Suspense } from 'react';
import { MEDICAL_THEME, MEDICAL_TYPE } from '../config/medicalTheme.constants';
import { lazyWithRetry } from '../utils/lazyWithRetry';
import {
  Link,
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
import EdApplicationEntryRedirect from '../components/EdApplicationEntryRedirect';
import { getEdApplicationHomeRoute } from '../config/edApplication.config';
import { AppShell } from '../components/AppShell';
import { DisplayShell } from '../layouts/DisplayShell';
import { ScreenModeLandingRedirect } from './screenModeRouteRedirects';
import { CARE_DROID_SCREEN_MODES } from '../config/careDroidScreenModes';
import { ED_UNIFIED_PUBLIC_ROUTES } from '../domain/constants';

const lazyRoute = lazyWithRetry;
const lazyNamed = (loader, exportName) =>
  lazyRoute(() => loader().then((module) => ({ default: module[exportName] })));

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
const ReferralPanel          = lazyRoute(() => import('../components/ReferralPanel'));
const IntegrationHubPage     = lazyRoute(() => import('../pages/integrations/IntegrationHubPage'));
const SharedToolSession      = lazyRoute(() => import('../pages/tools/SharedToolSession'));

// ── Clinical tools ───────────────────────────────────────────────────────────
const ToolsOverview       = lazyRoute(() => import('../pages/tools/ToolsOverview'));
const ClinicalToolCatalog = lazyRoute(() => import('../pages/tools/ClinicalToolCatalog'));

// ── Admin ────────────────────────────────────────────────────────────────────
const AdminOperationsShell = lazyRoute(() => import('../components/admin/AdminOperationsShell'));
const AdminOperationsHome  = lazyRoute(() => import('../pages/admin/AdminOperationsHome'));
const EdStaffWorkflowAdmin = lazyRoute(() => import('../pages/admin/EdStaffWorkflowAdmin'));
const TeamManagement       = lazyNamed(() => import('../pages/team/TeamManagement'), 'TeamManagement');
const SystemHealth         = lazyRoute(() => import('../pages/SystemHealth'));
const AutomationAuditTrail = lazyRoute(() => import('../pages/AutomationAuditTrail'));
const PlatformGovernanceWorkspace = lazyRoute(() => import('../pages/platform/PlatformGovernanceWorkspace'));

// ── Physician tools ──────────────────────────────────────────────────────────
const ClinicalDocumentationAssistant = lazyRoute(() => import('../pages/ClinicalDocumentationAssistant'));
const TenantAdministrationCenter = lazyNamed(
  () => import('../pages/organization/OrganizationPages'),
  'TenantAdministrationCenter',
);

// ── User / account ───────────────────────────────────────────────────────────
const Profile               = lazyRoute(() => import('../pages/Profile'));
const ProfileSettings       = lazyRoute(() => import('../pages/ProfileSettings'));
const ProfileActivity       = lazyRoute(() => import('../pages/profile/ProfileActivity'));
const ProfilePreferences    = lazyRoute(() => import('../pages/profile/ProfilePreferences'));
const ProfileSecurity       = lazyRoute(() => import('../pages/profile/ProfileSecurity'));
const ProfileToolPreferences = lazyRoute(() => import('../pages/profile/ProfileToolPreferences'));
const ProfileWorkspaces     = lazyRoute(() => import('../pages/profile/ProfileWorkspaces'));
const BillingPage           = lazyRoute(() => import('../pages/BillingPage'));
const UsagePage             = lazyRoute(() => import('../pages/UsagePage'));
const NotificationPreferences = lazyRoute(() => import('../pages/NotificationPreferences'));
const FeatureManagement = lazyRoute(() => import('../pages/settings/FeatureManagement'));

import {
  AUTH_PATH_ALIASES,
  AUTH_SIGNUP_PATH_ALIASES,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from '../config/routes.config';
import { resolveRegistryId } from '../data/clinicalCatalogWiring';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import TrackMindRouteGuard from '../components/TrackMindRouteGuard';
import ProfileRouteGuard from '../components/ProfileRouteGuard';
import {
  getEmergencyRoleHomeRoute,
  EMERGENCY_ROLE_IDS,
  getReceptionEmbeddedIntakePath,
} from '../config/emergencyRolePermissions';
import { getPlatformHomeRoute, isReceptionFirstUxEnabled } from '../config/receptionFirstUx.config';
import { resolvePlatformLanding } from '../config/platformEntryModel';
import { resolveDemoDefaultLandingRoute } from '../config/demoPersonaModel';

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
  return <Navigate to={resolveDemoDefaultLandingRoute()} replace />;
}

// ── Role-aware route guard ───────────────────────────────────────────────────

function EmergencyAccessDenied({ requestedPath }) {
  const emergencyRole = useEmergencyRolePermissions();
  const fallbackPath = emergencyRole.nearestRoute(requestedPath);

  return (
    <section
      style={{
        minHeight: '100%',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: MEDICAL_THEME.surfacePage,
      }}
    >
      <div
        role="alert"
        style={{
          maxWidth: 560,
          border: '1px solid #7F1D1D',
          borderRadius: 16,
          background: MEDICAL_THEME.surfaceCard,
          color: MEDICAL_THEME.ink,
          padding: 24,
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            color: MEDICAL_TYPE.statusCritical,
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Access denied
        </span>
        <h1 style={{ margin: '6px 0 0', fontSize: 22 }}>CareDroid page unavailable</h1>
        <p style={{ color: MEDICAL_THEME.inkSubtle, lineHeight: 1.5 }}>
          {emergencyRole.roleLabel} does not have access to this CareDroid page.
        </p>
        <Link
          to={fallbackPath}
          style={{
            display: 'inline-flex',
            marginTop: 10,
            borderRadius: 10,
            background: MEDICAL_THEME.accent,
            color: MEDICAL_THEME.onAccent,
            padding: '10px 13px',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Go to permitted CareDroid page
        </Link>
      </div>
    </section>
  );
}

function EmergencyRouteGuard({ path, children }) {
  const emergencyRole = useEmergencyRolePermissions();
  if (
    path === CANONICAL_ROUTES.emergencyWhiteboard &&
    emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk
  ) {
    return <Navigate to={CANONICAL_ROUTES.emergencyReception} replace />;
  }
  if (!emergencyRole.canAccessRoute(path)) {
    return <EmergencyAccessDenied requestedPath={path} />;
  }
  return children;
}

function EmergencyDefaultRedirect() {
  const { saasProfile } = useUserIdentity();
  const emergencyRole = useEmergencyRolePermissions();

  const destination =
    resolvePlatformLanding({
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
  } else if (pathname === CANONICAL_ROUTES.workflows || pathname === CANONICAL_ROUTES.automation || pathname === CANONICAL_ROUTES.workflowMining) {
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

function TriageWorkspaceRoute() {
  const [searchParams] = useSearchParams();
  if (!searchParams.has('queue') && !searchParams.has('filter') && !searchParams.has('queueFilter')) {
    return <Navigate to={`${CANONICAL_ROUTES.triage}?queue=pretriage`} replace />;
  }
  return (
    <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyQueues}>
      <EmergencySurfaceRedirect surfaceId="queues">
        <QueueRoute />
      </EmergencySurfaceRedirect>
    </EmergencyRouteGuard>
  );
}

function PatientProfileRoute() {
  const { patientId } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (patientId && !params.has('patientId')) params.set('patientId', patientId);
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
      <Route path="/" element={<EmergencyDefaultRedirect />} />

      {/* Auth — redirect to demo landing, no auth shell needed */}
      {legacyAuthPaths.map((path) => (
        <Route key={`legacy-auth-${path}`} path={path} element={<AuthPathsRedirect />} />
      ))}

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
      <Route path={ED_UNIFIED_PUBLIC_ROUTES.calculators} element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyTools} />} />
      <Route
        path={ED_UNIFIED_PUBLIC_ROUTES.charge}
        element={<ScreenModeLandingRedirect mode={CARE_DROID_SCREEN_MODES.chargeNurse} />}
      />
      <Route
        path={ED_UNIFIED_PUBLIC_ROUTES.physician}
        element={<ScreenModeLandingRedirect mode={CARE_DROID_SCREEN_MODES.physician} />}
      />

      {/* ── Main application shell (AppShell) ── */}
      <Route element={<RootLayout />}>

        {/* Entry redirects */}
        <Route path={CANONICAL_ROUTES.platformStart} element={<EdApplicationEntryRedirect />} />

        {/* ── Admin ── */}
        <Route
          path={CANONICAL_ROUTES.adminOperations}
          element={
            <LazyRoute label="Loading admin console...">
              <AdminOperationsShell />
            </LazyRoute>
          }
        >
          <Route index element={<LazyRoute label="Loading admin overview..."><AdminOperationsHome /></LazyRoute>} />
          <Route path="staff-workflows" element={<LazyRoute label="Loading ED workflows..."><EdStaffWorkflowAdmin /></LazyRoute>} />
          <Route path="team"            element={<LazyRoute label="Loading team..."><TeamManagement /></LazyRoute>} />
          <Route path="tenant"          element={<LazyRoute label="Loading tenant admin..."><TenantAdministrationCenter /></LazyRoute>} />
          <Route path="system-health"   element={<LazyRoute label="Loading system health..."><SystemHealth /></LazyRoute>} />
          <Route path="audit-trail"     element={<LazyRoute label="Loading audit trail..."><AutomationAuditTrail /></LazyRoute>} />
        </Route>
        <Route
          path={CANONICAL_ROUTES.tenantAdmin}
          element={<Navigate to={`${CANONICAL_ROUTES.adminOperations}/tenant`} replace />}
        />

        {/* ── Emergency department core ── */}
        <Route path="/emergency" element={<EmergencyDefaultRedirect />} />

        {/* CareDroid consolidated page architecture */}
        <Route
          path={CANONICAL_ROUTES.intake}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyIntake}>
              <EmergencyIntakeEntry />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.queue}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyQueues}>
              <EmergencySurfaceRedirect surfaceId="queues">
                <QueueRoute />
              </EmergencySurfaceRedirect>
            </EmergencyRouteGuard>
          }
        />
        <Route path={CANONICAL_ROUTES.triage} element={<TriageWorkspaceRoute />} />
        <Route path="/patients/:patientId" element={<PatientProfileRoute />} />
        <Route
          path="/patients"
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyPatients}>
              <EmergencySurfaceRedirect surfaceId="patients">
                <PatientsRoute />
              </EmergencySurfaceRedirect>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.alerts}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAlerts}>
              <LazyRoute label="Loading alerts...">
                <ClinicalAlertsPage />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.aiChief}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCopilot}>
              <CopilotRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.staff}
          element={
            <LazyRoute label="Loading staff command...">
              <TeamManagement />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.departments}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCapacity}>
              <CapacityRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.analytics}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}>
              <LazyRoute label="Loading analytics...">
                <EmergencyAnalytics />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.reports}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}>
              <LazyRoute label="Loading reports...">
                <EmergencyAnalytics />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.settings}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencySettings}>
              <LazyRoute label="Loading settings...">
                <EmergencySettings />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />

        <Route
          path={CANONICAL_ROUTES.emergencyWhiteboard}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyWhiteboard}>
              <ErrorBoundary fallbackText="EmergencyWhiteboard encountered an error. Refresh to reload.">
                <LazyRoute label="Loading whiteboard...">
                  <EmergencyWhiteboard />
                </LazyRoute>
              </ErrorBoundary>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyPatients}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyPatients}>
              <EmergencySurfaceRedirect surfaceId="patients">
                <PatientsRoute />
              </EmergencySurfaceRedirect>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyEms}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyEms}>
              <LazyRoute label="Loading EMS pipeline...">
                <EMSPipeline />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReception}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyReception}>
              <LazyRoute label="Loading reception...">
                <ReceptionWorkspace />
              </LazyRoute>
            </EmergencyRouteGuard>
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
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyIntake}>
              <EmergencyIntakeEntry />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyQueues}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyQueues}>
              <EmergencySurfaceRedirect surfaceId="queues">
                <QueueRoute />
              </EmergencySurfaceRedirect>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReassessment}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyReassessment}>
              <ReassessmentRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCapacity}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCapacity}>
              <CapacityRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyBoarding}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyBoarding}>
              <BoardingRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyReferrals}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyReferrals}>
              <LazyRoute label="Loading referrals...">
                <ReferralPanel />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyCopilot}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyCopilot}>
              <CopilotRoute />
            </EmergencyRouteGuard>
          }
        />
        <Route
          path="/emergency/documentation"
          element={
            <EmergencyRouteGuard path="/emergency/documentation">
              <LazyRoute label="Loading documentation assistant...">
                <ClinicalDocumentationAssistant />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyTools}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyTools}>
              <LazyRoute label="Loading Medical Tools...">
                <ToolsOverview />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyPulse}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyPulse}>
              <LazyRoute label="Loading department pulse...">
                <EmergencyDepartmentPulse />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyShift}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyShift}>
              <LazyRoute label="Loading shift summary...">
                <EmergencyShiftSummary />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyAnalytics}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAnalytics}>
              <LazyRoute label="Loading analytics...">
                <EmergencyAnalytics />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyAlerts}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyAlerts}>
              <LazyRoute label="Loading alerts...">
                <ClinicalAlertsPage />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencySettings}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencySettings}>
              <LazyRoute label="Loading settings...">
                <EmergencySettings />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyHelp}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyHelp}>
              <LazyRoute label="Loading guide...">
                <HelpHubPage />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.integrationHub}
          element={
            <LazyRoute label="Loading Integration Hub...">
              <IntegrationHubPage />
            </LazyRoute>
          }
        />

        {/* ── User profile & account ── */}
        <Route path={CANONICAL_ROUTES.profile}               element={<LazyRoute label="Loading profile..."><Profile /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.profileSettings}       element={<LazyRoute label="Loading profile settings..."><ProfileSettings /></LazyRoute>} />
        <Route path="/profile-settings"                       element={<Navigate to={CANONICAL_ROUTES.profileSettings} replace />} />
        <Route path={CANONICAL_ROUTES.profileToolPreferences} element={<LazyRoute label="Loading tool preferences..."><ProfileToolPreferences /></LazyRoute>} />
        <Route path="/profile/activity"                       element={<LazyRoute label="Loading profile activity..."><ProfileActivity /></LazyRoute>} />
        <Route path="/profile/preferences"                    element={<LazyRoute label="Loading profile preferences..."><ProfilePreferences /></LazyRoute>} />
        <Route path="/profile/security"                       element={<LazyRoute label="Loading profile security..."><ProfileSecurity /></LazyRoute>} />
        <Route path="/profile/workspaces"                     element={<LazyRoute label="Loading profile workspaces..."><ProfileWorkspaces /></LazyRoute>} />
        <Route path="/notification-preferences"               element={<LazyRoute label="Loading notification preferences..."><NotificationPreferences /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.notifications}           element={<Navigate to="/notification-preferences" replace />} />

        {/* ── SaaS billing ── */}
        <Route path={CANONICAL_ROUTES.billing} element={<LazyRoute label="Loading billing..."><BillingPage /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.usage}   element={<LazyRoute label="Loading usage..."><UsagePage /></LazyRoute>} />

        {/* ── Developer / tools catalog ── */}
        <Route
          path={CANONICAL_ROUTES.developerCatalog}
          element={
            <LazyRoute label="Loading developer catalog...">
              <ClinicalToolCatalog />
            </LazyRoute>
          }
        />
        <Route path={CANONICAL_ROUTES.featureFlags} element={<LazyRoute label="Loading feature flags..."><FeatureManagement /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.systemHealth} element={<LazyRoute label="Loading system health..."><SystemHealth /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.saasHealth} element={<LazyRoute label="Loading system health..."><SystemHealth /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.audit} element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.security} element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.regulatory} element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.aiGovernance} element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace /></LazyRoute>} />
        <Route path={CANONICAL_ROUTES.humanReview} element={<LazyRoute label="Loading governance workspace..."><PlatformGovernanceWorkspace /></LazyRoute>} />

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

        {/* ── Retired extension routes → whiteboard ── */}
        <Route path="/cosmos"              element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/cosmos/*"            element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/workspace"           element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/workspaces"          element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/executive"           element={<Navigate to={CANONICAL_ROUTES.emergencyAnalytics} replace />} />
        <Route path="/organization"        element={<Navigate to={CANONICAL_ROUTES.adminOperations} replace />} />
        <Route path="/organization/*"      element={<Navigate to={CANONICAL_ROUTES.adminOperations} replace />} />
        <Route path="/surveillance"        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/surveillance/*"      element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/fleet"               element={<Navigate to={CANONICAL_ROUTES.emergencyEms} replace />} />
        <Route path="/fleet/*"             element={<ToolsRedirect />} />
        <Route path="/vehicle"             element={<Navigate to={CANONICAL_ROUTES.emergencyEms} replace />} />
        <Route path="/vehicle/*"           element={<Navigate to={CANONICAL_ROUTES.emergencyEms} replace />} />
        <Route path="/maps"                element={<ToolsRedirect />} />
        <Route path="/tracking"            element={<ToolsRedirect />} />
        <Route path="/live-tracking"       element={<ToolsRedirect />} />
        <Route path="/operations-center"   element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
        <Route path="/platform-learning"   element={<Navigate to={CANONICAL_ROUTES.emergencySettings} replace />} />
        <Route path="/audit-logs"          element={<Navigate to={CANONICAL_ROUTES.emergencySettings} replace />} />
        <Route path="/security"            element={<Navigate to={CANONICAL_ROUTES.emergencySettings} replace />} />
        <Route path="/regulatory"          element={<Navigate to={CANONICAL_ROUTES.emergencySettings} replace />} />
        <Route path="/ai/evaluation"       element={<Navigate to={CANONICAL_ROUTES.emergencyAnalytics} replace />} />
        <Route path="/ai/command-center"   element={<Navigate to={CANONICAL_ROUTES.emergencyCopilot} replace />} />
        <Route path="/ai-command"          element={<Navigate to={CANONICAL_ROUTES.emergencyCopilot} replace />} />
        <Route path="/team"                element={<Navigate to={`${CANONICAL_ROUTES.adminOperations}/team`} replace />} />


      </Route>{/* end RootLayout */}

      {/* ── Tool URL shortcuts (outside shell, handled by ToolsRedirect) ── */}
      <Route path="/tools"              element={<ToolsRedirect />} />
      <Route path="/tools/*"            element={<ToolsRedirect />} />
      <Route path="/calculators"        element={<ToolsRedirect />} />
      <Route path="/calculators/*"      element={<ToolsRedirect />} />
      <Route path="/scores"             element={<ToolsRedirect />} />
      <Route path="/scores/*"           element={<ToolsRedirect />} />
      <Route path="/catalog"            element={<ToolsRedirect />} />
      <Route path="/all-tools"          element={<ToolsRedirect />} />
      <Route path="/clinical-tools"     element={<ToolsRedirect />} />
      <Route path="/lab"                element={<ToolsRedirect />} />
      <Route path="/medical-simulation" element={<ToolsRedirect />} />
      <Route path="/simulation"        element={<ToolsRedirect />} />
      <Route path="/simulation/*"      element={<ToolsRedirect />} />
      <Route path="/competencies"      element={<ToolsRedirect />} />
      <Route path="/pharmacy"           element={<ToolsRedirect />} />
      <Route path="/pharmacy/*"         element={<ToolsRedirect />} />
      <Route path="/radiology"          element={<ToolsRedirect />} />
      <Route path="/radiology/*"        element={<ToolsRedirect />} />
      <Route path="/recommendations"    element={<ToolsRedirect />} />
      <Route path="/automation"         element={<ToolsRedirect />} />
      <Route path="/workflows"          element={<ToolsRedirect />} />
      <Route path="/workflow-mining"    element={<ToolsRedirect />} />
      <Route path="/discover"           element={<ToolsRedirect />} />
      <Route path="/search"             element={<ToolsRedirect />} />
      <Route path="/knowledge-hub"      element={<ToolsRedirect />} />
      <Route path="/knowledge-base"     element={<ToolsRedirect />} />
      <Route path="/knowledge-graph"    element={<ToolsRedirect />} />
      <Route path="/laboratory"         element={<ToolsRedirect />} />
      <Route path="/fleet/live-map"     element={<ToolsRedirect />} />
      <Route path="/fleet/route-optimizer" element={<ToolsRedirect />} />
      <Route path="/operations/:tool"   element={<ToolsRedirect />} />
      <Route path="/digital-twin"       element={<ToolsRedirect />} />

      {/* ── Copilot / AI aliases ── */}
      <Route path="/assistant" element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />} />
      <Route path="/chat"      element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />} />
      <Route path="/ai"        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />} />
      <Route path="/copilot"   element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />} />

      {/* ── Generic fallbacks ── */}
      <Route path="/dashboard"          element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyWhiteboard} />} />
      <Route path="/home"               element={<EmergencyDefaultRedirect />} />
      <Route path="/app"                element={<EmergencyDefaultRedirect />} />
      <Route path="/mobile"             element={<EmergencyDefaultRedirect />} />
      <Route path="/mobile/*"           element={<EmergencyDefaultRedirect />} />
      <Route path="/android"            element={<EmergencyDefaultRedirect />} />
      <Route path="/android/*"          element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare" element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare/*" element={<EmergencyDefaultRedirect />} />
      <Route path="/emergency/*"        element={<EmergencyDefaultRedirect />} />
      <Route path="*"                   element={<EmergencyDefaultRedirect />} />
    </Routes>
  );
}
