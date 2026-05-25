import React, { useState, useEffect, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser, Permission } from './contexts/UserContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { ToolPreferencesProvider, useToolPreferences } from './contexts/ToolPreferencesContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
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
import { applyRegistryToolLaunch } from './navigation/registryToolLaunch';
import { AUTH_PATH_ALIASES, AUTH_SIGNUP_PATH_ALIASES } from './routing/authPathAliases';
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
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Patients = lazyWithRetry(() => import('./pages/Patients'));
const Operations = lazyWithRetry(() => import('./pages/Operations'));
const LiveTrackingMap = lazyWithRetry(() => import('./pages/LiveTrackingMap'));
const MedicalIotDashboard = lazyWithRetry(() => import('./pages/MedicalIotDashboard'));
const HospitalMapDashboard = lazyWithRetry(() => import('./pages/HospitalMapDashboard'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const ProfileSettings = lazyWithRetry(() => import('./pages/ProfileSettings'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));

// Lazy-loaded pages for better performance (loaded on demand)
const NotificationPreferences = lazyWithRetry(() => import('./pages/NotificationPreferences'));
const TwoFactorSetup = lazyWithRetry(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = lazyWithRetry(() => import('./pages/BiometricSetup'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const AuditLogs = lazyWithRetry(() => import('./pages/AuditLogs'));
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
const PulmonologyAssistantPage = lazyWithRetry(() => import('./pages/tools/PulmonologyAssistantPage'));
const NephrologyAssistantPage = lazyWithRetry(() => import('./pages/tools/NephrologyAssistantPage'));
const GastroenterologyAssistantPage = lazyWithRetry(() => import('./pages/tools/GastroenterologyAssistantPage'));
const EndocrineMetabolicAssistantPage = lazyWithRetry(() => import('./pages/tools/EndocrineMetabolicAssistantPage'));
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

function NotificationToasts() {
  const { notifications, removeNotification } = useNotifications();
  return <NotificationToastContainer toasts={notifications} onDismiss={removeNotification} />;
}

// ==================== AUTH PAGE ====================
function AuthPage() {
  const { setAuthToken, setUser } = useUser();
  const navigate = useNavigate();

  const handleAuthSuccess = (token, user) => {
    flushSync(() => {
      setAuthToken(token);
      if (user) setUser(user);
    });
    navigate('/dashboard', { replace: true });
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
          ? 'Direct sign-in with API access.'
          : 'Direct sign-in using local UI data only. Start the backend for tool APIs.'
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Direct sign-in auth bypass failed from welcome page', { err });
      error('Direct sign-in failed', 'Unable to start the local direct sign-in session.');
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
              Direct Sign In
            </button>
          )}
        </div>

        {enableDevAuthBypass && (
          <p className="welcome-page-dev-note">
            Direct sign-in is enabled for local development and uses the same app shell routes as
            signed-in users.
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
  const {
    conversations,
    activeConversationId,
    selectConversation,
    addConversation,
    selectedTool,
    setActiveTool,
    selectTool,
    addMessage,
  } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const navigate = useNavigate();
  const location = useLocation();

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

  const handleToolSelect = (toolId) => {
    if (toolId) {
      applyRegistryToolLaunch(toolId, {
        navigate,
        addMessage,
        selectTool,
        setActiveTool,
        recordToolAccess,
        replace: true,
      });
    } else {
      setActiveTool(null);
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
    }
  };

  const handleOpenToolsOverview = () => {
    setActiveTool(null);
    navigate('/tools');
  };

  const handleOpenToolsCatalog = () => {
    setActiveTool(null);
    navigate('/tools/catalog');
  };

  const isConversationViewport = ['/chat', '/assistant'].includes(location.pathname);

  return (
    <AppShell
      isAuthed={true}
      conversations={conversations}
      activeConversation={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onSignOut={handleSignOut}
      healthStatus="online"
      currentTool={selectedTool}
      onToolSelect={handleToolSelect}
      onOpenToolsOverview={handleOpenToolsOverview}
      onOpenToolsCatalog={handleOpenToolsCatalog}
      isDevAuthBypass={isDevAuthBypass}
      devAuthBannerLabel={user?.devAuthLabel || 'Direct Sign In'}
    >
      <div
        className={`app-shell-page-body${isConversationViewport ? ' app-shell-page-body--conversation' : ''}`}
      >
        {children}
      </div>
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

const ASSISTANT_ROUTE_ALIASES = ['/ai', '/copilot'];
const TOOLS_ROUTE_ALIASES = ['/all-tools', '/clinical-tools'];
const CALCULATORS_ROUTE_ALIASES = ['/calculators'];
const LIVE_MAP_ROUTE_ALIASES = ['/maps', '/tracking', '/live-tracking'];
const FLEET_MAP_ROUTE_ALIASES = ['/fleet/live-map', '/fleet/tracking'];

// ==================== ROUTING ====================
function AppRoutes() {
  const { isAuthenticated, isLoading } = useUser();
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
      return <Navigate to="/auth" replace />;
    }

    if (publicOnly && isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    if (permission) {
      return (
        <PermissionGate
          permission={permission}
          requireAll={requireAllPermissions}
          fallback={<Navigate to="/tools" replace />}
        >
          {element}
        </PermissionGate>
      );
    }

    return element;
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
      publicOnly: true,
    },
    {
      path: '/auth/callback',
      element: (
        <AuthShell>
          <LegacyOAuthCallbackRedirect />
        </AuthShell>
      ),
      publicOnly: true,
    },
    ...AUTH_PATH_ALIASES.map((path) => ({
      path,
      element: <AuthPathRedirect />,
      publicOnly: true,
    })),

    {
      path: '/dashboard',
      element: (
        <AppShellPage>
          <CommandDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/home',
      element: <LegacyProtectedRouteRedirect to="/dashboard" />,
      requiresAuth: true,
    },
    {
      path: '/assistant',
      element: (
        <AppShellPage>
          <Dashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/chat',
      element: <LegacyProtectedRouteRedirect to="/assistant" />,
      requiresAuth: true,
    },
    ...ASSISTANT_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/assistant" />,
      requiresAuth: true,
    })),
    {
      path: '/patients',
      element: (
        <AppShellPage>
          <Patients />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/operations',
      element: (
        <AppShellPage>
          <Operations />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/live-map',
      element: (
        <AppShellPage>
          <LiveTrackingMap />
        </AppShellPage>
      ),
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
      element: (
        <AppShellPage>
          <MedicalIotDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/hospital-map',
      element: (
        <AppShellPage>
          <HospitalMapDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },

    // Clinical tools: canonical routes render their product pages directly.
    {
      path: '/tools',
      element: (
        <AppShellPage>
          <ToolsOverview />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    ...TOOLS_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/tools" />,
      requiresAuth: true,
    })),
    {
      path: '/tools/catalog',
      element: (
        <AppShellPage>
          <ClinicalToolCatalog />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/tools/drug-checker',
      element: (
        <AppShellPage>
          <DrugChecker />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/lab-interpreter',
      element: (
        <AppShellPage>
          <LabInterpreter />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    ...CALCULATOR_ROUTE_DEFS.map(({ path, calculatorSlug }) => ({
      path,
      element: (
        <AppShellPage>
          <Calculators initialCalculatorId={calculatorSlug} />
        </AppShellPage>
      ),
      requiresAuth: true,
    })),
    ...LEGACY_CALCULATOR_ROUTE_ALIASES.map(({ path, to }) => ({
      path,
      element: <LegacyProtectedRouteRedirect to={to} />,
      requiresAuth: true,
    })),
    {
      path: '/tools/calculators',
      element: (
        <AppShellPage>
          <Calculators />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/calculators/:slug',
      element: (
        <AppShellPage>
          <Calculators />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    ...CALCULATORS_ROUTE_ALIASES.map((path) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/tools/calculators" />,
      requiresAuth: true,
    })),
    {
      path: '/tools/protocols',
      element: (
        <AppShellPage>
          <Protocols />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/diagnosis',
      element: (
        <AppShellPage>
          <DiagnosisAssistant />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/procedures',
      element: (
        <AppShellPage>
          <ProcedureGuide />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/ambient-scribe',
      element: (
        <AppShellPage>
          <AmbientScribe />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/calculator-recommender',
      element: (
        <AppShellPage>
          <CalculatorRecommender />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/pulmonology/:toolId',
      element: (
        <AppShellPage>
          <PulmonologyAssistantPage />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/nephrology/:toolId',
      element: (
        <AppShellPage>
          <NephrologyAssistantPage />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/gastroenterology/:toolId',
      element: (
        <AppShellPage>
          <GastroenterologyAssistantPage />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/endocrine/:toolId',
      element: (
        <AppShellPage>
          <EndocrineMetabolicAssistantPage />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/guideline-rag',
      element: (
        <AppShellPage>
          <GuidelineRag />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.USE_AI_CHAT,
    },
    {
      path: '/tools/differential-ai',
      element: (
        <AppShellPage>
          <DifferentialAi />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/timeline-ai',
      element: (
        <AppShellPage>
          <TimelineAi />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/patient-summary-ai',
      element: (
        <AppShellPage>
          <PatientSummaryAi />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/order-set-ai',
      element: (
        <AppShellPage>
          <OrderSetAi />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/ai-explainability',
      element: (
        <AppShellPage>
          <AiExplainability />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/tools/clinical-audit',
      element: (
        <AppShellPage>
          <ClinicalAudit />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },

    {
      path: '/fleet',
      element: <LegacyProtectedRouteRedirect to="/operations" />,
      requiresAuth: true,
    },
    {
      path: '/catalog',
      element: <LegacyProtectedRouteRedirect to="/tools/catalog" />,
      requiresAuth: true,
    },
    {
      path: '/fleet/command',
      element: (
        <AppShellPage>
          <FleetDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/fleet/map',
      element: (
        <AppShellPage>
          <FleetLiveMap />
        </AppShellPage>
      ),
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
      element: (
        <AppShellPage>
          <PredictiveMaintenance />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/fleet/route-optimizer',
      element: (
        <AppShellPage>
          <RouteOptimizer />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/tools/*',
      element: (
        <AppShellPage>
          <ToolNotFound />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/fleet/*',
      element: (
        <AppShellPage>
          <ToolsAreaFallback />
        </AppShellPage>
      ),
      requiresAuth: true,
    },

    // Clinical Intelligence routes
    {
      path: '/clinical/alerts',
      element: (
        <AppShellPage>
          <ClinicalAlertsPage />
        </AppShellPage>
      ),
      requiresAuth: true,
    },

    {
      path: '/profile',
      element: (
        <AppShellPage>
          <Profile />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/profile-settings',
      element: (
        <AppShellPage>
          <ProfileSettings />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/settings',
      element: (
        <AppShellPage>
          <Settings />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/notifications',
      element: (
        <AppShellPage>
          <NotificationPreferences />
        </AppShellPage>
      ),
      requiresAuth: true,
    },

    {
      path: '/two-factor-setup',
      element: (
        <AppShellPage>
          <TwoFactorSetup />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/biometric-setup',
      element: (
        <AppShellPage>
          <BiometricSetup />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/onboarding',
      element: (
        <AppShellPage>
          <Onboarding />
        </AppShellPage>
      ),
      requiresAuth: true,
    },

    {
      path: '/consent',
      element: (
        <AppShellPage>
          <ConsentFlow />
        </AppShellPage>
      ),
      requiresAuth: true,
    },
    {
      path: '/consent-history',
      element: (
        <AppShellPage>
          <ConsentHistory />
        </AppShellPage>
      ),
      requiresAuth: true,
    },

    {
      path: '/privacy',
      element: (
        <PublicShell>
          <PrivacyPolicy />
        </PublicShell>
      ),
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
      element: (
        <AppShellPage>
          <TeamManagement />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.MANAGE_USERS,
    },
    {
      path: '/audit-logs',
      element: (
        <AppShellPage>
          <AuditLogs />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS,
    },
    {
      path: '/analytics',
      element: (
        <AppShellPage>
          <AnalyticsDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/costs',
      element: (
        <AppShellPage>
          <CostAnalyticsDashboard />
        </AppShellPage>
      ),
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },

    {
      path: '*',
      element: isAuthenticated ? (
        <AppShellPage>
          <ToolNotFound
            title="Page not found"
            description="The requested route does not exist in this workspace."
          />
        </AppShellPage>
      ) : (
        <Navigate to="/auth" replace />
      ),
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
