import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  buildCareWorkspaceModel,
  getWorkspaceSubpageById,
} from '../config/workspace.config';
import { getWorkspaceExperienceProfile } from '../data/workspaceExperience';
import { workspaceFilterSummary } from '../data/platformOperatingSystem';
import { getAutomationAuditEntries } from '../data/automationAuditTrail';
import WorkspaceDataPipelineService from '../services/workspaceDataPipelineService';
import AutomationEngine from '../services/automationEngine';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon, getWorkspaceIcon } from '../navigation/iconRegistry';
import LaunchActionCard from '../components/ui/LaunchActionCard';
import './WorkspaceHome.css';

function WorkspaceRouteCard({ route, onLaunch }) {
  return (
    <LaunchActionCard
      className="workspace-route-card"
      onClick={() => onLaunch(route.path)}
      ariaLabel={`Open ${route.label}`}
      icon={CHROME_ICONS.layoutDashboard}
      title={route.label}
      description={route.description}
      classNames={{
        icon: 'workspace-route-card__icon',
        body: 'workspace-route-card__body',
      }}
    />
  );
}

function WorkspaceToolCard({ tool, onLaunch }) {
  return (
    <LaunchActionCard
      className="workspace-tool-card"
      onClick={() => onLaunch(tool)}
      ariaLabel={`Open ${tool.name}`}
      icon={getToolIcon(tool.id)}
      iconSize={21}
      iconColor={tool.color}
      title={tool.name}
      description={tool.description}
      meta={tool.category}
      classNames={{
        icon: 'workspace-tool-card__icon',
        body: 'workspace-tool-card__body',
        meta: 'workspace-tool-card__meta',
      }}
    />
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

function statusLabel(status) {
  return status === 'backend-wired' ? 'Backend wired' : 'Demo/local fallback';
}

function WorkspaceSubpageTabs({ workspaceId, subpages, activeSubpageId }) {
  return (
    <nav className="workspace-subpage-tabs" aria-label="Workspace subpages">
      {subpages.map((subpage) => (
        <Link
          key={subpage.id}
          to={`/workspace/${workspaceId}/${subpage.id}`}
          className={`workspace-subpage-tab${subpage.id === activeSubpageId ? ' workspace-subpage-tab--active' : ''}`}
          aria-current={subpage.id === activeSubpageId ? 'page' : undefined}
        >
          {subpage.label}
        </Link>
      ))}
    </nav>
  );
}

function WorkspaceListPanel({ title, description, items = [], empty = 'No items available.', renderItem }) {
  return (
    <section className="workspace-panel">
      <div className="workspace-panel__header">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div className="workspace-card-grid">
        {items.length ? items.map(renderItem) : <p className="workspace-empty-state">{empty}</p>}
      </div>
    </section>
  );
}

function WorkspaceCapabilityCard({ item, icon = CHROME_ICONS.activity }) {
  const id = item.id || item.label || item;
  const label = item.label || item.name || item.title || item;
  const detail = item.description || item.detail || item.reason || item.source || '';
  return (
    <article key={id} className="workspace-capability-card">
      <span className="workspace-route-card__icon" aria-hidden>
        <NavIcon icon={icon} size={18} />
      </span>
      <span className="workspace-route-card__body">
        <strong>{label}</strong>
        {detail ? <span>{detail}</span> : null}
      </span>
    </article>
  );
}

function WorkspaceAutomationHub({ workspaceId, solutionPackage, onRunAutomation }) {
  const automationState = AutomationEngine.getWorkspaceAutomationState(workspaceId);
  const history = getAutomationAuditEntries().filter((entry) => entry.workspace.id === workspaceId).slice(0, 5);
  const allAutomations = [
    ...automationState.activeAutomations,
    ...automationState.demoAutomations,
    ...automationState.disabledAutomations,
  ];
  const analytics = {
    runs: history.length,
    success: history.filter((entry) => entry.status === 'success').length,
    blocked: history.filter((entry) => entry.status === 'blocked').length,
    failed: history.filter((entry) => entry.status === 'failed').length,
  };

  return (
    <section className="workspace-automation-layout" aria-label="Workspace automations">
      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>{solutionPackage?.title || 'Workspace Automation Hub'}</h2>
          <p>
            Automations package this workspace into a sellable solution: workspace, assets, AI,
            workflows, and measurable outcomes.
          </p>
        </div>
        <div className="workspace-card-grid">
          {allAutomations.map((automation) => (
            <article key={automation.automationId} className="workspace-automation-card">
              <div>
                <strong>{automation.title}</strong>
                <span>{automation.description}</span>
              </div>
              <dl>
                <div>
                  <dt>Status</dt>
                  <dd>{automation.status}</dd>
                </div>
                <div>
                  <dt>Risk</dt>
                  <dd>{automation.riskLevel}</dd>
                </div>
                <div>
                  <dt>Review</dt>
                  <dd>{automation.humanReviewRequired ? 'Required' : 'Not required'}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="workspace-secondary-action"
                onClick={() => onRunAutomation(automation.automationId)}
              >
                Preview run
              </button>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation analytics</h2>
          <p>Workspace-local run history and adoption signals.</p>
        </div>
        <div className="workspace-focus-metrics">
          {Object.entries(analytics).map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>Audit trail</small>
            </div>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation history</h2>
          <p>Recent auditable events for this workspace.</p>
        </div>
        <div className="workspace-card-grid">
          {history.length ? (
            history.map((entry) => (
              <WorkspaceCapabilityCard
                key={entry.id}
                icon={CHROME_ICONS.bolt}
                item={{
                  id: entry.id,
                  label: entry.triggerFired,
                  detail: `${entry.status} · ${entry.actionSelected}`,
                }}
              />
            ))
          ) : (
            <p className="workspace-empty-state">No automation history yet. Preview an automation to create an audit event.</p>
          )}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="workspace-panel__header">
          <h2>Automation settings</h2>
          <p>Risk, review, and packaging controls for this workspace solution.</p>
        </div>
        <div className="workspace-card-grid">
          <WorkspaceCapabilityCard
            icon={CHROME_ICONS.shield}
            item={{
              id: 'review-required',
              label: 'Human review required',
              detail: `${automationState.settings.humanReviewRequired} automations require review.`,
            }}
          />
          <WorkspaceCapabilityCard
            icon={CHROME_ICONS.circleDollar}
            item={{
              id: 'solution-package',
              label: 'Sellable solution',
              detail: solutionPackage?.title || 'No packaged solution assigned.',
            }}
          />
        </div>
      </div>
    </section>
  );
}

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const { workspaceId = DEFAULT_CARE_WORKSPACE_ID, subpage } = useParams();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recordToolAccess } = useToolPreferences();
  const {
    activeWorkspaceId,
    assistantContext,
    recommendations,
    shortcuts,
    switchWorkspace,
  } = useWorkspace();
  const model = useMemo(() => buildCareWorkspaceModel(workspaceId), [workspaceId]);
  const canonicalWorkspaceId = model.workspace.id || DEFAULT_CARE_WORKSPACE_ID;
  const activeSubpage = useMemo(
    () => getWorkspaceSubpageById(canonicalWorkspaceId, subpage || 'dashboard'),
    [canonicalWorkspaceId, subpage]
  );
  const activeSubpageId = activeSubpage?.id || 'dashboard';
  const pipelineData = useMemo(
    () => WorkspaceDataPipelineService.normalizeWorkspaceData(canonicalWorkspaceId),
    [canonicalWorkspaceId]
  );

  useEffect(() => {
    if (workspaceId !== canonicalWorkspaceId) {
      navigate(`/workspace/${canonicalWorkspaceId}/${activeSubpageId}`, { replace: true });
      return;
    }
    if (subpage && !activeSubpage) {
      navigate(`/workspace/${canonicalWorkspaceId}/dashboard`, { replace: true });
      return;
    }
    if (activeWorkspaceId !== canonicalWorkspaceId) {
      void switchWorkspace(canonicalWorkspaceId);
    }
  }, [activeSubpage, activeSubpageId, activeWorkspaceId, canonicalWorkspaceId, navigate, subpage, switchWorkspace, workspaceId]);
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
    addMessage(
      assistantContext ||
        pipelineData.aiContext.assistantContext ||
        workspaceExperience.assistantContext ||
        model.workspace.aiContext ||
        `Open ${workspaceExperience.operatingLabel}.`,
      'user'
    );
    navigate('/assistant');
  };

  const previewAutomation = (automationId) => {
    const result = AutomationEngine.runAutomation(automationId, {
      workspaceId: canonicalWorkspaceId,
      subscriptionTier: 'professional',
      humanReviewAvailable: true,
      integrationsEnabled: true,
    });
    addMessage(result.assistantPrompt || `Review automation ${automationId}.`, 'user');
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
          <p>{assistantContext || pipelineData.aiContext.assistantContext || workspaceExperience.assistantContext || model.workspace.aiContext}</p>
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
          <div>
            <dt>Backend wired</dt>
            <dd>{pipelineData.analytics.counts.backendWiredServices}</dd>
          </div>
        </dl>
      </section>

      <WorkspaceSubpageTabs
        workspaceId={canonicalWorkspaceId}
        subpages={model.subpageEntries}
        activeSubpageId={activeSubpageId}
      />

      <section className="workspace-pipeline-status" aria-label="Workspace data status">
        <div>
          <p className="workspace-eyebrow">Data Pipeline</p>
          <h2>{pipelineData.mode.modeName}</h2>
          <p>{pipelineData.sourceStatus}</p>
        </div>
        <div className="workspace-service-list" aria-label="Backend service status">
          {pipelineData.backendConnections.slice(0, 4).map((service) => (
            <span key={service.id} className={`workspace-service-chip workspace-service-chip--${service.status}`}>
              {service.label}: {statusLabel(service.status)}
            </span>
          ))}
        </div>
      </section>

      {activeSubpageId === 'dashboard' ? (
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
      ) : null}

      {activeSubpageId === 'tools' ? (
        <WorkspaceListPanel
          title={`${workspaceExperience.shortLabel} tools`}
          description="Workspace assets stay inside the page model rather than the sidebar."
          items={model.toolEntries}
          renderItem={(tool) => <WorkspaceToolCard key={tool.id} tool={tool} onLaunch={launchTool} />}
        />
      ) : null}

      {activeSubpageId === 'workflows' ? (
        <WorkspaceListPanel
          title="Workspace workflows"
          description="Workflow recommendations are mode-driven and can launch existing tools or assistant context."
          items={pipelineData.recommendations.filter((item) => item.type === 'workflow')}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.route} />}
        />
      ) : null}

      {activeSubpageId === 'automations' ? (
        <WorkspaceAutomationHub
          workspaceId={canonicalWorkspaceId}
          solutionPackage={pipelineData.analytics.solutionPackage}
          onRunAutomation={previewAutomation}
        />
      ) : null}

      {activeSubpageId === 'analytics' ? (
        <WorkspaceListPanel
          title="Workspace analytics"
          description="Analytics are normalized from registry metadata and honest backend status."
          items={Object.entries(pipelineData.analytics.counts).map(([label, value]) => ({ id: label, label, detail: String(value) }))}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.lineChart} />}
        />
      ) : null}

      {activeSubpageId === 'alerts' ? (
        <WorkspaceListPanel
          title="Active alerts"
          description="Alerts combine workspace-mode risks with local/demo operational notifications."
          items={pipelineData.alerts}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.bell} />}
        />
      ) : null}

      {activeSubpageId === 'reports' ? (
        <WorkspaceListPanel
          title="Reports"
          description="Reports describe the current workspace mode and available evidence surfaces."
          items={pipelineData.mode.reports.map((report) => ({ id: report, label: report, detail: `${workspaceExperience.shortLabel} report` }))}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.formatPdf} />}
        />
      ) : null}

      {activeSubpageId === 'settings' ? (
        <WorkspaceListPanel
          title="Workspace settings"
          description="Settings reflect permissions, backend connections, and SaaS workspace configuration."
          items={[
            ...pipelineData.mode.permissions.map((permission) => ({ id: permission, label: permission, detail: 'Required permission' })),
            ...pipelineData.backendConnections.map((service) => ({
              id: service.id,
              label: service.label,
              detail: `${service.endpoint} · ${service.statusLabel}`,
            })),
          ]}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} icon={CHROME_ICONS.settings} />}
        />
      ) : null}

      {!['dashboard', 'tools', 'workflows', 'automations', 'analytics', 'alerts', 'reports', 'settings'].includes(activeSubpageId) ? (
        <WorkspaceListPanel
          title={activeSubpage?.label || 'Workspace subpage'}
          description={`${activeSubpage?.label || 'This subpage'} is connected to ${pipelineData.mode.modeName} and uses the same workspace data pipeline.`}
          items={[
            ...pipelineData.recommendations.slice(0, 4),
            ...pipelineData.alerts.slice(0, 3),
          ]}
          renderItem={(item) => <WorkspaceCapabilityCard key={item.id} item={item} />}
        />
      ) : null}
    </main>
  );
}
