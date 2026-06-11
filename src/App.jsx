import React, { useState, useEffect, Suspense } from 'react';
import { flushSync } from 'react-dom';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider, useUser, Permission } from './contexts/UserContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { ConversationProvider, useConversation } from './contexts/ConversationContext';
import { ToolPreferencesProvider } from './contexts/ToolPreferencesContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { OrganizationContextProvider } from './contexts/OrganizationContext';
import { WhiteLabelProvider } from './contexts/WhiteLabelContext';
import { UserIdentityProvider } from './contexts/UserIdentityContext';
import { CostTrackingProvider } from './contexts/CostTrackingContext';
import { SystemConfigProvider } from './contexts/SystemConfigContext';
import { TenantContextProvider } from './contexts/TenantContext';
import { EmergencyDepartmentProvider } from './contexts/EmergencyDepartmentContext';
import OfflineProvider from './contexts/OfflineProvider';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGate from './components/PermissionGate';
import { NotificationToastContainer } from './components/notifications/NotificationToast';
import EmergencyWhiteboard from './components/EmergencyWhiteboard';
import EMSPipeline from './components/EMSPipeline';
import QueueIntelligencePanel from './components/QueueIntelligencePanel';
import ReferralPanel from './components/ReferralPanel';
import ShiftSummary from './components/ShiftSummary';
import AppShell from './layout/AppShell';
import AuthShell from './layout/AuthShell';
import { PublicShell } from './layout/PublicShell';
import { createDevAuthSession, isDevAuthBypassEnabled } from './auth/devAuthBypass';
import { useNotificationActions } from './hooks/useNotificationActions';
import logger from './utils/logger';
import { NavIcon } from './navigation/NavIcon';
import { CHROME_ICONS } from './navigation/iconRegistry';
import { AUTH_PATH_ALIASES, PROTECTED_ROUTE_ALIAS_REDIRECTS } from './config/routes.config';
import {
  CALCULATOR_ROUTE_DEFS,
  LEGACY_CALCULATOR_ROUTE_ALIASES,
} from './routes/clinicalToolRoutes';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { useEmergencyStore } from '../store/emergencyStore';

// Page imports - Public
import { PrivacyPolicy } from './pages/legal/PrivacyPolicy';
import { TermsOfService } from './pages/legal/TermsOfService';
import GDPRNotice from './pages/GDPRNotice';
import HIPAANotice from './pages/HIPAANotice';
import HelpCenter from './pages/HelpCenter';
import Version from './pages/Version';

// Authenticated shell pages — lazy for smaller initial JS (mobile LCP)
const {
  SearchResultsPage,
  HealthcareKnowledgeHubPage,
  ClinicalTimelinePage,
  NotificationCenterPage,
  WorkflowBuilderPage,
  WorkflowMiningEnginePage,
  WorkspaceDependencyGraphPage,
  AssetLibraryPage,
} = {
  SearchResultsPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.SearchResultsPage }))
  ),
  HealthcareKnowledgeHubPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.HealthcareKnowledgeHubPage }))
  ),
  ClinicalTimelinePage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.ClinicalTimelinePage }))
  ),
  NotificationCenterPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.NotificationCenterPage }))
  ),
  WorkflowBuilderPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.WorkflowBuilderPage }))
  ),
  WorkflowMiningEnginePage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.WorkflowMiningEnginePage }))
  ),
  WorkspaceDependencyGraphPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.WorkspaceDependencyGraphPage }))
  ),
  AssetLibraryPage: lazyWithRetry(() =>
    import('./pages/PlatformOSPages').then((m) => ({ default: m.AssetLibraryPage }))
  ),
};
const CapabilityDiscovery = lazyWithRetry(() => import('./pages/CapabilityDiscovery'));
const RecommendationsPage = lazyWithRetry(() => import('./pages/RecommendationsPage'));
const AutomationAuditTrail = lazyWithRetry(() => import('./pages/AutomationAuditTrail'));
const DependencyMap = lazyWithRetry(() => import('./pages/DependencyMap'));
const DependencyGraph = lazyWithRetry(() => import('./pages/DependencyGraph'));
const Artifacts = lazyWithRetry(() => import('./pages/Artifacts'));
const ResearchEvidenceHub = lazyWithRetry(() => import('./pages/ResearchEvidenceHub'));
const ClinicalDocumentationAssistant = lazyWithRetry(
  () => import('./pages/ClinicalDocumentationAssistant')
);
const ClinicalKnowledgeGraph = lazyWithRetry(() => import('./pages/ClinicalKnowledgeGraph'));
const ClinicalDecisionSupport = lazyWithRetry(() => import('./pages/ClinicalDecisionSupport'));
const Competencies = lazyWithRetry(() => import('./pages/Competencies'));
const Credentials = lazyWithRetry(() => import('./pages/Credentials'));
const Medical3DViewer = lazyWithRetry(() => import('./pages/Medical3DViewer'));
const PlatformSystemPage = lazyWithRetry(() => import('./pages/platform/PlatformSystemPage'));
const PlatformGovernanceWorkspace = lazyWithRetry(
  () => import('./pages/platform/PlatformGovernanceWorkspace')
);
const FeatureFlagCenter = lazyWithRetry(() => import('./pages/FeatureFlagCenter'));
const PluginMarketplace = lazyWithRetry(() => import('./pages/PluginMarketplace'));
const DataLineageExplorer = lazyWithRetry(() => import('./pages/DataLineageExplorer'));
const GovernanceRegistry = lazyWithRetry(() => import('./pages/GovernanceRegistry'));
const PlatformSelfDiagnostics = lazyWithRetry(() => import('./pages/PlatformSelfDiagnostics'));
const SystemHealth = lazyWithRetry(() => import('./pages/SystemHealth'));
const SaasHealthCenter = lazyWithRetry(() => import('./pages/SaasHealthCenter'));
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
const CustomerPortalPage = lazyWithRetry(
  () => import('./pages/customer-portal/CustomerPortalPage')
);
const SuccessCenterPage = lazyWithRetry(() => import('./pages/success-center/SuccessCenterPage'));
const KnowledgeBasePage = lazyWithRetry(() => import('./pages/KnowledgeBasePage'));
const MarketplacePage = lazyWithRetry(() => import('./pages/MarketplacePage'));
const EnterpriseReadinessPage = lazyWithRetry(() => import('./pages/EnterpriseReadinessPage'));
const PlatformAdminPage = lazyWithRetry(() => import('./pages/PlatformAdminPage'));
const BillingPage = lazyWithRetry(() => import('./pages/BillingPage'));
const UsagePage = lazyWithRetry(() => import('./pages/UsagePage'));
const {
  OrganizationDashboard,
  OrganizationSettings,
  PackMarketplace,
  AssetLifecycleAdmin,
  CustomerSuccessDashboard,
  OrganizationIntelligenceProfile,
  DepartmentsPage,
  ServiceLinesPage,
  TenantAdministrationCenter,
} = {
  OrganizationDashboard: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.OrganizationDashboard,
    }))
  ),
  OrganizationSettings: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.OrganizationSettings,
    }))
  ),
  PackMarketplace: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({ default: m.PackMarketplace }))
  ),
  AssetLifecycleAdmin: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.AssetLifecycleAdmin,
    }))
  ),
  CustomerSuccessDashboard: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.CustomerSuccessDashboard,
    }))
  ),
  OrganizationIntelligenceProfile: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.OrganizationIntelligenceProfile,
    }))
  ),
  DepartmentsPage: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({ default: m.DepartmentsPage }))
  ),
  ServiceLinesPage: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({ default: m.ServiceLinesPage }))
  ),
  TenantAdministrationCenter: lazyWithRetry(() =>
    import('./pages/organization/OrganizationPages').then((m) => ({
      default: m.TenantAdministrationCenter,
    }))
  ),
};

// Lazy-loaded pages for better performance (loaded on demand)
const NotificationPreferences = lazyWithRetry(() => import('./pages/NotificationPreferences'));
const TwoFactorSetup = lazyWithRetry(() => import('./pages/TwoFactorSetup'));
const BiometricSetup = lazyWithRetry(() => import('./pages/BiometricSetup'));
const Welcome = lazyWithRetry(() => import('./pages/Welcome'));
const {
  ProductsIndexPage,
  ProductDetailPage,
  CommercialPlansPage,
  SpecialtiesIndexPage,
  SpecialtyDetailPage,
  CarePathwaysIndexPage,
  CarePathwayDetailPage,
  AgentsRegistryPage,
  MaturityAssessmentPage,
  OutcomesDashboardPage,
  ValueTrackingPage,
  ProductIntelligenceLayerPage,
  CustomerExpansionOpportunitiesPage,
  IntegrationsMarketplacePage,
  IntegrationReadinessPage,
  HospitalSolutionBuilderPage,
  ConfigurationStudioPage,
  OrganizationOnboardingPage,
} = {
  ProductsIndexPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.ProductsIndexPage }))
  ),
  ProductDetailPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.ProductDetailPage }))
  ),
  CommercialPlansPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.CommercialPlansPage }))
  ),
  SpecialtiesIndexPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.SpecialtiesIndexPage }))
  ),
  SpecialtyDetailPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.SpecialtyDetailPage }))
  ),
  CarePathwaysIndexPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.CarePathwaysIndexPage }))
  ),
  CarePathwayDetailPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.CarePathwayDetailPage }))
  ),
  AgentsRegistryPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.AgentsRegistryPage }))
  ),
  MaturityAssessmentPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.MaturityAssessmentPage,
    }))
  ),
  OutcomesDashboardPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.OutcomesDashboardPage }))
  ),
  ValueTrackingPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({ default: m.ValueTrackingPage }))
  ),
  ProductIntelligenceLayerPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.ProductIntelligenceLayerPage,
    }))
  ),
  CustomerExpansionOpportunitiesPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.CustomerExpansionOpportunitiesPage,
    }))
  ),
  IntegrationsMarketplacePage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.IntegrationsMarketplacePage,
    }))
  ),
  IntegrationReadinessPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.IntegrationReadinessPage,
    }))
  ),
  HospitalSolutionBuilderPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.HospitalSolutionBuilderPage,
    }))
  ),
  ConfigurationStudioPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.ConfigurationStudioPage,
    }))
  ),
  OrganizationOnboardingPage: lazyWithRetry(() =>
    import('./pages/commercial/CommercialPages').then((m) => ({
      default: m.OrganizationOnboardingPage,
    }))
  ),
};
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
          ? 'Platform access started with API support.'
          : 'Platform access started with local UI data while backend APIs are unavailable.'
      );
      navigate('/dashboard', { replace: true });
    } catch (err) {
      logger.error('Platform access failed from welcome page', { err });
      error('Platform access failed', 'Unable to start the platform access session.');
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
              Enter Platform
            </button>
          )}
        </div>

        {enableDevAuthBypass && (
          <p className="welcome-page-dev-note">
            Platform access is enabled for visitors and uses the same app shell routes as signed-in
            clinicians.
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
      devAuthBannerLabel={user?.devAuthLabel || 'Platform Access'}
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

/** Auth entry aliases are bypassed for the public platform build. */
function AuthPathRedirect() {
  return <Navigate to="/emergency" replace />;
}

/** Legacy protected paths stay deep-linkable while canonical routes own the UI. */
function LegacyProtectedRouteRedirect({ to, state }) {
  const location = useLocation();
  return (
    <Navigate
      to={{ pathname: to, search: location.search, hash: location.hash }}
      replace
      state={state}
    />
  );
}

function FutureReleaseStub({ label = 'This module' }) {
  return (
    <section className="ed-route-panel ed-route-panel--future" aria-labelledby="future-release-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="future-release-title">{label} — Coming in a future release</h1>
        <p>This module is parked while the Emergency OS workflow remains the active shell.</p>
      </header>
    </section>
  );
}

function EmergencyCopilotRedirect() {
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);

  useEffect(() => {
    setCopilotOpen(true);
  }, [setCopilotOpen]);

  return (
    <LegacyProtectedRouteRedirect
      to="/emergency"
      state={{
        edNotice: {
          title: 'ED Copilot is open in the right panel',
          message:
            'Chat and AI workflows now live in the persistent Copilot panel, not a page route.',
        },
      }}
    />
  );
}

function WorkspaceRouteRedirect() {
  const { workspaceId, subpage } = useParams();
  const workspaceLabel = workspaceId
    ? `${workspaceId.charAt(0).toUpperCase()}${workspaceId.slice(1).replace(/-/g, ' ')} module`
    : 'Emergency OS module';

  if (workspaceId === 'emergency') {
    const routeMap = {
      whiteboard: '/emergency',
      queues: '/emergency/queues',
      queue: '/emergency/queues',
      ems: '/emergency/ems',
      referrals: '/emergency/referrals',
      capacity: '/emergency/capacity',
      boarding: '/emergency/capacity',
      analytics: '/emergency/capacity',
      'shift-summary': '/emergency/shift',
      shift: '/emergency/shift',
      'command-center': '/emergency',
      copilot: '/emergency',
    };

    return <LegacyProtectedRouteRedirect to={routeMap[subpage] || '/emergency'} />;
  }

  return <FutureReleaseStub label={workspaceLabel} />;
}

function EmergencyQueueRoute() {
  return (
    <section
      className="ed-route-panel ed-route-panel--queue"
      aria-labelledby="emergency-queue-title"
    >
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="emergency-queue-title">Queue Intelligence</h1>
        <p>Live waiting, triage, provider, referral, admission, and reassessment pressure.</p>
      </header>
      <QueueIntelligencePanel collapsed={false} onCollapsedChange={() => {}} />
    </section>
  );
}

function EmergencyCapacityRoute() {
  const capacity = useEmergencyStore((state) => state.capacity);
  const queues = useEmergencyStore((state) => state.queues);

  return (
    <section className="ed-route-panel" aria-labelledby="emergency-capacity-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="emergency-capacity-title">Capacity Detail</h1>
        <p>Current department pressure, room occupancy, boarding risk, and queue load.</p>
      </header>

      <div className="ed-route-panel__metrics" aria-label="Capacity metrics">
        <article>
          <span>Capacity Score</span>
          <strong>{capacity.score}</strong>
          <small>{capacity.label}</small>
        </article>
        <article>
          <span>Occupancy</span>
          <strong>
            {capacity.currentOccupancy}/{capacity.maxCapacity}
          </strong>
          <small>{capacity.occupancyPercent}% rooms occupied</small>
        </article>
        <article>
          <span>Boarding</span>
          <strong>{capacity.boardingCount}</strong>
          <small>{capacity.admissionPendingCount} admission pending</small>
        </article>
        <article>
          <span>EMS Inbound</span>
          <strong>{capacity.emsInboundCount}</strong>
          <small>{capacity.incomingEMSCriticalCount} critical</small>
        </article>
      </div>

      <div className="ed-route-panel__list" aria-label="Queue pressure">
        {queues
          .filter((queue) => queue.patientIds.length > 0)
          .map((queue) => (
            <article key={queue.id}>
              <div>
                <strong>{queue.name}</strong>
                <span>
                  {queue.patientIds.length} patients · Avg {queue.averageWaitMinutes}m · Oldest{' '}
                  {queue.longestWaitMinutes}m
                </span>
              </div>
              <small>{queue.criticalCount} critical</small>
            </article>
          ))}
      </div>
    </section>
  );
}

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
    if (publicOnly && isAuthenticated) {
      return <Navigate to="/emergency" replace />;
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

    if (requiresAuth || !publicOnly) {
      return <AppShellPage>{resolvedElement}</AppShellPage>;
    }

    return resolvedElement;
  };

  const routes = [
    {
      path: '/',
      element: <Navigate to="/emergency" replace />,
      publicOnly: true,
    },
    {
      path: '/auth',
      element: <Navigate to="/emergency" replace />,
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
      path: '/emergency',
      element: <EmergencyWhiteboard />,
      requiresAuth: true,
    },
    {
      path: '/emergency/queues',
      element: <EmergencyQueueRoute />,
      requiresAuth: true,
    },
    {
      path: '/emergency/ems',
      element: <EMSPipeline />,
      requiresAuth: true,
    },
    {
      path: '/emergency/referrals',
      element: <ReferralPanel />,
      requiresAuth: true,
    },
    {
      path: '/emergency/capacity',
      element: <EmergencyCapacityRoute />,
      requiresAuth: true,
    },
    {
      path: '/emergency/shift',
      element: <ShiftSummary />,
      requiresAuth: true,
    },
    {
      path: '/emergency/copilot',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/emergency/whiteboard',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/patients',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/queue',
      element: <LegacyProtectedRouteRedirect to="/emergency/queues" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/analytics',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/boarding',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/command-center',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/emergency/settings',
      element: <FutureReleaseStub label="Emergency OS settings" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/*',
      element: <FutureReleaseStub label="Emergency OS module" />,
      requiresAuth: true,
    },

    {
      path: '/dashboard',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/executive',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/discover',
      element: <CapabilityDiscovery />,
      requiresAuth: true,
    },
    {
      path: '/recommendations',
      element: <RecommendationsPage />,
      requiresAuth: true,
    },
    {
      path: '/automation-audit',
      element: <AutomationAuditTrail />,
      requiresAuth: true,
    },
    {
      path: '/automation-analytics',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/workspace',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/workspace/emergency/whiteboard',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/workspace/emergency/queue',
      element: <LegacyProtectedRouteRedirect to="/emergency/queues" />,
      requiresAuth: true,
    },
    {
      path: '/workspace/emergency/queues',
      element: <LegacyProtectedRouteRedirect to="/emergency/queues" />,
      requiresAuth: true,
    },
    {
      path: '/workspace/emergency/copilot',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/workspace/emergency/settings',
      element: <FutureReleaseStub label="Emergency OS settings" />,
      requiresAuth: true,
    },
    {
      path: '/workspaces',
      element: <FutureReleaseStub label="Emergency OS directory" />,
      requiresAuth: true,
    },
    {
      path: '/workspace/:workspaceId',
      element: <WorkspaceRouteRedirect />,
      requiresAuth: true,
    },
    {
      path: '/workspace/:workspaceId/:subpage',
      element: <WorkspaceRouteRedirect />,
      requiresAuth: true,
    },
    {
      path: '/search',
      element: <SearchResultsPage />,
      requiresAuth: true,
    },
    {
      path: '/knowledge-hub',
      element: <HealthcareKnowledgeHubPage />,
      requiresAuth: true,
    },
    {
      path: '/timeline',
      element: <ClinicalTimelinePage />,
      requiresAuth: true,
    },
    {
      path: '/digital-twin',
      element: <FutureReleaseStub label="Digital twin" />,
      requiresAuth: true,
    },
    {
      path: '/operations',
      element: <FutureReleaseStub label="Operations" />,
      requiresAuth: true,
    },
    {
      path: '/digital-twin-intelligence',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/workflows',
      element: <WorkflowBuilderPage />,
      requiresAuth: true,
    },
    {
      path: '/department-intelligence',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/workflow-mining',
      element: <WorkflowMiningEnginePage />,
      requiresAuth: true,
    },
    {
      path: '/workspace-dependency-graph',
      element: <WorkspaceDependencyGraphPage />,
      requiresAuth: true,
    },
    {
      path: '/assets',
      element: <AssetLibraryPage />,
      requiresAuth: true,
    },
    ...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({
      path,
      element: <LegacyProtectedRouteRedirect to={to} />,
      requiresAuth: true,
    })),
    {
      path: '/assistant',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/patients',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
    },
    {
      path: '/patients/import',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/labs/import',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/medications/import',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/observations/import',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.WRITE_PHI],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workspace',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/summary',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/timeline',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/events',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/risk-history',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/care-plan',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/consent',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.MANAGE_CONSENT,
    },
    {
      path: '/patients/:patientId/source-data',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: Permission.READ_PHI,
    },
    {
      path: '/patients/:patientId/review',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_REVIEW_QUEUE],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/privacy',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_PRIVACY_CENTER],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workflows',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/workflows/:workflowId',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/documentation',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.USE_AI_CHAT],
      requireAllPermissions: true,
    },
    {
      path: '/patients/:patientId/documentation/:documentId',
      element: <LegacyProtectedRouteRedirect to="/emergency" />,
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
      path: '/ai-models',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/memory',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/ai-memory',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
    },
    {
      path: '/training',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: [Permission.CONFIGURE_SYSTEM, Permission.VIEW_ANALYTICS],
    },
    {
      path: '/ai-evaluation',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/ai-command-center',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/platform-learning-engine',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/brain',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/business-brain',
      element: <EmergencyCopilotRedirect />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/live-map',
      element: <FutureReleaseStub label="Live map" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/medical-iot',
      element: <FutureReleaseStub label="Medical IoT" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/hospital-map',
      element: <FutureReleaseStub label="Hospital map" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/devices',
      element: <FutureReleaseStub label="Device fleet" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },

    // Clinical tools: canonical routes render their product pages directly.
    {
      path: '/tools',
      element: <ToolsOverview />,
      requiresAuth: true,
    },
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
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
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
      element: <FutureReleaseStub label="Simulation" />,
      requiresAuth: true,
    },
    {
      path: '/simulation/outcomes',
      element: <FutureReleaseStub label="Simulation outcomes" />,
      requiresAuth: true,
    },
    {
      path: '/simulation/sepsis-deterioration',
      element: <FutureReleaseStub label="Simulation scenario" />,
      requiresAuth: true,
    },
    {
      path: '/simulation/:scenarioId',
      element: <FutureReleaseStub label="Simulation scenario" />,
      requiresAuth: true,
    },
    {
      path: '/laboratory',
      element: <FutureReleaseStub label="Laboratory" />,
      requiresAuth: true,
    },
    {
      path: '/3d-viewer',
      element: <Medical3DViewer />,
      requiresAuth: true,
    },
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
      element: <FutureReleaseStub label="Fleet command" />,
      requiresAuth: true,
    },
    {
      path: '/fleet/map',
      element: <FutureReleaseStub label="Fleet map" />,
      requiresAuth: true,
      permission: [Permission.READ_PHI, Permission.VIEW_ANALYTICS, Permission.CONFIGURE_SYSTEM],
    },
    {
      path: '/fleet/predictive-maintenance',
      element: <FutureReleaseStub label="Fleet predictive maintenance" />,
      requiresAuth: true,
    },
    {
      path: '/fleet/route-optimizer',
      element: <FutureReleaseStub label="Fleet route optimizer" />,
      requiresAuth: true,
    },
    {
      path: '/tools/*',
      element: <ToolNotFound />,
      requiresAuth: true,
    },
    {
      path: '/fleet/*',
      element: <FutureReleaseStub label="Fleet" />,
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
      path: '/customer-portal',
      element: <CustomerPortalPage />,
      requiresAuth: true,
    },
    {
      path: '/knowledge-base',
      element: <KnowledgeBasePage />,
      requiresAuth: true,
    },
    {
      path: '/marketplace',
      element: <MarketplacePage />,
      requiresAuth: true,
    },
    {
      path: '/enterprise-readiness',
      element: <EnterpriseReadinessPage />,
      requiresAuth: true,
    },
    {
      path: '/platform-admin',
      element: <PlatformAdminPage />,
      requiresAuth: true,
    },
    {
      path: '/billing',
      element: <BillingPage />,
      requiresAuth: true,
    },
    {
      path: '/usage',
      element: <UsagePage />,
      requiresAuth: true,
    },
    {
      path: '/organization',
      element: <OrganizationDashboard />,
      requiresAuth: true,
    },
    {
      path: '/organization/settings',
      element: <OrganizationSettings />,
      requiresAuth: true,
    },
    {
      path: '/tenant-admin',
      element: <TenantAdministrationCenter />,
      requiresAuth: true,
    },
    {
      path: '/tenant-admin/workspaces',
      element: <TenantAdministrationCenter />,
      requiresAuth: true,
    },
    {
      path: '/settings/organization',
      element: <OrganizationSettings />,
      requiresAuth: true,
    },
    {
      path: '/settings/organization/packs',
      element: <PackMarketplace />,
      requiresAuth: true,
    },
    {
      path: '/settings/organization/assets',
      element: <AssetLifecycleAdmin />,
      requiresAuth: true,
    },
    {
      path: '/platform-analytics',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
    },
    {
      path: '/customer-success',
      element: <CustomerSuccessDashboard />,
      requiresAuth: true,
    },
    {
      path: '/organization-intelligence',
      element: <OrganizationIntelligenceProfile />,
      requiresAuth: true,
    },
    {
      path: '/success-center',
      element: <SuccessCenterPage />,
      requiresAuth: true,
    },
    {
      path: '/departments',
      element: <DepartmentsPage />,
      requiresAuth: true,
    },
    {
      path: '/service-lines',
      element: <ServiceLinesPage />,
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
      path: '/welcome',
      element: <Welcome />,
      requiresAuth: true,
    },
    {
      path: '/onboarding',
      element: <OrganizationOnboardingPage />,
      requiresAuth: true,
    },
    {
      path: '/products',
      element: <ProductsIndexPage />,
      requiresAuth: true,
    },
    {
      path: '/products/:slug',
      element: <ProductDetailPage />,
      requiresAuth: true,
    },
    {
      path: '/asset-packs',
      element: <PackMarketplace />,
      requiresAuth: true,
    },
    {
      path: '/plans',
      element: <CommercialPlansPage />,
      requiresAuth: true,
    },
    {
      path: '/specialties',
      element: <SpecialtiesIndexPage />,
      requiresAuth: true,
    },
    {
      path: '/specialties/:slug',
      element: <SpecialtyDetailPage />,
      requiresAuth: true,
    },
    {
      path: '/care-pathways',
      element: <CarePathwaysIndexPage />,
      requiresAuth: true,
    },
    {
      path: '/care-pathways/:slug',
      element: <CarePathwayDetailPage />,
      requiresAuth: true,
    },
    {
      path: '/agents',
      element: <AgentsRegistryPage />,
      requiresAuth: true,
    },
    {
      path: '/maturity-assessment',
      element: <MaturityAssessmentPage />,
      requiresAuth: true,
    },
    {
      path: '/outcomes',
      element: <OutcomesDashboardPage />,
      requiresAuth: true,
    },
    {
      path: '/value-tracking',
      element: <ValueTrackingPage />,
      requiresAuth: true,
    },
    {
      path: '/product-intelligence',
      element: <ProductIntelligenceLayerPage />,
      requiresAuth: true,
    },
    {
      path: '/expansion-opportunities',
      element: <CustomerExpansionOpportunitiesPage />,
      requiresAuth: true,
    },
    {
      path: '/integrations-marketplace',
      element: <IntegrationsMarketplacePage />,
      requiresAuth: true,
    },
    {
      path: '/integration-readiness',
      element: <IntegrationReadinessPage />,
      requiresAuth: true,
    },
    {
      path: '/configuration-studio',
      element: <ConfigurationStudioPage />,
      requiresAuth: true,
    },
    {
      path: '/solution-builder',
      element: <HospitalSolutionBuilderPage />,
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
      element: (
        <PublicShell>
          <PrivacyPolicy />
        </PublicShell>
      ),
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
      path: '/saas-health',
      element: <SaasHealthCenter />,
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
      path: '/dependency-graph',
      element: <DependencyGraph />,
      requiresAuth: true,
      permission: Permission.CONFIGURE_SYSTEM,
    },
    {
      path: '/governance-registry',
      element: <GovernanceRegistry />,
      requiresAuth: true,
      permission: Permission.VIEW_GOVERNANCE,
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
    {
      path: '/analytics',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
      requiresAuth: true,
      permission: Permission.VIEW_ANALYTICS,
    },
    {
      path: '/costs',
      element: <LegacyProtectedRouteRedirect to="/emergency/capacity" />,
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
                  <TenantContextProvider>
                    <UserIdentityProvider>
                      <OrganizationContextProvider>
                        <WhiteLabelProvider>
                          <ConversationProvider>
                            <SystemConfigProvider>
                              <EmergencyDepartmentProvider>
                                <OfflineProvider>
                                  <ErrorBoundary>
                                    <Suspense fallback={<PageLoader />}>
                                      <AppRoutes />
                                    </Suspense>
                                    <NotificationToasts />
                                  </ErrorBoundary>
                                </OfflineProvider>
                              </EmergencyDepartmentProvider>
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
    </BrowserRouter>
  );
}

export default App;
