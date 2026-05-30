import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
} from '../data/workspaceArchitecture';
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

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { workspaceId = DEFAULT_CARE_WORKSPACE_ID } = useParams();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const model = useMemo(() => buildCareWorkspaceModel(workspaceId), [workspaceId]);
  const workspaceSummary = useMemo(() => workspaceFilterSummary(model.workspace.id), [model.workspace.id]);
  const WorkspaceIcon = getWorkspaceIcon(model.workspace.icon);

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
    addMessage(model.workspace.aiContext, 'user');
    navigate('/assistant');
  };

  return (
    <main className="workspace-home">
      <section className="workspace-hero" aria-labelledby="workspace-title">
        <div className="workspace-hero__icon" aria-hidden>
          <NavIcon icon={WorkspaceIcon} size={34} />
        </div>
        <div className="workspace-hero__content">
          <p className="workspace-eyebrow">Workspace Architecture</p>
          <h1 id="workspace-title">{model.workspace.label} Workspace</h1>
          <p>{model.workspace.description}</p>
        </div>
        <div className="workspace-hero__actions">
          <button type="button" className="workspace-primary-action" onClick={launchAssistantContext}>
            <NavIcon icon={CHROME_ICONS.bot} size={18} aria-hidden />
            Ask in context
          </button>
          <button type="button" className="workspace-secondary-action" onClick={() => launchRoute('/dashboard')}>
            Command Center
          </button>
        </div>
      </section>

      <section className="workspace-switch-grid" aria-label="Switch workspaces">
        {CARE_WORKSPACES.map((workspace) => {
          const Icon = getWorkspaceIcon(workspace.icon);
          const active = workspace.id === model.workspace.id;
          return (
            <button
              key={workspace.id}
              type="button"
              className={`workspace-chip${active ? ' workspace-chip--active' : ''}`}
              onClick={() => navigate(workspace.path)}
              aria-current={active ? 'page' : undefined}
            >
              <NavIcon icon={Icon} size={17} aria-hidden />
              <span>{workspace.shortLabel}</span>
            </button>
          );
        })}
      </section>

      <section className="workspace-context-panel" aria-labelledby="workspace-context-title">
        <div>
          <p className="workspace-eyebrow">AI Context</p>
          <h2 id="workspace-context-title">Tools appear when the work requires them</h2>
          <p>{model.workspace.aiContext}</p>
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
            <dt>Calculators</dt>
            <dd>{model.stats.calculators}</dd>
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
            {model.routeEntries.map((route) => (
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
            {model.toolEntries.map((tool) => (
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
            {workspaceSummary.notifications.slice(0, 5).map((notification) => (
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
