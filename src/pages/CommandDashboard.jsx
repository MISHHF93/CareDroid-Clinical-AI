import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Permission, useUser } from '../contexts/UserContext';
import { useConversation } from '../contexts/ConversationContext';
import { useSystemConfig } from '../contexts/SystemConfigContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard';
import { getCommandDashboardModel } from '../data/commandDashboardModel';
import {
  CategoryBarChart,
  DistributionDonutChart,
  MetricCard,
  StatusCard,
  TrendChart,
  VisualizationPanel,
} from '../components/dashboard/DashboardVisualizations';
import { getRegistryToolNavigation, applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
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
    <section className={`command-panel ${className}`.trim()} aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-title`}>
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

export default function CommandDashboard() {
  const navigate = useNavigate();
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const { user, isDevAuthBypass, hasPermission } = useUser();
  const { activeWorkspace, activity, aiPersonalization } = useUserIdentity();
  const { conversations, messages, addMessage, selectTool, setActiveTool } = useConversation();
  const { recentTools, recordToolAccess } = useToolPreferences();
  const systemConfig = useSystemConfig();
  const model = useMemo(() => getCommandDashboardModel(), []);
  const canViewDeveloperCatalog = hasPermission(Permission.CONFIGURE_SYSTEM);
  const recentToolItems = useMemo(
    () => recentTools.map((toolId) => model.toolById[toolId]).filter(Boolean).slice(0, 4),
    [model.toolById, recentTools]
  );
  const recentAssistantOutputs = useMemo(
    () => messages.filter((message) => message.role === 'assistant').slice(-3).reverse(),
    [messages]
  );
  const recentUsageTrend = useMemo(
    () => buildRecentUsageTrend(recentToolItems, messages),
    [messages, recentToolItems]
  );

  const launchTool = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
      replace: false,
    });
  };

  const launchPrompt = (prompt) => {
    addMessage(prompt, 'user');
    navigate('/assistant');
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
          <p className="command-eyebrow">AI-first clinical cockpit</p>
          <h1 id="command-dashboard-title">CareDroid Command Dashboard</h1>
          <p>
            Ask CareDroid what to do next, launch clinical tools, and keep backend status visible from one
            authenticated workspace.
          </p>
        </div>
        <div className="command-hero__stats" aria-label="Dashboard inventory summary">
          <div>
            <strong>{model.stats.totalTools}</strong>
            <span>Library tools</span>
          </div>
          <div>
            <strong>{model.stats.calculators}</strong>
            <span>Calculators</span>
          </div>
          <div>
            <strong>{model.stats.backendBacked}</strong>
            <span>Backend-backed</span>
          </div>
        </div>
      </section>

      <section className="command-dashboard__grid" aria-label="Personalized workspace summary">
        <ProfileSummaryCard compact />
        <DashboardPanel
          title="Workspace Recommendations"
          description={`Context-aware suggestions for ${activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'your workspace'}.`}
          icon={CHROME_ICONS.sparkles}
        >
          <div className="command-prompt-grid">
            {(aiPersonalization?.recommendedWorkflows || []).slice(0, 3).map((workflow) => (
              <button
                key={workflow.id || workflow.title}
                type="button"
                className="command-prompt-chip"
                onClick={() => workflow.toolId && model.toolById[workflow.toolId] ? launchTool(model.toolById[workflow.toolId]) : null}
              >
                <strong>{workflow.title}</strong>
                <span>{workflow.reason}</span>
              </button>
            ))}
          </div>
          <p className="command-assistant-help">
            Recent safe activity: {(activity?.recentTools || []).length} tools, {(activity?.recentAiChats || []).length} AI chats.
          </p>
        </DashboardPanel>
      </section>

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
            Free-text questions seed the active conversation and continue in the focused assistant route.
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

      <DashboardPanel
        title="Command Analytics"
        description="Inventory-derived command center metrics, launch modes, readiness, and recent session activity."
        icon={CHROME_ICONS.barChart}
      >
        <div className="dashboard-metric-grid command-analytics-metrics">
          <MetricCard label="Total tools" value={model.stats.totalTools} hint="Unified inventory" tone="good" />
          <MetricCard label="Calculators" value={model.stats.calculators} hint="Dedicated and assisted scores" />
          <MetricCard label="AI tools" value={model.stats.aiTools} hint="Backend or assistant-guided" />
          <MetricCard label="Backend-backed" value={model.stats.backendBacked} hint="Executor/platform routes" />
          <MetricCard
            label="Planned"
            value={model.stats.unsupported}
            hint="Unsupported or roadmap state"
            tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
          />
        </div>

        <div className="dashboard-visual-grid command-analytics-grid">
          <VisualizationPanel title="Tool Category Distribution" description="One count per canonical user-facing tool.">
            <CategoryBarChart data={model.visualizations.categoryDistribution} title="Tool category distribution" />
          </VisualizationPanel>
          <VisualizationPanel title="Launch Type Distribution" description="How dashboard cards resolve at launch.">
            <DistributionDonutChart data={model.visualizations.launchTypeDistribution} title="Launch type distribution" />
          </VisualizationPanel>
          <VisualizationPanel title="Clinical Tier Distribution" description="Tier A/B/C, fleet, IoT, and hub readiness.">
            <DistributionDonutChart data={model.visualizations.tierDistribution} title="Clinical tier distribution" />
          </VisualizationPanel>
          <VisualizationPanel title="Recent Activity Trend" description="Session-derived activity trend, not a persisted audit log." badge="Session data">
            <TrendChart data={recentUsageTrend} title="Recent activity trend" />
          </VisualizationPanel>
        </div>
      </DashboardPanel>

      <div className="command-dashboard__grid">
        <DashboardPanel
          title="Clinical Tools"
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
          title="Reference & Guidelines"
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
          title="Fleet & Operations"
          description="Operations tools stay visible without implying autonomous dispatch or control."
          icon={CHROME_ICONS.tools}
        >
          <div className="command-tool-grid">
            {model.panels.fleetOperations.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
          <Link className="command-panel-link" to="/operations">
            Open operations landing
          </Link>
        </DashboardPanel>

        <DashboardPanel
          title="Medical IoT / Device Monitoring"
          description="Connected devices, vitals streams, telemetry alerts, battery, connectivity, and stale/offline signals."
          icon={CHROME_ICONS.activity}
        >
          <div className="command-tool-grid">
            {model.panels.medicalIot.map((tool) => (
              <ToolCard key={tool.id} tool={tool} onLaunch={launchTool} />
            ))}
          </div>
          <Link className="command-panel-link" to="/medical-iot">
            Open Medical IoT Dashboard
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
                onClick={() => navigate('/assistant')}
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
                onClick={() => navigate('/assistant')}
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
              value={isDevAuthBypass ? 'Direct sign-in' : user?.role || 'Authenticated'}
              tone={isDevAuthBypass ? 'warning' : 'good'}
            />
            <StatusItem
              label="Backend config"
              value={systemConfig.loading ? 'Checking' : systemConfig.configDegraded ? 'Degraded' : 'Connected'}
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
              value={Array.isArray(systemConfig.availableTools) ? systemConfig.availableTools.length : 0}
              tone="neutral"
            />
          </div>
          <div className="dashboard-status-grid-visual command-system-status-cards">
            <StatusCard
              label="API status"
              value={systemConfig.loading ? 'Checking' : systemConfig.configDegraded ? 'Degraded' : 'Ready'}
              detail={systemConfig.error || 'Dashboard remains usable while local tools stay available.'}
              tone={systemConfig.configDegraded || systemConfig.error ? 'warning' : 'good'}
            />
            <StatusCard
              label="Executor readiness"
              value={`${model.stats.backendBacked} backed`}
              detail={`${model.stats.unsupported} planned or unsupported entries tracked.`}
              tone={model.stats.unsupported > 0 ? 'warning' : 'good'}
            />
          </div>
          <VisualizationPanel title="Tool Readiness Distribution" description="Backend, local, assistant-guided, and planned tool states.">
            <DistributionDonutChart data={model.visualizations.readinessDistribution} title="Tool readiness distribution" />
          </VisualizationPanel>
          {systemConfig.error ? <p className="command-status-note">{systemConfig.error}</p> : null}
          <div className="command-status-actions">
            <button type="button" className="command-secondary-action" onClick={systemConfig.refresh}>
              Retry status
            </button>
            <Link className="command-secondary-action" to="/tools">
              Open Tool Library
            </Link>
            {canViewDeveloperCatalog ? (
              <Link className="command-secondary-action" to="/tools/catalog">
                Developer audit
              </Link>
            ) : null}
          </div>
        </DashboardPanel>
      </div>
    </main>
  );
}
