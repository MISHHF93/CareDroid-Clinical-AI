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
import {
  StatusCard,
} from '../components/dashboard/DashboardVisualizations';
import {
  MetricCard as CompactMetricCard,
} from '../components/ui/CareDroidPrimitives';
import LaunchActionCard from '../components/ui/LaunchActionCard';
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

function CommandToolLaunchCard({ tool, onLaunch }) {
  return (
    <LaunchActionCard
      className="command-tool-card"
      onClick={() => onLaunch(tool)}
      ariaLabel={`Open ${tool.name}`}
      icon={getToolIcon(tool.id)}
      iconSize={22}
      iconColor={tool.color}
      title={tool.name}
      description={tool.description}
      meta={
        <>
          <span>{tool.category}</span>
          <span>{launchBadgeFor(tool)}</span>
        </>
      }
      classNames={{
        icon: 'command-tool-card__icon',
        body: 'command-tool-card__body',
        title: 'command-tool-card__title',
        description: 'command-tool-card__desc',
        meta: 'command-tool-card__meta',
      }}
    />
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

function InsightChip({ label, value, helper, tone = 'neutral' }) {
  return (
    <div className={`command-insight-chip command-insight-chip--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}

function cssToken(value = 'default') {
  return String(value || 'default').toLowerCase().replace(/[^a-z0-9-]/g, '-');
}

function workspaceThemeStyle(experience) {
  return {
    '--workspace-os-accent': experience.theme?.accent,
    '--workspace-os-surface': experience.theme?.surface,
    '--workspace-os-border': experience.theme?.border,
  };
}

function CompactActionCard({ item, onClick }) {
  const isPrimaryAction = item.path === CANONICAL_ROUTES.assistant || item.id === 'assistant';

  return (
    <LaunchActionCard
      className={`command-compact-action${isPrimaryAction ? ' command-compact-action--primary' : ''}`}
      to={onClick ? undefined : item.path}
      onClick={onClick}
      icon={item.icon}
      title={item.label}
      description={item.description}
      classNames={{
        icon: 'command-compact-action__icon',
        body: 'command-compact-action__body',
      }}
    />
  );
}

const DASHBOARD_LAUNCH_CARDS = Object.freeze([
  {
    id: 'search',
    label: 'Global Search',
    description: 'Find tools, calculators, protocols, workflows, AI agents, operations, and routes from one place.',
    path: CANONICAL_ROUTES.search,
    icon: CHROME_ICONS.search,
  },
  {
    id: 'recommendations',
    label: 'Recommendations',
    description: 'Open role, workspace, product, AI, simulation, and protocol recommendations.',
    path: CANONICAL_ROUTES.recommendations,
    icon: CHROME_ICONS.sparkles,
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    description: 'Ask, triage, and launch tools from the chatbot workspace.',
    path: CANONICAL_ROUTES.assistant,
    icon: CHROME_ICONS.bot,
  },
  {
    id: 'workspace',
    label: 'Manage Workspaces',
    description: 'Change active workspace, defaults, and workspace context from one place.',
    path: '/profile/workspaces',
    icon: CHROME_ICONS.layoutDashboard,
  },
  {
    id: 'profile',
    label: 'Profile',
    description: 'Open profile, preferences, activity, security, and workspace settings.',
    path: CANONICAL_ROUTES.profile,
    icon: CHROME_ICONS.user,
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Browse every permitted clinical and operations tool.',
    path: CANONICAL_ROUTES.tools,
    icon: CHROME_ICONS.tools,
  },
  {
    id: 'calculators',
    label: 'Calculators',
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
    id: 'automation-analytics',
    label: 'Automation Analytics',
    description: 'Track solution automation runs, adoption, failures, human overrides, and AI acceptance.',
    path: CANONICAL_ROUTES.automationAnalytics,
    icon: CHROME_ICONS.bolt,
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
    icon: CHROME_ICONS.flask,
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
    icon: CHROME_ICONS.activity,
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
    icon: CHROME_ICONS.smartphone,
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
  const { branding, tenant } = useOrganizationContext();
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
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { favorites, pinned, recentTools, recordToolAccess } = useToolPreferences();
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
        .slice(0, 3),
    [model.toolById, recentTools]
  );
  const favoriteToolItems = useMemo(
    () =>
      [...new Set([...(pinned || []), ...(favorites || [])])]
        .map((toolId) => model.toolById[toolId])
        .filter(Boolean)
        .slice(0, 2),
    [favorites, model.toolById, pinned]
  );
  const recommendedToolItems = useMemo(
    () => {
      const sourceRecommendations = workspaceRecommendations.length
        ? workspaceRecommendations
        : model.recommendedAssets;
      return sourceRecommendations
        .map((recommendation) => model.toolById[recommendation.assetId || recommendation.id])
        .filter(Boolean)
        .slice(0, 3);
    },
    [model.recommendedAssets, model.toolById, workspaceRecommendations]
  );
  const dashboardLaunchCardsById = useMemo(
    () => Object.fromEntries(DASHBOARD_LAUNCH_CARDS.map((card) => [card.id, card])),
    []
  );
  const workspaceActionCards = useMemo(() => {
    const selected = [
      ...['assistant', 'tools', 'operations']
        .map((id) => dashboardLaunchCardsById[id])
        .filter(Boolean),
      ...workspaceExperience.primaryActionIds
        .map((id) => dashboardLaunchCardsById[id])
        .filter(Boolean),
      ...workspaceExperience.routeEntries
        .slice(0, 3)
        .map((route) => ({
          id: `workspace-route-${route.id}`,
          label: route.label,
          description: route.description,
          path: route.path,
          icon: CHROME_ICONS.layoutDashboard,
        })),
      ...workspaceShortcuts
        .map(normalizeWorkspaceShortcut)
        .filter(Boolean)
        .slice(0, 2)
        .map((shortcut) => ({
          id: `workspace-shortcut-${shortcut.id}`,
          label: shortcut.label,
          description: shortcut.description,
          path: shortcut.path,
          icon: CHROME_ICONS.layoutDashboard,
        })),
    ];
    return [...new Map(selected.map((item) => [item.path || item.id, item])).values()].slice(0, 3);
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
    ].slice(0, 1),
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
  const continueToolItems = useMemo(
    () => [...new Map([...favoriteToolItems, ...recentToolItems].map((tool) => [tool.id, tool])).values()].slice(0, 3),
    [favoriteToolItems, recentToolItems]
  );
  const hasLiveSignals = activeAlerts.length > 0 || unreadNotifications.length > 0 || recentToolItems.length > 0;
  const showStatusPanel = systemConfig.loading || systemConfig.configDegraded || Boolean(systemConfig.error);
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
    <section
      className={`command-dashboard command-dashboard--compressed command-dashboard--${cssToken(workspaceExperience.tone)} command-dashboard--workspace-${cssToken(workspaceExperience.id)}`}
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
    >
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
          <p>{branding?.dashboardSubtitle || workspaceExperience.dashboardSubtitle}</p>
          <div className="command-hero__context" aria-label="Dashboard context">
            <span>{workspaceExperience.label || workspaceContextActive?.name || activeWorkspace?.name || safeSaasProfile.defaultWorkspace || 'Emergency'}</span>
            <span>{workspaceExperience.environment}</span>
            <Link to={CANONICAL_ROUTES.systemHealth}>
              {systemConfig.configDegraded ? 'Backend degraded' : 'Systems ready'}
            </Link>
          </div>
        </div>
        <div className="command-insight-strip" aria-label="Dashboard context summary">
          {(workspaceExperience.focusMetrics || []).slice(0, 1).map((metric) => (
            <InsightChip
              key={metric.label}
              label={metric.label}
              value={metric.value}
              helper={metric.helper}
              tone={metric.tone || 'good'}
            />
          ))}
          <InsightChip label="Alerts" value={activeAlerts.length} tone={activeAlerts.length ? 'warning' : 'good'} />
        </div>
      </section>

      <DashboardPanel
        title="Actions"
        description="Start with Assistant. Tools and Operations stay close for direct work."
        icon={CHROME_ICONS.layoutDashboard}
      >
        <div className="command-compact-action-grid">
          {workspaceActionCards.map((item) => (
            <CompactActionCard key={item.id} item={item} />
          ))}
        </div>
        <div className="command-utility-links" aria-label="Secondary dashboard access">
          <Link to={CANONICAL_ROUTES.search}>Search</Link>
          <Link to={CANONICAL_ROUTES.recommendations}>Recommendations</Link>
          <Link to="/profile/workspaces">Workspaces</Link>
          <Link to={CANONICAL_ROUTES.profile}>Profile</Link>
        </div>
      </DashboardPanel>

      {continueToolItems.length > 0 && (
        <DashboardPanel
          title="Continue"
          description="Pinned, favorite, and recent tools appear only when there is something to resume."
          icon={CHROME_ICONS.clock}
        >
          <div className="command-tool-grid">
            {continueToolItems.map((tool) => (
              <CommandToolLaunchCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
        </DashboardPanel>
      )}

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
              Ask Assistant
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
          <Link className="command-prompt-chip command-prompt-chip--link" to={CANONICAL_ROUTES.recommendations}>
            <strong>More recommendations</strong>
            <span>Open role, workspace, and product-aware suggestions.</span>
          </Link>
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
              recommendedToolItems.slice(0, 2).map((tool) => (
                <CommandToolLaunchCard key={tool.id} tool={tool} onLaunch={launchTool} />
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

        {hasLiveSignals && (
          <DashboardPanel
            title="Signals"
            description="Only live alerts, unread notifications, or resumable tool activity appears here."
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
              {unreadNotifications.slice(0, 1).map((notification) => (
                <Link
                  key={notification.id || notificationTitle(notification)}
                  className="command-recent-item"
                  to={CANONICAL_ROUTES.notifications}
                >
                  <strong>{notificationTitle(notification)}</strong>
                  <span>{notificationBody(notification)}</span>
                </Link>
              ))}
              {recentToolItems.slice(0, 1).map((tool) => (
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
        )}

        {showStatusPanel && (
          <DashboardPanel
            title="Status"
            description="System status appears inline only when attention is needed."
            icon={CHROME_ICONS.shield}
          >
            <div className="command-compressed-metrics" role="status">
              <CompactMetricCard
                label="Backend"
                value={systemConfig.configDegraded ? 'Degraded' : 'Checking'}
                helper={systemConfig.loading ? 'Checking' : 'Config'}
                tone={systemConfig.configDegraded ? 'warning' : 'good'}
              />
            </div>
            <div className="command-status-card-row">
              <StatusCard
                label="Session"
                value={isDevAuthBypass ? 'Demo' : user?.role || 'Authenticated'}
                detail={systemConfig.error || 'Local tools remain available.'}
                tone={systemConfig.configDegraded || systemConfig.error ? 'warning' : 'good'}
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
              <Link className="command-secondary-action" to={CANONICAL_ROUTES.systemHealth}>
                System Health
              </Link>
              {canViewDeveloperCatalog ? (
                <Link className="command-secondary-action" to={CANONICAL_ROUTES.developerCatalog}>
                  Audit
                </Link>
              ) : null}
            </div>
          </DashboardPanel>
        )}
      </section>
    </section>
  );
}
