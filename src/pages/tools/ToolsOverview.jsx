import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { useConversation } from '../../contexts/ConversationContext';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { resolveCatalogLaunch } from '../../data/clinicalCatalogWiring';
import {
  buildProfileToolGraph,
  buildUserToolProfile,
  filterToolsForProfileGraph,
} from '../../data/profileToolSegmentation';
import {
  getUserFacingToolRegistryProjection,
  TOOL_LIFECYCLE_LABELS,
} from '../../data/toolInventory';
import {
  ASSET_ACCESS_STATES,
  filterVisibleTools,
  getAssetAwareToolProjection,
  groupToolsByAccessView,
} from '../../data/assetAccess';
import { getRoleBasedAssetRecommendations } from '../../data/assetRecommendation';
import { FEATURE_FLAGS } from '../../config/featureFlags.config';
import { applyRegistryToolLaunch } from '../../navigation/registryToolLaunch';
import { NavIcon } from '../../navigation/NavIcon';
import { CHROME_ICONS, getToolIcon } from '../../navigation/iconRegistry';
import { recordAssetLaunchUsage, USAGE_EVENT_TYPES } from '../../services/usageMeteringService';
import './ToolsOverview.css';

const TOOL_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'All' },
  { value: 'recommended', label: 'Recommended' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'organization', label: 'Organization' },
  { value: 'permitted', label: 'Permitted' },
  { value: 'calculator', label: 'Calculators' },
  { value: 'diagnostics', label: 'Diagnostics' },
  { value: 'ai-workflows', label: 'AI Workflows' },
  { value: 'maps-iot', label: 'Maps & IoT' },
  { value: 'operations', label: 'Operations' },
  { value: 'favorites', label: 'Favorites' },
  { value: 'recent', label: 'Recent' },
]);

const TOOL_FILTER_OPTION_VALUES = new Set(TOOL_FILTER_OPTIONS.map((option) => option.value));

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
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
    tool.lifecycleState,
    tool.lifecycleLabel,
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
  if (!filter || ['recommended', 'favorites', 'recent', 'workspace', 'organization', 'permitted', 'all'].includes(filter)) {
    return true;
  }
  if (filter === 'simulations') {
    return /simulation|scenario|competenc/i.test(`${tool.name} ${tool.description} ${tool.id}`);
  }
  if (filter === 'laboratory') {
    return tool.category === 'Laboratory' || /lab|laboratory/i.test(`${tool.name} ${tool.path}`);
  }
  if (filter === 'governance') {
    return /audit|governance|privacy|regulatory|compliance/i.test(
      `${tool.name} ${tool.description} ${tool.category}`
    );
  }
  if (filter === 'calculator') {
    return (
      tool.surface !== 'hub' &&
      (tool.category === 'Calculator' || tool.surface === 'calculator-form')
    );
  }
  if (filter === 'diagnostics') {
    return (
      tool.category === 'Diagnostic' ||
      /diagnos|differential|triage|risk|score/i.test(`${tool.name} ${tool.description}`)
    );
  }
  if (filter === 'ai-workflows') {
    return (
      ['AI Tools', 'Diagnostic'].includes(tool.category) ||
      tool.launchType === 'chat-assisted' ||
      tool.launchType === 'backend-backed' ||
      /ai|assistant|workflow|scribe|summary|order set|timeline/i.test(
        `${tool.name} ${tool.description}`
      )
    );
  }
  if (filter === 'maps-iot') {
    return (
      tool.category === 'IoT' ||
      tool.surface === 'iot-dashboard' ||
      tool.path === '/hospital-map' ||
      tool.path === '/live-map' ||
      /map|iot|device|telemetry|digital twin/i.test(`${tool.name} ${tool.description}`)
    );
  }
  if (filter === 'operations') {
    return (
      ['Fleet', 'IoT', 'Hospital Operations'].includes(tool.category) ||
      ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(tool.surface) ||
      /fleet|operations|dispatch|device|hospital map|live map|digital twin/i.test(
        `${tool.name} ${tool.description}`
      )
    );
  }
  return true;
}

function primaryActionLabel(tool) {
  if (tool.accessState === ASSET_ACCESS_STATES.DISABLED) return 'Unavailable';
  if (tool.accessState === ASSET_ACCESS_STATES.LOCKED) return 'Request access';
  if (tool.accessState === ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED) return 'Upgrade plan';
  if (tool.accessState === ASSET_ACCESS_STATES.RESTRICTED) return 'Restricted';
  if (
    tool.accessState === ASSET_ACCESS_STATES.ADMIN_ONLY ||
    tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN
  )
    return 'Admin only';
  if (tool.surface === 'chat-assisted' || tool.launchType === 'chat-assisted')
    return 'Start guided chat';
  if (tool.category === 'Calculator' || tool.surface === 'calculator-form')
    return 'Open calculator';
  if (
    ['fleet-page', 'iot-dashboard', 'hospital-operations'].includes(tool.surface) ||
    ['Fleet', 'IoT', 'Hospital Operations'].includes(tool.category)
  ) {
    return 'Open dashboard';
  }
  return 'Open tool';
}

function hasMeaningfulAssistantAction(tool) {
  return tool.surface !== 'chat-assisted' && tool.launchType !== 'chat-assisted';
}

function lifecycleLabel(tool) {
  return tool.lifecycleLabel || TOOL_LIFECYCLE_LABELS[tool.lifecycleState] || 'Active';
}

function accessRestrictionCopy(tool) {
  if (
    !tool.accessState ||
    [ASSET_ACCESS_STATES.ALLOWED, ASSET_ACCESS_STATES.BETA, ASSET_ACCESS_STATES.EXPERIMENTAL].includes(
      tool.accessState
    )
  )
    return '';
  if (tool.accessState === ASSET_ACCESS_STATES.DISABLED) {
    return 'This feature is disabled for the current rollout.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.LOCKED) {
    return 'This asset is not included in the current organization packs.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.SUBSCRIPTION_REQUIRED) {
    return 'This asset requires a higher subscription plan.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.RESTRICTED) {
    if (tool.accessReasons?.includes('workspace')) {
      return 'This asset is outside the active workspace.';
    }
    if (tool.accessReasons?.includes('permission')) {
      return 'Your current role or workspace is missing the required permission.';
    }
    return 'This asset is restricted in the current context.';
  }
  if (
    tool.accessState === ASSET_ACCESS_STATES.ADMIN_ONLY ||
    tool.accessState === ASSET_ACCESS_STATES.REQUIRES_ADMIN
  ) {
    return 'This asset is available to administrators only.';
  }
  if (tool.accessState === ASSET_ACCESS_STATES.HIDDEN) {
    return 'This asset is hidden by your role or preferences.';
  }
  return tool.accessLabel || '';
}

const ToolsOverview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const requestedFilter = searchParams.get('filter');
  const requestedSearch = searchParams.get('q') || searchParams.get('search') || '';
  const routeDefaultFilter =
    location.pathname === CANONICAL_ROUTES.calculators ? 'calculator' : 'all';
  const [search, setSearch] = useState(requestedSearch);
  const [toolFilter, setToolFilter] = useState(
    TOOL_FILTER_OPTION_VALUES.has(requestedFilter) ? requestedFilter : routeDefaultFilter
  );

  useEffect(() => {
    setToolFilter(
      TOOL_FILTER_OPTION_VALUES.has(requestedFilter) ? requestedFilter : routeDefaultFilter
    );
  }, [requestedFilter, routeDefaultFilter]);

  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);
  const { selectTool, setActiveTool, addMessage } = useConversation();
  const toolPreferences = useToolPreferences();
  const {
    favorites,
    pinned,
    recentTools,
    hiddenTools,
    toggleFavorite,
    togglePinned,
    toggleHidden,
    recordToolAccess,
  } = toolPreferences;
  const {
    workspaces = [],
    activeWorkspaceId = 'emergency',
    setActiveWorkspaceId,
    activeWorkspace: workspaceContextActive,
    recommendations: workspaceRecommendations = [],
    switchWorkspace = setActiveWorkspaceId,
    visibleAssetIds = [],
    workspaceContext = null,
  } = useWorkspace();
  const { user } = useUser();
  const {
    account,
    preferences,
    activeWorkspace,
    workspaceState,
    platformContext,
    roleProfile,
    organization,
  } = useUserIdentity();

  const recommendations = useMemo(() => {
    if (workspaceRecommendations.length) {
      return workspaceRecommendations.map((recommendation) => ({
        id: recommendation.assetId,
        reason: recommendation.reason,
      }));
    }
    return getRoleBasedAssetRecommendations({ account, roleProfile });
  }, [account, roleProfile, workspaceRecommendations]);
  const recommendedIds = useMemo(() => recommendations.map((t) => t.id), [recommendations]);

  const accessContext = useMemo(
    () => ({
      ...(platformContext || {}),
      account,
      activeWorkspace,
        workspaceContextActive,
      preferences,
      workspaceState,
        visibleAssetIds,
    }),
    [account, activeWorkspace, platformContext, preferences, visibleAssetIds, workspaceContextActive, workspaceState]
  );
  const accessRole = platformContext?.membership?.role || account?.role || user?.role;

  const allToolsWithAccess = useMemo(() => {
    const projected = FEATURE_FLAGS.platformEntitlements
      && platformContext
      ? getAssetAwareToolProjection(accessContext, accessRole)
      : getUserFacingToolRegistryProjection();
    return filterVisibleTools(projected);
  }, [accessContext, accessRole, platformContext]);

  const tools = useMemo(
    () => filterVisibleTools(allToolsWithAccess),
    [allToolsWithAccess]
  );

  const accessGroups = useMemo(
    () =>
      groupToolsByAccessView(tools, {
        favorites,
        recent: recentTools,
        recommendedIds,
      }),
    [tools, favorites, recentTools, recommendedIds]
  );
  const toolById = useMemo(() => Object.fromEntries(tools.map((tool) => [tool.id, tool])), [tools]);
  const localActiveWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId),
    [activeWorkspaceId, workspaces]
  );
  const isBackendWorkspaceContext = Boolean(workspaceContext?.workspace);
  const isAllToolsWorkspace =
    activeWorkspaceId === 'all' || (!isBackendWorkspaceContext && !localActiveWorkspace?.toolIds?.length);
  const profile = useMemo(
    () =>
      buildUserToolProfile({
        account,
        user,
        preferences,
        activeWorkspace: workspaceContextActive || activeWorkspace || localActiveWorkspace,
        activeWorkspaceId: isAllToolsWorkspace ? 'all' : workspaceState?.activeWorkspaceId || activeWorkspaceId,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
      }),
    [
      account,
      activeWorkspace,
      activeWorkspaceId,
      isAllToolsWorkspace,
      localActiveWorkspace,
      preferences,
      toolPreferences,
      user,
      workspaceContextActive,
      workspaceState?.activeWorkspaceId,
      workspaceState?.effectivePermissions,
    ]
  );
  const profileToolGraph = useMemo(
    () => buildProfileToolGraph({ tools, profile }),
    [profile, tools]
  );
  const allToolIds = useMemo(() => tools.map((tool) => tool.id), [tools]);
  const workspaceToolIds = useMemo(
    () =>
      visibleAssetIds?.length
        ? visibleAssetIds
        : isAllToolsWorkspace
        ? allToolIds
        : localActiveWorkspace
          ? localActiveWorkspace.toolIds || []
          : allToolIds,
    [localActiveWorkspace, allToolIds, isAllToolsWorkspace, visibleAssetIds]
  );
  const workspaceToolIdSet = useMemo(() => new Set(workspaceToolIds), [workspaceToolIds]);
  const workspaceInventoryCount = useMemo(
    () =>
      isAllToolsWorkspace
        ? tools.length
        : tools.filter((tool) => workspaceToolIdSet.has(tool.id)).length,
    [isAllToolsWorkspace, tools, workspaceToolIdSet]
  );
  const pinnedToolIdSet = useMemo(() => new Set(pinned), [pinned]);
  const favoriteToolIdSet = useMemo(() => new Set(favorites), [favorites]);
  const hiddenToolIdSet = useMemo(() => new Set(hiddenTools), [hiddenTools]);
  const profileFilteredTools = useMemo(
    () =>
      toolFilter === 'calculator'
        ? tools
        : filterToolsForProfileGraph(profileToolGraph, toolFilter),
    [profileToolGraph, toolFilter, tools]
  );
  const workspaceTools = useMemo(
    () =>
      profileFilteredTools.filter((tool) => {
        return isAllToolsWorkspace || workspaceToolIdSet.has(tool.id);
      }),
    [isAllToolsWorkspace, profileFilteredTools, toolFilter, workspaceToolIdSet]
  );
  const searchQuery = normalizeSearch(search);
  const recentToolItems = useMemo(
    () =>
      recentTools
        .map((toolId) => toolById[toolId])
        .filter((tool) => tool && (isAllToolsWorkspace || workspaceToolIdSet.has(tool.id))),
    [isAllToolsWorkspace, recentTools, toolById, workspaceToolIdSet]
  );
  const filteredTools = useMemo(() => {
    let base = workspaceTools;
    if (toolFilter === 'recommended') base = profileToolGraph.recommendedTools;
    else if (toolFilter === 'workspace') base = accessGroups.workspace;
    else if (toolFilter === 'organization') base = accessGroups.organization;
    else if (toolFilter === 'permitted') base = accessGroups.permitted;
    else if (toolFilter === 'favorites') base = accessGroups.favorites;
    else if (toolFilter === 'recent') base = recentToolItems;

    return base.filter((tool) => {
      if (toolFilter !== 'all' && !matchesToolFilter(tool, toolFilter)) return false;
      if (!searchQuery) return true;
      return toolSearchBlob(tool).includes(searchQuery);
    });
  }, [
    workspaceTools,
    searchQuery,
    toolFilter,
    accessGroups,
    profileToolGraph.recommendedTools,
    recentToolItems,
  ]);

  const handleToolClick = (tool) => {
    if (tool.isLaunchable === false) return;
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess,
    });
  };

  const handleToolCardKeyDown = (event, tool) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    handleToolClick(tool);
  };

  const handleAssistantLaunch = (tool) => {
    if (tool.isLaunchable === false) return;
    const launch = resolveCatalogLaunch(tool.id);
    recordToolAccess(tool.id);
    recordAssetLaunchUsage(
      { registryId: tool.id, mode: 'chat-assisted', pathname: CANONICAL_ROUTES.assistant },
      { source: 'tools-overview-assistant', eventType: USAGE_EVENT_TYPES.TOOL_LAUNCH }
    );
    selectTool(tool.id);
    setActiveTool(tool.id);
    addMessage(
      launch.chatSeed ||
        `Help me use ${tool.name} as clinical decision support only. Ask for any context needed before recommending next steps.`,
      'user'
    );
    navigate(CANONICAL_ROUTES.assistant);
  };

  const orderedTools = useMemo(() => {
    const pinnedTools = [];
    const unpinnedTools = [];
    for (const tool of filteredTools) {
      if (pinnedToolIdSet.has(tool.id)) {
        pinnedTools.push(tool);
      } else {
        unpinnedTools.push(tool);
      }
    }
    return [...pinnedTools, ...unpinnedTools];
  }, [filteredTools, pinnedToolIdSet]);
  const showWorkspaceEmpty = !isAllToolsWorkspace && workspaceInventoryCount === 0;
  const showSearchEmpty = !showWorkspaceEmpty && filteredTools.length === 0;
  const filterTabs = TOOL_FILTER_OPTIONS;
  const emptyStateCopy =
    hiddenTools.length > 0
      ? 'No tools match this view. Some tools are hidden by your preferences; restore them from Profile > Tool preferences or switch to All.'
      : 'No launchable tools match the current search and filter. Try a clinical alias or reset the filters.';

  return (
    <div className="tools-overview">
      <div className="tools-overview-header">
        <div className="header-content">
          <h1>
            <span className="tools-overview-title-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.tools} size={28} />
            </span>{' '}
            Tool Library
          </h1>
          <p className="header-subtitle">
            Browse the canonical tool library prioritized for your role, specialty, workspace, pins,
            and access level.
          </p>
          <div className="tools-profile-summary" aria-label="Profile tool graph summary">
            <span>{profile.role}</span>
            <span>{profile.specialty}</span>
            <span>{profileToolGraph.counts.visible} visible</span>
            <span>{profileToolGraph.counts.recommended} recommended</span>
            <span>{profileToolGraph.counts.restricted} restricted</span>
          </div>
          <div className="tools-workspace">
            <label htmlFor="workspaceSelect">Workspace</label>
            <select
              id="workspaceSelect"
              value={activeWorkspaceId}
              onChange={(e) => switchWorkspace(e.target.value)}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>
          <div
            className="tools-discovery-controls"
            role="search"
            aria-label="Search and filter all tools"
          >
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
          <div className="tools-filter-tabs" role="tablist" aria-label="Tool category filters">
            {filterTabs.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={toolFilter === option.value}
                aria-label={option.value === 'all' ? 'All' : option.label}
                className={`tools-filter-tab${toolFilter === option.value ? ' tools-filter-tab--active' : ''}`}
                onClick={() => setToolFilter(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="header-stats">
            <div className="stat">
              <span className="stat-number">{profileToolGraph.counts.visible}</span>
              <span className="stat-label">Visible</span>
            </div>
            <div className="stat">
              <span className="stat-number">{filteredTools.length}</span>
              <span className="stat-label">
                {searchQuery || toolFilter !== 'all'
                  ? 'Matching'
                  : isAllToolsWorkspace
                    ? 'Shown'
                    : 'Workspace tools'}
              </span>
            </div>
            <div className="stat">
              <span className="stat-number">{profileToolGraph.counts.recommended}</span>
              <span className="stat-label">Recommended</span>
            </div>
            <div className="stat">
              <span className="stat-number">{profileToolGraph.counts.pinned}</span>
              <span className="stat-label">Pinned</span>
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
                <span className="tools-recent-action">{primaryActionLabel(tool)} →</span>
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
          <button
            type="button"
            className="btn-open-tool"
            onClick={() => setActiveWorkspaceId('all')}
          >
            Show all tools →
          </button>
        </div>
      ) : showSearchEmpty ? (
        <div className="tools-recent" role="status">
          <div className="tools-recent-header">
            <h2 className="tools-recent-title">No matching tools</h2>
            <p>{emptyStateCopy}</p>
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
          {orderedTools.map((tool) => (
            <div
              key={tool.id}
              data-tool-id={tool.id}
              className="tool-card-large"
              onClick={() => handleToolClick(tool)}
              onKeyDown={(event) => handleToolCardKeyDown(event, tool)}
              role="button"
              tabIndex={tool.isLaunchable === false ? -1 : 0}
              aria-disabled={tool.isLaunchable === false}
            >
              <div className="tool-card-header">
                <div className="tool-icon">
                  <span aria-hidden>
                    <NavIcon icon={getToolIcon(tool.id)} size={28} />
                  </span>
                </div>
                <div className="tool-meta">
                  <h3>{tool.name}</h3>
                  <span className="tool-category">{tool.category}</span>
                  <span
                    className={`tool-category tool-category--lifecycle tool-category--lifecycle-${tool.lifecycleState}`}
                  >
                    {lifecycleLabel(tool)}
                  </span>
                  {tool.accessLabel ? (
                    <span
                      className={`tool-category tool-category--access tool-category--access-${tool.accessState}`}
                    >
                      {tool.accessLabel}
                    </span>
                  ) : null}
                  {tool.surface === 'chat-assisted' ? (
                    <span className="tool-category tool-category--guided">Guided</span>
                  ) : null}
                  {tool.restrictionReason ? (
                    <span className="tool-category tool-category--restricted">
                      {tool.restrictionReason}
                    </span>
                  ) : null}
                </div>
                <div className="tool-card-actions">
                  <button
                    className={`tool-card-action ${favoriteToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={
                      favoriteToolIdSet.has(tool.id) ? 'Remove from favorites' : 'Add to favorites'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon
                      icon={CHROME_ICONS.star}
                      size={16}
                      fill={favoriteToolIdSet.has(tool.id) ? 'currentColor' : 'none'}
                      aria-hidden
                    />
                  </button>
                  <button
                    className={`tool-card-action ${pinnedToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={pinnedToolIdSet.has(tool.id) ? 'Unpin tool' : 'Pin tool'}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinned(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon icon={CHROME_ICONS.pin} size={16} aria-hidden />
                  </button>
                  <button
                    className={`tool-card-action ${hiddenToolIdSet.has(tool.id) ? 'active' : ''}`}
                    title={
                      hiddenToolIdSet.has(tool.id)
                        ? 'Show tool by default'
                        : 'Hide from default views'
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(tool.id);
                    }}
                    type="button"
                  >
                    <NavIcon icon={CHROME_ICONS.close} size={16} aria-hidden />
                  </button>
                  <div className="tool-shortcut">
                    {tool.shortcut ? tool.shortcut.replace('Ctrl+', '⌘') : 'Open'}
                  </div>
                </div>
              </div>

              <p className="tool-description">{tool.description}</p>
              {tool.restrictionReason || tool.isLaunchable === false ? (
                <p className="tool-restriction-note">
                  Unavailable: {tool.restrictionReason || accessRestrictionCopy(tool)}
                </p>
              ) : null}

              <div className="tool-features">
                <h4>Key Features:</h4>
                <ul>
                  {(tool.features || []).slice(0, 3).map((feature, idx) => (
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
                  {tool.useCases.slice(0, 3).map((useCase, idx) => (
                    <span key={idx} className="use-case-tag">
                      {useCase}
                    </span>
                  ))}
                </div>
              </div>

              <div className="tool-actions">
                <button
                  className="btn-open-tool"
                  disabled={Boolean(tool.restrictionReason) || tool.isLaunchable === false}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToolClick(tool);
                  }}
                >
                  {primaryActionLabel(tool)} →
                </button>
                {hasMeaningfulAssistantAction(tool) &&
                !tool.restrictionReason &&
                tool.isLaunchable !== false ? (
                  <button
                    className="btn-chat-tool"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssistantLaunch(tool);
                    }}
                  >
                    Ask Assistant
                  </button>
                ) : null}
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
            <h3>Ask Assistant</h3>
            <p>
              Send context to Assistant when you want guidance, preview, or confirmation before
              acting.
            </p>
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
            <p>
              Existing backend commands and deterministic executors still run behind the simpler
              surface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolsOverview;
