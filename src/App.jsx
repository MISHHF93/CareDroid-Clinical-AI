import { lazy, Suspense, useEffect } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser } from './contexts/UserContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConversationProvider } from './contexts/ConversationContext';
import { ToolPreferencesProvider } from './contexts/ToolPreferencesContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { OrganizationContextProvider } from './contexts/OrganizationContext';
import { WhiteLabelProvider } from './contexts/WhiteLabelContext';
import { UserIdentityProvider, useUserIdentity } from './contexts/UserIdentityContext';
import { CostTrackingProvider } from './contexts/CostTrackingContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { TenantContextProvider } from './contexts/TenantContext';
import OfflineProvider from './contexts/OfflineProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { AppShell } from './components/AppShell';
const lazyNamed = (loader, exportName) =>
  lazy(() => loader().then((module) => ({ default: module[exportName] })));
const EmergencyWhiteboard = lazy(() => import('./components/EmergencyWhiteboard'));
const SmartIntake = lazy(() => import('./pages/emergency/SmartIntake'));
const ReceptionWorkspace = lazy(() => import('./pages/emergency/ReceptionWorkspace'));
const EmergencyAnalytics = lazy(() => import('./pages/emergency/EmergencyAnalytics'));
const EmergencySettings = lazy(() => import('./pages/emergency/EmergencySettings'));
const EMSPipeline = lazy(() => import('./components/EMSPipeline'));
const ToolsOverview = lazy(() => import('./pages/tools/ToolsOverview'));
const ClinicalToolCatalog = lazy(() => import('./pages/tools/ClinicalToolCatalog'));
const PlatformNavigationPage = lazy(() => import('./pages/PlatformNavigationPage'));
const CapabilityDiscovery = lazy(() => import('./pages/CapabilityDiscovery'));
const PlatformEntryHub = lazy(() => import('./pages/PlatformEntryHub'));
const ExecutiveCommandCenter = lazy(() => import('./pages/ExecutiveCommandCenter'));
const AiCommandCenterDashboard = lazy(() => import('./pages/AiCommandCenterDashboard'));
const DigitalTwinIntelligence = lazy(() => import('./pages/DigitalTwinIntelligence'));
const HospitalMapDashboard = lazy(() => import('./pages/HospitalMapDashboard'));
const MedicalIotDashboard = lazy(() => import('./pages/MedicalIotDashboard'));
const DeviceFleetManagement = lazy(() => import('./pages/DeviceFleetManagement'));
const LiveTrackingMap = lazy(() => import('./pages/LiveTrackingMap'));
const DigitalOperationsCenter = lazy(() => import('./pages/DigitalOperationsCenter'));
const FleetDashboard = lazy(() => import('./pages/fleet/FleetDashboard'));
const FleetLiveMap = lazy(() => import('./pages/fleet/FleetLiveMap'));
const RouteOptimizer = lazy(() => import('./pages/fleet/RouteOptimizer'));
const PredictiveMaintenance = lazy(() => import('./pages/fleet/PredictiveMaintenance'));
const SurveillanceNexusDashboard = lazy(() => import('./pages/surveillance/SurveillanceNexusDashboard'));
const SuccessCenterPage = lazy(() => import('./pages/success-center/SuccessCenterPage'));
const LaboratoryDashboard = lazy(() => import('./pages/LaboratoryDashboard'));
const SimulationScenarioPlayer = lazy(() => import('./pages/SimulationScenarioPlayer'));
const AutomationAnalytics = lazy(() => import('./pages/AutomationAnalytics'));
const FeatureFlagCenter = lazy(() => import('./pages/FeatureFlagCenter'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const TeamManagement = lazy(() => import('./pages/team/TeamManagement'));
const ClinicalDocumentationAssistant = lazy(() => import('./pages/ClinicalDocumentationAssistant'));
const ClinicalKnowledgeGraph = lazy(() => import('./pages/ClinicalKnowledgeGraph'));
const IntegrationHubPage = lazy(() => import('./pages/integrations/IntegrationHubPage'));
const CosmosViewer = lazy(() => import('./pages/cosmos/CosmosViewer'));
const PredictiveAnalyticsDashboard = lazy(() => import('./pages/PredictiveAnalyticsDashboard'));
const ResearchEvidenceHub = lazy(() => import('./pages/ResearchEvidenceHub'));
const Medical3DViewer = lazy(() => import('./pages/Medical3DViewer'));
const WorkspacesIndexPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'WorkspacesIndexPage',
);
const SearchResultsPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'SearchResultsPage',
);
const HealthcareKnowledgeHubPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'HealthcareKnowledgeHubPage',
);
const ClinicalTimelinePage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'ClinicalTimelinePage',
);
const NotificationCenterPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'NotificationCenterPage',
);
const DigitalTwinPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'DigitalTwinPage',
);
const WorkflowBuilderPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'WorkflowBuilderPage',
);
const DepartmentIntelligencePage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'DepartmentIntelligencePage',
);
const WorkflowMiningEnginePage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'WorkflowMiningEnginePage',
);
const CareDroidBusinessBrainPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'CareDroidBusinessBrainPage',
);
const WorkspaceDependencyGraphPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'WorkspaceDependencyGraphPage',
);
const AssetLibraryPage = lazyNamed(
  () => import('./pages/PlatformOSPages'),
  'AssetLibraryPage',
);
const CustomerExpansionOpportunitiesPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'CustomerExpansionOpportunitiesPage',
);
const ProductIntelligenceLayerPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'ProductIntelligenceLayerPage',
);
const ProductsIndexPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'ProductsIndexPage',
);
const ProductDetailPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'ProductDetailPage',
);
const SpecialtiesIndexPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'SpecialtiesIndexPage',
);
const SpecialtyDetailPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'SpecialtyDetailPage',
);
const CarePathwaysIndexPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'CarePathwaysIndexPage',
);
const CarePathwayDetailPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'CarePathwayDetailPage',
);
const AgentsRegistryPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'AgentsRegistryPage',
);
const MaturityAssessmentPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'MaturityAssessmentPage',
);
const OutcomesDashboardPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'OutcomesDashboardPage',
);
const ValueTrackingPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'ValueTrackingPage',
);
const IntegrationsMarketplacePage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'IntegrationsMarketplacePage',
);
const IntegrationReadinessPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'IntegrationReadinessPage',
);
const HospitalSolutionBuilderPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'HospitalSolutionBuilderPage',
);
const ConfigurationStudioPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'ConfigurationStudioPage',
);
const CommercialPlansPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'CommercialPlansPage',
);
const OrganizationOnboardingPage = lazyNamed(
  () => import('./pages/commercial/CommercialPages'),
  'OrganizationOnboardingPage',
);
const OrganizationDashboard = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'OrganizationDashboard',
);
const OrganizationSettings = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'OrganizationSettings',
);
const PackMarketplace = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'PackMarketplace',
);
const PlatformAnalyticsPage = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'PlatformAnalyticsPage',
);
const CustomerSuccessDashboard = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'CustomerSuccessDashboard',
);
const OrganizationIntelligenceProfile = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'OrganizationIntelligenceProfile',
);
const AssetLifecycleAdmin = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'AssetLifecycleAdmin',
);
const DepartmentsPage = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'DepartmentsPage',
);
const ServiceLinesPage = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'ServiceLinesPage',
);
const TenantAdministrationCenter = lazyNamed(
  () => import('./pages/organization/OrganizationPages'),
  'TenantAdministrationCenter',
);
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));
const MarketplacePage = lazy(() => import('./pages/MarketplacePage'));
const EnterpriseReadinessPage = lazy(() => import('./pages/EnterpriseReadinessPage'));
const TrackMindMaturityDashboard = lazy(() => import('./pages/TrackMindMaturityDashboard'));
const TrackMindRoleWorkspace = lazy(() => import('./pages/TrackMindRoleWorkspace'));
const CustomerSuccessPlatformPage = lazy(() => import('./pages/CustomerSuccessPlatformPage'));
const EnterpriseOperatingPlatformHub = lazy(() => import('./pages/EnterpriseOperatingPlatformHub'));
const PlatformIntelligenceHub = lazy(() => import('./pages/PlatformIntelligenceHub'));
const PlatformAdminPage = lazy(() => import('./pages/PlatformAdminPage'));
const CustomerPortalPage = lazy(() => import('./pages/customer-portal/CustomerPortalPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const UsagePage = lazy(() => import('./pages/UsagePage'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const SaasHealthCenter = lazy(() => import('./pages/SaasHealthCenter'));
const PluginMarketplace = lazy(() => import('./pages/PluginMarketplace'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileSettings = lazy(() => import('./pages/ProfileSettings'));
const ProfileActivity = lazy(() => import('./pages/profile/ProfileActivity'));
const ProfilePreferences = lazy(() => import('./pages/profile/ProfilePreferences'));
const ProfileSecurity = lazy(() => import('./pages/profile/ProfileSecurity'));
const ProfileToolPreferences = lazy(() => import('./pages/profile/ProfileToolPreferences'));
const ProfileWorkspaces = lazy(() => import('./pages/profile/ProfileWorkspaces'));
const DependencyMap = lazy(() => import('./pages/DependencyMap'));
const DependencyGraph = lazy(() => import('./pages/DependencyGraph'));
const DataLineageExplorer = lazy(() => import('./pages/DataLineageExplorer'));
const PlatformSelfDiagnostics = lazy(() => import('./pages/PlatformSelfDiagnostics'));
const PlatformLearningEngine = lazy(() => import('./pages/PlatformLearningEngine'));
const CareDroidBrainDashboard = lazy(() => import('./pages/CareDroidBrainDashboard'));
const AiEvaluationDashboard = lazy(() => import('./pages/AiEvaluationDashboard'));
const AiModelsPage = lazy(() => import('./pages/AiModelsPage'));
const AIGovernanceDashboard = lazy(() => import('./pages/AIGovernanceDashboard'));
const GovernanceRegistry = lazy(() => import('./pages/GovernanceRegistry'));
const AutomationAuditTrail = lazy(() => import('./pages/AutomationAuditTrail'));
const ClinicalDecisionSupport = lazy(() => import('./pages/ClinicalDecisionSupport'));
const Protocols = lazy(() => import('./pages/tools/Protocols'));
const MedicalSimulationSuite = lazy(() => import('./pages/MedicalSimulationSuite'));
const SimulationOutcomes = lazy(() => import('./pages/SimulationOutcomes'));
const Competencies = lazy(() => import('./pages/Competencies'));
const Credentials = lazy(() => import('./pages/Credentials'));
const Artifacts = lazy(() => import('./pages/Artifacts'));
const AdminOperationsShell = lazy(() => import('./components/admin/AdminOperationsShell'));
const AdminOperationsHome = lazy(() => import('./pages/admin/AdminOperationsHome'));
const EdStaffWorkflowAdmin = lazy(() => import('./pages/admin/EdStaffWorkflowAdmin'));
const SharedToolSession = lazy(() => import('./pages/tools/SharedToolSession'));
const EmergencyDepartmentPulse = lazy(() => import('./pages/emergency/pulse'));
const EmergencyShiftSummary = lazy(() => import('./pages/emergency/shift'));
const ReferralPanel = lazy(() => import('./components/ReferralPanel'));
import {
  AUTH_PATH_ALIASES,
  AUTH_SIGNUP_PATH_ALIASES,
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from './config/routes.config';
import { resolveRegistryId } from './data/clinicalCatalogWiring';
import { useEmergencyRolePermissions } from './hooks/useEmergencyRolePermissions';
import TrackMindRouteGuard from './components/TrackMindRouteGuard';
import ProfileRouteGuard from './components/ProfileRouteGuard';
import { getEmergencyRoleHomeRoute, EMERGENCY_ROLE_IDS, getReceptionEmbeddedIntakePath, prefersReceptionForPatientCreate } from './config/emergencyRolePermissions';
import { getPlatformHomeRoute, isReceptionFirstUxEnabled } from './config/receptionFirstUx.config';
import { resolvePlatformLanding } from './config/platformEntryModel';
import { resolveDemoDefaultLandingRoute } from './config/demoPersonaModel';


import {
  PatientsRoute,
  QueueRoute,
  ReassessmentRoute,
  BoardingRoute,
  CapacityRoute,
  CopilotRoute,
} from './pages/emergency/emergencyRoutePages';
import EmergencySurfaceRedirect from './pages/emergency/EmergencySurfaceRedirect';
import { shouldRedirectEmergencySurface } from './services/navigateToEmergencySurface';

function RouteLoadingFallback({ label = 'Loading CareDroid module...' }) {
  return (
    <div role="status" style={{ padding: 24, color: '#9CA3AF' }}>
      {label}
    </div>
  );
}

function LazyRoute({ children, label }) {
  return <Suspense fallback={<RouteLoadingFallback label={label} />}>{children}</Suspense>;
}

function AuthPathsRedirect() {
  return <Navigate to={resolveDemoDefaultLandingRoute()} replace />;
}

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
        background: '#0A0E1A',
      }}
    >
      <div
        role="alert"
        style={{
          maxWidth: 560,
          border: '1px solid #7F1D1D',
          borderRadius: 16,
          background: '#111827',
          color: '#F9FAFB',
          padding: 24,
          boxShadow: 'none',
        }}
      >
        <span
          style={{
            color: '#FCA5A5',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Access denied
        </span>
        <h1 style={{ margin: '6px 0 0', fontSize: 22 }}>CareDroid page unavailable</h1>
        <p style={{ color: '#9CA3AF', lineHeight: 1.5 }}>
          {emergencyRole.roleLabel} does not have access to this CareDroid page.
        </p>
        <Link
          to={fallbackPath}
          style={{
            display: 'inline-flex',
            marginTop: 10,
            borderRadius: 10,
            background: '#2563EB',
            color: '#F9FAFB',
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

  // In development/demo, default straight to the core Emergency Whiteboard for the selected persona.
  // This reduces the "huge app" feeling and makes role switching + main surface the clear entry point.
  const isDev = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || import.meta.env.DEV);

  if (isDev) {
    return <Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />;
  }

  const destination =
    resolvePlatformLanding({
      saasRole: saasProfile?.role || saasProfile?.saasRole,
    }) ||
    emergencyRole.landingRoute ||
    emergencyRole.defaultRoute ||
    resolveDemoDefaultLandingRoute() ||
    getPlatformHomeRoute() ||
    CANONICAL_ROUTES.emergencyReception;

  return <Navigate to={destination} replace />;
}

function EmergencyIntakeEntry() {
  const emergencyRole = useEmergencyRolePermissions();
  const [searchParams] = useSearchParams();
  if (
    shouldRedirectEmergencySurface('intake', emergencyRole.role) ||
    prefersReceptionForPatientCreate(emergencyRole.role)
  ) {
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

function operationToolQuery(pathname) {
  if (pathname === CANONICAL_ROUTES.hospitalMap) return 'hospital-map';
  if (pathname === CANONICAL_ROUTES.medicalIot) return 'medical-iot-dashboard';
  if (pathname === CANONICAL_ROUTES.devices) return 'device-fleet-management';
  if (
    pathname === CANONICAL_ROUTES.liveMap ||
    pathname === '/maps' ||
    pathname === '/tracking' ||
    pathname === '/live-tracking'
  ) {
    return 'live-tracking-map';
  }
  if (pathname === CANONICAL_ROUTES.digitalTwin) return 'digital-twin';
  if (pathname === CANONICAL_ROUTES.fleetMap || pathname === '/fleet/live-map' || pathname === '/fleet/tracking') {
    return 'fleet-live-map';
  }
  if (pathname === CANONICAL_ROUTES.fleetCommand || pathname === '/fleet' || pathname === '/vehicle') {
    return 'fleet-command';
  }
  if (pathname.startsWith('/fleet/')) {
    const slug = pathSegmentAfter(pathname, '/fleet/');
    if (slug === 'map' || slug === 'live-map' || slug === 'tracking') return 'fleet-live-map';
    if (slug === 'command') return 'fleet-command';
    return canonicalToolQuery(slug) || 'fleet-command';
  }
  if (pathname.startsWith('/vehicle/')) return 'fleet-command';
  if (pathname.startsWith('/operations/')) return canonicalToolQuery(pathSegmentAfter(pathname, '/operations/')) || 'fleet-command';
  return 'fleet-command';
}

function simulationToolQuery(pathname) {
  if (pathname === CANONICAL_ROUTES.competencies || pathname.startsWith(`${CANONICAL_ROUTES.competencies}/`)) {
    return 'competency-platform';
  }
  if (pathname === CANONICAL_ROUTES.credentials || pathname.startsWith(`${CANONICAL_ROUTES.credentials}/`)) {
    return 'credentialing-platform';
  }
  if (pathname === CANONICAL_ROUTES.simulationOutcomes || pathname.startsWith(`${CANONICAL_ROUTES.simulationOutcomes}/`)) {
    return 'simulation-outcomes';
  }
  return 'simulation-suite';
}

export function buildEmergencyToolsRedirect(location) {
  const pathname = normalizeRedirectPath(location.pathname);
  const params = new URLSearchParams(location.search);
  const setDefault = (key, value) => {
    if (!params.has(key)) params.set(key, value);
  };
  const setQueryFromSlug = (slug) => {
    const query = canonicalToolQuery(slug);
    if (query && !params.has('q') && !params.has('search')) {
      params.set('q', query);
    }
    if (query && !params.has('open') && !params.has('tool') && !params.has('calc')) {
      params.set('open', query);
    }
  };
  const setCalculatorQueryFromSlug = (slug) => {
    const query = safeDecodeURIComponent(slug);
    if (query && !params.has('q') && !params.has('search')) {
      params.set('q', query);
    }
    if (query && !params.has('open') && !params.has('tool') && !params.has('calc')) {
      params.set('open', query);
    }
  };

  if (pathname === CANONICAL_ROUTES.developerCatalog || pathname === '/catalog') {
    setDefault('source', 'catalog');
    setDefault('filter', 'all');
  } else if (pathname === CANONICAL_ROUTES.recommendations) {
    setDefault('source', 'recommendations');
    setDefault('filter', 'recommended');
  } else if (pathname === CANONICAL_ROUTES.workflows || pathname === CANONICAL_ROUTES.automation) {
    setDefault('source', 'workflows');
    setDefault('filter', 'ai-workflows');
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
  } else if (
    pathname === CANONICAL_ROUTES.simulation ||
    pathname.startsWith(`${CANONICAL_ROUTES.simulation}/`) ||
    pathname === '/medical-simulation' ||
    pathname === CANONICAL_ROUTES.competencies ||
    pathname.startsWith(`${CANONICAL_ROUTES.competencies}/`) ||
    pathname === CANONICAL_ROUTES.credentials ||
    pathname.startsWith(`${CANONICAL_ROUTES.credentials}/`)
  ) {
    const query = simulationToolQuery(pathname);
    setDefault('source', 'simulation');
    setDefault('filter', 'simulations');
    setDefault('q', query);
    setDefault('open', query);
  } else if (pathname === '/pharmacy' || pathname.startsWith('/pharmacy/')) {
    setDefault('source', 'clinical-tools');
    setDefault('filter', 'clinical-tools');
    setDefault('q', 'drug-check');
    setDefault('open', 'drug-check');
  } else if (pathname === '/radiology' || pathname.startsWith('/radiology/')) {
    setDefault('source', 'workflows');
    setDefault('filter', 'ai-workflows');
    setDefault('q', 'guideline-rag');
    setDefault('open', 'guideline-rag');
  } else if (
    pathname === CANONICAL_ROUTES.hospitalMap ||
    pathname === CANONICAL_ROUTES.medicalIot ||
    pathname === CANONICAL_ROUTES.devices ||
    pathname === CANONICAL_ROUTES.liveMap ||
    pathname === '/maps' ||
    pathname === '/tracking' ||
    pathname === '/live-tracking' ||
    pathname === CANONICAL_ROUTES.operations ||
    pathname === CANONICAL_ROUTES.operationsCenter ||
    pathname.startsWith('/operations/') ||
    pathname === '/fleet' ||
    pathname.startsWith('/fleet/') ||
    pathname === '/vehicle' ||
    pathname.startsWith('/vehicle/') ||
    pathname === CANONICAL_ROUTES.digitalTwin
  ) {
    const operationQuery = operationToolQuery(pathname);
    setDefault('source', 'operations');
    setDefault('filter', 'operations');
    setDefault('q', operationQuery);
    if (operationQuery) setDefault('open', operationQuery);
  } else if (
    pathname === CANONICAL_ROUTES.calculators ||
    pathname.startsWith(`${CANONICAL_ROUTES.calculators}/`) ||
    pathname.startsWith('/tools/calculator/') ||
    pathname === '/calculators' ||
    pathname.startsWith('/calculators/') ||
    pathname === '/scores' ||
    pathname.startsWith('/scores/') ||
    pathname === '/emergency/calculators'
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

function NonEmergencyWorkspaceRedirect() {
  const location = useLocation();
  const pathname = normalizeRedirectPath(location.pathname);
  if (pathname === '/analytics') {
    return (
      <Navigate
        to={{ pathname: CANONICAL_ROUTES.emergencyAnalytics, hash: location.hash || '' }}
        replace
      />
    );
  }
  if (pathname === '/governance' || pathname.startsWith('/governance/')) {
    return (
      <Navigate
        to={{
          pathname: CANONICAL_ROUTES.emergencyTools,
          search: '?source=governance&filter=governance',
          hash: location.hash || '',
        }}
        replace
      />
    );
  }
  return (
    <Navigate
      to={buildEmergencyToolsRedirect(location)}
      replace
      state={{ from: location.pathname }}
    />
  );
}

function EmergencyAliasRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search, hash: location.hash }} replace />;
}

function RootLayout() {
  return (
    <AppShell>
      <ProfileRouteGuard>
        <Outlet />
      </ProfileRouteGuard>
    </AppShell>
  );
}

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
      <Route path="/" element={<EmergencyDefaultRedirect />} />
      {legacyAuthPaths.map((path) => (
        <Route key={`legacy-auth-${path}`} path={path} element={<AuthPathsRedirect />} />
      ))}
      <Route
        path="/shared/tools/:shareId"
        element={
          <LazyRoute label="Loading shared tool session...">
            <SharedToolSession />
          </LazyRoute>
        }
      />
      <Route element={<RootLayout />}>
        <Route
          path={CANONICAL_ROUTES.platformStart}
          element={
            <LazyRoute label="Loading platform entry...">
              <PlatformEntryHub />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.adminOperations}
          element={
            <LazyRoute label="Loading admin console...">
              <AdminOperationsShell />
            </LazyRoute>
          }
        >
          <Route
            index
            element={
              <LazyRoute label="Loading admin overview...">
                <AdminOperationsHome />
              </LazyRoute>
            }
          />
          <Route
            path="staff-workflows"
            element={
              <LazyRoute label="Loading ED workflows...">
                <EdStaffWorkflowAdmin />
              </LazyRoute>
            }
          />
          <Route
            path="team"
            element={
              <LazyRoute label="Loading team...">
                <TeamManagement />
              </LazyRoute>
            }
          />
          <Route
            path="tenant"
            element={
              <LazyRoute label="Loading tenant admin...">
                <TenantAdministrationCenter />
              </LazyRoute>
            }
          />
        </Route>
        <Route
          path={CANONICAL_ROUTES.tenantAdmin}
          element={<Navigate to={`${CANONICAL_ROUTES.adminOperations}/tenant`} replace />}
        />
        <Route path="/emergency" element={<EmergencyDefaultRedirect />} />
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
          path={CANONICAL_ROUTES.integrationHub}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencySettings}>
              <LazyRoute label="Loading Integration Hub...">
                <IntegrationHubPage />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.cosmosViewer}
          element={
            <LazyRoute label="Loading Cosmos Viewer...">
              <CosmosViewer />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.workspace}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.workspace}>
              <LazyRoute label="Loading platform navigation...">
                <PlatformNavigationPage />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.discover}
          element={
            <LazyRoute label="Loading platform discovery...">
              <CapabilityDiscovery />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.workspaces}
          element={
            <LazyRoute label="Loading workspaces...">
              <WorkspacesIndexPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.executive}
          element={
            <LazyRoute label="Loading executive command center...">
              <ExecutiveCommandCenter />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.aiCommandCenter}
          element={
            <LazyRoute label="Loading AI command center...">
              <AiCommandCenterDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.search}
          element={
            <LazyRoute label="Loading search...">
              <SearchResultsPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.knowledgeHub}
          element={
            <LazyRoute label="Loading knowledge hub...">
              <HealthcareKnowledgeHubPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.knowledgeBase}
          element={
            <LazyRoute label="Loading knowledge base...">
              <KnowledgeBasePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.notifications}
          element={
            <LazyRoute label="Loading notifications...">
              <NotificationCenterPage />
            </LazyRoute>
          }
        />
        <Route
          path="/notification-preferences"
          element={
            <LazyRoute label="Loading notification preferences...">
              <NotificationPreferences />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.timeline}
          element={
            <LazyRoute label="Loading timeline...">
              <ClinicalTimelinePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.customerPortal}
          element={
            <LazyRoute label="Loading customer portal...">
              <CustomerPortalPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.marketplace}
          element={
            <LazyRoute label="Loading marketplace...">
              <MarketplacePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.enterpriseReadiness}
          element={
            <LazyRoute label="Loading enterprise readiness...">
              <EnterpriseReadinessPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.trackMindWorkspace}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.trackMindWorkspace}>
              <LazyRoute label="Loading TrackMind workspace...">
                <TrackMindRoleWorkspace />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.trackMindMaturity}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.trackMindMaturity}>
              <LazyRoute label="Loading TrackMind maturity...">
                <TrackMindMaturityDashboard />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.enterprisePlatform}
          element={
            <TrackMindRouteGuard path={CANONICAL_ROUTES.enterprisePlatform}>
              <LazyRoute label="Loading enterprise platform...">
                <EnterpriseOperatingPlatformHub />
              </LazyRoute>
            </TrackMindRouteGuard>
          }
        />
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
        <Route
          path={CANONICAL_ROUTES.platformAdmin}
          element={
            <LazyRoute label="Loading platform admin...">
              <PlatformAdminPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.billing}
          element={
            <LazyRoute label="Loading billing...">
              <BillingPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.usage}
          element={
            <LazyRoute label="Loading usage...">
              <UsagePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.profile}
          element={
            <LazyRoute label="Loading profile...">
              <Profile />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.profileSettings}
          element={
            <LazyRoute label="Loading profile settings...">
              <ProfileSettings />
            </LazyRoute>
          }
        />
        <Route path="/profile-settings" element={<Navigate to={CANONICAL_ROUTES.profileSettings} replace />} />
        <Route
          path={CANONICAL_ROUTES.profileToolPreferences}
          element={
            <LazyRoute label="Loading tool preferences...">
              <ProfileToolPreferences />
            </LazyRoute>
          }
        />
        <Route
          path="/profile/activity"
          element={
            <LazyRoute label="Loading profile activity...">
              <ProfileActivity />
            </LazyRoute>
          }
        />
        <Route
          path="/profile/preferences"
          element={
            <LazyRoute label="Loading profile preferences...">
              <ProfilePreferences />
            </LazyRoute>
          }
        />
        <Route
          path="/profile/security"
          element={
            <LazyRoute label="Loading profile security...">
              <ProfileSecurity />
            </LazyRoute>
          }
        />
        <Route
          path="/profile/workspaces"
          element={
            <LazyRoute label="Loading profile workspaces...">
              <ProfileWorkspaces />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.products}
          element={
            <LazyRoute label="Loading products...">
              <ProductsIndexPage />
            </LazyRoute>
          }
        />
        <Route
          path={`${CANONICAL_ROUTES.products}/:slug`}
          element={
            <LazyRoute label="Loading product detail...">
              <ProductDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.plans}
          element={
            <LazyRoute label="Loading commercial plans...">
              <CommercialPlansPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.assetPacks}
          element={
            <LazyRoute label="Loading asset packs...">
              <PackMarketplace />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.departments}
          element={
            <LazyRoute label="Loading departments...">
              <DepartmentsPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.serviceLines}
          element={
            <LazyRoute label="Loading service lines...">
              <ServiceLinesPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.departmentIntelligence}
          element={
            <LazyRoute label="Loading department intelligence...">
              <DepartmentIntelligencePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.productIntelligence}
          element={
            <LazyRoute label="Loading product intelligence...">
              <ProductIntelligenceLayerPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.expansionOpportunities}
          element={
            <LazyRoute label="Loading expansion opportunities...">
              <CustomerExpansionOpportunitiesPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.integrationsMarketplace}
          element={
            <LazyRoute label="Loading integrations marketplace...">
              <IntegrationsMarketplacePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.integrationReadiness}
          element={
            <LazyRoute label="Loading integration readiness...">
              <IntegrationReadinessPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.solutionBuilder}
          element={
            <LazyRoute label="Loading solution builder...">
              <HospitalSolutionBuilderPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.valueTracking}
          element={
            <LazyRoute label="Loading value tracking...">
              <ValueTrackingPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.outcomes}
          element={
            <LazyRoute label="Loading outcomes...">
              <OutcomesDashboardPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.maturityAssessment}
          element={
            <LazyRoute label="Loading maturity assessment...">
              <MaturityAssessmentPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.successCenter}
          element={
            <LazyRoute label="Loading success center...">
              <SuccessCenterPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.customerSuccess}
          element={
            <LazyRoute label="Loading customer success...">
              <CustomerSuccessPlatformPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.specialties}
          element={
            <LazyRoute label="Loading specialties...">
              <SpecialtiesIndexPage />
            </LazyRoute>
          }
        />
        <Route
          path={`${CANONICAL_ROUTES.specialties}/:slug`}
          element={
            <LazyRoute label="Loading specialty...">
              <SpecialtyDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.carePathways}
          element={
            <LazyRoute label="Loading care pathways...">
              <CarePathwaysIndexPage />
            </LazyRoute>
          }
        />
        <Route
          path={`${CANONICAL_ROUTES.carePathways}/:slug`}
          element={
            <LazyRoute label="Loading care pathway...">
              <CarePathwayDetailPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.agents}
          element={
            <LazyRoute label="Loading AI agents...">
              <AgentsRegistryPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.organization}
          element={
            <LazyRoute label="Loading organization...">
              <OrganizationDashboard />
            </LazyRoute>
          }
        />
        <Route
          path="/organization/settings"
          element={
            <LazyRoute label="Loading organization settings...">
              <OrganizationSettings />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.organizationSettings}
          element={
            <LazyRoute label="Loading organization settings...">
              <OrganizationSettings />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.organizationPacks}
          element={
            <LazyRoute label="Loading organization packs...">
              <PackMarketplace />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.organizationAssets}
          element={
            <LazyRoute label="Loading organization assets...">
              <AssetLifecycleAdmin />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.organizationIntelligence}
          element={
            <LazyRoute label="Loading organization intelligence...">
              <OrganizationIntelligenceProfile />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.workflowMining}
          element={
            <LazyRoute label="Loading workflow mining...">
              <WorkflowMiningEnginePage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.workspaceDependencyGraph}
          element={
            <LazyRoute label="Loading workspace dependency graph...">
              <WorkspaceDependencyGraphPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.digitalTwin}
          element={
            <LazyRoute label="Loading digital twin...">
              <DigitalTwinPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.digitalTwinIntelligence}
          element={
            <LazyRoute label="Loading digital twin intelligence...">
              <DigitalTwinIntelligence />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.surveillanceNexus}
          element={
            <LazyRoute label="Loading surveillance nexus...">
              <SurveillanceNexusDashboard />
            </LazyRoute>
          }
        />
        <Route path="/surveillance" element={<Navigate to={CANONICAL_ROUTES.surveillanceNexus} replace />} />
        <Route
          path={CANONICAL_ROUTES.hospitalMap}
          element={
            <LazyRoute label="Loading hospital map...">
              <HospitalMapDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.medicalIot}
          element={
            <LazyRoute label="Loading medical IoT...">
              <MedicalIotDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.devices}
          element={
            <LazyRoute label="Loading device fleet...">
              <DeviceFleetManagement />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.liveMap}
          element={
            <LazyRoute label="Loading live map...">
              <LiveTrackingMap />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.operations}
          element={
            <LazyRoute label="Loading operations center...">
              <DigitalOperationsCenter />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.fleetCommand}
          element={
            <LazyRoute label="Loading fleet command...">
              <FleetDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.fleetMap}
          element={
            <LazyRoute label="Loading fleet map...">
              <FleetLiveMap />
            </LazyRoute>
          }
        />
        <Route
          path="/fleet/route-optimizer"
          element={
            <LazyRoute label="Loading route optimizer...">
              <RouteOptimizer />
            </LazyRoute>
          }
        />
        <Route
          path="/fleet/predictive-maintenance"
          element={
            <LazyRoute label="Loading predictive maintenance...">
              <PredictiveMaintenance />
            </LazyRoute>
          }
        />
        <Route path="/fleet" element={<Navigate to={CANONICAL_ROUTES.fleetCommand} replace />} />
        <Route
          path={CANONICAL_ROUTES.workflows}
          element={
            <LazyRoute label="Loading workflows...">
              <WorkflowBuilderPage />
            </LazyRoute>
          }
        />
        <Route path={CANONICAL_ROUTES.automation} element={<Navigate to={CANONICAL_ROUTES.workflows} replace />} />
        <Route
          path={CANONICAL_ROUTES.automationAnalytics}
          element={
            <LazyRoute label="Loading automation analytics...">
              <AutomationAnalytics />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.platformAnalytics}
          element={
            <LazyRoute label="Loading platform analytics...">
              <PlatformAnalyticsPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.configurationStudio}
          element={
            <LazyRoute label="Loading configuration studio...">
              <ConfigurationStudioPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.protocols}
          element={
            <LazyRoute label="Loading protocols...">
              <Protocols />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.clinicalDecisionSupport}
          element={
            <LazyRoute label="Loading clinical decision support...">
              <ClinicalDecisionSupport />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.documentation}
          element={
            <LazyRoute label="Loading clinical documentation...">
              <ClinicalDocumentationAssistant />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.knowledgeGraph}
          element={
            <LazyRoute label="Loading knowledge graph...">
              <ClinicalKnowledgeGraph />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.predictiveAnalytics}
          element={
            <LazyRoute label="Loading predictive analytics...">
              <PredictiveAnalyticsDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.research}
          element={
            <LazyRoute label="Loading research evidence hub...">
              <ResearchEvidenceHub />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.laboratory}
          element={
            <LazyRoute label="Loading laboratory dashboard...">
              <LaboratoryDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.developerCatalog}
          element={
            <LazyRoute label="Loading developer catalog...">
              <ClinicalToolCatalog />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.medical3dViewer}
          element={
            <LazyRoute label="Loading 3D viewer...">
              <Medical3DViewer />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.simulation}
          element={
            <LazyRoute label="Loading simulation suite...">
              <MedicalSimulationSuite />
            </LazyRoute>
          }
        />
        <Route
          path={`${CANONICAL_ROUTES.simulation}/:scenarioId`}
          element={
            <LazyRoute label="Loading simulation scenario...">
              <SimulationScenarioPlayer />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.simulationOutcomes}
          element={
            <LazyRoute label="Loading simulation outcomes...">
              <SimulationOutcomes />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.competencies}
          element={
            <LazyRoute label="Loading competencies...">
              <Competencies />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.credentials}
          element={
            <LazyRoute label="Loading credentials...">
              <Credentials />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.onboarding}
          element={
            <LazyRoute label="Loading onboarding...">
              <OrganizationOnboardingPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.systemHealth}
          element={
            <LazyRoute label="Loading system health...">
              <SystemHealth />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.saasHealth}
          element={
            <LazyRoute label="Loading SaaS health...">
              <SaasHealthCenter />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.featureFlags}
          element={
            <LazyRoute label="Loading feature flags...">
              <FeatureFlagCenter />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.plugins}
          element={
            <LazyRoute label="Loading plugins...">
              <PluginMarketplace />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.dependencyMap}
          element={
            <LazyRoute label="Loading dependency map...">
              <DependencyMap />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.governanceRegistry}
          element={
            <LazyRoute label="Loading governance registry...">
              <GovernanceRegistry />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.dependencyGraph}
          element={
            <LazyRoute label="Loading dependency graph...">
              <DependencyGraph />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.audit}
          element={
            <LazyRoute label="Loading audit trail...">
              <AutomationAuditTrail />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.automationAudit}
          element={
            <LazyRoute label="Loading automation audit...">
              <AutomationAuditTrail />
            </LazyRoute>
          }
        />
        <Route path="/audit-logs" element={<Navigate to={CANONICAL_ROUTES.audit} replace />} />
        <Route
          path={CANONICAL_ROUTES.dataLineage}
          element={
            <LazyRoute label="Loading data lineage...">
              <DataLineageExplorer />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.selfDiagnostics}
          element={
            <LazyRoute label="Loading self diagnostics...">
              <PlatformSelfDiagnostics />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.platformLearningEngine}
          element={
            <LazyRoute label="Loading platform learning engine...">
              <PlatformLearningEngine />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.brain}
          element={
            <LazyRoute label="Loading CareDroid brain...">
              <CareDroidBrainDashboard />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.businessBrain}
          element={
            <LazyRoute label="Loading business brain...">
              <CareDroidBusinessBrainPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.aiModels}
          element={
            <LazyRoute label="Loading AI models...">
              <AiModelsPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.aiEvaluation}
          element={
            <LazyRoute label="Loading AI evaluation...">
              <AiEvaluationDashboard />
            </LazyRoute>
          }
        />
        <Route path="/ai/evaluation" element={<Navigate to={CANONICAL_ROUTES.aiEvaluation} replace />} />
        <Route
          path={CANONICAL_ROUTES.aiGovernance}
          element={
            <LazyRoute label="Loading AI governance...">
              <AIGovernanceDashboard />
            </LazyRoute>
          }
        />
        <Route path={CANONICAL_ROUTES.security} element={<Navigate to={CANONICAL_ROUTES.aiGovernance} replace />} />
        <Route path={CANONICAL_ROUTES.regulatory} element={<Navigate to={CANONICAL_ROUTES.aiGovernance} replace />} />
        <Route
          path={CANONICAL_ROUTES.assets}
          element={
            <LazyRoute label="Loading assets...">
              <AssetLibraryPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.artifacts}
          element={
            <LazyRoute label="Loading artifacts...">
              <Artifacts />
            </LazyRoute>
          }
        />
        <Route path="/platform-learning" element={<Navigate to={CANONICAL_ROUTES.platformLearningEngine} replace />} />
        <Route
          path="/team"
          element={
            <LazyRoute label="Loading team management...">
              <TeamManagement />
            </LazyRoute>
          }
        />
        {NON_ED_WORKSPACE_REDIRECT_ROUTES.map(({ path, moduleName }) => (
          <Route
            key={`${path}-${moduleName}`}
            path={path}
            element={<NonEmergencyWorkspaceRedirect />}
          />
        ))}
      </Route>
      <Route path="/tools" element={<ToolsRedirect />} />
      <Route path="/tools/*" element={<ToolsRedirect />} />
      <Route path="/calculators" element={<ToolsRedirect />} />
      <Route path="/calculators/*" element={<ToolsRedirect />} />
      <Route path="/scores" element={<ToolsRedirect />} />
      <Route path="/scores/*" element={<ToolsRedirect />} />
      <Route path="/catalog" element={<ToolsRedirect />} />
      <Route path="/all-tools" element={<ToolsRedirect />} />
      <Route path="/clinical-tools" element={<ToolsRedirect />} />
      <Route path="/lab" element={<ToolsRedirect />} />
      <Route path="/medical-simulation" element={<ToolsRedirect />} />
      <Route path="/maps" element={<Navigate to={CANONICAL_ROUTES.liveMap} replace />} />
      <Route path="/tracking" element={<Navigate to={CANONICAL_ROUTES.liveMap} replace />} />
      <Route path="/live-tracking" element={<Navigate to={CANONICAL_ROUTES.liveMap} replace />} />
      <Route path="/operations-center" element={<Navigate to={CANONICAL_ROUTES.operations} replace />} />
      <Route path="/vehicle" element={<Navigate to={CANONICAL_ROUTES.fleetCommand} replace />} />
      <Route path="/vehicle/*" element={<Navigate to={CANONICAL_ROUTES.fleetCommand} replace />} />
      <Route path="/pharmacy" element={<ToolsRedirect />} />
      <Route path="/pharmacy/*" element={<ToolsRedirect />} />
      <Route path="/radiology" element={<ToolsRedirect />} />
      <Route path="/radiology/*" element={<ToolsRedirect />} />
      <Route path="/recommendations" element={<ToolsRedirect />} />
      {LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (
        <Route key={`${path}-${to}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
      ))}
      <Route path="/dashboard" element={<EmergencyDefaultRedirect />} />
      <Route path="/home" element={<EmergencyDefaultRedirect />} />
      <Route path="/app" element={<Navigate to={CANONICAL_ROUTES.workspace} replace />} />
      <Route path="/mobile" element={<EmergencyDefaultRedirect />} />
      <Route path="/mobile/*" element={<EmergencyDefaultRedirect />} />
      <Route path="/android" element={<EmergencyDefaultRedirect />} />
      <Route path="/android/*" element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare" element={<EmergencyDefaultRedirect />} />
      <Route path="/general-healthcare/*" element={<EmergencyDefaultRedirect />} />
      <Route
        path="/assistant"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />}
      />
      <Route
        path="/chat"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />}
      />
      <Route
        path="/ai"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />}
      />
      <Route
        path="/copilot"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.emergencyCopilot} />}
      />
      <Route
        path="/ai/command-center"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.aiCommandCenter} />}
      />
      <Route
        path="/ai-command"
        element={<EmergencyAliasRedirect to={CANONICAL_ROUTES.aiCommandCenter} />}
      />
      <Route path="/emergency/*" element={<EmergencyDefaultRedirect />} />
      <Route path="*" element={<EmergencyDefaultRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <WorkspaceProvider>
              <CostTrackingProvider>
                <ToolPreferencesProvider>
                  <TenantContextProvider>
                    <UserIdentityProvider>
                      <OrganizationContextProvider>
                        <WhiteLabelProvider>
                          <ConversationProvider>
                            <SystemConfigProvider>
                              <OfflineProvider>
                                <BrowserRouter>
                                  <AppRoutes />
                                </BrowserRouter>
                              </OfflineProvider>
                            </SystemConfigProvider>
                          </ConversationProvider>
                        </WhiteLabelProvider>
                      </OrganizationContextProvider>
                    </UserIdentityProvider>
                  </TenantContextProvider>
                </ToolPreferencesProvider>
              </CostTrackingProvider>
            </WorkspaceProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
