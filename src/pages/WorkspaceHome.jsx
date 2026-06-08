import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
} from '../config/workspace.config';
import { getWorkspaceExperienceProfile } from '../data/workspaceExperience';
import { workspaceFilterSummary } from '../data/platformOperatingSystem';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon, getWorkspaceIcon } from '../navigation/iconRegistry';
import './WorkspaceHome.css';

function WorkspaceRouteCard({ route, onLaunch }) {
  return (
    <button
      type="button"
      className="workspace-route-card"
      onClick={() => onLaunch(route.path)}
      aria-label={`Open ${route.label}`}
    >
      <span className="workspace-route-card__icon" aria-hidden>
        <NavIcon icon={CHROME_ICONS.layoutDashboard} size={20} />
      </span>
      <span className="workspace-route-card__body">
        <strong>{route.label}</strong>
        <span>{route.description}</span>
      </span>
    </button>
  );
}

function WorkspaceToolCard({ tool, onLaunch }) {
  return (
    <button
      type="button"
      className="workspace-tool-card"
      onClick={() => onLaunch(tool)}
      aria-label={`Open ${tool.name}`}
    >
      <span className="workspace-tool-card__icon" style={{ color: tool.color }} aria-hidden>
        <NavIcon icon={getToolIcon(tool.id)} size={21} />
      </span>
      <span className="workspace-tool-card__body">
        <strong>{tool.name}</strong>
        <span>{tool.description}</span>
        <span className="workspace-tool-card__meta">{tool.category}</span>
      </span>
    </button>
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

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { workspaceId = DEFAULT_CARE_WORKSPACE_ID } = useParams();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const {
    assistantContext,
    recommendations,
    shortcuts,
  } = useWorkspace();
  const model = useMemo(() => buildCareWorkspaceModel(workspaceId), [workspaceId]);
  const workspaceExperience = useMemo(
    () => getWorkspaceExperienceProfile(model.workspace),
    [model.workspace]
  );
  const workspaceSummary = useMemo(() => workspaceFilterSummary(model.workspace.id), [model.workspace.id]);
  const WorkspaceIcon = getWorkspaceIcon(model.workspace.icon);
  const visibleRouteEntries = useMemo(
    () => (shortcuts.length ? shortcuts : model.routeEntries).slice(0, 4),
    [model.routeEntries, shortcuts]
  );
  const visibleToolEntries = useMemo(
    () =>
      (recommendations.length
        ? recommendations
            .map((recommendation) =>
              model.toolEntries.find((tool) => tool.id === recommendation.assetId)
            )
            .filter(Boolean)
        : model.toolEntries
      ).slice(0, 3),
    [model.toolEntries, recommendations]
  );

  const launchRoute = (path) => {
    navigate({ pathname: path, search: '' });
  };

  const launchTool = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: false,
      state: { source: 'workspace', workspaceId: model.workspace.id },
    });
  };

  const launchAssistantContext = () => {
    addMessage(assistantContext || model.workspace.aiContext, 'user');
    navigate('/assistant');
  };

  return (
    <main
      className={`workspace-home workspace-home--${cssToken(workspaceExperience.tone)} workspace-home--workspace-${cssToken(workspaceExperience.id)}`}
      data-workspace-os={workspaceExperience.id}
      style={workspaceThemeStyle(workspaceExperience)}
    >
      <section className="workspace-hero" aria-labelledby="workspace-title">
        <div className="workspace-hero__icon" aria-hidden>
          <NavIcon icon={WorkspaceIcon} size={34} />
        </div>
        <div className="workspace-hero__content">
          <p className="workspace-eyebrow">{workspaceExperience.operatingLabel}</p>
          <h1 id="workspace-title">{model.workspace.label} Workspace</h1>
          <p>{workspaceExperience.dashboardSubtitle || model.workspace.description}</p>
        </div>
        <div className="workspace-hero__actions">
          <button type="button" className="workspace-primary-action" onClick={launchAssistantContext}>
            <NavIcon icon={CHROME_ICONS.bot} size={18} aria-hidden />
            Ask Assistant
          </button>
          <button type="button" className="workspace-secondary-action" onClick={() => launchRoute('/dashboard')}>
            Command Center
          </button>
        </div>
      </section>

      <section className="workspace-operating-brief" aria-label={`${workspaceExperience.operatingLabel} brief`}>
        <div>
          <p className="workspace-eyebrow">{workspaceExperience.environment}</p>
          <h2>{workspaceExperience.dashboardTitle}</h2>
          <ul>
            {(workspaceExperience.operatingBrief || []).slice(0, 2).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="workspace-focus-metrics">
          {(workspaceExperience.focusMetrics || []).slice(0, 2).map((metric) => (
            <div key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.helper}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-switch-grid" aria-label="Workspace management">
        <Link className="workspace-chip workspace-chip--active" to="/profile/workspaces">
          <NavIcon icon={WorkspaceIcon} size={17} aria-hidden />
          <span>Manage workspaces</span>
        </Link>
      </section>

      <section className="workspace-context-panel" aria-labelledby="workspace-context-title">
        <div>
          <p className="workspace-eyebrow">AI Context</p>
          <h2 id="workspace-context-title">{workspaceExperience.assistantTitle}</h2>
          <p>{assistantContext || workspaceExperience.assistantContext || model.workspace.aiContext}</p>
        </div>
        <dl className="workspace-stats">
          <div>
            <dt>Context routes</dt>
            <dd>{model.stats.routes}</dd>
          </div>
          <div>
            <dt>Relevant tools</dt>
            <dd>{model.stats.tools}</dd>
          </div>
          <div>
            <dt>Notifications</dt>
            <dd>{workspaceSummary.notifications.length}</dd>
          </div>
        </dl>
      </section>

      <section className="workspace-content-grid">
        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Context Panels</h2>
            <p>Dashboards, maps, and settings that belong to this workspace.</p>
          </div>
          <div className="workspace-card-grid">
            {visibleRouteEntries.map((route) => (
              <WorkspaceRouteCard key={route.id} route={route} onLaunch={launchRoute} />
            ))}
          </div>
        </div>

        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Recommended Tools</h2>
            <p>Inventory-backed actions surfaced by context instead of sidebar sprawl.</p>
          </div>
          <div className="workspace-card-grid">
            {visibleToolEntries.map((tool) => (
              <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
        </div>

        <div className="workspace-panel">
          <div className="workspace-panel__header">
            <h2>Notifications</h2>
            <p>Workspace-filtered operational inbox items.</p>
          </div>
          <div className="workspace-card-grid">
            {workspaceSummary.notifications.slice(0, 3).map((notification) => (
              <button
                key={notification.id}
                type="button"
                className="workspace-route-card"
                onClick={() => navigate('/notifications')}
              >
                <span className="workspace-route-card__icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.bell} size={20} />
                </span>
                <span className="workspace-route-card__body">
                  <strong>{notification.title}</strong>
                  <span>{notification.body}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
