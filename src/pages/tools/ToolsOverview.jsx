import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import { applyRegistryToolLaunch } from '../../navigation/registryToolLaunch';
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

  const tools = getUserFacingToolRegistryProjection();
  const toolById = Object.fromEntries(tools.map((tool) => [tool.id, tool]));
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const isAllToolsWorkspace = activeWorkspaceId === 'all';
  const workspaceToolIds = isAllToolsWorkspace
    ? tools.map((tool) => tool.id)
    : activeWorkspace
    ? activeWorkspace.toolIds || []
    : tools.map((tool) => tool.id);
  const filteredTools = tools.filter((tool) => workspaceToolIds.includes(tool.id));
  const recentToolItems = recentTools
    .map((toolId) => toolById[toolId])
    .filter((tool) => tool && (isAllToolsWorkspace || workspaceToolIds.includes(tool.id)));

  const handleToolClick = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
    });
  };

  const orderedTools = [
    ...filteredTools.filter((tool) => pinned.includes(tool.id)),
    ...filteredTools.filter((tool) => !pinned.includes(tool.id))
  ];
  const calculatorCount = tools.filter((tool) => tool.category === 'Calculator').length;
  const chatAssistedCount = tools.filter((tool) => tool.surface === 'chat-assisted').length;
  const showWorkspaceEmpty = filteredTools.length === 0;

  return (
    <div className="tools-overview">
      <div className="tools-overview-header">
        <div className="header-content">
          <h1>
            <span className="tools-overview-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.tools} size={28} />
            </span>{' '}
            All Tools
          </h1>
          <p className="header-subtitle">
            One launchable catalog for CareDroid clinical tools, calculators, chat-assisted workflows, and fleet tools.
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
              Developer Catalog / Source Audit →
            </button>
          </p>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">{tools.length}</span>
              <span className="stat-label">Launchable tools</span>
            </div>
            <div className="stat">
              <span className="stat-number">{filteredTools.length}</span>
              <span className="stat-label">{isAllToolsWorkspace ? 'Shown' : 'Workspace tools'}</span>
            </div>
            <div className="stat">
              <span className="stat-number">{calculatorCount}</span>
              <span className="stat-label">Calculators</span>
            </div>
            <div className="stat">
              <span className="stat-number">{chatAssistedCount}</span>
              <span className="stat-label">Chat-assisted</span>
            </div>
          </div>
        </div>
      </div>

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

      {showWorkspaceEmpty ? (
        <div className="tools-recent">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">No tools in this workspace</h2>
            <p>This workspace does not include any launchable tools from the current inventory.</p>
          </div>
          <button type="button" className="btn-open-tool" onClick={() => setActiveWorkspaceId('all')}>
            Show all tools →
          </button>
        </div>
      ) : (
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
                {tool.surface === 'chat-assisted' ? (
                  <span className="tool-category" style={{ backgroundColor: `${tool.color}15`, color: tool.color }}>
                    Chat-assisted
                  </span>
                ) : null}
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
                  {tool.shortcut ? tool.shortcut.replace('Ctrl+', '⌘') : 'Open'}
                </div>
              </div>
            </div>

            <p className="tool-description">{tool.description}</p>

            <div className="tool-features">
              <h4>Key Features:</h4>
              <ul>
                {(tool.features || []).map((feature, idx) => (
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
                {tool.surface === 'chat-assisted' ? 'Start Guided Chat →' : 'Open Tool →'}
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
      )}

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
