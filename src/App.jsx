import { lazy, Suspense, useEffect, useMemo } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
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
import { UserIdentityProvider } from './contexts/UserIdentityContext';
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
const EmergencyAnalytics = lazy(() => import('./pages/emergency/EmergencyAnalytics'));
const EmergencySettings = lazy(() => import('./pages/emergency/EmergencySettings'));
const EMSPipeline = lazy(() => import('./components/EMSPipeline'));
const ToolsOverview = lazy(() => import('./pages/tools/ToolsOverview'));
const ClinicalToolCatalog = lazy(() => import('./pages/tools/ClinicalToolCatalog'));
const PlatformNavigationPage = lazy(() => import('./pages/PlatformNavigationPage'));
const Auth = lazy(() => import('./pages/Auth'));
const ExecutiveCommandCenter = lazy(() => import('./pages/ExecutiveCommandCenter'));
const DigitalTwinIntelligence = lazy(() => import('./pages/DigitalTwinIntelligence'));
const SuccessCenterPage = lazy(() => import('./pages/success-center/SuccessCenterPage'));
const LaboratoryDashboard = lazy(() => import('./pages/LaboratoryDashboard'));
const SimulationScenarioPlayer = lazy(() => import('./pages/SimulationScenarioPlayer'));
const AutomationAnalytics = lazy(() => import('./pages/AutomationAnalytics'));
const FeatureFlagCenter = lazy(() => import('./pages/FeatureFlagCenter'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const TeamManagement = lazy(() => import('./pages/team/TeamManagement'));
const ClinicalDocumentationAssistant = lazy(() => import('./pages/ClinicalDocumentationAssistant'));
const ClinicalKnowledgeGraph = lazy(() => import('./pages/ClinicalKnowledgeGraph'));
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
const TwoFactorSetup = lazy(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = lazy(() => import('./pages/BiometricSetup'));
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
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const SharedToolSession = lazy(() => import('./pages/tools/SharedToolSession'));
const EmergencyDepartmentPulse = lazy(() => import('./pages/emergency/pulse'));
const EmergencyShiftSummary = lazy(() => import('./pages/emergency/shift'));
import PatientCard from './components/PatientCard';
const ReferralPanel = lazy(() => import('./components/ReferralPanel'));
import { useEmergencyStore } from './store/emergencyStore';
import { PatientFlag, PatientState } from './types/emergency';
import {
  CANONICAL_ROUTES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  NON_ED_WORKSPACE_REDIRECT_ROUTES,
} from './config/routes.config';
import { resolveRegistryId } from './data/clinicalCatalogWiring';
import { EMERGENCY_OS_BRANDING } from './config/emergencyOsBranding.config';
import { useEmergencyRolePermissions } from './hooks/useEmergencyRolePermissions';
import {
  useBoardingStatus,
  useCapacityStatus,
  useEDCopilot,
  useEmergencyPatients,
  useEmergencyQueues,
  useUpgradeHarnessAuditSummary,
  useUpgradeHarnessCapacity,
  useUpgradeHarnessClinicalIntelligence,
  usePatientJourney,
  useReassessmentQueue,
} from './hooks/useEmergencyOs';

const emergencyRouteStyles = {
  page: {
    minHeight: '100%',
    display: 'grid',
    alignContent: 'start',
    gap: 'var(--space-4, 16px)',
    padding: 'var(--space-4, 16px)',
    background: 'var(--color-background, #0A0E1A)',
    color: 'var(--color-text-primary, #F9FAFB)',
  },
  hero: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 'var(--space-4, 16px)',
    border: '1px solid var(--color-border-subtle, #1F2937)',
    borderRadius: 'var(--radius-xl, 16px)',
    background: 'var(--color-card, #172033)',
    padding: 'var(--space-4, 16px)',
    boxShadow: 'none',
  },
  eyebrow: {
    color: 'var(--status-info, #60A5FA)',
    fontSize: 'var(--font-size-xs, 12px)',
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  title: {
    margin: 'var(--space-1, 4px) 0 0',
    color: 'var(--color-text-primary, #F9FAFB)',
    fontSize: 'var(--font-size-2xl, 24px)',
    lineHeight: 1.05,
  },
  description: {
    color: 'var(--color-text-secondary, #9CA3AF)',
    fontSize: 'var(--font-size-sm, 14px)',
    margin: 'var(--space-1, 4px) 0 0',
    maxWidth: 860,
  },
  card: {
    border: '1px solid var(--color-border-subtle, #1F2937)',
    borderRadius: 'var(--radius-lg, 12px)',
    background: 'var(--color-surface, #111827)',
  },
  muted: {
    color: 'var(--color-text-muted, #6B7280)',
  },
};

function EmergencyRoutePage({ eyebrow, title, description, children, actions }) {
  return (
    <section style={emergencyRouteStyles.page}>
      <header style={emergencyRouteStyles.hero}>
        <div>
          {eyebrow ? <span style={emergencyRouteStyles.eyebrow}>{eyebrow}</span> : null}
          <h1 style={emergencyRouteStyles.title}>{title}</h1>
          {description ? <p style={emergencyRouteStyles.description}>{description}</p> : null}
        </div>
        {actions ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

function RouteLoadingFallback({ label = 'Loading Emergency OS module...' }) {
  return (
    <div role="status" style={{ padding: 24, color: '#9CA3AF' }}>
      {label}
    </div>
  );
}

function LazyRoute({ children, label }) {
  return <Suspense fallback={<RouteLoadingFallback label={label} />}>{children}</Suspense>;
}

function AuthRoute() {
  const navigate = useNavigate();
  const { setAuthToken, setUser } = useUser();

  const handleAuthSuccess = (accessToken, user) => {
    if (user) setUser(user);
    if (accessToken) setAuthToken(accessToken);
    navigate(CANONICAL_ROUTES.emergencyWhiteboard, { replace: true });
  };

  return (
    <LazyRoute label="Loading sign-in...">
      <Auth onAuthSuccess={handleAuthSuccess} />
    </LazyRoute>
  );
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
        <h1 style={{ margin: '6px 0 0', fontSize: 22 }}>Emergency OS page unavailable</h1>
        <p style={{ color: '#9CA3AF', lineHeight: 1.5 }}>
          {emergencyRole.roleLabel} does not have access to this Emergency OS page.
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
          Go to permitted Emergency OS page
        </Link>
      </div>
    </section>
  );
}

function EmergencyRouteGuard({ path, children }) {
  const emergencyRole = useEmergencyRolePermissions();
  if (!emergencyRole.canAccessRoute(path)) {
    return <EmergencyAccessDenied requestedPath={path} />;
  }
  return children;
}

function EmergencyDefaultRedirect() {
  const emergencyRole = useEmergencyRolePermissions();
  return (
    <Navigate
      to={
        emergencyRole.canAccessRoute(CANONICAL_ROUTES.emergencyWhiteboard)
          ? CANONICAL_ROUTES.emergencyWhiteboard
          : emergencyRole.defaultRoute ||
            emergencyRole.allowedRoutes[0] ||
            CANONICAL_ROUTES.emergencyWhiteboard
      }
      replace
    />
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

function MetricGrid({ metrics }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      {metrics.map((metric) => (
        <article
          key={metric.label}
          style={{
            ...emergencyRouteStyles.card,
            display: 'grid',
            gap: 6,
            minWidth: 0,
            padding: 'var(--space-3, 12px)',
          }}
        >
          <strong
            style={{
              display: 'block',
              color: metric.color || 'var(--color-text-primary, #F9FAFB)',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 28,
              lineHeight: 1,
            }}
          >
            {metric.value}
          </strong>
          <span
            style={{
              display: 'block',
              color: 'var(--color-text-secondary, #9CA3AF)',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {metric.label}
          </span>
        </article>
      ))}
    </div>
  );
}

function PatientGrid({ patients, emptyMessage }) {
  if (!patients.length) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          borderStyle: 'dashed',
          color: 'var(--color-text-muted, #9CA3AF)',
          padding: 'var(--space-6, 24px)',
          textAlign: 'center',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
        gap: 10,
      }}
    >
      {patients.map((patient) => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </div>
  );
}

function dataFreshness(generatedAt) {
  if (!generatedAt) {
    return {
      label: 'latest local state',
      stale: false,
    };
  }

  const timestamp = new Date(generatedAt).getTime();
  if (!Number.isFinite(timestamp)) {
    return {
      label: 'latest local state',
      stale: false,
    };
  }

  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  const timeLabel = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (elapsedMinutes < 1) {
    return {
      label: `updated now at ${timeLabel}`,
      stale: false,
    };
  }

  return {
    label: `updated ${elapsedMinutes < 60 ? `${elapsedMinutes}m ago` : `${Math.round(elapsedMinutes / 60)}h ago`} at ${timeLabel}`,
    stale: elapsedMinutes >= 5,
  };
}

function ApiStateBanner({
  moduleState,
  fallbackText = 'Showing the last local Emergency OS state. Verify against the current department record before operational decisions.',
}) {
  if (moduleState.loading && !moduleState.data) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          color: 'var(--color-text-secondary, #9CA3AF)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        Loading department data...
      </div>
    );
  }

  if (moduleState.error) {
    return (
      <div
        role="alert"
        style={{
          border: '1px solid color-mix(in srgb, var(--status-critical, #EF4444) 54%, var(--color-border-default, #7F1D1D))',
          borderRadius: 'var(--radius-lg, 12px)',
          background: 'color-mix(in srgb, var(--status-critical, #EF4444) 12%, var(--color-surface, #111827))',
          color: 'var(--status-critical, #FCA5A5)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        {moduleState.error}. {fallbackText}
      </div>
    );
  }

  if (moduleState.isEmpty) {
    return (
      <div
        role="status"
        style={{
          ...emergencyRouteStyles.card,
          borderStyle: 'dashed',
          color: 'var(--color-text-muted, #9CA3AF)',
          padding: 'var(--space-3, 12px)',
        }}
      >
        No active records are available for this module yet. Add or load department data before using this view for handoff decisions.
      </div>
    );
  }

  return null;
}

function DataSourceNote({ moduleState }) {
  const generatedAt = moduleState.data?.generatedAt;
  const source = moduleState.data?.source;
  const freshness = dataFreshness(generatedAt);
  const sourceLabel =
    !source || /fallback|demo|fixture|first-customer/i.test(source)
      ? 'walkthrough/local dataset - no live hospital integration'
      : source === 'backend'
        ? 'live Emergency OS feed'
        : source;
  return (
    <div
      role="status"
      title={freshness.stale ? 'Data may be stale. Validate against current department state.' : undefined}
      style={{
        color: freshness.stale
          ? 'var(--status-warning, #F59E0B)'
          : 'var(--color-text-muted, #6B7280)',
        fontSize: 12,
      }}
    >
      Source: {sourceLabel} | {freshness.label}
      {freshness.stale ? ' | validate before operational decisions' : ''}
    </div>
  );
}

function isHighRisk(patient) {
  return (
    patient.priority === 'P1' ||
    patient.priority === 'P2' ||
    patient.flags.includes(PatientFlag.HighRisk) ||
    patient.flags.includes(PatientFlag.DeteriorationRisk) ||
    patient.flags.includes(PatientFlag.SepsisAlert)
  );
}

function isBoarding(patient) {
  return (
    patient.state === PatientState.Admission || patient.flags.includes(PatientFlag.PendingAdmission)
  );
}

function displayPatientName(patient) {
  return `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || patient.name || patient.mrn;
}

const REASSESSMENT_ATTENTION_FLAGS = [
  PatientFlag.DeteriorationRisk,
  PatientFlag.SepsisAlert,
  PatientFlag.HighRisk,
  PatientFlag.ReassessmentDue,
];

const QUEUE_MOVEMENT_STAGES = Object.freeze({
  Arrival: ['Arrival'],
  Registration: ['Arrival'],
  Triage: ['Triage'],
  Waiting: ['Waiting'],
  Assessment: ['Assessment'],
  Orders: ['Assessment'],
  Results: ['Results'],
  Admission: ['Admission'],
  Boarding: ['Admission'],
  Referral: ['Disposition', 'Admission'],
  Discharge: ['Disposition', 'Discharge'],
  Reassessment: ['Waiting', 'Assessment', 'Results', 'Disposition'],
});

function needsReassessmentAttention(patient) {
  return REASSESSMENT_ATTENTION_FLAGS.some((flag) => patient.flags.includes(flag));
}

function findUpgradeSignal(signals = [], capability) {
  return signals.find((signal) => signal.capability === capability) || null;
}

function PatientsRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storePatients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const patientsModule = useEmergencyPatients();
  const journeyModule = usePatientJourney();
  const patients = patientsModule.data?.data?.patients || storePatients;
  const patientIdParam = searchParams.get('patientId') || '';
  const patientSearchParam = searchParams.get('patientSearch') || '';
  const query = searchParams.get('q') || patientSearchParam || '';
  const requestedPatient = useMemo(
    () => (patientIdParam ? patients.find((patient) => patient.id === patientIdParam) || null : null),
    [patientIdParam, patients],
  );
  const journeyData = journeyModule.data?.data || {};
  const journeyStateCounts = journeyData.stateCounts || patients.reduce((counts, patient) => {
    counts[patient.state] = (counts[patient.state] || 0) + 1;
    return counts;
  }, {});
  const journeyEvents = Array.isArray(journeyData.events)
    ? journeyData.events
    : patients.flatMap((patient) => patient.timeline || []);
  const visibleJourneyStates = Object.entries(journeyStateCounts)
    .filter(([, count]) => Number(count) > 0)
    .slice(0, 6);
  const visiblePatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return requestedPatient
        ? [requestedPatient, ...patients.filter((patient) => patient.id !== requestedPatient.id)]
        : patients;
    }
    return patients.filter((patient) =>
      [
        patient.firstName,
        patient.lastName,
        patient.name,
        patient.mrn,
        patient.chiefComplaint,
        patient.complaint,
        patient.state,
        patient.priority,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [patients, query, requestedPatient]);

  useEffect(() => {
    if (requestedPatient?.id) selectPatient(requestedPatient.id);
  }, [requestedPatient?.id, selectPatient]);

  const updateQuery = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value.trim()) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <EmergencyRoutePage
      eyebrow="Patients"
      title="Emergency Patients"
      description="Find active patients, search by name or MRN, and open a patient card for next steps."
      actions={
        <label
          style={{
            display: 'grid',
            gap: 4,
            minWidth: 260,
            color: 'var(--color-text-secondary, #9CA3AF)',
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Search patients
          <input
            type="search"
            value={query}
            placeholder="Name, MRN, complaint..."
            onChange={(event) => updateQuery(event.target.value)}
            style={{
              minHeight: 38,
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 'var(--radius-md, 10px)',
              background: 'var(--color-elevated, #0B1120)',
              color: 'var(--color-text-primary, #F9FAFB)',
              font: 'inherit',
              fontSize: 13,
              padding: '0 12px',
              textTransform: 'none',
            }}
          />
        </label>
      }
    >
      <ApiStateBanner moduleState={patientsModule} />
      <MetricGrid
        metrics={[
          { label: 'Total patients', value: patients.length, color: '#60A5FA' },
          { label: 'High risk', value: patients.filter(isHighRisk).length, color: '#EF4444' },
          {
            label: 'Waiting',
            value: patients.filter((patient) => patient.state === PatientState.Waiting).length,
            color: '#F59E0B',
          },
        ]}
      />
      <ApiStateBanner
        moduleState={journeyModule}
        fallbackText="Patient Journey endpoint is unavailable; patient cards remain available."
      />
      <article
        aria-label="Patient Journey backend status"
        style={{
          ...emergencyRouteStyles.card,
          display: 'grid',
          gap: 10,
          padding: 'var(--space-3, 12px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ color: 'var(--color-text-primary, #F9FAFB)' }}>
              Patient Journey Engine
            </strong>
            <p style={{ margin: '4px 0 0', color: 'var(--color-text-secondary, #9CA3AF)', fontSize: 13 }}>
              Backend state-count and timeline-event envelope rendered through the active Patients route.
            </p>
          </div>
          <span
            style={{
              borderRadius: 999,
              background: 'var(--color-elevated, #0B1120)',
              color: '#BFDBFE',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 12,
              fontWeight: 900,
              padding: '6px 10px',
              whiteSpace: 'nowrap',
            }}
          >
            {journeyEvents.length} events
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {visibleJourneyStates.length ? (
            visibleJourneyStates.map(([state, count]) => (
              <span
                key={state}
                style={{
                  border: '1px solid var(--color-border-subtle, #1F2937)',
                  borderRadius: 999,
                  color: 'var(--color-text-secondary, #9CA3AF)',
                  fontSize: 12,
                  fontWeight: 800,
                  padding: '5px 9px',
                }}
              >
                {state}: {count}
              </span>
            ))
          ) : (
            <span style={{ color: 'var(--color-text-muted, #6B7280)', fontSize: 13 }}>
              No active journey state counts yet.
            </span>
          )}
        </div>
      </article>
      <PatientGrid
        patients={visiblePatients}
        emptyMessage={
          query
            ? 'No patients match the current search. Clear the search to return to the active board.'
            : 'No active patients are currently on the board.'
        }
      />
      <DataSourceNote moduleState={patientsModule} />
    </EmergencyRoutePage>
  );
}

function QueueRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const activeQueueFilter = useEmergencyStore((state) => state.activeQueueFilter);
  const setActiveQueueFilter = useEmergencyStore((state) => state.setActiveQueueFilter);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const queues = useEmergencyQueues();
  const requestedQueueFilter =
    searchParams.get('queue') || searchParams.get('filter') || searchParams.get('queueFilter') || '';
  const effectiveQueueFilter = activeQueueFilter || requestedQueueFilter;
  const pendingReferralPatientIds = useMemo(
    () =>
      new Set(
        referrals
          .filter((referral) => !['Closed', 'Completed', 'Declined', 'PatientDeparted'].includes(referral.status))
          .map((referral) => referral.patientId),
      ),
    [referrals],
  );
  const queueRows = useMemo(
    () => [
      {
        label: 'Waiting',
        patients: patients.filter((patient) => patient.state === PatientState.Waiting),
        target: 30,
        movementStages: QUEUE_MOVEMENT_STAGES.Waiting,
      },
      {
        label: 'Triage',
        patients: patients.filter((patient) => patient.state === PatientState.Triage),
        target: 10,
        movementStages: QUEUE_MOVEMENT_STAGES.Triage,
      },
      {
        label: 'Assessment',
        patients: patients.filter((patient) => patient.state === PatientState.Assessment),
        target: 45,
        movementStages: QUEUE_MOVEMENT_STAGES.Assessment,
      },
      {
        label: 'Orders',
        patients: patients.filter((patient) => patient.state === PatientState.Orders),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Orders,
      },
      {
        label: 'Results',
        patients: patients.filter((patient) => patient.state === PatientState.Results),
        target: 90,
        movementStages: QUEUE_MOVEMENT_STAGES.Results,
      },
      {
        label: 'Admission',
        patients: patients.filter((patient) => patient.state === PatientState.Admission),
        target: 120,
        movementStages: QUEUE_MOVEMENT_STAGES.Admission,
      },
      {
        label: 'Referral',
        patients: patients.filter((patient) => pendingReferralPatientIds.has(patient.id)),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Referral,
      },
      {
        label: 'Discharge',
        patients: patients.filter((patient) => patient.state === PatientState.Disposition),
        target: 60,
        movementStages: QUEUE_MOVEMENT_STAGES.Discharge,
      },
      {
        label: 'Reassessment',
        patients: patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)),
        target: 30,
        movementStages: QUEUE_MOVEMENT_STAGES.Reassessment,
      },
    ],
    [patients, pendingReferralPatientIds],
  );
  const apiQueueRows = queues.data?.data?.queues;
  const visibleQueueRows = useMemo(() => {
    if (!apiQueueRows?.length) return queueRows;
    const apiLabels = new Set(apiQueueRows.map((queue) => String(queue.label).toLowerCase()));
    const supplementalJourneyQueues = queueRows.filter(
      (queue) => !apiLabels.has(String(queue.label).toLowerCase()),
    );
    return [...apiQueueRows, ...supplementalJourneyQueues];
  }, [apiQueueRows, queueRows]);
  useEffect(() => {
    if (requestedQueueFilter && requestedQueueFilter !== activeQueueFilter) {
      setActiveQueueFilter(requestedQueueFilter);
    }
  }, [activeQueueFilter, requestedQueueFilter, setActiveQueueFilter]);

  const clearQueueFilter = () => {
    setActiveQueueFilter(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('queue');
    nextParams.delete('filter');
    nextParams.delete('queueFilter');
    setSearchParams(nextParams, { replace: true });
  };

  const activeFilterKey = String(effectiveQueueFilter || '').trim().toLowerCase();
  const filteredQueueRows = useMemo(() => {
    if (!activeFilterKey) return visibleQueueRows;
    const exactMatches = visibleQueueRows.filter(
      (queue) => String(queue.label || queue.type || '').toLowerCase() === activeFilterKey,
    );
    return exactMatches.length ? exactMatches : visibleQueueRows;
  }, [activeFilterKey, visibleQueueRows]);
  const queueMetrics = useMemo(() => {
    const totalQueued = filteredQueueRows.reduce(
      (total, queue) => total + (queue.count ?? queue.patients?.length ?? 0),
      0,
    );
    const breachedQueues = filteredQueueRows.filter((queue) => {
      const patientsInQueue = queue.patients || [];
      const oldestWait =
        queue.oldestWaitMinutes ??
        patientsInQueue.reduce((max, patient) => {
          const arrivedAt = new Date(patient.arrivalTime).getTime();
          if (!Number.isFinite(arrivedAt)) return max;
          return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
        }, 0);
      const target = queue.targetMinutes ?? queue.target ?? 0;
      return queue.breached ?? oldestWait > target;
    }).length;
    return { totalQueued, breachedQueues };
  }, [filteredQueueRows]);

  return (
    <EmergencyRoutePage
      eyebrow="Operations"
      title="Queues"
      description="See who is waiting, which queues need attention, and where the next handoff is blocked."
    >
      <ApiStateBanner moduleState={queues} />
      <MetricGrid
        metrics={[
          { label: 'Total queued', value: queueMetrics.totalQueued, color: '#60A5FA' },
          {
            label: 'Breached queues',
            value: queueMetrics.breachedQueues,
            color: queueMetrics.breachedQueues ? '#EF4444' : '#10B981',
          },
          {
            label: effectiveQueueFilter ? 'Filtered queue' : 'Tracked queues',
            value: effectiveQueueFilter || visibleQueueRows.length,
          },
        ]}
      />
      {effectiveQueueFilter ? (
        <div
          role="status"
          style={{
            ...emergencyRouteStyles.card,
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
            padding: 'var(--space-3, 12px)',
          }}
        >
          <span style={{ color: '#BFDBFE', fontSize: 13, fontWeight: 800 }}>
            Showing the {effectiveQueueFilter} queue requested from the whiteboard.
          </span>
          <button
            type="button"
            onClick={clearQueueFilter}
            style={{
              border: '1px solid var(--color-border-subtle, #1F2937)',
              borderRadius: 999,
              background: 'transparent',
              color: 'var(--color-text-primary, #F9FAFB)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 800,
              padding: '6px 10px',
            }}
          >
            Clear queue filter
          </button>
        </div>
      ) : null}
      <div style={{ display: 'grid', gap: 'var(--space-3, 12px)' }}>
        {filteredQueueRows.map((queue) => {
          const patientsInQueue = queue.patients || [];
          const movementStages =
            queue.movementStages ||
            QUEUE_MOVEMENT_STAGES[queue.label] ||
            QUEUE_MOVEMENT_STAGES[queue.type] ||
            [];
          const oldestWait =
            queue.oldestWaitMinutes ??
            patientsInQueue.reduce((max, patient) => {
              const arrivedAt = new Date(patient.arrivalTime).getTime();
              if (!Number.isFinite(arrivedAt)) return max;
              return Math.max(max, Math.round((Date.now() - arrivedAt) / 60000));
            }, 0);
          const target = queue.targetMinutes ?? queue.target;
          const breached = queue.breached ?? oldestWait > target;
          return (
            <article
              key={queue.label}
              style={{
                ...emergencyRouteStyles.card,
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: 12,
                alignItems: 'center',
                borderLeft: `4px solid ${breached ? '#EF4444' : '#60A5FA'}`,
                padding: 'var(--space-3, 12px)',
              }}
            >
              <div>
                <strong style={{ color: 'var(--color-text-primary, #F9FAFB)' }}>{queue.label}</strong>
                <div
                  aria-label={`${queue.label} queue patients`}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    margin: '6px 0 0',
                    color: 'var(--color-text-secondary, #9CA3AF)',
                    fontSize: 13,
                  }}
                >
                  {patientsInQueue.length ? (
                    patientsInQueue.slice(0, 3).map((patient) => (
                      <button
                        key={patient.id}
                        type="button"
                        onClick={() => selectPatient(patient.id)}
                        style={{
                          border: '1px solid var(--color-border-subtle, #1F2937)',
                          borderRadius: 999,
                          background: 'var(--color-elevated, #0B1120)',
                          color: 'var(--color-text-primary, #F9FAFB)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: 800,
                          padding: '4px 8px',
                        }}
                      >
                        {displayPatientName(patient)}
                      </button>
                    ))
                  ) : (
                    'Queue clear'
                  )}
                </div>
                {movementStages.length ? (
                  <small style={{ color: '#BFDBFE', display: 'block', fontSize: 12, fontWeight: 800, marginTop: 4 }}>
                    Movement stage: {movementStages.join(' / ')}
                  </small>
                ) : null}
              </div>
              <strong
                style={{
                  borderRadius: 999,
                  background: 'var(--color-elevated, #0B1120)',
                  color: 'var(--color-text-primary, #F9FAFB)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  padding: '5px 10px',
                }}
              >
                {queue.count ?? patientsInQueue.length}
              </strong>
              <span style={{ color: breached ? '#EF4444' : '#10B981', fontSize: 12, fontWeight: 900 }}>
                Oldest {oldestWait}m
              </span>
            </article>
          );
        })}
      </div>
      <DataSourceNote moduleState={queues} />
    </EmergencyRoutePage>
  );
}

function ReassessmentRoute() {
  const [searchParams] = useSearchParams();
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const reassessment = useReassessmentQueue();
  const patientIdParam = searchParams.get('patientId') || '';
  const requestedPatient = useMemo(
    () => (patientIdParam ? patients.find((patient) => patient.id === patientIdParam) || null : null),
    [patientIdParam, patients],
  );
  const duePatients = useMemo(() => {
    const byId = new Map();
    for (const patient of reassessment.data?.data?.patients || []) {
      byId.set(patient.id, patient);
    }
    for (const patient of patients.filter(needsReassessmentAttention)) {
      byId.set(patient.id, patient);
    }
    return [...byId.values()];
  }, [patients, reassessment.data]);
  const prioritizedDuePatients = useMemo(() => {
    if (!requestedPatient || !duePatients.some((patient) => patient.id === requestedPatient.id)) {
      return duePatients;
    }
    return [requestedPatient, ...duePatients.filter((patient) => patient.id !== requestedPatient.id)];
  }, [duePatients, requestedPatient]);
  const overdueCount = Math.max(
    reassessment.data?.data?.overdueCount ?? 0,
    patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
  );

  useEffect(() => {
    if (requestedPatient?.id) selectPatient(requestedPatient.id);
  }, [requestedPatient?.id, selectPatient]);

  return (
    <EmergencyRoutePage
      eyebrow="Safety"
      title="Reassessment"
      description="Patients due for another look. Open a patient card to review details and update the plan."
    >
      <ApiStateBanner moduleState={reassessment} />
      <MetricGrid
        metrics={[
          {
            label: 'Due now',
            value: prioritizedDuePatients.length,
            color: prioritizedDuePatients.length ? '#F59E0B' : '#10B981',
          },
          { label: 'Overdue', value: overdueCount, color: '#EF4444' },
          { label: 'Next action', value: reassessment.data?.data?.nextAction || 'Review queue' },
        ]}
      />
      <PatientGrid patients={prioritizedDuePatients} emptyMessage="No reassessments are due right now." />
      <DataSourceNote moduleState={reassessment} />
    </EmergencyRoutePage>
  );
}

function BoardingRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const boarding = useBoardingStatus();
  const boardingPatients = boarding.data?.data?.patients || patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Flow"
      title="Boarding"
      description="Patients waiting for an inpatient bed and the boarding pressure affecting department flow."
    >
      <ApiStateBanner moduleState={boarding} />
      <MetricGrid
        metrics={[
          { label: 'Boarding patients', value: boardingPatients.length, color: '#F59E0B' },
          {
            label: 'Longest boarding',
            value: `${boarding.data?.data?.longestBoardingMinutes ?? 0}m`,
            color: '#F97316',
          },
          { label: 'Escalation', value: boarding.data?.data?.escalation || 'No escalation' },
        ]}
      />
      <PatientGrid patients={boardingPatients} emptyMessage="No active boarding patients." />
      <DataSourceNote moduleState={boarding} />
    </EmergencyRoutePage>
  );
}

function CapacityRoute() {
  const storeCapacity = useEmergencyStore((state) => state.capacity);
  const storeRooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const capacityStatus = useCapacityStatus();
  const upgradeCapacity = useUpgradeHarnessCapacity();
  const capacity = capacityStatus.data?.data?.capacity || storeCapacity;
  const rooms = capacityStatus.data?.data?.rooms || storeRooms;
  const upgradeSignals = upgradeCapacity.data?.data?.signals || [];
  const simulationSignal = findUpgradeSignal(upgradeSignals, 'real_time_simulation_adaptive_policy');
  const bragSignal = findUpgradeSignal(upgradeSignals, 'brag_forecast_10h');
  const availableRooms = rooms.filter((room) => room.status === 'Available').length;
  const blockedRooms = rooms.filter((room) => room.status === 'Blocked').length;
  const boardingPatients = patients.filter(isBoarding);

  return (
    <EmergencyRoutePage
      eyebrow="Capacity"
      title="Capacity"
      description="Current room availability, boarding load, and department pressure in one view."
    >
      <ApiStateBanner moduleState={capacityStatus} />
      <MetricGrid
        metrics={[
          {
            label: 'Capacity score',
            value: `${capacity.score} ${capacity.band}`,
            color: '#60A5FA',
          },
          { label: 'Occupied rooms', value: capacity.occupiedRooms },
          { label: 'Available rooms', value: availableRooms, color: '#10B981' },
          { label: 'Blocked rooms', value: blockedRooms, color: '#F97316' },
          { label: 'Boarding patients', value: capacity.boardingCount, color: '#F59E0B' },
          { label: 'Reassessment due', value: capacity.reassessmentDue, color: '#EF4444' },
        ]}
      />
      {capacityStatus.data?.data?.recommendations?.length ? (
        <div style={{ display: 'grid', gap: 8 }}>
          {capacityStatus.data.data.recommendations.map((recommendation) => (
            <div
              key={recommendation}
              style={{
                ...emergencyRouteStyles.card,
                borderColor: 'color-mix(in srgb, var(--status-info, #60A5FA) 36%, var(--color-border-default, #1F2937))',
                background:
                  'color-mix(in srgb, var(--status-info, #60A5FA) 8%, var(--color-surface, #111827))',
                color: '#BFDBFE',
                padding: 'var(--space-3, 12px)',
              }}
            >
              {recommendation}
            </div>
          ))}
        </div>
      ) : null}
      {simulationSignal || bragSignal ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {simulationSignal ? (
            <article style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
              <strong style={{ color: '#BFDBFE' }}>Adaptive policy simulation</strong>
              <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                Pressure {simulationSignal.data.currentPressureScore};{' '}
                {simulationSignal.data.recommendedPolicyReview}
              </p>
              <small style={{ color: '#FDE68A' }}>{simulationSignal.safety.humanReviewMessage}</small>
            </article>
          ) : null}
          {bragSignal ? (
            <article style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
              <strong style={{ color: '#BFDBFE' }}>10-hour BRAG forecast</strong>
              <p style={{ margin: '6px 0 0', color: '#9CA3AF', fontSize: 13 }}>
                Peak band {bragSignal.data.peakBand};{' '}
                {(bragSignal.data.forecast || []).slice(-1)[0]?.humanReviewTrigger}
              </p>
              <small style={{ color: '#FDE68A' }}>
                Confidence {Math.round((bragSignal.confidence || 0) * 100)}% · Audit{' '}
                {String(bragSignal.audit.immutableLedgerHash).slice(0, 10)}
              </small>
            </article>
          ) : null}
        </div>
      ) : null}
      <PatientGrid
        patients={boardingPatients}
        emptyMessage="No active boarders affecting capacity."
      />
      <DataSourceNote moduleState={capacityStatus} />
    </EmergencyRoutePage>
  );
}

function CopilotRoute() {
  const patients = useEmergencyStore((state) => state.patients);
  const capacity = useEmergencyStore((state) => state.capacity);
  const alerts = useEmergencyStore((state) => state.alerts);
  const copilot = useEDCopilot();
  const upgradeClinical = useUpgradeHarnessClinicalIntelligence();
  const upgradeAudit = useUpgradeHarnessAuditSummary();
  const promptContext = copilot.data?.data?.promptContext || {};
  const clinicalSignals = upgradeClinical.data?.data?.signals || [];
  const cdssSignal = findUpgradeSignal(clinicalSignals, 'multimodal_cdss');
  const telephoneSignal = findUpgradeSignal(clinicalSignals, 'telephone_triage_diversion');
  const federatedSignal = findUpgradeSignal(clinicalSignals, 'federated_learning_harness');
  const auditSignal = upgradeAudit.data?.data?.signals?.[0] || null;
  const activePatients = patients.filter((patient) => patient.state !== PatientState.Discharge);
  const highRiskPatients = activePatients.filter(isHighRisk);

  return (
    <EmergencyRoutePage
      eyebrow={EMERGENCY_OS_BRANDING.aiiosName}
      title={EMERGENCY_OS_BRANDING.copilotName}
      description={EMERGENCY_OS_BRANDING.copilotIntro}
    >
      <ApiStateBanner moduleState={copilot} />
      <MetricGrid
        metrics={[
          { label: 'Active patients', value: promptContext.patientCount ?? activePatients.length },
          {
            label: 'High risk',
            value: promptContext.highRiskCount ?? highRiskPatients.length,
            color: '#EF4444',
          },
          {
            label: 'Capacity band',
            value: promptContext.capacity?.band ?? capacity.band,
            color: '#60A5FA',
          },
          {
            label: 'Active alerts',
            value: alerts.filter((alert) => !alert.dismissed).length,
            color: '#F59E0B',
          },
        ]}
      />
      {copilot.data?.data?.quickActions?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {copilot.data.data.quickActions.map((action) => (
            <span
              key={action}
              style={{
                border: '1px solid color-mix(in srgb, var(--status-info, #60A5FA) 34%, var(--color-border-default, #1F2937))',
                borderRadius: 999,
                background:
                  'color-mix(in srgb, var(--status-info, #60A5FA) 10%, var(--color-surface, #111827))',
                color: '#BFDBFE',
                padding: '6px 10px',
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              {action}
            </span>
          ))}
        </div>
      ) : null}
      <p
        style={{
          ...emergencyRouteStyles.card,
          borderColor:
            'color-mix(in srgb, var(--status-warning, #F59E0B) 40%, var(--color-border-default, #1F2937))',
          background:
            'color-mix(in srgb, var(--status-warning, #F59E0B) 8%, var(--color-surface, #111827))',
          color: 'var(--color-text-secondary, #9CA3AF)',
          margin: 0,
          padding: 'var(--space-3, 12px)',
        }}
      >
        Use the docked {EMERGENCY_OS_BRANDING.copilotName} to ask about who needs attention,
        capacity pressure, EMS status, or reassessment priorities.{' '}
        The active panel supports typed prompts, browser image attachment metadata, and voice dictation
        for staff-reviewed context.{' '}
        {EMERGENCY_OS_BRANDING.safetyLine}
      </p>
      {cdssSignal || telephoneSignal || federatedSignal || auditSignal ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {[
            cdssSignal && {
              title: 'CDSS safety gate',
              body: `${cdssSignal.data.reviewQueue?.length || 0} high-risk review cards. ${cdssSignal.data.safetyGate}`,
              meta: cdssSignal.safety.status,
            },
            telephoneSignal && {
              title: 'Telephone triage diversion',
              body: `${telephoneSignal.data.candidates?.length || 0} candidates held for human approval.`,
              meta: telephoneSignal.data.diversionStatus,
            },
            federatedSignal && {
              title: 'Federated insights',
              body: `Pilot model ${federatedSignal.data.modelCard?.modelId}; no PHI leaves the fixture contract.`,
              meta: `AUC ${federatedSignal.data.modelCard?.metrics?.auc}`,
            },
            auditSignal && {
              title: 'Immutable audit summary',
              body: `${auditSignal.data.ledgerEntries?.length || 0} linked pilot ledger entries.`,
              meta: String(auditSignal.data.latestHash || auditSignal.audit.immutableLedgerHash).slice(0, 12),
            },
          ]
            .filter(Boolean)
            .map((card) => (
              <article key={card.title} style={{ ...emergencyRouteStyles.card, padding: 'var(--space-3, 12px)' }}>
                <strong style={{ color: '#BFDBFE' }}>{card.title}</strong>
                <p style={{ margin: '6px 0', color: '#9CA3AF', fontSize: 13 }}>{card.body}</p>
                <small style={{ color: '#FDE68A' }}>{card.meta}</small>
              </article>
            ))}
        </div>
      ) : null}
      <DataSourceNote moduleState={copilot} />
    </EmergencyRoutePage>
  );
}

function RootLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<EmergencyDefaultRedirect />} />
      <Route path={CANONICAL_ROUTES.auth} element={<AuthRoute />} />
      <Route path="/login" element={<AuthRoute />} />
      <Route path="/log-in" element={<AuthRoute />} />
      <Route path="/signin" element={<AuthRoute />} />
      <Route path="/sign-in" element={<AuthRoute />} />
      <Route path="/signup" element={<Navigate to={`${CANONICAL_ROUTES.auth}?mode=signup`} replace />} />
      <Route path="/sign-up" element={<Navigate to={`${CANONICAL_ROUTES.auth}?mode=signup`} replace />} />
      <Route path="/register" element={<Navigate to={`${CANONICAL_ROUTES.auth}?mode=signup`} replace />} />
      <Route path="/join" element={<Navigate to={`${CANONICAL_ROUTES.auth}?mode=signup`} replace />} />
      <Route
        path={CANONICAL_ROUTES.authCallback}
        element={
          <LazyRoute label="Completing sign-in...">
            <AuthCallback />
          </LazyRoute>
        }
      />
      <Route
        path="/shared/tools/:shareId"
        element={
          <LazyRoute label="Loading shared tool session...">
            <SharedToolSession />
          </LazyRoute>
        }
      />
      <Route element={<RootLayout />}>
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
              <PatientsRoute />
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
          path={CANONICAL_ROUTES.emergencyIntake}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyIntake}>
              <LazyRoute label="Loading intake...">
                <SmartIntake />
              </LazyRoute>
            </EmergencyRouteGuard>
          }
        />
        <Route
          path={CANONICAL_ROUTES.emergencyQueues}
          element={
            <EmergencyRouteGuard path={CANONICAL_ROUTES.emergencyQueues}>
              <QueueRoute />
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
          path={CANONICAL_ROUTES.workspace}
          element={
            <LazyRoute label="Loading platform navigation...">
              <PlatformNavigationPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.discover}
          element={
            <LazyRoute label="Loading platform discovery...">
              <PlatformNavigationPage />
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
          path={CANONICAL_ROUTES.platformAdmin}
          element={
            <LazyRoute label="Loading platform admin...">
              <PlatformAdminPage />
            </LazyRoute>
          }
        />
        <Route
          path={CANONICAL_ROUTES.tenantAdmin}
          element={
            <LazyRoute label="Loading tenant admin...">
              <TenantAdministrationCenter />
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
          path="/two-factor-setup"
          element={
            <LazyRoute label="Loading two-factor setup...">
              <TwoFactorSetup />
            </LazyRoute>
          }
        />
        <Route
          path="/biometric-setup"
          element={
            <LazyRoute label="Loading biometric setup...">
              <BiometricSetup />
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
              <CustomerSuccessDashboard />
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
      <Route path="/hospital-map" element={<ToolsRedirect />} />
      <Route path="/medical-iot" element={<ToolsRedirect />} />
      <Route path="/devices" element={<ToolsRedirect />} />
      <Route path="/live-map" element={<ToolsRedirect />} />
      <Route path="/maps" element={<ToolsRedirect />} />
      <Route path="/tracking" element={<ToolsRedirect />} />
      <Route path="/live-tracking" element={<ToolsRedirect />} />
      <Route path="/operations" element={<ToolsRedirect />} />
      <Route path="/operations/*" element={<ToolsRedirect />} />
      <Route path="/operations-center" element={<ToolsRedirect />} />
      <Route path="/fleet" element={<ToolsRedirect />} />
      <Route path="/fleet/*" element={<ToolsRedirect />} />
      <Route path="/vehicle" element={<ToolsRedirect />} />
      <Route path="/vehicle/*" element={<ToolsRedirect />} />
      <Route path="/pharmacy" element={<ToolsRedirect />} />
      <Route path="/pharmacy/*" element={<ToolsRedirect />} />
      <Route path="/radiology" element={<ToolsRedirect />} />
      <Route path="/radiology/*" element={<ToolsRedirect />} />
      <Route path="/recommendations" element={<ToolsRedirect />} />
      {LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => (
        <Route key={`${path}-${to}`} path={path} element={<EmergencyAliasRedirect to={to} />} />
      ))}
      <Route
        path="/dashboard"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/home"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route path="/app" element={<Navigate to={CANONICAL_ROUTES.workspace} replace />} />
      <Route
        path="/mobile"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/mobile/*"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/android"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/android/*"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/general-healthcare"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route
        path="/general-healthcare/*"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
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
        path="/emergency/*"
        element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />}
      />
      <Route path="*" element={<Navigate to={CANONICAL_ROUTES.emergencyWhiteboard} replace />} />
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
