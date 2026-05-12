import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
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
import { useNotificationActions } from './hooks/useNotificationActions';
import logger from './utils/logger';

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

// Tool pages - lazy loaded
const ToolsOverview = lazy(() => import('./pages/tools/ToolsOverview'));
const DrugChecker = lazy(() => import('./pages/tools/DrugChecker'));
const LabInterpreter = lazy(() => import('./pages/tools/LabInterpreter'));
const Calculators = lazy(() => import('./pages/tools/Calculators'));
const Protocols = lazy(() => import('./pages/tools/Protocols'));
const DiagnosisAssistant = lazy(() => import('./pages/tools/DiagnosisAssistant'));
const ProcedureGuide = lazy(() => import('./pages/tools/ProcedureGuide'));
const SharedToolSession = lazy(() => import('./pages/tools/SharedToolSession'));

// Clinical Intelligence pages
const ClinicalAlertsPage = lazy(() => import('./pages/ClinicalAlertsPage'));

// Loading fallback component
const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    flexDirection: 'column',
    gap: '16px'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '4px solid var(--panel-border)',
      borderTopColor: 'var(--accent-green)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <div style={{
      fontSize: '14px',
      color: 'var(--muted-text)'
    }}>Loading...</div>
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
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'var(--navy-bg)',
      color: 'var(--text-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        <div style={{
          fontSize: '64px',
          marginBottom: '24px'
        }}>🏥</div>
        
        <h1 style={{
          fontSize: '48px',
          fontWeight: 700,
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #00ff88, #00ffff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          CareDroid-Clinical-AI
        </h1>

        <p style={{
          fontSize: '18px',
          color: 'var(--muted-text)',
          marginBottom: '40px',
          lineHeight: 1.6
        }}>
          Your universal medical AI doctor. Get instant clinical guidance, drug interaction checks, lab interpretations, and evidence-based recommendations.
        </p>

        <div style={{
          display: 'grid',
          gap: '16px',
          marginBottom: '40px'
        }}>
          <div style={{
            padding: '16px',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>✅ Clinical Tools</div>
            <div style={{ fontSize: '14px', color: 'var(--muted-text)' }}>Drug checker, calculators, lab interpreter, protocols</div>
          </div>
          <div style={{
            padding: '16px',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>🔒 Secure & Compliant</div>
            <div style={{ fontSize: '14px', color: 'var(--muted-text)' }}>HIPAA-ready, encrypted conversations, audit logging</div>
          </div>
          <div style={{
            padding: '16px',
            background: 'rgba(0, 255, 136, 0.1)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '12px'
          }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>🚀 Always On</div>
            <div style={{ fontSize: '14px', color: 'var(--muted-text)' }}>Works offline, stores conversations, available everywhere</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/auth')}
          style={{
            padding: '14px 32px',
            fontSize: '16px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #00ff88, #00ffff)',
            color: 'var(--navy-ink)',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)'
          }}
          onMouseOver={(e) => e.target.style.boxShadow = '0 12px 32px rgba(0, 255, 136, 0.5)'}
          onMouseOut={(e) => e.target.style.boxShadow = '0 8px 24px rgba(0, 255, 136, 0.3)'}
        >
          Sign In or Create Account
        </button>

        <p style={{
          marginTop: '24px',
          fontSize: '14px',
          color: 'var(--muted-text)'
        }}>
          Healthcare professionals only. Secure login required.
        </p>
      </div>
    </div>
  );
}

function AppShellPage({ children }) {
  const { signOut } = useUser();
  const { conversations, activeConversationId, selectConversation, addConversation } = useConversation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const handleNewConversation = () => {
    addConversation();
  };

  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate('/dashboard', { replace: true });
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
    >
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }}>
        {children}
      </div>
    </AppShell>
  );
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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--navy-bg)',
        color: 'var(--text-color)'
      }}>
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

    { path: '/dashboard', element: <Dashboard />, requiresAuth: true },

    // Tool routes - all require authentication
    { path: '/tools', element: <AppShellPage><ToolsOverview /></AppShellPage>, requiresAuth: true },
    { path: '/tools/drug-checker', element: <AppShellPage><DrugChecker /></AppShellPage>, requiresAuth: true },
    { path: '/tools/lab-interpreter', element: <AppShellPage><LabInterpreter /></AppShellPage>, requiresAuth: true },
    { path: '/tools/calculators', element: <AppShellPage><Calculators /></AppShellPage>, requiresAuth: true },
    { path: '/tools/protocols', element: <AppShellPage><Protocols /></AppShellPage>, requiresAuth: true },
    { path: '/tools/diagnosis', element: <AppShellPage><DiagnosisAssistant /></AppShellPage>, requiresAuth: true },
    { path: '/tools/procedures', element: <AppShellPage><ProcedureGuide /></AppShellPage>, requiresAuth: true },

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
    </BrowserRouter>
  );
}

export default App;
