import React, { useState, useEffect, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser, Permission } from './contexts/UserContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { ToolPreferencesProvider } from './contexts/ToolPreferencesContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { UserIdentityProvider } from './contexts/UserIdentityContext';
import { CostTrackingProvider } from './contexts/CostTrackingContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import OfflineProvider from './contexts/OfflineProvider';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGate from './components/PermissionGate';
import { NotificationToastContainer } from './components/notifications/NotificationToast';
import AppShell from './layout/AppShell';
import AuthShell from './layout/AuthShell';
import { PublicShell } from './layout/PublicShell';
import Auth from './pages/Auth';
import { createDevAuthSession, isDevAuthBypassEnabled } from './auth/devAuthBypass';
import { useNotificationActions } from './hooks/useNotificationActions';
import logger from './utils/logger';
import { NavIcon } from './navigation/NavIcon';
import { CHROME_ICONS } from './navigation/iconRegistry';
import {
  ASSISTANT_ROUTE_ALIASES,
  AUDIT_ROUTE_ALIASES,
  AUTH_PATH_ALIASES,
  AUTH_SIGNUP_PATH_ALIASES,
  CALCULATORS_ROUTE_ALIASES,
  FLEET_MAP_ROUTE_ALIASES,
  LABORATORY_ROUTE_ALIASES,
  LIVE_MAP_ROUTE_ALIASES,
  MEDICAL_3D_VIEWER_ROUTE_ALIASES,
  SIMULATION_ROUTE_ALIASES,
  TOOLS_ROUTE_ALIASES,
} from './config/routes.config';
import {
  CALCULATOR_ROUTE_DEFS,
  LEGACY_CALCULATOR_ROUTE_ALIASES,
} from './routes/clinicalToolRoutes';
import { lazyWithRetry } from './utils/lazyWithRetry';

// Page imports - Public
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import GDPRNotice from './pages/GDPRNotice';
import HIPAANotice from './pages/HIPAANotice';
import HelpCenter from './pages/HelpCenter';
import Version from './pages/Version';

// Authenticated shell pages — lazy for smaller initial JS (mobile LCP)
const CommandDashboard = lazyWithRetry(() => import('./pages/CommandDashboard'));
const WorkspaceHome = lazyWithRetry(() => import('./pages/WorkspaceHome'));
const {
  WorkspacesIndexPage,
  SearchResultsPage,
  ClinicalTimelinePage,
  NotificationCenterPage,
  DigitalTwinPage,
  WorkflowBuilderPage,
  AssetLibraryPage,
} = {
  WorkspacesIndexPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.WorkspacesIndexPage }))
  ),
  SearchResultsPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.SearchResultsPage }))
  ),
  ClinicalTimelinePage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.ClinicalTimelinePage }))
  ),
  NotificationCenterPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.NotificationCenterPage }))
  ),
  DigitalTwinPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.DigitalTwinPage }))
  ),
  WorkflowBuilderPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.WorkflowBuilderPage }))
  ),
  AssetLibraryPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.AssetLibraryPage }))
  ),
};
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const CapabilityDiscovery = lazyWithRetry(() => import('./pages/CapabilityDiscovery'));
const WorkflowAutomationBuilder = lazyWithRetry(() => import('./pages/WorkflowAutomationBuilder'));
const DependencyMap = lazyWithRetry(() => import('./pages/DependencyMap'));
const Patients = lazyWithRetry(() => import('./pages/Patients'));
const Artifacts = lazyWithRetry(() => import('./pages/Artifacts'));
const MemoryDashboard = lazyWithRetry(() => import('./pages/MemoryDashboard'));
const TrainingDashboard = lazyWithRetry(() => import('./pages/TrainingDashboard'));
const AiEvaluationDashboard = lazyWithRetry(() => import('./pages/AiEvaluationDashboard'));
const AiCommandCenterDashboard = lazyWithRetry(() => import('./pages/AiCommandCenterDashboard'));
const Operations = lazyWithRetry(() => import('./pages/Operations'));
const DigitalOperationsCenter = lazyWithRetry(() => import('./pages/DigitalOperationsCenter'));
const ResearchEvidenceHub = lazyWithRetry(() => import('./pages/ResearchEvidenceHub'));
const ClinicalDocumentationAssistant = lazyWithRetry(() => import('./pages/ClinicalDocumentationAssistant'));
const ClinicalKnowledgeGraph = lazyWithRetry(() => import('./pages/ClinicalKnowledgeGraph'));
const PredictiveAnalyticsDashboard = lazyWithRetry(() => import('./pages/PredictiveAnalyticsDashboard'));
const ClinicalDecisionSupport = lazyWithRetry(() => import('./pages/ClinicalDecisionSupport'));
const Competencies = lazyWithRetry(() => import('./pages/Competencies'));
const Credentials = lazyWithRetry(() => import('./pages/Credentials'));
const MedicalSimulationSuite = lazyWithRetry(() => import('./pages/MedicalSimulationSuite'));
const SimulationScenarioPlayer = lazyWithRetry(() => import('./pages/SimulationScenarioPlayer'));
const SimulationOutcomes = lazyWithRetry(() => import('./pages/SimulationOutcomes'));
const LaboratoryDashboard = lazyWithRetry(() => import('./pages/LaboratoryDashboard'));
const Medical3DViewer = lazyWithRetry(() => import('./pages/Medical3DViewer'));
const LiveTrackingMap = lazyWithRetry(() => import('./pages/LiveTrackingMap'));
const MedicalIotDashboard = lazyWithRetry(() => import('./pages/MedicalIotDashboard'));
const HospitalMapDashboard = lazyWithRetry(() => import('./pages/HospitalMapDashboard'));
const DeviceFleetManagement = lazyWithRetry(() => import('./pages/DeviceFleetManagement'));
const PlatformSystemPage = lazyWithRetry(() => import('./pages/platform/PlatformSystemPage'));
const PlatformGovernanceWorkspace = lazyWithRetry(
  () => import('./pages/platform/PlatformGovernanceWorkspace')
);
const FeatureFlagCenter = lazyWithRetry(() => import('./pages/FeatureFlagCenter'));
const PluginMarketplace = lazyWithRetry(() => import('./pages/PluginMarketplace'));
const DataLineageExplorer = lazyWithRetry(() => import('./pages/DataLineageExplorer'));
const PlatformSelfDiagnostics = lazyWithRetry(() => import('./pages/PlatformSelfDiagnostics'));
const SystemHealth = lazyWithRetry(() => import('./pages/SystemHealth'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const ProfileSettings = lazyWithRetry(() => import('./pages/ProfileSettings'));
const ProfileActivity = lazyWithRetry(() => import('./pages/profile/ProfileActivity'));
const ProfilePreferences = lazyWithRetry(() => import('./pages/profile/ProfilePreferences'));
const ProfileToolPreferences = lazyWithRetry(
  () => import('./pages/profile/ProfileToolPreferences')
);
const ProfileWorkspaces = lazyWithRetry(() => import('./pages/profile/ProfileWorkspaces'));
const ProfileSecurity = lazyWithRetry(() => import('./pages/profile/ProfileSecurity'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));

// Lazy-loaded pages for better performance (loaded on demand)
const NotificationPreferences = lazyWithRetry(() => import('./pages/NotificationPreferences'));
const TwoFactorSetup = lazyWithRetry(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = lazyWithRetry(() => import('./pages/BiometricSetup'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const AnalyticsDashboard = lazyWithRetry(() => import('./pages/AnalyticsDashboard'));
const CostAnalyticsDashboard = lazyWithRetry(() => import('./pages/CostAnalyticsDashboard'));
const ConsentFlow = lazyWithRetry(() =>
  import('./pages/legal/ConsentFlow').then((m) => ({ default: m.ConsentFlow }))
);
const ConsentHistory = lazyWithRetry(() =>
  import('./pages/legal/ConsentHistory').then((m) => ({ default: m.ConsentHistory }))
);
const TeamManagement = lazyWithRetry(() =>
  import('./pages/team/TeamManagement').then((m) => ({ default: m.TeamManagement }))
);
const AuthCallback = lazyWithRetry(() => import('./pages/AuthCallback'));

const SharedToolSession = lazyWithRetry(() => import('./pages/tools/SharedToolSession'));
const ClinicalAudit = lazyWithRetry(() => import('./pages/tools/ClinicalAudit'));
const ToolsOverview = lazyWithRetry(() => import('./pages/tools/ToolsOverview'));
const ClinicalToolCatalog = lazyWithRetry(() => import('./pages/tools/ClinicalToolCatalog'));
const Calculators = lazyWithRetry(() => import('./pages/tools/Calculators'));
const DrugChecker = lazyWithRetry(() => import('./pages/tools/DrugChecker'));
const LabInterpreter = lazyWithRetry(() => import('./pages/tools/LabInterpreter'));
const Protocols = lazyWithRetry(() => import('./pages/tools/Protocols'));
const DiagnosisAssistant = lazyWithRetry(() => import('./pages/tools/DiagnosisAssistant'));
const ProcedureGuide = lazyWithRetry(() => import('./pages/tools/ProcedureGuide'));
const AmbientScribe = lazyWithRetry(() => import('./pages/tools/AmbientScribe'));
const CalculatorRecommender = lazyWithRetry(() => import('./pages/tools/CalculatorRecommender'));
const CardiologyAssistantPage = lazyWithRetry(
  () => import('./pages/tools/CardiologyAssistantPage')
);
const PulmonologyAssistantPage = lazyWithRetry(
  () => import('./pages/tools/PulmonologyAssistantPage')
);
const NephrologyAssistantPage = lazyWithRetry(
  () => import('./pages/tools/NephrologyAssistantPage')
);
const GastroenterologyAssistantPage = lazyWithRetry(
  () => import('./pages/tools/GastroenterologyAssistantPage')
);
const EndocrineMetabolicAssistantPage = lazyWithRetry(
  () => import('./pages/tools/EndocrineMetabolicAssistantPage')
);
const NeurologyAssistantPage = lazyWithRetry(() => import('./pages/tools/NeurologyAssistantPage'));
const PediatricsObgynAssistantPage = lazyWithRetry(
  () => import('./pages/tools/PediatricsObgynAssistantPage')
);
const PsychiatryAssistantPage = lazyWithRetry(
  () => import('./pages/tools/PsychiatryAssistantPage')
);
const GuidelineRag = lazyWithRetry(() => import('./pages/tools/GuidelineRag'));
const DifferentialAi = lazyWithRetry(() => import('./pages/tools/DifferentialAi'));
const TimelineAi = lazyWithRetry(() => import('./pages/tools/TimelineAi'));
const PatientSummaryAi = lazyWithRetry(() => import('./pages/tools/PatientSummaryAi'));
const OrderSetAi = lazyWithRetry(() => import('./pages/tools/OrderSetAi'));
const AiExplainability = lazyWithRetry(() => import('./pages/tools/AiExplainability'));
const ToolNotFound = lazyWithRetry(() => import('./pages/tools/ToolNotFound'));
const ToolsAreaFallback = lazyWithRetry(() => import('./pages/tools/ToolsAreaFallback'));
const FleetDashboard = lazyWithRetry(() => import('./pages/fleet/FleetDashboard'));
const FleetLiveMap = lazyWithRetry(() => import('./pages/fleet/FleetLiveMap'));
const PredictiveMaintenance = lazyWithRetry(() => import('./pages/fleet/PredictiveMaintenance'));
const RouteOptimizer = lazyWithRetry(() => import('./pages/fleet/RouteOptimizer'));

// Clinical Intelligence pages
const ClinicalAlertsPage = lazyWithRetry(() => import('./pages/ClinicalAlertsPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader-spinner" aria-hidden />
    <div className="page-loader-label">Loading...</div>
  </div>
);

logger.info('App.jsx loaded - Medical AI Chat Application');

function buildAuthRedirectSearch(location) {
  const current = `${location.pathname}${location.search || ''}${location.hash || ''}`;
  if (
    !location.pathname ||
    location.pathname === '/auth' ||
    location.pathname.startsWith('/auth/')
  ) {
    return '';
  }
  const search = new URLSearchParams();
  search.set('next', current);
  return `?${search.toString()}`;
}

function getSafePostAuthPath(location) {
  const search = new URLSearchParams(location.search);
  const next = search.get('next') || location.state?.from;
  if (!next || typeof next !== 'string') return '/dashboard';
  if (!next.startsWith('/') || next.startsWith('//')) return '/dashboard';
  if (next === '/auth' || next.startsWith('/auth?') || next.startsWith('/auth/')) {
    return '/dashboard';
  }
  return next;
}

function NotificationToasts() {
  const { notifications, removeNotification } = useNotifications();
  return <NotificationToastContainer toasts={notifications} onDismiss={removeNotification} />;
}

// ==================== AUTH PAGE ====================
function AuthPage() {
  const { setAuthToken, setUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAuthSuccess = (token, user) => {
    flushSync(() => {
      setAuthToken(token);
      if (user) setUser(user);
    });
    navigate(getSafePostAuthPath(location), { replace: true });
  };

  return <Auth onAuthSuccess={handleAuthSuccess} />;
}

// ==================== WELCOME PAGE ====================
export function WelcomePage() {
  const navigate = useNavigate();
  const { setAuthToken, setUser } = useUser();
  const { info, error } = useNotificationActions();
  const enableDevAuthBypass = isDevAuthBypassEnabled();

  const startDevSession = async () => {
    try {
      const session = await createDevAuthSession();
      flushSync(() => {
        setAuthToken(session.token);
        setUser(session.user);
      });
      info(
        'Signing in',
        session.backendBacked
          ? 'Demo mode with API access.'
          : 'Demo mode using local UI data only. Start the backend for tool APIs.'
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Demo mode auth bypass failed from welcome page', { err });
      error('Demo mode failed', 'Unable to start the local demo session.');
    }
  };

  const handleDirectSignIn = async () => {
    if (!enableDevAuthBypass) return;
    await startDevSession();
  };

  return (
    <div className="welcome-page-root">
      <div className="welcome-page-inner">
        <div className="welcome-page-icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.hospital} size={56} />
        </div>

        <h1 className="welcome-page-title">CareDroid-Clinical-AI</h1>

        <p className="welcome-page-lead">
          Your universal medical AI doctor. Get instant clinical guidance, drug interaction checks,
          lab interpretations, and evidence-based recommendations.
        </p>

        <div className="welcome-page-grid">
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.checkCircle} size={20} aria-hidden />
              <span>Clinical Tools</span>
            </div>
            <div className="welcome-page-card-desc">
              Drug checker, calculators, lab interpreter, protocols
            </div>
          </div>
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.shield} size={20} aria-hidden />
              <span>Secure & Compliant</span>
            </div>
            <div className="welcome-page-card-desc">
              HIPAA-ready, encrypted conversations, audit logging
            </div>
          </div>
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.rocket} size={20} aria-hidden />
              <span>Always On</span>
            </div>
            <div className="welcome-page-card-desc">
              Works offline, stores conversations, available everywhere
            </div>
          </div>
        </div>

        <div className="welcome-page-actions">
          <button type="button" className="welcome-page-cta" onClick={() => navigate('/auth')}>
            Sign In or Create Account
          </button>
          {enableDevAuthBypass && (
            <button type="button" className="welcome-page-dev-cta" onClick={handleDirectSignIn}>
              Continue in Demo Mode
            </button>
          )}
        </div>

        {enableDevAuthBypass && (
          <p className="welcome-page-dev-note">
            Demo mode is enabled for local or hosted demos and uses the same app shell routes as
            signed-in clinicians.
          </p>
        )}

        <p className="welcome-page-footnote">
          Healthcare professionals only. Secure login required.
        </p>
      </div>
    </div>
  );
}

function AppShellPage({ children }) {
  const { signOut, user, isDevAuthBypass } = useUser();
  const { conversations, activeConversationId, selectConversation, addConversation } =
    useConversation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const handleNewConversation = () => {
    addConversation();
    navigate({ pathname: '/assistant', search: '' }, { replace: true });
  };

  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate({ pathname: '/assistant', search: '' }, { replace: true });
  };

  return (
    <AppShell
      isAuthed={true}
      conversations={conversations}
      activeConversation={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onSignOut={handleSignOut}
      healthStatus="online"
      isDevAuthBypass={isDevAuthBypass}
      devAuthBannerLabel={user?.devAuthLabel || 'Demo Mode'}
    >
      {children}
    </AppShell>
  );
}

/** Old backend path: redirect to canonical /auth-callback preserving ?token= */
function LegacyOAuthCallbackRedirect() {
  const location = useLocation();
  return <Navigate to={{ pathname: '/auth-callback', search: location.search }} replace />;
}

/** This SPA only implements sign-in at `/auth`; common paths redirect here. */
function AuthPathRedirect() {
  const location = useLocation();
  const search = new URLSearchParams(location.search);
  if (AUTH_SIGNUP_PATH_ALIASES.includes(location.pathname) && !search.has('mode')) {
    search.set('mode', 'signup');
  }
  return (
    <Navigate
      to={{
        pathname: '/auth',
        search: search.toString() ? `?${search.toString()}` : '',
        hash: location.hash,
      }}
      replace
    />
  );
}

/** Legacy protected paths stay deep-linkable while canonical routes own the UI. */
function LegacyProtectedRouteRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={{ pathname: to, search: location.search, hash: location.hash }} replace />;
}

// ==================== ROUTING ====================
function AppRoutes() {
  const { isAuthenticated, isLoading } = useUser();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      setIsChecking(false);
      return undefined;
    }
    const timer = setTimeout(() => setIsChecking(false), 150);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isChecking || isLoading) {
    return (
      <div className="app-init-screen">
        <h1>Initializing...</h1>
      </div>
    );
  }

  const resolveElement = ({
    element,
    requiresAuth,
    publicOnly,
    permission,
    requireAllPermissions = false,
  }) => {
    if (requiresAuth && !isAuthenticated) {
      return (
        <Navigate
          to={{ pathname: '/auth', search: buildAuthRedirectSearch(location) }}
          replace
          state={{ from: `${location.pathname}${location.search || ''}${location.hash || ''}` }}
        />
      );
    }

    if (publicOnly && isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    let resolvedElement = element;

    if (permission) {
      resolvedElement = (
        <PermissionGate
          permission={permission}
          requireAll={requireAllPermissions}
          fallback={<Navigate to="/tools" replace />}
        >
          {resolvedElement}
        </PermissionGate>
      );
    }

    if (requiresAuth) {
      return <AppShellPage>{resolvedElement}</AppShellPage>;
    }

    return resolvedElement;
  };

  const routes = [
    {
      path: '/',
      element: (
        <PublicShell>
          <WelcomePage />
        </PublicShell>
      ),
      publicOnly: true,
    },
    {
      path: '/auth',
      element: (
        <AuthShell>
          <AuthPage />
        </AuthShell>
      ),
      publicOnly: true,
    },
    {
      path: '/auth-callback',
      element: (
        <AuthShell>
          <AuthCallback />
        </AuthShell>
      ),
    },
    {
      path: '/auth/callback',
      element: (
        <AuthShell>
          <LegacyOAuthCallbackRedirect />
        </AuthShell>
      ),
    },
    ...AUTH_PATH_ALIASES.map((path) => ({
      path,
      element: <AuthPathRedirect />,
      publicOnly: true,
    })),

    {
      path: '/dashboard',
      element: <CommandDashboard />,
      requiresAuth: true,
    },
    {
      path: '/discover',
      element: <CapabilityDiscovery />,
      requiresAuth: true,
    },
    {
      path: '/automation',
      element: <WorkflowAutomationBuilder />,
      requiresAuth: true,
    },
    {
      path: '/workspace',
      element: <LegacyProtectedRouteRedirect to="/workspace/clinical" />,
      requiresAuth: true,
    },
    {
      path: '/workspaces',
      element: <WorkspacesIndexPage />,
      requiresAuth: true,
    },
    {
      path: '/workspace/:workspaceId',
      element: <WorkspaceHome />,
      requiresAuth: true,
    },
    {
      path: '/search',
      element: <SearchResultsPage />,
      requiresAuth: true,
    },
    {
      path: '/timeline',
      element: <ClinicalTimelinePage />,
      requiresAuth: true,
    },
    {
      path: '/digital-twin',
      element: <DigitalTwinPage />,
      requiresAuth: true,
    },
    {
      path: '/operations',
      element: <Operations />,
      requiresAuth: true,
    },
    {
      path: '/operations-center',
      element: <DigitalOperationsCenter />,
      requiresAuth: true,
    },
    {
      path: '/workflows',
      element: <WorkflowBuilderPage />,
      requiresAuth: true,
    },
    {
      path: '/assets',
      element: <AssetLibraryPage />,
      requiresAuth: true,
    },
    {
      path: '/home',
      element: <LegacyProtectedRouteRedirect to="/dashboard" />,
      requiresAuth: true,
    },
    {
      path: '/assistant',
      element: <Dashboard />,
      requiresAuth: true,
    },
    ...ASSISTANT_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/assistant" />,
      requiresAuth: true,
    })),
    {
      path: '/patients',
      element: <Patients />,
      requiresAuth: true,
    },
    {
      path: '/patients/import',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/labs/import',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/medications/import',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/observations/import',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workspace',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/summary',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/timeline',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/events',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/risk-history',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/care-plan',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/consent',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_CONSENT,
    },
    {
      path: '/patients/:patientId/source-data',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/review',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_REVIEW_QUEUE],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/privacy',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_PRIVACY_CENTER],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workflows',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workflows/:workflowId',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/documentation',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/documentation/:documentId',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/integrations',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_INTEGRATIONS,
    },
    {
      path: '/integrations/fhir',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.VIEW_INTEGRATIONS,
    },
    {
      path: '/integrations/hl7',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: Permission.VIEW_INTEGRATIONS,
    },
    {
      path: '/integrations/source-provenance',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_INTEGRATIONS,
    },
    {
      path: '/operations/observability',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: [Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY],
      requireAllPermissions: true,
    },
    {
      path: '/operations/deployments',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_OPERATIONS,
    },
    {
      path: '/operations/service-health',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_OPERATIONS,
    },
    {
      path: '/operations/incidents',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_INCIDENTS,
    },
    {
      path: '/artifacts',
      element: <Artifacts />,
      requiresAuth: true,
    },
    {
      path: '/memory',
      element: <MemoryDashboard />,
      requiresAuth: true,
    },
    {
      path: '/ai-memory',
      element: <MemoryDashboard />,
      requiresAuth: true,
    },
    {
      path: '/training',
      element: <TrainingDashboard />,
      requiresAuth: true,
      permission: [Permission.CONFIGURE_SYSTEM, Permission.VIEW_ANALYTICS],
    },
    {
      path: '/ai/evaluation',
      element: <AiEvaluationDashboard />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/ai-command-center',
      element: <AiCommandCenterDashboard />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/live-map',
      element: <LiveTrackingMap />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    ...LIVE_MAP_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/live-map" />,
      requiresAuth: true,
    })),
    {
      path: '/medical-iot',
      element: <MedicalIotDashboard />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/hospital-map',
      element: <HospitalMapDashboard />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/devices',
      element: <DeviceFleetManagement />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },

    // Clinical tools: canonical routes render their product pages directly.
    {
      path: '/tools',
      element: <ToolsOverview />,
      requiresAuth: true,
    },
    ...TOOLS_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/tools" />,
      requiresAuth: true,
    })),
    {
      path: '/tools/catalog',
      element: <ClinicalToolCatalog />,
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/tools/drug-checker',
      element: <DrugChecker />,
      requiresAuth: true,
    },
    {
      path: '/tools/lab-interpreter',
      element: <LabInterpreter />,
      requiresAuth: true,
    },
    ...CALCULATOR_ROUTE_DEFS.map(({ path, calculatorSlug }) => ({
      path,
      element: <Calculators initialCalculatorId={calculatorSlug} />,
      requiresAuth: true,
    })),
    ...LEGACY_CALCULATOR_ROUTE_ALIASES.map(({ path, to }) => ({
      path,
      element: <LegacyProtectedRouteRedirect to={to} />,
      requiresAuth: true,
    })),
    {
      path: '/tools/calculators',
      element: <ToolsOverview />,
      requiresAuth: true,
    },
    {
      path: '/tools/calculators/:slug',
      element: <Calculators />,
      requiresAuth: true,
    },
    ...CALCULATORS_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/tools/calculators" />,
      requiresAuth: true,
    })),
    {
      path: '/documentation',
      element: <ClinicalDocumentationAssistant />,
      requiresAuth: true,
    },
    {
      path: '/knowledge-graph',
      element: <ClinicalKnowledgeGraph />,
      requiresAuth: true,
    },
    {
      path: '/predictive-analytics',
      element: <PredictiveAnalyticsDashboard />,
      requiresAuth: true,
    },
    {
      path: '/clinical-decision-support',
      element: <ClinicalDecisionSupport />,
      requiresAuth: true,
    },
    {
      path: '/competencies',
      element: <Competencies />,
      requiresAuth: true,
    },
    {
      path: '/credentials',
      element: <Credentials />,
      requiresAuth: true,
    },
    {
      path: '/simulation',
      element: <MedicalSimulationSuite />,
      requiresAuth: true,
    },
    {
      path: '/simulation/outcomes',
      element: <SimulationOutcomes />,
      requiresAuth: true,
    },
    {
      path: '/simulation/sepsis-deterioration',
      element: <SimulationScenarioPlayer />,
      requiresAuth: true,
    },
    {
      path: '/simulation/:scenarioId',
      element: <SimulationScenarioPlayer />,
      requiresAuth: true,
    },
    ...SIMULATION_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/simulation" />,
      requiresAuth: true,
    })),
    {
      path: '/laboratory',
      element: <LaboratoryDashboard />,
      requiresAuth: true,
    },
    ...LABORATORY_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/laboratory" />,
      requiresAuth: true,
    })),
    {
      path: '/3d-viewer',
      element: <Medical3DViewer />,
      requiresAuth: true,
    },
    ...MEDICAL_3D_VIEWER_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/3d-viewer" />,
      requiresAuth: true,
    })),
    {
      path: '/protocols',
      element: <Protocols />,
      requiresAuth: true,
    },
    {
      path: '/research',
      element: <ResearchEvidenceHub />,
      requiresAuth: true,
      permission: Permission.USE_AI_CHAT,
    },
    {
      path: '/tools/protocols',
      element: <Protocols />,
      requiresAuth: true,
    },
    {
      path: '/tools/diagnosis',
      element: <DiagnosisAssistant />,
      requiresAuth: true,
    },
    {
      path: '/tools/procedures',
      element: <ProcedureGuide />,
      requiresAuth: true,
    },
    {
      path: '/tools/ambient-scribe',
      element: <AmbientScribe />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/calculator-recommender',
      element: <CalculatorRecommender />,
      requiresAuth: true,
    },
    {
      path: '/tools/cardiology/:toolId',
      element: <CardiologyAssistantPage />,
      requiresAuth: true,
      permission: Permission.USE_AI_CHAT,
    },
    {
      path: '/tools/workflow-builder-ai',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/clinical-reasoning-engine',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/why-engine',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/audit-trail-ai',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.VIEW_AUDIT_LOGS, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/soap-builder',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/clinical-dictation',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/discharge-summary-ai',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/referral-ai',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/prior-auth-ai',
      element: <PlatformSystemPage />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/pulmonology/:toolId',
      element: <PulmonologyAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/nephrology/:toolId',
      element: <NephrologyAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/gastroenterology/:toolId',
      element: <GastroenterologyAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/endocrine/:toolId',
      element: <EndocrineMetabolicAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/neurology/:toolId',
      element: <NeurologyAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/pediatrics-obgyn/:toolId',
      element: <PediatricsObgynAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/psychiatry/:toolId',
      element: <PsychiatryAssistantPage />,
      requiresAuth: true,
    },
    {
      path: '/tools/guideline-rag',
      element: <GuidelineRag />,
      requiresAuth: true,
      permission: Permission.USE_AI_CHAT,
    },
    {
      path: '/tools/differential-ai',
      element: <DifferentialAi />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/timeline-ai',
      element: <TimelineAi />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/patient-summary-ai',
      element: <PatientSummaryAi />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/order-set-ai',
      element: <OrderSetAi />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/ai-explainability',
      element: <AiExplainability />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/clinical-audit',
      element: <ClinicalAudit />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },

    {
      path: '/fleet/command',
      element: <FleetDashboard />,
      requiresAuth: true,
    },
    {
      path: '/fleet/map',
      element: <FleetLiveMap />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    ...FLEET_MAP_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/fleet/map" />,
      requiresAuth: true,
    })),
    {
      path: '/fleet/predictive-maintenance',
      element: <PredictiveMaintenance />,
      requiresAuth: true,
    },
    {
      path: '/fleet/route-optimizer',
      element: <RouteOptimizer />,
      requiresAuth: true,
    },
    {
      path: '/tools/*',
      element: <ToolNotFound />,
      requiresAuth: true,
    },
    {
      path: '/fleet/*',
      element: <ToolsAreaFallback />,
      requiresAuth: true,
    },

    // Clinical Intelligence routes
    {
      path: '/clinical/alerts',
      element: <ClinicalAlertsPage />,
      requiresAuth: true,
    },

    {
      path: '/profile',
      element: <Profile />,
      requiresAuth: true,
    },
    {
      path: '/profile/settings',
      element: <ProfileSettings />,
      requiresAuth: true,
    },
    {
      path: '/profile/activity',
      element: <ProfileActivity />,
      requiresAuth: true,
    },
    {
      path: '/profile/preferences',
      element: <ProfilePreferences />,
      requiresAuth: true,
    },
    {
      path: '/profile/tool-preferences',
      element: <ProfileToolPreferences />,
      requiresAuth: true,
    },
    {
      path: '/profile/workspaces',
      element: <ProfileWorkspaces />,
      requiresAuth: true,
    },
    {
      path: '/profile/security',
      element: <ProfileSecurity />,
      requiresAuth: true,
    },
    {
      path: '/profile-settings',
      element: <Navigate to="/profile/settings" replace />,
      requiresAuth: true,
    },
    {
      path: '/settings',
      element: <Settings />,
      requiresAuth: true,
    },
    {
      path: '/notifications',
      element: <NotificationCenterPage />,
      requiresAuth: true,
    },
    {
      path: '/notification-preferences',
      element: <NotificationPreferences />,
      requiresAuth: true,
    },

    {
      path: '/two-factor-setup',
      element: <TwoFactorSetup />,
      requiresAuth: true,
    },
    {
      path: '/biometric-setup',
      element: <BiometricSetup />,
      requiresAuth: true,
    },
    {
      path: '/onboarding',
      element: <Onboarding />,
      requiresAuth: true,
    },

    {
      path: '/consent',
      element: <ConsentFlow />,
      requiresAuth: true,
    },
    {
      path: '/consent-history',
      element: <ConsentHistory />,
      requiresAuth: true,
    },

    {
      path: '/privacy',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_PRIVACY_CENTER,
    },
    {
      path: '/legal/privacy',
      element: (
        <PublicShell>
          <PrivacyPolicy />
        </PublicShell>
      ),
    },
    {
      path: '/privacy/access-log',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_PHI_ACCESS_LOGS,
    },
    {
      path: '/privacy/requests',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_PRIVACY_CENTER,
    },
    {
      path: '/consent/:patientId',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_CONSENT,
    },
    {
      path: '/terms',
      element: (
        <PublicShell>
          <TermsOfService />
        </PublicShell>
      ),
    },
    {
      path: '/gdpr',
      element: (
        <PublicShell>
          <GDPRNotice />
        </PublicShell>
      ),
    },
    {
      path: '/hipaa',
      element: (
        <PublicShell>
          <HIPAANotice />
        </PublicShell>
      ),
    },
    {
      path: '/help',
      element: (
        <PublicShell>
          <HelpCenter />
        </PublicShell>
      ),
    },
    {
      path: '/version',
      element: (
        <PublicShell>
          <Version />
        </PublicShell>
      ),
    },
    {
      path: '/shared/tools/:shareId',
      element: (
        <PublicShell>
          <SharedToolSession />
        </PublicShell>
      ),
    },

    {
      path: '/team',
      element: <TeamManagement />,
      requiresAuth: true,
      permission: Permission.MANAGE_USERS,
    },
    {
      path: '/ai-governance',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_GOVERNANCE,
    },
    {
      path: '/security',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AI_SECURITY,
    },
    {
      path: '/regulatory',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_REGULATORY,
    },
    {
      path: '/equity',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_EQUITY_METRICS,
    },
    {
      path: '/human-review',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_REVIEW_QUEUE,
    },
    {
      path: '/system-health',
      element: <SystemHealth />,
      requiresAuth: true,
      permission: [Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY],
      requireAllPermissions: true,
    },
    {
      path: '/feature-flags',
      element: <FeatureFlagCenter />,
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/plugins',
      element: <PluginMarketplace />,
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/dependency-map',
      element: <DependencyMap />,
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/data-lineage',
      element: <DataLineageExplorer />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    {
      path: '/self-diagnostics',
      element: <PlatformSelfDiagnostics />,
      requiresAuth: true,
      permission: [Permission.VIEW_OPERATIONS, Permission.VIEW_OBSERVABILITY],
      requireAllPermissions: true,
    },
    {
      path: '/review',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_REVIEW_QUEUE,
    },
    {
      path: '/review/clinical',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_CLINICAL_AI,
    },
    {
      path: '/review/documentation',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_DOCUMENTATION,
    },
    {
      path: '/review/privacy',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_PRIVACY_REQUESTS,
    },
    {
      path: '/review/governance',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_GOVERNANCE,
    },
    {
      path: '/audit',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    {
      path: '/audit/ai',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    {
      path: '/audit/phi',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_PHI_AUDIT,
    },
    {
      path: '/audit/integrations',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    {
      path: '/audit/policy',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    ...AUDIT_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/audit" />,
      requiresAuth: true,
    })),
    {
      path: '/analytics',
      element: <AnalyticsDashboard />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/costs',
      element: <CostAnalyticsDashboard />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/governance',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_GOVERNANCE,
    },
    {
      path: '/governance/clinical',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_GOVERNANCE,
    },
    {
      path: '/governance/clinical/policies',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_CLINICAL_POLICY,
    },
    {
      path: '/governance/clinical/release-gates',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.APPROVE_CLINICAL_POLICY,
    },
    {
      path: '/governance/clinical/safety-findings',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_SAFETY_FINDINGS,
    },
    {
      path: '/governance/ai-security',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_AI_SECURITY,
    },
    {
      path: '/governance/ai-security/prompt-firewall',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_AI_SECURITY,
    },
    {
      path: '/governance/ai-security/model-access',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_AI_SECURITY,
    },
    {
      path: '/governance/ai-security/incidents',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_AI_SECURITY_INCIDENTS,
    },
    {
      path: '/governance/regulatory',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_REGULATORY,
    },
    {
      path: '/governance/regulatory/capabilities',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_REGULATORY,
    },
    {
      path: '/governance/regulatory/intended-use',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_REGULATORY,
    },
    {
      path: '/governance/regulatory/evidence',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.APPROVE_REGULATORY,
    },
    {
      path: '/governance/equity',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_EQUITY_METRICS,
    },
    {
      path: '/governance/equity/metrics',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_EQUITY_METRICS,
    },
    {
      path: '/governance/equity/cohorts',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_EQUITY_COHORTS,
    },
    {
      path: '/governance/equity/findings',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_BIAS_FINDINGS,
    },
    {
      path: '/governance/equity/reports',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.EXPORT_EQUITY_REPORTS,
    },
    {
      path: '/governance/validation',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_VALIDATION,
    },
    {
      path: '/governance/validation/scenarios',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_VALIDATION,
    },
    {
      path: '/governance/validation/synthetic-patients',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_VALIDATION,
    },
    {
      path: '/governance/validation/runs',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.RUN_VALIDATION,
    },
    {
      path: '/governance/validation/release-gates',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.APPROVE_VALIDATION,
    },
    {
      path: '/governance/ai',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_GOVERNANCE,
    },
    {
      path: '/governance/model-usage',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/governance/costs',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: [Permission.MANAGE_SUBSCRIPTIONS, Permission.VIEW_ANALYTICS],
      requireAllPermissions: true,
    },
    {
      path: '/governance/clinical-safety',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.REVIEW_SAFETY_FINDINGS,
    },
    {
      path: '/governance/consent',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.MANAGE_CONSENT,
    },
    {
      path: '/governance/privacy',
      element: <PlatformGovernanceWorkspace />,
      requiresAuth: true,
      permission: Permission.VIEW_PRIVACY_CENTER,
    },

    {
      path: '*',
      element: (
        <ToolNotFound
          title="Page not found"
          description="The requested route does not exist in this workspace."
        />
      ),
      requiresAuth: true,
    },
  ];

  return (
    <Routes>
      {routes.map((route) => (
        <Route key={route.path} path={route.path} element={resolveElement(route)} />
      ))}
    </Routes>
  );
}

// ==================== APP ====================
function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <NotificationProvider>
            <WorkspaceProvider>
              <CostTrackingProvider>
                <ToolPreferencesProvider>
                  <UserIdentityProvider>
                    <ConversationProvider>
                      <SystemConfigProvider>
                        <OfflineProvider>
                          <ErrorBoundary>
                            <Suspense fallback={<PageLoader />}>
                              <AppRoutes />
                            </Suspense>
                            <NotificationToasts />
                          </ErrorBoundary>
                        </OfflineProvider>
                      </SystemConfigProvider>
                    </ConversationProvider>
                  </UserIdentityProvider>
                </ToolPreferencesProvider>
              </CostTrackingProvider>
            </WorkspaceProvider>
          </NotificationProvider>
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
