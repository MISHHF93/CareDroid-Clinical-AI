import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import { applyRegistryToolLaunch } from '../../navigation/registryToolLaunch';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import './ToolsOverview.css';

const TOOL_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'All actions' },
  { value: 'calculator', label: 'Calculators' },
  { value: 'chat-assisted', label: 'Guided chat' },
  { value: 'backend-backed', label: 'Verified actions' },
  { value: 'clinical-page', label: 'Forms and pages' },
  { value: 'fleet', label: 'Operations' },
  { value: 'reference', label: 'Reference' },
]);

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function toolSearchBlob(tool) {
  return [
    tool.id,
    tool.canonicalInventoryId,
    tool.name,
    tool.description,
    tool.category,
    tool.surface,
    tool.launchType,
    tool.tier,
    tool.nluToolId,
    tool.executorStatus,
    tool.shortcut,
    tool.searchText,
    ...(tool.features || []),
    ...(tool.useCases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesToolFilter(tool, filter) {
  if (!filter || filter === 'all') return true;
  if (filter === 'calculator') return tool.category === 'Calculator' || tool.surface === 'calculator-form';
  if (filter === 'chat-assisted') return tool.surface === 'chat-assisted' || tool.launchType === 'chat-assisted';
  if (filter === 'backend-backed') return tool.launchType === 'backend-backed' || tool.executorStatus === 'registered';
  if (filter === 'clinical-page') return tool.surface === 'tool-page' || tool.launchType === 'clinical-page';
  if (filter === 'fleet') return tool.category === 'Fleet' || tool.surface === 'fleet-page';
  if (filter === 'reference') return tool.category === 'Reference';
  return true;
}

const ToolsOverview = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [toolFilter, setToolFilter] = useState('all');
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
  const workspaceTools = tools.filter((tool) => workspaceToolIds.includes(tool.id));
  const searchQuery = normalizeSearch(search);
  const filteredTools = useMemo(
    () =>
      workspaceTools.filter((tool) => {
        if (!matchesToolFilter(tool, toolFilter)) return false;
        if (!searchQuery) return true;
        return toolSearchBlob(tool).includes(searchQuery);
      }),
    [workspaceTools, searchQuery, toolFilter]
  );
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

  const handleAssistantLaunch = (tool) => {
    const launch = resolveCatalogLaunch(tool.id);
    recordToolAccess(tool.id);
    selectTool(tool.id);
    setActiveTool(tool.id);
    addMessage(
      launch.chatSeed ||
        `Help me use ${tool.name} as clinical decision support only. Ask for any context needed before recommending next steps.`,
      'user'
    );
    navigate('/assistant');
  };

  const orderedTools = [
    ...filteredTools.filter((tool) => pinned.includes(tool.id)),
    ...filteredTools.filter((tool) => !pinned.includes(tool.id))
  ];
  const calculatorCount = tools.filter((tool) => tool.category === 'Calculator').length;
  const chatAssistedCount = tools.filter((tool) => tool.surface === 'chat-assisted').length;
  const showWorkspaceEmpty = workspaceTools.length === 0;
  const showSearchEmpty = !showWorkspaceEmpty && filteredTools.length === 0;

  return (
    <div className="tools-overview">
      <div className="tools-overview-header">
        <div className="header-content">
          <h1>
            <span className="tools-overview-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.tools} size={28} />
            </span>{' '}
            Tools
          </h1>
          <p className="header-subtitle">
            Pick what you want to do. CareDroid keeps the routes, validation, and execution details underneath.
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
              Trust and source details →
            </button>
          </p>
          <div className="tools-discovery-controls" role="search" aria-label="Search and filter all tools">
            <label className="tools-search-field">
              <span>Search tools</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Try pe-score, bleeding risk, kidney function…"
                aria-label="Search all tools"
              />
            </label>
            <label className="tools-filter-field">
              <span>Filter</span>
              <select
                value={toolFilter}
                onChange={(e) => setToolFilter(e.target.value)}
                aria-label="Filter tools by type"
              >
                {TOOL_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">{tools.length}</span>
              <span className="stat-label">Actions</span>
            </div>
            <div className="stat">
              <span className="stat-number">{filteredTools.length}</span>
              <span className="stat-label">
                {searchQuery || toolFilter !== 'all' ? 'Matching' : isAllToolsWorkspace ? 'Shown' : 'Workspace tools'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-number">{calculatorCount}</span>
              <span className="stat-label">Calculators</span>
            </div>
            <div className="stat">
              <span className="stat-number">{chatAssistedCount}</span>
              <span className="stat-label">Guided</span>
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
      ) : showSearchEmpty ? (
        <div className="tools-recent" role="status">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">No matching tools</h2>
            <p>
              No launchable tools match the current search and filter. Try a clinical alias or reset the filters.
            </p>
          </div>
          <button
            type="button"
            className="btn-open-tool"
            onClick={() => {
              setSearch('');
              setToolFilter('all');
            }}
          >
            Clear search and filters →
          </button>
        </div>
      ) : (
        <div className="tools-grid">
          {orderedTools.map(tool => (
          <div
            key={tool.id}
            data-tool-id={tool.id}
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
                    Guided
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
                {tool.surface === 'chat-assisted' ? 'Start with Assistant →' : 'Open →'}
              </button>
              <button
                className="btn-chat-tool"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAssistantLaunch(tool);
                }}
              >
                Open in Assistant
              </button>
            </div>
          </div>
          ))}
        </div>
      )}

      <div className="tools-tips">
        <h2 className="tools-tips-title">
          <NavIcon icon={CHROME_ICONS.lightbulb} size={28} />
          How to act
        </h2>
        <div className="tips-grid">
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.checkCircle} size={32} />
            </span>
            <h3>Choose an action</h3>
            <p>Start from a card instead of learning route names or command phrasing.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.messageCircle} size={32} />
            </span>
            <h3>Open in Assistant</h3>
            <p>Send context to Assistant when you want guidance, preview, or confirmation before acting.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.download} size={32} />
            </span>
            <h3>Verify results</h3>
            <p>Outputs remain attached to the session so you can review, edit, share, or retry.</p>
          </div>
          <div className="tip-card">
            <span className="tip-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.bot} size={32} />
            </span>
            <h3>Power stays underneath</h3>
            <p>Existing backend commands and deterministic executors still run behind the simpler surface.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsOverview;
