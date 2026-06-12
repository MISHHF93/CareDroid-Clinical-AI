import React, { useState, useEffect, Suspense } from 'react';
import { flushSync } from 'react-dom';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
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
import OfflineProvider from './contexts/OfflineProvider';
import ErrorBoundary from './components/ErrorBoundary';
import PermissionGate from './components/PermissionGate';
import { NotificationToastContainer } from './components/notifications/NotificationToast';
import EmergencyWhiteboard from './components/EmergencyWhiteboard';
import EMSPipeline from './components/EMSPipeline';
import QueueIntelligencePanel from './components/QueueIntelligencePanel';
import ReferralPanel from './components/ReferralPanel';
import AppShell from './layout/AppShell';
import { PatientState } from '../types/emergency';
import { createDevAuthSession, isDevAuthBypassEnabled } from './auth/devAuthBypass';
import { useNotificationActions } from './hooks/useNotificationActions';
import { useFeature } from './hooks/useFeature';
import { subscribeToFeatureFlagSync } from '../store/featureStore';
import { FEATURE_REGISTRY_BY_ID } from '../lib/features/featureRegistry';
import logger from './utils/logger';
import { NavIcon } from './navigation/NavIcon';
import { CHROME_ICONS } from './navigation/iconRegistry';
import {
  AUTH_PATH_ALIASES,
  LEGACY_EMERGENCY_ROUTE_REDIRECTS,
  PROTECTED_ROUTE_ALIAS_REDIRECTS,
  WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS,
} from './config/routes.config';
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
const EmergencySettings = lazyWithRetry(() => import('./pages/emergency/EmergencySettings'));
const FeatureManagement = lazyWithRetry(() => import('./pages/settings/FeatureManagement'));
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
const EmergencyAnalytics = lazyWithRetry(() => import('./pages/emergency/EmergencyAnalytics'));
const SmartIntake = lazyWithRetry(() => import('./pages/emergency/SmartIntake'));
const ClinicalCalculatorHub = lazyWithRetry(() => import('./pages/emergency/ClinicalCalculatorHub'));
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

// Clinical Intelligence pages
const ClinicalAlertsPage = lazyWithRetry(() => import('./pages/ClinicalAlertsPage'));

// Loading fallback component
const PageLoader = () => (
  <div className="page-loader">
    <div className="page-loader-spinner" aria-hidden />
    <div className="page-loader-label">Loading...</div>
  </div>
);

logger.info('App.jsx loaded - CareDroid Emergency OS');

function NotificationToasts() {
  const { notifications, removeNotification } = useNotifications();
  return <NotificationToastContainer toasts={notifications} onDismiss={removeNotification} />;
}

function FeatureFlagSyncToasts() {
  const { info } = useNotificationActions();

  useEffect(() => {
    const unsubscribe = subscribeToFeatureFlagSync((change) => {
      const label = FEATURE_REGISTRY_BY_ID[change.featureId]?.label || change.featureId;
      const staffName = change.changedBy || 'another staff member';
      info('Feature updated', `${label} was toggled by ${staffName}.`);
    });
    return unsubscribe;
  }, [info]);

  return null;
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
          ? 'Emergency OS access started with API support.'
          : 'Emergency OS access started with local UI data while backend APIs are unavailable.'
      );
      navigate('/emergency/whiteboard', { replace: true });
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
  const isEmergencyHydrating = useEmergencyStore((state) => state.isHydrating);
  const hasEmergencyHydrated = useEmergencyStore((state) => state.hasHydrated);
  const ensureEmergencyHydrated = useEmergencyStore((state) => state.ensureHydrated);
  const navigate = useNavigate();

  useEffect(() => {
    ensureEmergencyHydrated();
  }, [ensureEmergencyHydrated]);

  const handleSignOut = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const handleNewConversation = () => {
    addConversation();
    navigate({ pathname: '/emergency/copilot', search: '' }, { replace: true });
  };

  const handleSelectConversation = (conversationId) => {
    selectConversation(conversationId);
    navigate({ pathname: '/emergency/copilot', search: '' }, { replace: true });
  };

  const shellContent =
    isEmergencyHydrating || !hasEmergencyHydrated ? (
      <section className="ed-route-panel" aria-busy="true" aria-labelledby="emergency-loading-title">
        <header className="ed-route-panel__header">
          <span>Emergency OS</span>
          <h1 id="emergency-loading-title">Loading Emergency OS</h1>
          <p>Hydrating patients, staff, capacity, EMS, referrals, and alerts.</p>
        </header>
        <div className="page-loader">
          <div className="page-loader-spinner" aria-hidden />
          <div className="page-loader-label">Preparing emergency workspace...</div>
        </div>
      </section>
    ) : (
      children
    );

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
      {shellContent}
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
  return <Navigate to="/emergency/whiteboard" replace />;
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

function LegacyCalculatorRouteRedirect() {
  const { slug } = useParams();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const calculatorId = slug || params.get('calc') || params.get('tool');

  if (calculatorId) {
    params.set('tool', calculatorId);
  }

  return (
    <Navigate
      to={{
        pathname: '/emergency/copilot',
        search: params.toString() ? `?${params.toString()}` : '',
      }}
      replace
    />
  );
}

function LegacyToolRouteRedirect({ toolId }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  if (toolId) {
    params.set('tool', toolId);
  }

  return (
    <Navigate
      to={{
        pathname: '/emergency/copilot',
        search: params.toString() ? `?${params.toString()}` : '',
      }}
      replace
    />
  );
}

const SETTINGS_TABS = Object.freeze([
  { label: 'General', to: '/emergency/settings' },
  { label: 'Features', to: '/settings/features' },
  { label: 'Thresholds', to: '/emergency/settings#thresholds' },
  { label: 'Staff', to: '/emergency/settings#staff' },
  { label: 'Integrations', to: '/emergency/settings#integrations' },
]);

function SettingsTabs({ active = 'General' }) {
  return (
    <nav className="ed-route-panel__tabs" aria-label="Settings tabs">
      {SETTINGS_TABS.map((tab) => (
        <Link
          key={tab.label}
          to={tab.to}
          aria-current={tab.label === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function SettingsRoute() {
  return (
    <section className="ed-route-panel" aria-labelledby="settings-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS Admin</span>
        <h1 id="settings-title">Settings</h1>
        <p>General, features, thresholds, staff, and integration settings for the ED workspace.</p>
      </header>
      <SettingsTabs active="General" />
      <EmergencySettings />
    </section>
  );
}

function SettingsFeaturesRoute() {
  return (
    <section className="ed-route-panel" aria-labelledby="settings-features-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS Admin</span>
        <h1 id="settings-features-title">Feature Management</h1>
        <p>Enable, disable, and review feature availability across the Emergency OS shell.</p>
      </header>
      <SettingsTabs active="Features" />
      <FeatureManagement />
    </section>
  );
}

function FeatureRouteGuard({ feature, children }) {
  const { enabled, feature: featureDefinition } = useFeature(feature);
  if (enabled) return children;

  const label = featureDefinition?.label || feature;
  return (
    <Navigate
      to="/emergency/whiteboard"
      replace
      state={{
        edNotice: {
          title: 'Feature disabled',
          message: `${label} is disabled. Enable it in Settings > Feature Management.`,
        },
      }}
    />
  );
}

function EmergencyCopilotRoute() {
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);

  useEffect(() => {
    setCopilotOpen(true);
  }, [setCopilotOpen]);

  return (
    <section className="ed-route-panel" aria-labelledby="emergency-copilot-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="emergency-copilot-title">ED Copilot Workflows</h1>
        <p>
          Launch complaint-driven calculators and clinical tools while the persistent Copilot panel
          stays open for human-reviewed guidance.
        </p>
      </header>
      <ClinicalCalculatorHub />
    </section>
  );
}

function WorkspaceRouteRedirect() {
  const { workspaceId, subpage } = useParams();

  if (workspaceId === 'emergency') {
    return (
      <LegacyProtectedRouteRedirect
        to={WORKSPACE_EMERGENCY_SUBPAGE_REDIRECTS[subpage] || '/emergency/whiteboard'}
      />
    );
  }

  return <LegacyProtectedRouteRedirect to="/emergency/whiteboard" />;
}

function EmergencyQueueRoute() {
  const [collapsed, setCollapsed] = useState(false);

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
      <QueueIntelligencePanel collapsed={collapsed} onCollapsedChange={setCollapsed} />
    </section>
  );
}

const REASSESSMENT_ROUTE_FLAG_TYPES = new Set([
  'DeteriorationRisk',
  'HighRisk',
  'ScoreReassessmentRecommended',
  'ReassessmentDue',
]);

function hasReassessmentRouteFlag(patient) {
  return patient.flags?.some((flag) => REASSESSMENT_ROUTE_FLAG_TYPES.has(flag.type)) || false;
}

function EmergencyPatientsRoute() {
  return (
    <EmergencyWhiteboard
      title="Patients"
      subtitle="Active ED patient list, search, patient detail, and workflow actions."
      defaultViewMode="list"
    />
  );
}

function EmergencyReassessmentRoute() {
  const navigate = useNavigate();
  const patients = useEmergencyStore((state) => state.patients);
  const selectPatient = useEmergencyStore((state) => state.selectPatient);
  const reassessmentPatients = patients.filter(
    (patient) =>
      patient.state !== PatientState.Discharge &&
      patient.state !== PatientState.Deceased &&
      hasReassessmentRouteFlag(patient)
  );

  return (
    <section className="ed-route-panel" aria-labelledby="emergency-reassessment-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="emergency-reassessment-title">Reassessment</h1>
        <p>Patients requiring reassessment, escalation review, or deterioration checks.</p>
      </header>

      <div className="ed-route-panel__metrics" aria-label="Reassessment metrics">
        <article>
          <span>Due Now</span>
          <strong>{reassessmentPatients.length}</strong>
          <small>active patients flagged</small>
        </article>
        <article>
          <span>High Priority</span>
          <strong>{reassessmentPatients.filter((patient) => ['P1', 'P2'].includes(patient.priority)).length}</strong>
          <small>P1/P2 reassessment queue</small>
        </article>
        <article>
          <span>Source</span>
          <strong>Local</strong>
          <small>Store-backed safety queue</small>
        </article>
      </div>

      <section className="ed-route-panel__list" aria-label="Reassessment queue">
        <header>
          <strong>Reassessment Queue</strong>
          <small>{reassessmentPatients.length} patients</small>
        </header>
        {reassessmentPatients.length ? (
          reassessmentPatients.map((patient) => (
            <article key={patient.id}>
              <div>
                <strong>
                  {patient.firstName} {patient.lastName}
                </strong>
                <span>
                  {patient.priority} · {patient.mrn} · {patient.chiefComplaint}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  selectPatient(patient.id);
                  navigate('/emergency/patients');
                }}
              >
                Assess Now
              </button>
            </article>
          ))
        ) : (
          <article>
            <div>
              <strong>No reassessments due</strong>
              <span>All active patients are inside the current reassessment window.</span>
            </div>
          </article>
        )}
      </section>
    </section>
  );
}

function EmergencyCapacityRoute({ variant = 'capacity' }) {
  const capacity = useEmergencyStore((state) => state.capacity);
  const queues = useEmergencyStore((state) => state.queues);
  const rooms = useEmergencyStore((state) => state.rooms);
  const patients = useEmergencyStore((state) => state.patients);
  const boardingPatients = patients.filter(
    (patient) =>
      patient.state === PatientState.Admission ||
      patient.flags.some((flag) => flag.type === 'PendingAdmission')
  );
  const dischargePipeline = patients.filter((patient) => patient.state === PatientState.Disposition);
  const patientByRoomId = new Map(
    patients.filter((patient) => patient.roomId).map((patient) => [patient.roomId, patient])
  );
  const isBoardingRoute = variant === 'boarding';

  return (
    <section className="ed-route-panel" aria-labelledby="emergency-capacity-title">
      <header className="ed-route-panel__header">
        <span>Emergency OS</span>
        <h1 id="emergency-capacity-title">
          {isBoardingRoute ? 'Boarding Intelligence' : 'Capacity Detail'}
        </h1>
        <p>
          {isBoardingRoute
            ? 'Admission holds, bed pressure, disposition readiness, and boarding risk.'
            : 'Current department pressure, room occupancy, boarding risk, and queue load.'}
        </p>
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

      <section className="ed-route-panel__list" aria-label="Room grid">
        <header>
          <strong>Room Grid</strong>
          <small>
            {capacity.availableRoomCount} available · {capacity.currentOccupancy} occupied
          </small>
        </header>
        {rooms.map((room) => {
          const patient = patientByRoomId.get(room.id);
          return (
            <article key={room.id}>
              <div>
                <strong>{room.name}</strong>
                <span>
                  {room.type} · {room.status}
                  {patient ? ` · ${patient.firstName} ${patient.lastName}` : ''}
                </span>
              </div>
              <small>{room.isIsolationCapable ? 'Isolation capable' : 'Standard'}</small>
            </article>
          );
        })}
      </section>

      <section className="ed-route-panel__list" aria-label="Boarding patients">
        <header>
          <strong>Boarding List</strong>
          <small>{boardingPatients.length} patients</small>
        </header>
        {boardingPatients.length ? (
          boardingPatients.map((patient) => (
            <article key={patient.id}>
              <div>
                <strong>
                  {patient.firstName} {patient.lastName}
                </strong>
                <span>
                  {patient.mrn} · {patient.chiefComplaint}
                </span>
              </div>
              <small>{patient.state}</small>
            </article>
          ))
        ) : (
          <article>
            <div>
              <strong>No boarding patients</strong>
              <span>Admission queue is clear.</span>
            </div>
          </article>
        )}
      </section>

      <section className="ed-route-panel__list" aria-label="Discharge pipeline">
        <header>
          <strong>Discharge Pipeline</strong>
          <small>{dischargePipeline.length} disposition patients</small>
        </header>
        {dischargePipeline.length ? (
          dischargePipeline.map((patient) => (
            <article key={patient.id}>
              <div>
                <strong>
                  {patient.firstName} {patient.lastName}
                </strong>
                <span>
                  {patient.mrn} · {patient.chiefComplaint}
                </span>
              </div>
              <small>Disposition</small>
            </article>
          ))
        ) : (
          <article>
            <div>
              <strong>No disposition patients</strong>
              <span>Discharge pipeline is clear.</span>
            </div>
          </article>
        )}
      </section>
    </section>
  );
}

const FUTURE_RELEASE_ROUTES = Object.freeze([
  ['Executive Command Center', '/executive'],
  ['Capability Discovery', '/discover'],
  ['Recommendations', '/recommendations'],
  ['Automation Audit', '/automation-audit'],
  ['Automation Analytics', '/automation-analytics'],
  ['Workspace Directory', '/workspaces'],
  ['Knowledge Hub', '/knowledge-hub'],
  ['Timeline', '/timeline'],
  ['Digital Twin', '/digital-twin'],
  ['Operations', '/operations'],
  ['Digital Twin Intelligence', '/digital-twin-intelligence'],
  ['Workflows', '/workflows'],
  ['Workflow Mining', '/workflow-mining'],
  ['Workspace Dependency Graph', '/workspace-dependency-graph'],
  ['Assets', '/assets'],
  ['Integrations', '/integrations'],
  ['Integrations', '/integrations/*'],
  ['Operations', '/operations/*'],
  ['Artifacts', '/artifacts'],
  ['AI Models', '/ai-models'],
  ['Memory', '/memory'],
  ['AI Memory', '/ai-memory'],
  ['Training', '/training'],
  ['AI Evaluation', '/ai-evaluation'],
  ['AI Command Center', '/ai-command-center'],
  ['Platform Learning Engine', '/platform-learning-engine'],
  ['CareDroid Brain', '/brain'],
  ['Business Brain', '/business-brain'],
  ['Live Map', '/live-map'],
  ['Medical IoT', '/medical-iot'],
  ['Hospital Map', '/hospital-map'],
  ['Device Fleet', '/devices'],
  ['Documentation', '/documentation'],
  ['Knowledge Graph', '/knowledge-graph'],
  ['Predictive Analytics', '/predictive-analytics'],
  ['Clinical Decision Support', '/clinical-decision-support'],
  ['Competencies', '/competencies'],
  ['Credentials', '/credentials'],
  ['Simulation', '/simulation'],
  ['Simulation Outcomes', '/simulation/outcomes'],
  ['Simulation Scenario', '/simulation/*'],
  ['Laboratory', '/laboratory'],
  ['3D Viewer', '/3d-viewer'],
  ['Protocols', '/protocols'],
  ['Research', '/research'],
  ['Clinical Tools', '/tools/*'],
  ['Fleet Command', '/fleet/command'],
  ['Fleet Map', '/fleet/map'],
  ['Fleet Predictive Maintenance', '/fleet/predictive-maintenance'],
  ['Fleet Route Optimizer', '/fleet/route-optimizer'],
  ['Fleet', '/fleet/*'],
  ['Clinical Alerts', '/clinical/alerts'],
  ['Profile', '/profile'],
  ['Profile', '/profile/*'],
  ['Customer Portal', '/customer-portal'],
  ['Knowledge Base', '/knowledge-base'],
  ['Marketplace', '/marketplace'],
  ['Enterprise Readiness', '/enterprise-readiness'],
  ['Platform Admin', '/platform-admin'],
  ['Billing', '/billing'],
  ['Usage', '/usage'],
  ['Organization', '/organization'],
  ['Organization', '/organization/*'],
  ['Tenant Admin', '/tenant-admin'],
  ['Tenant Admin', '/tenant-admin/*'],
  ['Organization Settings', '/settings/organization'],
  ['Organization Packs', '/settings/organization/packs'],
  ['Organization Assets', '/settings/organization/assets'],
  ['Platform Analytics', '/platform-analytics'],
  ['Customer Success', '/customer-success'],
  ['Organization Intelligence', '/organization-intelligence'],
  ['Success Center', '/success-center'],
  ['Departments', '/departments'],
  ['Service Lines', '/service-lines'],
  ['Notifications', '/notifications'],
  ['Notification Preferences', '/notification-preferences'],
  ['Two-Factor Setup', '/two-factor-setup'],
  ['Biometric Setup', '/biometric-setup'],
  ['Welcome', '/welcome'],
  ['Onboarding', '/onboarding'],
  ['Products', '/products'],
  ['Products', '/products/*'],
  ['Asset Packs', '/asset-packs'],
  ['Plans', '/plans'],
  ['Specialties', '/specialties'],
  ['Specialties', '/specialties/*'],
  ['Care Pathways', '/care-pathways'],
  ['Care Pathways', '/care-pathways/*'],
  ['Agents', '/agents'],
  ['Maturity Assessment', '/maturity-assessment'],
  ['Outcomes', '/outcomes'],
  ['Value Tracking', '/value-tracking'],
  ['Product Intelligence', '/product-intelligence'],
  ['Expansion Opportunities', '/expansion-opportunities'],
  ['Integrations Marketplace', '/integrations-marketplace'],
  ['Integration Readiness', '/integration-readiness'],
  ['Configuration Studio', '/configuration-studio'],
  ['Solution Builder', '/solution-builder'],
  ['Consent', '/consent'],
  ['Consent History', '/consent-history'],
  ['Consent', '/consent/*'],
  ['Privacy Policy', '/privacy'],
  ['Privacy Policy', '/legal/privacy'],
  ['Privacy', '/privacy/*'],
  ['Terms of Service', '/terms'],
  ['GDPR Notice', '/gdpr'],
  ['HIPAA Notice', '/hipaa'],
  ['Help Center', '/help'],
  ['Version', '/version'],
  ['Shared Tool Session', '/shared/tools/:shareId'],
  ['Team Management', '/team'],
  ['AI Governance', '/ai-governance'],
  ['Security', '/security'],
  ['Regulatory', '/regulatory'],
  ['Equity', '/equity'],
  ['Human Review', '/human-review'],
  ['System Health', '/system-health'],
  ['SaaS Health', '/saas-health'],
  ['Feature Flags', '/feature-flags'],
  ['Plugins', '/plugins'],
  ['Dependency Map', '/dependency-map'],
  ['Dependency Graph', '/dependency-graph'],
  ['Governance Registry', '/governance-registry'],
  ['Data Lineage', '/data-lineage'],
  ['Self Diagnostics', '/self-diagnostics'],
  ['Review', '/review'],
  ['Review', '/review/*'],
  ['Audit', '/audit'],
  ['Audit', '/audit/*'],
  ['Analytics', '/analytics'],
  ['Costs', '/costs'],
  ['Governance', '/governance'],
  ['Governance', '/governance/*'],
]);

// ==================== ROUTING ====================
export function AppRoutes() {
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
    shell = true,
    permission,
    requireAllPermissions = false,
  }) => {
    if (publicOnly && isAuthenticated) {
      return <Navigate to="/emergency/whiteboard" replace />;
    }

    let resolvedElement = element;

    if (permission) {
      resolvedElement = (
        <PermissionGate
          permission={permission}
          requireAll={requireAllPermissions}
          fallback={<Navigate to="/emergency/whiteboard" replace />}
        >
          {resolvedElement}
        </PermissionGate>
      );
    }

    if (shell && (requiresAuth || !publicOnly)) {
      return <AppShellPage>{resolvedElement}</AppShellPage>;
    }

    return resolvedElement;
  };

  const routes = [
    {
      path: '/',
      element: <Navigate to="/emergency/whiteboard" replace />,
      publicOnly: true,
    },
    {
      path: '/auth-callback',
      element: <AuthCallback />,
      shell: false,
    },
    {
      path: '/auth/callback',
      element: <LegacyOAuthCallbackRedirect />,
      shell: false,
    },
    ...AUTH_PATH_ALIASES.map((path) => ({
      path,
      element: <AuthPathRedirect />,
      publicOnly: true,
    })),
    {
      path: '/emergency',
      element: <Navigate to="/emergency/whiteboard" replace />,
      requiresAuth: true,
    },
    {
      path: '/emergency/whiteboard',
      element: <EmergencyWhiteboard />,
      requiresAuth: true,
    },
    {
      path: '/emergency/patients',
      element: <EmergencyPatientsRoute />,
      requiresAuth: true,
    },
    {
      path: '/emergency/ems',
      element: (
        <FeatureRouteGuard feature="ems_pipeline">
          <EMSPipeline />
        </FeatureRouteGuard>
      ),
      requiresAuth: true,
    },
    {
      path: '/emergency/pulse',
      element: <LegacyProtectedRouteRedirect to="/emergency/analytics" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/intake',
      element: <SmartIntake />,
      requiresAuth: true,
    },
    {
      path: '/emergency/queues',
      element: (
        <FeatureRouteGuard feature="queue_intelligence">
          <EmergencyQueueRoute />
        </FeatureRouteGuard>
      ),
      requiresAuth: true,
    },
    {
      path: '/emergency/reassessment',
      element: <EmergencyReassessmentRoute />,
      requiresAuth: true,
    },
    {
      path: '/emergency/referrals',
      element: (
        <FeatureRouteGuard feature="referral_intelligence">
          <ReferralPanel />
        </FeatureRouteGuard>
      ),
      requiresAuth: true,
    },
    {
      path: '/emergency/capacity',
      element: (
        <FeatureRouteGuard feature="capacity_intelligence">
          <EmergencyCapacityRoute />
        </FeatureRouteGuard>
      ),
      requiresAuth: true,
    },
    {
      path: '/emergency/boarding',
      element: (
        <FeatureRouteGuard feature="boarding_intelligence">
          <EmergencyCapacityRoute variant="boarding" />
        </FeatureRouteGuard>
      ),
      requiresAuth: true,
    },
    {
      path: '/emergency/copilot',
      element: <EmergencyCopilotRoute />,
      requiresAuth: true,
    },
    {
      path: '/emergency/analytics',
      element: <EmergencyAnalytics />,
      requiresAuth: true,
    },
    {
      path: '/emergency/tools',
      element: <LegacyProtectedRouteRedirect to="/emergency/copilot" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/shift',
      element: <LegacyProtectedRouteRedirect to="/emergency/analytics" />,
      requiresAuth: true,
    },
    {
      path: '/emergency/settings',
      element: <SettingsRoute />,
      requiresAuth: true,
    },
    {
      path: '/search',
      element: <SearchResultsPage />,
      requiresAuth: true,
    },
    {
      path: '/settings',
      element: <LegacyProtectedRouteRedirect to="/emergency/settings" />,
      requiresAuth: true,
    },
    {
      path: '/settings/features',
      element: <SettingsFeaturesRoute />,
      requiresAuth: true,
    },
    {
      path: '/tools/calculators',
      element: <LegacyCalculatorRouteRedirect />,
      requiresAuth: true,
    },
    {
      path: '/tools/calculators/:slug',
      element: <LegacyCalculatorRouteRedirect />,
      requiresAuth: true,
    },
    {
      path: '/tools/drug-checker',
      element: <LegacyToolRouteRedirect toolId="drug-check" />,
      requiresAuth: true,
    },
    ...LEGACY_EMERGENCY_ROUTE_REDIRECTS.map(({ path, to }) => ({
      path,
      element: <LegacyProtectedRouteRedirect to={to} />,
      requiresAuth: true,
    })),
    ...PROTECTED_ROUTE_ALIAS_REDIRECTS.map(({ path, to }) => ({
      path,
      element: <LegacyProtectedRouteRedirect to={to} />,
      requiresAuth: true,
    })),
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
    ...FUTURE_RELEASE_ROUTES.map(([, path]) => ({
      path,
      element: <LegacyProtectedRouteRedirect to="/emergency/whiteboard" />,
      requiresAuth: true,
    })),
    {
      path: '*',
      element: <Navigate to="/emergency/whiteboard" replace />,
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
                              <OfflineProvider>
                                <ErrorBoundary>
                                  <Suspense fallback={<PageLoader />}>
                                    <AppRoutes />
                                  </Suspense>
                                  <FeatureFlagSyncToasts />
                                  <NotificationToasts />
                                </ErrorBoundary>
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
    </BrowserRouter>
  );
}

export default App;
