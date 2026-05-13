import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser, Permission } from './contexts/UserContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { ToolPreferencesProvider } from './contexts/ToolPreferencesContext';
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
import logger from './utils/logger';
import { NavIcon } from './navigation/NavIcon';
import { CHROME_ICONS } from './navigation/iconRegistry';
import { getToolById } from './data/toolRegistry';

// Page imports - Public
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import GDPRNotice from './pages/GDPRNotice';
import HIPAANotice from './pages/HIPAANotice';
import HelpCenter from './pages/HelpCenter';

// Page imports - Authenticated (Core pages loaded immediately)
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProfileSettings from './pages/ProfileSettings';
import Settings from './pages/Settings';

// Lazy-loaded pages for better performance (loaded on demand)
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const TwoFactorSetup = lazy(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = lazy(() => import('./pages/BiometricSetup'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const CostAnalyticsDashboard = lazy(() => import('./pages/CostAnalyticsDashboard'));
const ConsentFlow = lazy(() => import('./pages/legal/ConsentFlow').then(m => ({ default: m.ConsentFlow })));
const ConsentHistory = lazy(() => import('./pages/legal/ConsentHistory').then(m => ({ default: m.ConsentHistory })));
const TeamManagement = lazy(() => import('./pages/team/TeamManagement').then(m => ({ default: m.TeamManagement })));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));

// Tool pages - lazy loaded inside Dashboard drawer only
const ToolsOverview = lazy(() => import('./pages/tools/ToolsOverview'));
const SharedToolSession = lazy(() => import('./pages/tools/SharedToolSession'));

// Clinical Intelligence pages
const ClinicalAlertsPage = lazy(() => import('./pages/ClinicalAlertsPage'));

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
  return (
    <NotificationToastContainer
      toasts={notifications}
      onDismiss={removeNotification}
    />
  );
}

// ==================== AUTH PAGE ====================
function AuthPage() {
  const { setAuthToken, setUser } = useUser();
  const navigate = useNavigate();

  const handleAuthSuccess = (token, user) => {
    setAuthToken(token);
    if (user) setUser(user);
    navigate('/dashboard', { replace: true });
  };

  return <Auth onAuthSuccess={handleAuthSuccess} />;
}

// ==================== WELCOME PAGE ====================
function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page-root">
      <div className="welcome-page-inner">
        <div className="welcome-page-icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.hospital} size={56} />
        </div>

        <h1 className="welcome-page-title">CareDroid-Clinical-AI</h1>

        <p className="welcome-page-lead">
          Your universal medical AI doctor. Get instant clinical guidance, drug interaction checks, lab interpretations, and evidence-based recommendations.
        </p>

        <div className="welcome-page-grid">
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.checkCircle} size={20} aria-hidden />
              <span>Clinical Tools</span>
            </div>
            <div className="welcome-page-card-desc">Drug checker, calculators, lab interpreter, protocols</div>
          </div>
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.shield} size={20} aria-hidden />
              <span>Secure & Compliant</span>
            </div>
            <div className="welcome-page-card-desc">HIPAA-ready, encrypted conversations, audit logging</div>
          </div>
          <div className="welcome-page-card">
            <div className="welcome-page-card-title welcome-page-card-title--icon">
              <NavIcon icon={CHROME_ICONS.rocket} size={20} aria-hidden />
              <span>Always On</span>
            </div>
            <div className="welcome-page-card-desc">Works offline, stores conversations, available everywhere</div>
          </div>
        </div>

        <button type="button" className="welcome-page-cta" onClick={() => navigate('/auth')}>
          Sign In or Create Account
        </button>

        <p className="welcome-page-footnote">Healthcare professionals only. Secure login required.</p>
      </div>
    </div>
  );
}

function AppShellPage({ children }) {
  const { signOut } = useUser();
  const {
    conversations,
    activeConversationId,
    selectConversation,
    addConversation,
    selectedTool,
    setActiveTool,
  } = useConversation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const handleNewConversation = () => {
    addConversation();
    navigate({ pathname: '/dashboard', search: '' }, { replace: true });
  };

  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate({ pathname: '/dashboard', search: '' }, { replace: true });
  };

  const handleToolSelect = (toolId) => {
    if (toolId) {
      setActiveTool(toolId);
      const tool = getToolById(toolId);
      const q = new URLSearchParams();
      q.set('tool', toolId);
      if (tool?.initialCalc) q.set('calc', tool.initialCalc);
      else q.delete('calc');
      navigate(`/dashboard?${q.toString()}`, { replace: true });
    } else {
      setActiveTool(null);
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
    }
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
      currentTool={selectedTool}
      onToolSelect={handleToolSelect}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          minHeight: 0,
        }}
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

// ==================== ROUTING ====================
function AppRoutes() {
  const { isAuthenticated, isLoading } = useUser();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsChecking(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isChecking || isLoading) {
    return (
      <div className="app-init-screen">
        <h1>Initializing...</h1>
      </div>
    );
  }

  const resolveElement = ({ element, requiresAuth, publicOnly, permission }) => {
    if (requiresAuth && !isAuthenticated) {
      return <Navigate to="/auth" replace />;
    }

    if (publicOnly && isAuthenticated) {
      return <Navigate to="/dashboard" replace />;
    }

    if (permission) {
      return (
        <PermissionGate permission={permission} fallback={<Navigate to="/dashboard" replace />}>
          {element}
        </PermissionGate>
      );
    }

    return element;
  };

  const routes = [
    { path: '/', element: <PublicShell><WelcomePage /></PublicShell>, publicOnly: true },
    { path: '/auth', element: <AuthShell><AuthPage /></AuthShell>, publicOnly: true },
    { path: '/auth-callback', element: <AuthShell><AuthCallback /></AuthShell>, publicOnly: true },
    { path: '/auth/callback', element: <AuthShell><LegacyOAuthCallbackRedirect /></AuthShell>, publicOnly: true },

    { path: '/dashboard', element: <AppShellPage><Dashboard /></AppShellPage>, requiresAuth: true },

    // Tool routes redirect into unified chat + tool panel (deep links preserved)
    { path: '/tools', element: <AppShellPage><ToolsOverview /></AppShellPage>, requiresAuth: true },
    { path: '/tools/drug-checker', element: <Navigate to="/dashboard?tool=drug-check" replace />, requiresAuth: true },
    { path: '/tools/lab-interpreter', element: <Navigate to="/dashboard?tool=lab-interp" replace />, requiresAuth: true },
    { path: '/tools/calculator/sofa', element: <Navigate to="/dashboard?tool=sofa-score" replace />, requiresAuth: true },
    { path: '/tools/calculator/gfr', element: <Navigate to="/dashboard?tool=calc-gfr" replace />, requiresAuth: true },
    { path: '/tools/calculator/bmi', element: <Navigate to="/dashboard?tool=calc-bmi" replace />, requiresAuth: true },
    { path: '/tools/calculator/chads2vasc', element: <Navigate to="/dashboard?tool=calc-chads2vasc" replace />, requiresAuth: true },
    { path: '/tools/calculators', element: <Navigate to="/dashboard?tool=calculators" replace />, requiresAuth: true },
    { path: '/tools/protocols', element: <Navigate to="/dashboard?tool=protocols" replace />, requiresAuth: true },
    { path: '/tools/diagnosis', element: <Navigate to="/dashboard?tool=diagnosis" replace />, requiresAuth: true },
    { path: '/tools/procedures', element: <Navigate to="/dashboard?tool=procedures" replace />, requiresAuth: true },

    // Clinical Intelligence routes
    { path: '/clinical/alerts', element: <AppShellPage><ClinicalAlertsPage /></AppShellPage>, requiresAuth: true },

    { path: '/profile', element: <AppShellPage><Profile /></AppShellPage>, requiresAuth: true },
    { path: '/profile-settings', element: <AppShellPage><ProfileSettings /></AppShellPage>, requiresAuth: true },
    { path: '/settings', element: <AppShellPage><Settings /></AppShellPage>, requiresAuth: true },
    { path: '/notifications', element: <AppShellPage><NotificationPreferences /></AppShellPage>, requiresAuth: true },

    { path: '/two-factor-setup', element: <AppShellPage><TwoFactorSetup /></AppShellPage>, requiresAuth: true },
    { path: '/biometric-setup', element: <AppShellPage><BiometricSetup /></AppShellPage>, requiresAuth: true },
    { path: '/onboarding', element: <AppShellPage><Onboarding /></AppShellPage>, requiresAuth: true },

    { path: '/consent', element: <AppShellPage><ConsentFlow /></AppShellPage>, requiresAuth: true },
    { path: '/consent-history', element: <AppShellPage><ConsentHistory /></AppShellPage>, requiresAuth: true },

    { path: '/privacy', element: <PublicShell><PrivacyPolicy /></PublicShell> },
    { path: '/terms', element: <PublicShell><TermsOfService /></PublicShell> },
    { path: '/gdpr', element: <PublicShell><GDPRNotice /></PublicShell> },
    { path: '/hipaa', element: <PublicShell><HIPAANotice /></PublicShell> },
    { path: '/help', element: <PublicShell><HelpCenter /></PublicShell> },
    { path: '/shared/tools/:shareId', element: <PublicShell><SharedToolSession /></PublicShell> },

    {
      path: '/team',
      element: <AppShellPage><TeamManagement /></AppShellPage>,
      requiresAuth: true,
      permission: Permission.MANAGE_USERS
    },
    {
      path: '/audit-logs',
      element: <AppShellPage><AuditLogs /></AppShellPage>,
      requiresAuth: true,
      permission: Permission.VIEW_AUDIT_LOGS
    },
    {
      path: '/analytics',
      element: <AppShellPage><AnalyticsDashboard /></AppShellPage>,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS
    },
    {
      path: '/costs',
      element: <AppShellPage><CostAnalyticsDashboard /></AppShellPage>,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS
    },

    { path: '*', element: isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/" replace /> }
  ];

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={resolveElement(route)}
        />
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
