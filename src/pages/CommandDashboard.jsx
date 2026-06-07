import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Permission, useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useOrganizationContext } from '../contexts/OrganizationContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useNotifications } from '../contexts/NotificationContext';
import ContextInsightCard from '../components/ContextInsightCard';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard';
import ProfileToolGraphCard from '../components/ProfileToolGraphCard';
import { AdaptiveDashboardPanel } from './PlatformOSPages';
import { getCommandDashboardModel } from '../data/commandDashboardModel';
import {
  CategoryBarChart,
  DistributionDonutChart,
  MetricCard,
  StatusCard,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import {
  getRegistryToolNavigation,
  applyRegistryToolLaunch,
} from '../navigation/registryToolLaunch';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../navigation/iconRegistry';
import './CommandDashboard.css';

function launchBadgeFor(tool) {
  const plan = getRegistryToolNavigation(tool.id);
  if (plan.mode === 'calculator-route') return 'Calculator route';
  if (plan.mode === 'chat-assisted') return 'Assistant guided';
  if (plan.mode === 'tool-page') return 'Tool page';
  if (plan.mode === 'calculator-hub') return 'Calculator hub';
  if (tool.executorStatus === 'registered') return 'Backend-backed';
  if (tool.executorStatus === 'unsupported') return 'Assistant fallback';
  return 'Open';
}

function ToolCard({ tool, onLaunch }) {
  return (
    <button
      type="button"
      className="command-tool-card"
      onClick={() => onLaunch(tool)}
      aria-label={`Open ${tool.name}`}
    >
      <span className="command-tool-card__icon" style={{ color: tool.color }} aria-hidden>
        <NavIcon icon={getToolIcon(tool.id)} size={22} />
      </span>
      <span className="command-tool-card__body">
        <span className="command-tool-card__title">{tool.name}</span>
        <span className="command-tool-card__desc">{tool.description}</span>
        <span className="command-tool-card__meta">
          <span>{tool.category}</span>
          <span>{launchBadgeFor(tool)}</span>
        </span>
      </span>
    </button>
  );
}

function DashboardPanel({ title, description, icon, children, className = '' }) {
  return (
    <section
      className={`command-panel ${className}`.trim()}
      aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}
    >
      <div className="command-panel__header">
        <span className="command-panel__icon" aria-hidden>
          <NavIcon icon={icon} size={22} />
        </span>
        <div>
          <h2 id={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function StatusItem({ label, value, tone = 'neutral' }) {
  return (
    <div className={`command-status-item command-status-item--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const DASHBOARD_LAUNCH_CARDS = Object.freeze([
  {
    id: 'assistant',
    label: 'AI Assistant',
    description: 'Ask, triage, and launch tools from the chatbot workspace.',
    path: CANONICAL_ROUTES.assistant,
    icon: CHROME_ICONS.bot,
  },
  {
    id: 'workspace',
    label: 'My Workspace',
    description: 'Open workspace-specific routes, recommendations, and context.',
    path: '/workspaces',
    icon: CHROME_ICONS.layoutDashboard,
  },
  {
    id: 'tools',
    label: 'My Tools',
    description: 'Browse every permitted clinical and operations tool.',
    path: CANONICAL_ROUTES.tools,
    icon: CHROME_ICONS.tools,
  },
  {
    id: 'calculators',
    label: 'My Calculators',
    description: 'Open the focused calculator hub and severity scores.',
    path: CANONICAL_ROUTES.calculators,
    icon: CHROME_ICONS.calculator,
  },
  {
    id: 'simulation',
    label: 'Medical Simulation',
    description: 'Practice demo scenarios with outcomes, competency, and AI tutor debrief.',
    path: CANONICAL_ROUTES.simulation,
    icon: CHROME_ICONS.training,
  },
  {
    id: 'simulation-outcomes',
    label: 'Simulation Outcomes',
    description: 'Review demo learner progress, weak areas, and competency coverage.',
    path: CANONICAL_ROUTES.simulationOutcomes,
    icon: CHROME_ICONS.barChart,
  },
  {
    id: 'laboratory',
    label: 'Laboratory',
    description: 'Review demo lab results, specimen queue, abnormal alerts, and trends.',
    path: CANONICAL_ROUTES.laboratory,
    icon: CHROME_ICONS.tools,
  },
  {
    id: '3d-viewer',
    label: '3D Viewer',
    description: 'Open an asset-safe anatomy and medical model viewer fallback.',
    path: CANONICAL_ROUTES.medical3dViewer,
    icon: CHROME_ICONS.artifacts,
  },
  {
    id: 'digital-twin',
    label: 'Digital Twin',
    description: 'View the operations aggregate across hospital, IoT, alerts, and fleet.',
    path: CANONICAL_ROUTES.digitalTwin,
    icon: CHROME_ICONS.activity,
  },
  {
    id: 'operations',
    label: 'Operations',
    description: 'Open the unified hub for maps, IoT, devices, fleet, alerts, telemetry, and maintenance.',
    path: CANONICAL_ROUTES.operations,
    icon: CHROME_ICONS.truck,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Review unread updates, preferences, and notification history.',
    path: CANONICAL_ROUTES.notifications,
    icon: CHROME_ICONS.bell,
  },
  {
    id: 'active-alerts',
    label: 'Active Alerts',
    description: 'Open clinical alert workflows and escalation status.',
    path: '/clinical/alerts',
    icon: CHROME_ICONS.alert,
  },
  {
    id: 'hospital-map',
    label: 'Hospital Map',
    description: 'View floors, rooms, beds, device markers, and stale states.',
    path: CANONICAL_ROUTES.hospitalMap,
    icon: CHROME_ICONS.hospital,
  },
  {
    id: 'medical-iot',
    label: 'Medical IoT',
    description: 'Monitor telemetry, devices, alerts, and demo data labels.',
    path: CANONICAL_ROUTES.medicalIot,
    icon: CHROME_ICONS.activity,
  },
  {
    id: 'fleet',
    label: 'Fleet',
    description: 'Open live vehicle tracking and route status.',
    path: CANONICAL_ROUTES.fleetMap,
    icon: CHROME_ICONS.truck,
  },
  {
    id: 'devices',
    label: 'Device Management',
    description: 'Manage device fleet state, maintenance, and assignments.',
    path: CANONICAL_ROUTES.devices,
    icon: CHROME_ICONS.wrench,
  },
  {
    id: 'activity',
    label: 'Recent Activity',
    description: 'Review recent tools, AI chats, and profile activity.',
    path: '/profile/activity',
    icon: CHROME_ICONS.clock,
  },
  {
    id: 'system-status',
    label: 'System Status',
    description: 'Check platform health and backend readiness.',
    path: CANONICAL_ROUTES.systemHealth,
    icon: CHROME_ICONS.shield,
  },
]);

function buildRecentUsageTrend(recentToolItems, messages) {
  const assistantCount = messages.filter((message) => message.role === 'assistant').length;
  const toolCount = recentToolItems.length;
  return [
    { label: 'Mon', value: Math.max(1, Math.round(toolCount / 2)) },
    { label: 'Tue', value: Math.max(2, toolCount + 1) },
    { label: 'Wed', value: Math.max(2, assistantCount) },
    { label: 'Thu', value: Math.max(3, assistantCount + toolCount) },
    { label: 'Now', value: Math.max(1, assistantCount + toolCount + 1) },
  ];
}

function notificationTitle(notification) {
  return (
    notification.title ||
    notification.message ||
    notification.text ||
    notification.type ||
    'Notification'
  );
}

function notificationBody(notification) {
  return (
    notification.message ||
    notification.body ||
    notification.description ||
    notificationTitle(notification)
  );
}

function isAlertNotification(notification) {
  const text =
    `${notification.type || ''} ${notification.severity || ''} ${notification.priority || ''}`.toLowerCase();
  return /alert|critical|high|urgent|warning/.test(text);
}

function isLaunchCardAllowed(card, platformContext) {
  const decisions = platformContext?.assetAccessDecisions || {};
  const aliases = {
    fleet: ['fleet-map', 'fleet-live-map', 'live-tracking-map', 'fleet-command'],
    tools: ['calculators', 'drug-check', 'lab-interp'],
    workspace: [],
    notifications: [],
    activity: [],
    'system-status': ['system-health', 'deployment-observability'],
  };
  const assetIds = aliases[card.id] || [card.id];
  const matchedDecisions = assetIds.map((id) => decisions[id]).filter(Boolean);
  if (!matchedDecisions.length) return true;
  return matchedDecisions.some((decision) => decision.isLaunchable !== false);
}

export default function CommandDashboard() {
  const navigate = useNavigate();
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const { user, isDevAuthBypass, hasPermission } = useUser();
  const {
    activeWorkspace,
    activity,
    aiPersonalization,
    platformContext,
    account,
    roleProfile,
    saasProfile,
    enabledAssetPacks,
    pinnedAssets,
    recentAssets,
  } = useUserIdentity();
  const { branding, tenant, subscription } = useOrganizationContext();
  const {
    activeWorkspace: workspaceContextActive,
    recommendations: workspaceRecommendations,
    shortcuts: workspaceShortcuts,
    visibleAssetIds: workspaceVisibleAssetIds,
    recommendedAIAgents,
    recommendedAssetPacks,
  } = useWorkspace();
  const safeSaasProfile = saasProfile || {
    role: user?.role || 'student',
    specialty: account?.specialty || 'general',
    department: account?.department || 'unassigned',
    defaultWorkspace: activeWorkspace?.name || 'Emergency',
    organizationType: account?.organizationType || 'hospital',
    preferredAIStyle: 'balanced',
  };
  const workspaceAwarePlatformContext = useMemo(
    () =>
      platformContext
        ? {
            ...platformContext,
            legacyToolAliases: workspaceVisibleAssetIds?.length
              ? workspaceVisibleAssetIds
              : platformContext.legacyToolAliases,
          }
        : platformContext,
    [platformContext, workspaceVisibleAssetIds]
  );
  const { conversations, messages, addMessage, selectTool, setActiveTool } = useConversation();
  const { favorites, recentTools, recordToolAccess } = useToolPreferences();
  const { notifications = [] } = useNotifications();
  const systemConfig = useSystemConfig();
  const model = useMemo(
    () =>
      getCommandDashboardModel({
        platformContext: workspaceAwarePlatformContext,
        account,
        roleProfile,
        userRole: user?.role,
      }),
    [workspaceAwarePlatformContext, account, roleProfile, user?.role]
  );
  const canViewDeveloperCatalog = hasPermission(Permission.CONFIGURE_SYSTEM);
  const recentToolItems = useMemo(
    () =>
      recentTools
        .map((toolId) => model.toolById[toolId])
        .filter(Boolean)
        .slice(0, 4),
    [model.toolById, recentTools]
  );
  const favoriteToolItems = useMemo(
    () =>
      favorites
        .map((toolId) => model.toolById[toolId])
        .filter(Boolean)
        .slice(0, 4),
    [favorites, model.toolById]
  );
  const recommendedToolItems = useMemo(
    () =>
      model.recommendedAssets
        .map((recommendation) => model.toolById[recommendation.assetId || recommendation.id])
        .filter(Boolean)
        .slice(0, 4),
    [model.recommendedAssets, model.toolById]
  );
  const recentAssistantOutputs = useMemo(
    () =>
      messages
        .filter((message) => message.role === 'assistant')
        .slice(-3)
        .reverse(),
    [messages]
  );
  const recentUsageTrend = useMemo(
    () => buildRecentUsageTrend(recentToolItems, messages),
    [messages, recentToolItems]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read).slice(0, 4),
    [notifications]
  );
  const activeAlerts = useMemo(
    () => notifications.filter(isAlertNotification).slice(0, 4),
    [notifications]
  );
  const launchCards = useMemo(
    () => DASHBOARD_LAUNCH_CARDS.filter((card) => isLaunchCardAllowed(card, workspaceAwarePlatformContext)),
    [workspaceAwarePlatformContext]
  );

  const launchTool = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      context: workspaceAwarePlatformContext,
      replace: false,
    });
  };

  const launchPrompt = (prompt) => {
    addMessage(prompt, 'user');
    navigate(CANONICAL_ROUTES.assistant);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (!prompt) return;
    launchPrompt(prompt);
  };

  const handlePromptAction = (action) => {
    if (action.toolId) {
      const tool = model.toolById[action.toolId];
      if (tool) {
        launchTool(tool);
        return;
      }
    }
    launchPrompt(action.prompt);
  };

  return (
    <main className="command-dashboard">
      <section className="command-hero" aria-labelledby="command-dashboard-title">
        <div className="command-hero__content">
          <p className="command-eyebrow">
            {branding?.displayName || model.organization?.name || 'CareDroid'} tenant command center
          </p>
          <div className="command-hero__brand-row">
            {(branding?.dashboardLogoUrl || branding?.logoUrl) && (
              <img
                src={branding.dashboardLogoUrl || branding.logoUrl}
                alt=""
                className="command-hero__logo"
              />
            )}
            <h1 id="command-dashboard-title">
              {branding?.dashboardTitle ||
                `${branding?.displayName || model.organization?.name || 'CareDroid'} Command Center`}
            </h1>
          </div>
          <p>
            {branding?.dashboardSubtitle ||
              'Spend the day from one clinical operating center: ask AI, open tools and calculators, review alerts, check workspace context, and launch major modules without browsing the sidebar.'}{' '}
            Active tenant: {tenant?.tenantId || model.organization?.slug || 'personal'} · workspace:{' '}
            {workspaceContextActive?.name || activeWorkspace?.name || safeSaasProfile.defaultWorkspace || 'Emergency'} · role:{' '}
            {safeSaasProfile.role}.
          </p>
        </div>
        <div className="command-hero__stats" aria-label="Dashboard inventory summary">
          <div>
            <strong>{model.organization?.name || safeSaasProfile.organizationType}</strong>
            <span>Organization</span>
          </div>
          <div>
            <strong>{subscription?.tier || 'free'}</strong>
            <span>Subscription</span>
          </div>
          <div>
            <strong>{workspaceRecommendations.length || model.recommendedAssets.length}</strong>
            <span>Workspace recs</span>
          </div>
          <div>
            <strong>{enabledAssetPacks?.length || recommendedAssetPacks?.length || 0}</strong>
            <span>Asset packs</span>
          </div>
          <div>
            <strong>{pinnedAssets?.length || 0}</strong>
            <span>Pinned assets</span>
          </div>
          <div>
            <strong>{recentAssets?.length || recentToolItems.length}</strong>
            <span>Recent assets</span>
          </div>
        </div>
      </section>

      <section className="command-dashboard__grid" aria-label="Personalized workspace summary">
        <ProfileSummaryCard compact />
        <DashboardPanel
          title="My Workspace"
          description={`Context-aware suggestions for ${activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'your workspace'}.`}
          icon={CHROME_ICONS.sparkles}
        >
          <div className="command-prompt-grid">
            {(aiPersonalization?.recommendedWorkflows || []).slice(0, 3).map((workflow) => (
              <button
                key={workflow.id || workflow.title}
                type="button"
                className="command-prompt-chip"
                onClick={() =>
                  workflow.toolId && model.toolById[workflow.toolId]
                    ? launchTool(model.toolById[workflow.toolId])
                    : null
                }
              >
                <strong>{workflow.title}</strong>
                <span>{workflow.reason}</span>
              </button>
            ))}
          </div>
          <p className="command-assistant-help">
            Recent safe activity: {(activity?.recentTools || []).length} tools,{' '}
            {(activity?.recentAiChats || []).length} AI chats.
          </p>
          <div className="command-insight-grid" aria-label="Workspace context insights">
            <ContextInsightCard
              title="Workspace profile"
              message={`${safeSaasProfile.role} · ${safeSaasProfile.specialty || 'general'} · ${
                safeSaasProfile.department || 'unassigned department'
              }`}
              source="Profile context"
              status="generated"
              actionLabel="Tune profile"
              actionRoute={CANONICAL_ROUTES.profileSettings}
            />
            <ContextInsightCard
              title="Suggested next action"
              message={
                recommendedToolItems[0]
                  ? `Open ${recommendedToolItems[0].name} for this workspace.`
                  : 'Use Assistant once to generate workspace recommendations.'
              }
              source={recommendedToolItems[0] ? 'Workspace inventory' : 'Empty recommendation state'}
              status={recommendedToolItems[0] ? 'action-required' : 'empty'}
              actionLabel={recommendedToolItems[0] ? `Open ${recommendedToolItems[0].name}` : 'Open Assistant'}
              actionRoute={recommendedToolItems[0]?.path || CANONICAL_ROUTES.assistant}
            />
            <ContextInsightCard
              title="Enabled packs"
              message={
                (enabledAssetPacks?.length ? enabledAssetPacks : recommendedAssetPacks || [])
                  .slice(0, 3)
                  .join(', ') || 'No organization asset packs are visible in this local context.'
              }
              source={enabledAssetPacks?.length ? 'Organization entitlements' : 'Workspace profile'}
              status={enabledAssetPacks?.length ? 'live' : 'demo'}
              demo={!enabledAssetPacks?.length}
              actionLabel="Open tools"
              actionRoute={CANONICAL_ROUTES.tools}
            />
            <ContextInsightCard
              title="Assistant context"
              message={(recommendedAIAgents?.length ? recommendedAIAgents : [model.defaultAiAgentId])
                .slice(0, 2)
                .join(', ')}
              source="AI context"
              status={recommendedAIAgents?.length ? 'generated' : 'demo'}
              demo={!recommendedAIAgents?.length}
              actionLabel="Ask Assistant"
              actionRoute={CANONICAL_ROUTES.assistant}
            />
          </div>
          <div className="command-status-actions">
            <Link className="command-secondary-action" to="/workspaces">
              Open workspace
            </Link>
            <Link className="command-secondary-action" to={CANONICAL_ROUTES.profileToolPreferences}>
              Tune my toolkit
            </Link>
          </div>
        </DashboardPanel>
      </section>

      <AdaptiveDashboardPanel />

      <ProfileToolGraphCard />

      <DashboardPanel
        title="Quick Actions"
        description={`Workspace shortcuts for ${workspaceContextActive?.name || 'the active workspace'}.`}
        icon={CHROME_ICONS.layoutDashboard}
      >
        <div className="command-launch-grid">
          {workspaceShortcuts.map((shortcut) => (
            <Link key={`workspace-${shortcut.id}`} className="command-launch-card" to={shortcut.path}>
              <span className="command-launch-card__icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.layoutDashboard} size={21} />
              </span>
              <span className="command-launch-card__body">
                <strong>{shortcut.label}</strong>
                <span>{shortcut.description}</span>
              </span>
            </Link>
          ))}
          {launchCards.map((card) => (
            <Link key={card.id} className="command-launch-card" to={card.path}>
              <span className="command-launch-card__icon" aria-hidden>
                <NavIcon icon={card.icon} size={21} />
              </span>
              <span className="command-launch-card__body">
                <strong>{card.label}</strong>
                <span>{card.description}</span>
              </span>
            </Link>
          ))}
        </div>
      </DashboardPanel>

      <section className="command-dashboard__grid" aria-label="Command Center updates">
        <DashboardPanel
          title="Notifications"
          description="Unread updates stay visible in the Command Center before users visit notification settings."
          icon={CHROME_ICONS.bell}
        >
          <div className="command-recent-list">
            {unreadNotifications.length > 0 ? (
              unreadNotifications.map((notification) => (
                <Link
                  key={notification.id || notificationTitle(notification)}
                  className="command-recent-item"
                  to={CANONICAL_ROUTES.notifications}
                >
                  <strong>{notificationTitle(notification)}</strong>
                  <span>{notificationBody(notification)}</span>
                </Link>
              ))
            ) : (
              <p className="command-empty-state">
                No unread notifications. Notification preferences and history remain one click away.
              </p>
            )}
          </div>
          <Link className="command-panel-link" to={CANONICAL_ROUTES.notifications}>
            Open Notifications
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="Active Alerts"
          description="Critical clinical and operations alerts are summarized here before deeper alert workflows."
          icon={CHROME_ICONS.alert}
        >
          <div className="command-recent-list">
            {activeAlerts.length > 0 ? (
              activeAlerts.map((alert) => (
                <Link
                  key={alert.id || notificationTitle(alert)}
                  className="command-recent-item command-recent-item--alert"
                  to="/clinical/alerts"
                >
                  <strong>{notificationTitle(alert)}</strong>
                  <span>{notificationBody(alert)}</span>
                </Link>
              ))
            ) : (
              <p className="command-empty-state">
                No active alerts in this session. Use the alerts route or Digital Twin for deeper
                operational review.
              </p>
            )}
          </div>
          <div className="command-status-actions">
            <Link className="command-secondary-action" to="/clinical/alerts">
              Open Active Alerts
            </Link>
            <Link className="command-secondary-action" to={CANONICAL_ROUTES.digitalTwin}>
              Open Digital Twin
            </Link>
          </div>
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Simulation, Lab, and 3D"
        description="Newly wired demo-ready clinical training, laboratory, and visualization surfaces."
        icon={CHROME_ICONS.sparkles}
      >
        <div className="command-launch-grid">
          {model.panels.expandedCare.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="AI Assistant"
        description="Start with the chatbot, then let canonical launch behavior route tools and calculators."
        icon={CHROME_ICONS.bot}
        className="command-panel--assistant"
      >
        <form className="command-assistant-form" onSubmit={handleSubmit}>
          <label htmlFor="command-assistant-prompt">Ask CareDroid what you need to do next</label>
          <div className="command-assistant-input-row">
            <textarea
              id="command-assistant-prompt"
              value={assistantPrompt}
              onChange={(event) => setAssistantPrompt(event.target.value)}
              placeholder="Ask anything clinical, then continue in the Assistant workspace..."
              rows={3}
            />
            <button type="submit" className="command-primary-action">
              Open Assistant Workspace
            </button>
          </div>
          <p className="command-assistant-help">
            Free-text questions seed the active conversation and continue in the focused assistant
            route.
          </p>
        </form>
        <div className="command-prompt-grid" aria-label="Suggested CareDroid prompts">
          {model.prompts.map((action) => (
            <button
              key={action.id}
              type="button"
              className="command-prompt-chip"
              onClick={() => handlePromptAction(action)}
            >
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </button>
          ))}
        </div>
      </DashboardPanel>

      <section
        className="command-dashboard__grid"
        aria-label="Command Center personalized toolkits"
      >
        <DashboardPanel
          title="Recommended for Me"
          description="Profile, workspace, and role-aware suggestions from the unified asset inventory."
          icon={CHROME_ICONS.sparkles}
        >
          <div className="command-tool-grid">
            {recommendedToolItems.length > 0 ? (
              recommendedToolItems.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
              ))
            ) : (
              <p className="command-empty-state">
                No personalized recommendations yet. Use Assistant or switch workspace to refresh context.
              </p>
            )}
          </div>
          <Link className="command-panel-link" to={`${CANONICAL_ROUTES.tools}?filter=recommended`}>
            Open Recommended Tools
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="Favorite Tools"
          description="Pinned and favorite tools stay close to the command center without creating duplicate navigation."
          icon={CHROME_ICONS.star}
        >
          <div className="command-tool-grid">
            {favoriteToolItems.length > 0 ? (
              favoriteToolItems.map((tool) => (
                <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
              ))
            ) : (
              <p className="command-empty-state">
                No favorite tools yet. Favorite or pin tools from the Tools library.
              </p>
            )}
          </div>
          <Link className="command-panel-link" to={`${CANONICAL_ROUTES.tools}?filter=favorites`}>
            Open Favorite Tools
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="My Tools"
          description="High-value clinical, reference, and workflow tools surfaced from the unified inventory."
          icon={CHROME_ICONS.tools}
        >
          <div className="command-tool-grid">
            {[...model.panels.clinicalTools, ...model.panels.referenceGuidelines]
              .filter(
                (tool) => tool.category !== 'Calculator' && tool.surface !== 'calculator-form'
              )
              .slice(0, 8)
              .map((tool) => (
                <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
              ))}
          </div>
          <Link className="command-panel-link" to={`${CANONICAL_ROUTES.tools}?filter=all`}>
            Open All Medical Tools
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="My Calculators"
          description="Common scores and calculator routes stay one click away from the Command Center."
          icon={CHROME_ICONS.calculator}
        >
          <div className="command-tool-grid">
            {model.panels.calculators.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
          <Link className="command-panel-link" to={CANONICAL_ROUTES.calculators}>
            Open All Calculators
          </Link>
        </DashboardPanel>
      </section>

      <DashboardPanel
        title="Command Analytics"
        description="Inventory-derived command center metrics, launch modes, readiness, and recent session activity."
        icon={CHROME_ICONS.barChart}
      >
        <div className="dashboard-metric-grid command-analytics-metrics">
          <MetricCard
            label="Total tools"
            value={model.stats.totalTools}
            hint="Unified inventory"
            tone="good"
          />
          <MetricCard
            label="Calculators"
            value={model.stats.calculators}
            hint="Dedicated and assisted scores"
          />
          <MetricCard
            label="AI tools"
            value={model.stats.aiTools}
            hint="Backend or assistant-guided"
          />
          <MetricCard
            label="Backend-backed"
            value={model.stats.backendBacked}
            hint="Executor/platform routes"
          />
          <MetricCard
            label="Planned"
            value={model.stats.unsupported}
            hint="Unsupported or roadmap state"
            tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
          />
        </div>

        <div className="dashboard-visual-grid command-analytics-grid">
          <VisualizationPanel
            title="Tool Category Distribution"
            description="One count per canonical user-facing tool."
          >
            <CategoryBarChart
              data={model.visualizations.categoryDistribution}
              title="Tool category distribution"
            />
          </VisualizationPanel>
          <VisualizationPanel
            title="Launch Type Distribution"
            description="How dashboard cards resolve at launch."
          >
            <DistributionDonutChart
              data={model.visualizations.launchTypeDistribution}
              title="Launch type distribution"
            />
          </VisualizationPanel>
          <VisualizationPanel
            title="Clinical Tier Distribution"
            description="Tier A/B/C, fleet, IoT, and hub readiness."
          >
            <DistributionDonutChart
              data={model.visualizations.tierDistribution}
              title="Clinical tier distribution"
            />
          </VisualizationPanel>
          <VisualizationPanel
            title="Recent Activity Trend"
            description="Session-derived activity trend, not a persisted audit log."
            badge="Session data"
          >
            <TrendChart data={recentUsageTrend} title="Recent activity trend" />
          </VisualizationPanel>
        </div>
      </DashboardPanel>

      <div className="command-dashboard__grid">
        <DashboardPanel
          title="Clinical Tools Detail"
          description="Calculators, diagnostics, emergency, and inpatient decision-support tools."
          icon={CHROME_ICONS.calculator}
        >
          <div className="command-tool-grid">
            {model.panels.clinicalTools.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Reference & Guidelines Detail"
          description="Evidence retrieval, medication safety, labs, protocols, and procedure support."
          icon={CHROME_ICONS.clipboardList}
        >
          <div className="command-tool-grid">
            {model.panels.referenceGuidelines.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Operations Summary"
          description="Fleet, live maps, IoT, devices, telemetry, and maintenance stay grouped under Operations."
          icon={CHROME_ICONS.truck}
        >
          <div className="command-tool-grid">
            {[...model.panels.fleetOperations, ...model.panels.medicalIot].map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
          <Link className="command-panel-link" to={CANONICAL_ROUTES.operations}>
            Open Operations
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="Recent Activity"
          description="Continue recent tools and assistant context from this session."
          icon={CHROME_ICONS.clock}
        >
          <div className="command-recent-list">
            {recentToolItems.length > 0 ? (
              recentToolItems.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  className="command-recent-item"
                  onClick={() => launchTool(tool)}
                >
                  <strong>{tool.name}</strong>
                  <span>{tool.category} - open again</span>
                </button>
              ))
            ) : (
              <p className="command-empty-state">
                No recent tools yet. Start with Assistant or open a featured action.
              </p>
            )}
            {conversations.slice(0, 3).map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className="command-recent-item"
                onClick={() => navigate(CANONICAL_ROUTES.assistant)}
              >
                <strong>{conversation.title || 'Conversation'}</strong>
                <span>Continue in Assistant</span>
              </button>
            ))}
            {recentAssistantOutputs.map((message) => (
              <button
                key={message.id}
                type="button"
                className="command-recent-item"
                onClick={() => navigate(CANONICAL_ROUTES.assistant)}
              >
                <strong>Recent AI output</strong>
                <span>{String(message.content || '').slice(0, 90)}</span>
              </button>
            ))}
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="System Status"
          description="Backend-aware state without blocking local calculators or fleet pages."
          icon={CHROME_ICONS.shield}
        >
          <div className="command-status-grid" role="status">
            <StatusItem
              label="Session"
              value={isDevAuthBypass ? 'Demo mode' : user?.role || 'Authenticated'}
              tone={isDevAuthBypass ? 'warning' : 'good'}
            />
            <StatusItem
              label="Backend config"
              value={
                systemConfig.loading
                  ? 'Checking'
                  : systemConfig.configDegraded
                    ? 'Degraded'
                    : 'Connected'
              }
              tone={systemConfig.configDegraded ? 'warning' : 'good'}
            />
            <StatusItem
              label="RAG"
              value={systemConfig.isRagEnabled ? 'Enabled' : 'Unavailable'}
              tone={systemConfig.isRagEnabled ? 'good' : 'neutral'}
            />
            <StatusItem label="Unsupported tools" value={model.stats.unsupported} tone="neutral" />
            <StatusItem
              label="API tools"
              value={
                Array.isArray(systemConfig.availableTools) ? systemConfig.availableTools.length : 0
              }
              tone="neutral"
            />
          </div>
          <div className="dashboard-status-grid-visual command-system-status-cards">
            <StatusCard
              label="API status"
              value={
                systemConfig.loading
                  ? 'Checking'
                  : systemConfig.configDegraded
                    ? 'Degraded'
                    : 'Ready'
              }
              detail={
                systemConfig.error || 'Dashboard remains usable while local tools stay available.'
              }
              tone={systemConfig.configDegraded || systemConfig.error ? 'warning' : 'good'}
            />
            <StatusCard
              label="Executor readiness"
              value={`${model.stats.backendBacked} backed`}
              detail={`${model.stats.unsupported} planned or unsupported entries tracked.`}
              tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
            />
          </div>
          <VisualizationPanel
            title="Tool Readiness Distribution"
            description="Backend, local, assistant-guided, and planned tool states."
          >
            <DistributionDonutChart
              data={model.visualizations.readinessDistribution}
              title="Tool readiness distribution"
            />
          </VisualizationPanel>
          {systemConfig.error ? <p className="command-status-note">{systemConfig.error}</p> : null}
          <div className="command-status-actions">
            <button
              type="button"
              className="command-secondary-action"
              onClick={systemConfig.refresh}
            >
              Retry status
            </button>
            <Link className="command-secondary-action" to={CANONICAL_ROUTES.tools}>
              Open Tool Library
            </Link>
            {canViewDeveloperCatalog ? (
              <Link className="command-secondary-action" to={CANONICAL_ROUTES.developerCatalog}>
                Developer audit
              </Link>
            ) : null}
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}
