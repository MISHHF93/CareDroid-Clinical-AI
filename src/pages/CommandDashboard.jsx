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
import { getCommandDashboardModel } from '../data/commandDashboardModel';
import {
  buildWorkspaceAssistantPrompt,
  getWorkspaceExperienceProfile,
  normalizeWorkspaceShortcut,
} from '../data/workspaceExperience';
import { getFrontendOperatingSystemState } from '../data/frontendOperatingSystem';
import {
  StatusCard,
} from '../components/dashboard/DashboardVisualizations';
import {
  InsightCard,
  MetricCard as CompactMetricCard,
} from '../components/ui/CareDroidPrimitives';
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

function InsightChip({ label, value, tone = 'neutral' }) {
  return (
    <div className={`command-insight-chip command-insight-chip--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CompactActionCard({ item, onClick }) {
  const content = (
    <>
      <span className="command-compact-action__icon" aria-hidden>
        <NavIcon icon={item.icon} size={20} />
      </span>
      <span className="command-compact-action__body">
        <strong>{item.label}</strong>
        <span>{item.description}</span>
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className="command-compact-action" onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link className="command-compact-action" to={item.path}>
      {content}
    </Link>
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
    id: 'assets',
    label: 'Assets',
    description: 'Open the asset library directly from the dashboard.',
    path: CANONICAL_ROUTES.assets,
    icon: CHROME_ICONS.artifacts,
  },
  {
    id: 'workflows',
    label: 'Workflows',
    description: 'Open workflow builder and journey automation without detouring through tools.',
    path: CANONICAL_ROUTES.workflows,
    icon: CHROME_ICONS.clipboardList,
  },
  {
    id: 'results',
    label: 'Results',
    description: 'Review outcomes, signals, follow-up context, and recent workspace events.',
    path: CANONICAL_ROUTES.timeline,
    icon: CHROME_ICONS.clock,
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

export default function CommandDashboard() {
  const navigate = useNavigate();
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const { user, isDevAuthBypass, hasPermission } = useUser();
  const {
    activeWorkspace,
    platformContext,
    account,
    roleProfile,
    saasProfile,
  } = useUserIdentity();
  const { branding, tenant, subscription } = useOrganizationContext();
  const {
    activeWorkspace: workspaceContextActive,
    recommendations: workspaceRecommendations,
    shortcuts: workspaceShortcuts,
    visibleAssetIds: workspaceVisibleAssetIds,
  } = useWorkspace();
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(workspaceContextActive || activeWorkspace),
    [activeWorkspace, workspaceContextActive]
  );
  const frontendOs = useMemo(
    () =>
      getFrontendOperatingSystemState({
        pathname: CANONICAL_ROUTES.dashboard,
        workspace: workspaceContextActive || activeWorkspace,
        tenantId: tenant?.tenantId || 'personal',
        plan: subscription?.tier || 'free',
      }),
    [activeWorkspace, subscription?.tier, tenant?.tenantId, workspaceContextActive]
  );
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
  const { conversations, addMessage, selectTool, setActiveTool } = useConversation();
  const { recentTools, recordToolAccess } = useToolPreferences();
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
  const recommendedToolItems = useMemo(
    () =>
      model.recommendedAssets
        .map((recommendation) => model.toolById[recommendation.assetId || recommendation.id])
        .filter(Boolean)
        .slice(0, 4),
    [model.recommendedAssets, model.toolById]
  );
  const dashboardLaunchCardsById = useMemo(
    () => Object.fromEntries(DASHBOARD_LAUNCH_CARDS.map((card) => [card.id, card])),
    []
  );
  const workspaceActionCards = useMemo(() => {
    const selected = [
      ...workspaceExperience.primaryActionIds
        .map((id) => dashboardLaunchCardsById[id])
        .filter(Boolean),
      ...['assets', 'workflows', 'results', 'simulation', 'operations', 'tools', 'workspace']
        .map((id) => dashboardLaunchCardsById[id])
        .filter(Boolean),
      ...workspaceExperience.routeEntries.map((route) => ({
        id: `workspace-route-${route.id}`,
        label: route.label,
        description: route.description,
        path: route.path,
        icon: CHROME_ICONS.layoutDashboard,
      })),
      ...workspaceShortcuts
        .map(normalizeWorkspaceShortcut)
        .filter(Boolean)
        .map((shortcut) => ({
          id: `workspace-shortcut-${shortcut.id}`,
          label: shortcut.label,
          description: shortcut.description,
          path: shortcut.path,
          icon: CHROME_ICONS.layoutDashboard,
        })),
    ];
    return [...new Map(selected.map((item) => [item.path || item.id, item])).values()].slice(0, 12);
  }, [dashboardLaunchCardsById, workspaceExperience, workspaceShortcuts]);
  const workspacePromptActions = useMemo(
    () => [
      ...workspaceExperience.quickPrompts.map((prompt, index) => ({
        id: `workspace-prompt-${workspaceExperience.id}-${index}`,
        title: prompt,
        description: workspaceExperience.modeSummary,
        prompt,
      })),
      ...model.prompts,
    ].slice(0, 6),
    [model.prompts, workspaceExperience]
  );
  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read && !isAlertNotification(notification)).slice(0, 4),
    [notifications]
  );
  const activeAlerts = useMemo(
    () => notifications.filter(isAlertNotification).slice(0, 4),
    [notifications]
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
    addMessage(buildWorkspaceAssistantPrompt(prompt, workspaceExperience), 'user');
    navigate(CANONICAL_ROUTES.assistant);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const prompt = assistantPrompt.trim();
    if (!prompt) return;
    launchPrompt(prompt);
  };

  const handlePromptAction = (action) => {
    if (action.route) {
      navigate(action.route);
      return;
    }
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
    <section className="command-dashboard command-dashboard--compressed">
      <section className="command-hero" aria-labelledby="command-dashboard-title">
        <div className="command-hero__content">
          <p className="command-eyebrow">
            {workspaceExperience.operatingLabel} · {branding?.displayName || model.organization?.name || 'CareDroid'}
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
                workspaceExperience.dashboardTitle}
            </h1>
          </div>
          <p>
            {branding?.dashboardSubtitle ||
              workspaceExperience.dashboardSubtitle}{' '}
            Tenant: {tenant?.tenantId || model.organization?.slug || 'personal'} · workspace:{' '}
            {workspaceExperience.label || workspaceContextActive?.name || activeWorkspace?.name || safeSaasProfile.defaultWorkspace || 'Emergency'} · role:{' '}
            {safeSaasProfile.role}.
          </p>
          <div className="command-os-flow" aria-label="Frontend operating system flow">
            {frontendOs.flowSteps.map((step) => (
              <span key={step.id} className={`command-os-flow__step command-os-flow__step--${step.state}`}>
                {step.label}
              </span>
            ))}
          </div>
        </div>
        <div className="command-insight-strip" aria-label="Dashboard context summary">
          <InsightChip label="Mode" value={workspaceExperience.shortLabel} tone="good" />
          <InsightChip label="Plan" value={subscription?.tier || 'free'} />
          <InsightChip label="Recommendations" value={workspaceRecommendations.length || model.recommendedAssets.length} tone="good" />
          <InsightChip label="Alerts" value={activeAlerts.length} tone={activeAlerts.length ? 'warning' : 'good'} />
        </div>
      </section>

      <DashboardPanel
        title="Actions"
        description="Primary routes and workspace shortcuts, compressed into one launch row."
        icon={CHROME_ICONS.layoutDashboard}
      >
        <div className="command-compact-action-grid">
          {workspaceActionCards.map((item) => (
            <CompactActionCard key={item.id} item={item} />
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel
        title="AI Assistant"
        description="Ask once, then continue in the focused Assistant workspace."
        icon={CHROME_ICONS.bot}
        className="command-panel--assistant"
      >
        <form className="command-assistant-form" onSubmit={handleSubmit}>
          <label htmlFor="command-assistant-prompt">Ask {workspaceExperience.assistantTitle} what you need to do next</label>
          <div className="command-assistant-input-row">
            <textarea
              id="command-assistant-prompt"
              value={assistantPrompt}
              onChange={(event) => setAssistantPrompt(event.target.value)}
              placeholder={workspaceExperience.assistantPlaceholder}
              rows={3}
            />
            <button type="submit" className="command-primary-action">
              Open {workspaceExperience.assistantTitle}
            </button>
          </div>
          <p className="command-assistant-help">
            {workspaceExperience.modeSummary} Free-text questions continue in the focused assistant route.
          </p>
        </form>
        <div className="command-prompt-grid command-prompt-grid--compressed" aria-label="Suggested CareDroid prompts">
          {workspacePromptActions.map((action) => (
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
        aria-label="Compressed recommendations and status"
      >
        <DashboardPanel
          title="Recommendations"
          description="Role and workspace-aware tools, reduced to the next best actions."
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
          title="Signals"
          description="Alerts, notifications, and recent activity in one compact feed."
          icon={CHROME_ICONS.clock}
        >
          <div className="command-recent-list">
            {activeAlerts.slice(0, 2).map((alert) => (
              <Link
                key={alert.id || notificationTitle(alert)}
                className="command-recent-item command-recent-item--alert"
                to="/clinical/alerts"
              >
                <strong>{notificationTitle(alert)}</strong>
                <span>{notificationBody(alert)}</span>
              </Link>
            ))}
            {unreadNotifications.slice(0, 2).map((notification) => (
              <Link
                key={notification.id || notificationTitle(notification)}
                className="command-recent-item"
                to={CANONICAL_ROUTES.notifications}
              >
                <strong>{notificationTitle(notification)}</strong>
                <span>{notificationBody(notification)}</span>
              </Link>
            ))}
            {recentToolItems.slice(0, 2).map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="command-recent-item"
                onClick={() => launchTool(tool)}
              >
                <strong>{tool.name}</strong>
                <span>{tool.category} - open again</span>
              </button>
            ))}
            {conversations.slice(0, 1).map((conversation) => (
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
            {!activeAlerts.length && !unreadNotifications.length && !recentToolItems.length && !conversations.length ? (
              <p className="command-empty-state">No live signals yet. Start with Assistant or open an action.</p>
            ) : null}
          </div>
          <div className="command-status-actions command-status-actions--row">
            <Link className="command-secondary-action" to={CANONICAL_ROUTES.notifications}>
              Notifications
            </Link>
            <Link className="command-secondary-action" to="/clinical/alerts">
              Alerts
            </Link>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title="Status"
          description="System and inventory state as compact cards."
          icon={CHROME_ICONS.shield}
        >
          <div className="command-compressed-metrics" role="status">
            <CompactMetricCard label="Tools" value={model.stats.totalTools} helper="Inventory" tone="good" />
            <CompactMetricCard label="AI tools" value={model.stats.aiTools} helper="Assistant/backed" />
            <CompactMetricCard
              label="Backend"
              value={systemConfig.configDegraded ? 'Degraded' : 'Ready'}
              helper={systemConfig.loading ? 'Checking' : 'Config'}
              tone={systemConfig.configDegraded ? 'warning' : 'good'}
            />
            <CompactMetricCard
              label="Planned"
              value={model.stats.unsupported}
              helper="Roadmap"
              tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
            />
          </div>
          <div className="command-status-card-row">
            <StatusCard
              label="Session"
              value={isDevAuthBypass ? 'Demo' : user?.role || 'Authenticated'}
              detail={systemConfig.error || 'Local tools remain available.'}
              tone={systemConfig.configDegraded || systemConfig.error ? 'warning' : 'good'}
            />
            <StatusCard
              label="Executor readiness"
              value={`${model.stats.backendBacked} backed`}
              detail={`${model.stats.unsupported} planned or unsupported entries tracked.`}
              tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
            />
          </div>
          {systemConfig.error ? <p className="command-status-note">{systemConfig.error}</p> : null}
          <div className="command-status-actions command-status-actions--row">
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
                Audit
              </Link>
            ) : null}
          </div>
        </DashboardPanel>
      </section>
    </section>
  );
}
