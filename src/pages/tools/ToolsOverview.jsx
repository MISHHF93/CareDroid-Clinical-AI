import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import toolRegistry, { toolRegistryById } from '../../data/toolRegistry';
import {
  clinicalIntentTools,
  getCatalogSummary,
  nluCalculatorHubOnly,
} from '../../data/clinicalIntentToolCatalog';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { chatAssistedLaunchAriaLabel } from '../../data/chatAssistedHubGroups';
import { getFullCapabilitiesSummary } from '../../data/platformCapabilitiesCatalog';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import './ToolsOverview.css';

const ToolsOverview = () => {
  const navigate = useNavigate();
  const { selectTool, setActiveTool, addMessage } = useConversation();
  const {
    favorites,
    pinned,
    recentTools,
    toggleFavorite,
    togglePinned,
    recordToolAccess
  } = useToolPreferences();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();

  const tools = toolRegistry;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const workspaceToolIds = activeWorkspace?.toolIds?.length
    ? activeWorkspace.toolIds
    : tools.map((tool) => tool.id);
  const filteredTools = tools.filter((tool) => workspaceToolIds.includes(tool.id));
  const recentToolItems = recentTools
    .map((toolId) => toolRegistryById[toolId])
    .filter((tool) => tool && workspaceToolIds.includes(tool.id));

  const handleToolClick = (tool) => {
    recordToolAccess(tool.id);
    selectTool(tool.id);
    navigate(tool.path);
  };

  const categories = [...new Set(filteredTools.map(t => t.category))];
  const catalogSummary = getCatalogSummary({ sidebarCount: tools.length });
  const hiddenApiCount = getFullCapabilitiesSummary();

  const handleNluHubTool = (toolId) => {
    const launch = resolveCatalogLaunch(toolId);
    if (launch.registryId) {
      recordToolAccess(launch.registryId);
      selectTool(launch.registryId);
      setActiveTool(launch.registryId);
    }
    if (launch.chatSeed) {
      addMessage(launch.chatSeed, 'user');
    }
    if (launch.path) {
      navigate(launch.path);
    } else {
      navigate('/dashboard');
    }
  };
  const orderedTools = [
    ...filteredTools.filter((tool) => pinned.includes(tool.id)),
    ...filteredTools.filter((tool) => !pinned.includes(tool.id))
  ];

  return (
    <div className="tools-overview">
      <div className="tools-overview-header">
        <div className="header-content">
          <h1>
            <span className="tools-overview-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.tools} size={28} />
            </span>{' '}
            Clinical Tools Suite
          </h1>
          <p className="header-subtitle">
            Comprehensive medical decision support tools powered by AI and evidence-based guidelines
          </p>
          <div className="tools-workspace">
            <label htmlFor="workspaceSelect">Workspace</label>
            <select
              id="workspaceSelect"
              value={activeWorkspaceId}
              onChange={(e) => setActiveWorkspaceId(e.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <p className="tools-catalog-link-wrap">
            <button
              type="button"
              className="tools-catalog-link"
              onClick={() => navigate('/tools/catalog')}
            >
              Full clinical catalog ({clinicalIntentTools.length} AI profiles,{' '}
              {hiddenApiCount.chatAndAi + hiddenApiCount.clinicalData + hiddenApiCount.emergency}{' '}
              hidden APIs) →
            </button>
          </p>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">{filteredTools.length}</span>
              <span className="stat-label">Suite shortcuts</span>
            </div>
            <div className="stat">
              <span className="stat-number">{catalogSummary.aiClinicalProfiles}</span>
              <span className="stat-label">AI tool profiles</span>
            </div>
            <div className="stat">
              <span className="stat-number">{catalogSummary.backendExecutors}</span>
              <span className="stat-label">Backend executors</span>
            </div>
          </div>
        </div>
      </div>

      {nluCalculatorHubOnly.length > 0 && (
        <div className="tools-chat-only">
          <div className="tools-chat-only-header">
            <h2 className="tools-chat-only-title">Chat-assisted decision support</h2>
            <p className="tools-chat-only-safety" role="note">
              <strong>Decision support only.</strong> These tools guide risk stratification, exam scoring, or
              imaging decisions in chat — they do not diagnose or rule out disease with certainty. Urgent ACS,
              stroke, trauma, and PE pathways take priority; do not delay emergency care to finish chat.
            </p>
            <p>
              Open the dashboard with a guided starter prompt, or launch from the Calculators hub.
            </p>
          </div>
          <div className="tools-chat-only-grid">
            {nluCalculatorHubOnly.map((tool) => {
              const meta = clinicalIntentTools.find((t) => t.toolId === tool.toolId);
              return (
                <button
                  key={tool.toolId}
                  type="button"
                  className="tools-chat-only-card"
                  aria-label={chatAssistedLaunchAriaLabel(tool.name)}
                  aria-describedby={`tools-chat-only-desc-${tool.toolId}`}
                  onClick={() => handleNluHubTool(tool.toolId)}
                >
                  <span className="tools-chat-only-name">{tool.name}</span>
                  <span
                    id={`tools-chat-only-desc-${tool.toolId}`}
                    className="tools-chat-only-desc"
                  >
                    {meta?.description || 'Chat-assisted decision support'}
                  </span>
                  <span className="tools-chat-only-action">Launch →</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {recentToolItems.length > 0 && (
        <div className="tools-recent">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">
              <span className="tools-recent-title-icon" aria-hidden>
                <NavIcon icon={CHROME_ICONS.clock} size={22} />
              </span>
              <span>Recent Tools</span>
            </h2>
            <p>Pick up where you left off with your most used tools.</p>
          </div>
          <div className="tools-recent-list">
            {recentToolItems.map((tool) => (
              <button
                key={tool.id}
                className="tools-recent-card"
                onClick={() => handleToolClick(tool)}
                type="button"
              >
                <span className="tools-recent-icon" aria-hidden>
                  <NavIcon icon={getToolIcon(tool.id)} size={22} />
                </span>
                <div className="tools-recent-info">
                  <span className="tools-recent-name">{tool.name}</span>
                  <span className="tools-recent-category">{tool.category}</span>
                </div>
                <span className="tools-recent-action">Open →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tools-grid">
        {orderedTools.map(tool => (
          <div
            key={tool.id}
            className="tool-card-large"
            onClick={() => handleToolClick(tool)}
            style={{ borderColor: tool.color }}
          >
            <div className="tool-card-header">
              <div className="tool-icon" style={{ backgroundColor: `${tool.color}20` }}>
                <span aria-hidden>
                  <NavIcon icon={getToolIcon(tool.id)} size={28} />
                </span>
              </div>
              <div className="tool-meta">
                <h3>{tool.name}</h3>
                <span className="tool-category" style={{ backgroundColor: `${tool.color}20`, color: tool.color }}>
                  {tool.category}
                </span>
              </div>
              <div className="tool-card-actions">
                <button
                  className={`tool-card-action ${favorites.includes(tool.id) ? 'active' : ''}`}
                  title={favorites.includes(tool.id) ? 'Remove from favorites' : 'Add to favorites'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(tool.id);
                  }}
                  type="button"
                >
                  <NavIcon
                    icon={CHROME_ICONS.star}
                    size={16}
                    fill={favorites.includes(tool.id) ? 'currentColor' : 'none'}
                    aria-hidden
                  />
                </button>
                <button
                  className={`tool-card-action ${pinned.includes(tool.id) ? 'active' : ''}`}
                  title={pinned.includes(tool.id) ? 'Unpin tool' : 'Pin tool'}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinned(tool.id);
                  }}
                  type="button"
                >
                  <NavIcon icon={CHROME_ICONS.pin} size={16} aria-hidden />
                </button>
                <div className="tool-shortcut">
                  {tool.shortcut.replace('Ctrl+', '⌘')}
                </div>
              </div>
            </div>

            <p className="tool-description">{tool.description}</p>

            <div className="tool-features">
              <h4>Key Features:</h4>
              <ul>
                {tool.features.map((feature, idx) => (
                  <li key={idx}>
                    <span className="feature-icon" aria-hidden>
                      <NavIcon icon={CHROME_ICONS.check} size={14} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="tool-use-cases">
              <h4>Use Cases:</h4>
              <div className="use-cases-tags">
                {tool.useCases.map((useCase, idx) => (
                  <span key={idx} className="use-case-tag">
                    {useCase}
                  </span>
                ))}
              </div>
            </div>

            <div className="tool-actions">
              <button
                className="btn-open-tool"
                style={{ backgroundColor: tool.color }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToolClick(tool);
                }}
              >
                Open Tool →
              </button>
              <button
                className="btn-chat-tool"
                onClick={(e) => {
                  e.stopPropagation();
                  recordToolAccess(tool.id);
                  selectTool(tool.id);
                  navigate('/dashboard');
                }}
              >
                Use in Chat
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Tips Section */}
      <div className="tools-tips">
        <h2 className="tools-tips-title">
          <NavIcon icon={CHROME_ICONS.lightbulb} size={28} />
          Quick Tips
        </h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.keyboard} size={32} />
            </span>
            <h3>Keyboard Shortcuts</h3>
            <p>Use Ctrl+1 through Ctrl+6 to quickly access tools from anywhere</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.messageCircle} size={32} />
            </span>
            <h3>Chat Integration</h3>
            <p>Type /tool-name in chat to invoke tools directly in conversation</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.download} size={32} />
            </span>
            <h3>State Persistence</h3>
            <p>Tool inputs are saved per conversation for easy reference</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.bot} size={32} />
            </span>
            <h3>AI Awareness</h3>
            <p>CareDroid can read and reference tool data in responses</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsOverview;
