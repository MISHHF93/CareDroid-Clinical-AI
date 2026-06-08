import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useTenantContext } from '../contexts/TenantContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { FEATURE_FLAGS } from '../config/featureFlags.config';
import { filterVisibleTools, getAssetAwareToolProjection } from '../data/assetAccess';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { getMountedCapabilityById } from '../data/mountedCapabilityGraph';
import { CARE_WORKSPACES } from '../config/workspace.config';
import { QUICK_COMMAND_DESTINATION_ITEMS, canExposeNavigationItem } from '../config/navigation.config';
import {
  buildSearchFirstDiscoveryEntries,
  searchDiscoveryText,
} from '../data/searchFirstDiscovery';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getNavIcon, getToolIcon, getWorkspaceIcon } from '../navigation/iconRegistry';
import './QuickCommandLauncher.css';

const MAX_RECENT_ITEMS = 5;
const MAX_FAVORITE_ITEMS = 5;
const MAX_DEFAULT_WORKSPACE_ITEMS = 2;
const MAX_DEFAULT_DESTINATION_ITEMS = 6;
const MAX_DEFAULT_TOOL_ITEMS = 4;

function commandSearchText(entry) {
  return [
    entry.id,
    entry.label,
    entry.description,
    entry.category,
    entry.path,
    entry.shortcut,
    entry.searchText,
    ...(entry.aliases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function fuzzyIncludes(haystack, needle) {
  if (!needle) return true;
  if (haystack.includes(needle)) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function makeNavEntry(item) {
  return {
    id: `nav:${item.id}`,
    sourceId: item.id,
    kind: 'nav',
    label: item.label,
    description: item.id === 'home' ? 'Open the CareDroid dashboard' : `Open ${item.label}`,
    category: 'Go to',
    path: item.path,
    icon: getNavIcon(item.id),
    shortcut: item.id === 'assistant' ? '/ask' : null,
  };
}

function makeWorkspaceEntry(workspace) {
  return {
    id: `workspace:${workspace.id}`,
    sourceId: workspace.id,
    kind: 'workspace',
    label: `${workspace.label || workspace.name} Workspace`,
    description: workspace.description,
    category: 'Workspace',
    path: workspace.path,
    icon: getWorkspaceIcon(workspace.icon),
    aliases: [workspace.shortLabel, workspace.aiContext],
  };
}

function makeShortcutEntry(shortcut) {
  return {
    id: `workspace-shortcut:${shortcut.id}`,
    sourceId: shortcut.id,
    kind: 'nav',
    label: shortcut.label,
    description: shortcut.description,
    category: 'Workspace',
    path: shortcut.path,
    icon: CHROME_ICONS.layoutDashboard,
    aliases: [shortcut.assetId],
  };
}

function makeToolEntry(tool) {
  const capability = getMountedCapabilityById(tool.id);
  return {
    id: `tool:${tool.id}`,
    sourceId: tool.id,
    kind: 'tool',
    label: tool.name,
    description: tool.description,
    category: tool.category,
    path: tool.path,
    icon: getToolIcon(tool.id),
    color: tool.color,
    shortcut: tool.shortcut,
    tool,
    capability,
    aliases: [
      tool.nluToolId,
      ...(tool.features || []),
      ...(tool.useCases || []),
      ...(tool.aliases || []),
      ...(capability?.aiAliases || []),
    ],
  };
}

function makeDiscoveryEntry(entry) {
  const iconByKind = {
    asset: CHROME_ICONS.artifacts,
    workflow: CHROME_ICONS.clipboardList,
    automation: CHROME_ICONS.bolt,
    simulation: CHROME_ICONS.training,
    protocol: CHROME_ICONS.stethoscope,
    'ai-agent': CHROME_ICONS.bot,
    'ai-model': CHROME_ICONS.brain,
    operation: CHROME_ICONS.activity,
    dashboard: CHROME_ICONS.layoutDashboard,
    destination: CHROME_ICONS.search,
    notification: CHROME_ICONS.bell,
    commercial: CHROME_ICONS.circleDollar,
  };
  return {
    id: `discovery:${entry.id}`,
    sourceId: entry.sourceId,
    kind: entry.kind,
    label: entry.title || entry.label,
    description: entry.description,
    category: `Discovery · ${entry.category}`,
    path: entry.path,
    icon: iconByKind[entry.kind] || CHROME_ICONS.search,
    aliases: entry.aliases,
    searchText: searchDiscoveryText(entry),
    assistantPrompt: entry.assistantPrompt,
  };
}

function uniqueEntriesById(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    if (!entry?.id || seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function navigationTargetFromPath(path = '') {
  const [pathname, ...searchParts] = String(path).split('?');
  return {
    pathname,
    search: searchParts.length ? `?${searchParts.join('?')}` : '',
  };
}

function isPrimaryShellDuplicate(tool, navPathSet) {
  if (tool?.path === '/tools/calculators' && tool.id === 'calculators') return true;
  if (!tool?.path || !navPathSet.has(tool.path)) return false;
  if (tool.path === '/tools/calculators' && tool.id !== 'calculators') return false;
  return true;
}

export function buildQuickCommandEntries({
  tools = getUserFacingToolRegistryProjection(),
  navItems = QUICK_COMMAND_DESTINATION_ITEMS,
  workspaces = CARE_WORKSPACES,
  recentToolIds = [],
  favoriteToolIds = [],
  discoveryEntries = null,
  navigationPermissions = [],
  includeContextualDestinations = true,
} = {}) {
  const workspaceEntries = uniqueEntriesById(workspaces.map(makeWorkspaceEntry));
  const exposedNavItems = navItems.filter((item) =>
    canExposeNavigationItem(item, {
      permissions: navigationPermissions,
      includeContextual: includeContextualDestinations,
    })
  );
  const navEntries = uniqueEntriesById(exposedNavItems.map(makeNavEntry));
  const navPathSet = new Set(navEntries.map((entry) => entry.path).filter(Boolean));
  const allToolEntries = tools
    .filter((tool) => tool?.id && tool.isLaunchable !== false && !isPrimaryShellDuplicate(tool, navPathSet))
    .map(makeToolEntry);
  const toolById = Object.fromEntries(allToolEntries.map((entry) => [entry.sourceId, entry]));
  const seenRecentIds = new Set();
  const recentEntries = recentToolIds
    .map((toolId) => toolById[toolId])
    .filter((entry) => {
      if (!entry || seenRecentIds.has(entry.sourceId)) return false;
      seenRecentIds.add(entry.sourceId);
      return true;
    })
    .slice(0, MAX_RECENT_ITEMS);
  const recentSourceIds = new Set(recentEntries.map((entry) => entry.sourceId));
  const seenFavoriteIds = new Set();
  const favoriteEntries = favoriteToolIds
    .map((toolId) => toolById[toolId])
    .filter((entry) => {
      if (!entry || recentSourceIds.has(entry.sourceId) || seenFavoriteIds.has(entry.sourceId)) return false;
      seenFavoriteIds.add(entry.sourceId);
      return true;
    })
    .slice(0, MAX_FAVORITE_ITEMS);
  const favoriteSourceIds = new Set(favoriteEntries.map((entry) => entry.sourceId));
  const toolEntries = allToolEntries.filter(
    (entry) => !recentSourceIds.has(entry.sourceId) && !favoriteSourceIds.has(entry.sourceId)
  );
  const sourceDiscoveryEntries =
    discoveryEntries ||
    buildSearchFirstDiscoveryEntries({
      navigationPermissions,
      includeContextualDestinations,
    });
  const searchableDiscoveryEntries = uniqueEntriesById(
    sourceDiscoveryEntries
      .filter((entry) =>
        [
          'asset',
          'workflow',
          'automation',
          'simulation',
          'protocol',
          'ai-agent',
          'ai-model',
          'operation',
          'dashboard',
          'destination',
          'notification',
          'commercial',
        ].includes(entry.kind)
      )
      .filter((entry) => !(entry.kind === 'asset' && toolById[entry.sourceId]))
      .map(makeDiscoveryEntry)
  );

  return { workspaceEntries, navEntries, toolEntries, recentEntries, favoriteEntries, discoveryEntries: searchableDiscoveryEntries };
}

function Section({ title, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <section className="quick-command-section" aria-labelledby={`quick-command-${title.toLowerCase().replace(/\W+/g, '-')}`}>
      <h3 id={`quick-command-${title.toLowerCase().replace(/\W+/g, '-')}`}>{title}</h3>
      <div className="quick-command-list">{children}</div>
    </section>
  );
}

function CommandItem({ entry, onLaunch, active = false }) {
  return (
    <button
      type="button"
      className={`quick-command-item${active ? ' quick-command-item--active' : ''}`}
      onClick={() => onLaunch(entry)}
      aria-label={`Open ${entry.label}`}
    >
      <span className="quick-command-item__icon" style={{ color: entry.color }} aria-hidden>
        <NavIcon icon={entry.icon} size={20} />
      </span>
      <span className="quick-command-item__body">
        <strong>{entry.label}</strong>
        <span>{entry.description}</span>
      </span>
      <span className="quick-command-item__meta">{entry.category}</span>
    </button>
  );
}

export default function QuickCommandLauncher({
  isOpen,
  isCompact = false,
  onClose,
  themePreference = 'system',
  resolvedTheme = 'light',
  onCycleTheme,
}) {
  const navigate = useNavigate();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const { recentTools, favorites, recordToolAccess } = useToolPreferences();
  const { user } = useUser();
  const { refreshTenantContext } = useTenantContext();
  const { account, activeWorkspace, preferences, platformContext, refreshIdentity, workspaceState } = useUserIdentity();
  const {
    activeWorkspace: workspaceContextActive,
    shortcuts: workspaceShortcuts,
    switchWorkspace,
    visibleAssetIds,
    workspaces: contextWorkspaces,
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const accessContext = useMemo(
    () => ({
      ...(platformContext || {}),
      account,
      activeWorkspace,
      preferences,
      workspaceState,
      visibleAssetIds,
    }),
    [account, activeWorkspace, platformContext, preferences, visibleAssetIds, workspaceState]
  );
  const accessRole = platformContext?.membership?.role || account?.role || user?.role;
  const navigationPermissions = useMemo(
    () => [
      ...(workspaceState?.effectivePermissions || []),
      ...(platformContext?.permissions || []),
      ...(account?.permissions || []),
      ...(user?.permissions || []),
    ],
    [account?.permissions, platformContext?.permissions, user?.permissions, workspaceState?.effectivePermissions]
  );
  const commandTools = useMemo(
    () =>
      FEATURE_FLAGS.platformEntitlements && platformContext
        ? filterVisibleTools(getAssetAwareToolProjection(accessContext, accessRole))
        : getUserFacingToolRegistryProjection(),
    [accessContext, accessRole, platformContext]
  );
  const entries = useMemo(
    () =>
      buildQuickCommandEntries({
        tools: commandTools,
        workspaces: contextWorkspaces?.length ? contextWorkspaces : CARE_WORKSPACES,
        recentToolIds: recentTools,
        favoriteToolIds: favorites,
        navigationPermissions,
        includeContextualDestinations: true,
      }),
    [commandTools, contextWorkspaces, favorites, navigationPermissions, recentTools]
  );
  const workspaceShortcutEntries = useMemo(
    () => (workspaceShortcuts || []).map(makeShortcutEntry),
    [workspaceShortcuts]
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      return undefined;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const launchEntry = async (entry) => {
    if (entry.kind === 'tool') {
      applyRegistryToolLaunch(entry.sourceId, {
        navigate,
        addMessage,
        selectTool,
        setActiveTool,
        recordToolAccess,
      });
    } else if (
      [
        'asset',
        'workflow',
        'automation',
        'simulation',
        'protocol',
        'ai-agent',
        'ai-model',
        'operation',
        'dashboard',
        'destination',
        'notification',
        'commercial',
      ].includes(entry.kind)
    ) {
      if (entry.path) {
        navigate(navigationTargetFromPath(entry.path));
      } else if (entry.assistantPrompt) {
        addMessage(entry.assistantPrompt, 'user');
        navigate({ pathname: '/assistant', search: '' });
      }
    } else {
      if (entry.kind === 'workspace') {
        await switchWorkspace(entry.sourceId);
        await refreshTenantContext?.();
        await refreshIdentity?.();
      }
      if (entry.path) {
        navigate(navigationTargetFromPath(entry.path));
      } else if (entry.assistantPrompt) {
        addMessage(entry.assistantPrompt, 'user');
        navigate({ pathname: '/assistant', search: '' });
      }
    }
    onClose?.();
  };

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const usedEntryIds = new Set();
  const usedEntryPaths = new Set();
  const pickUnique = (items) =>
    items.filter((entry) => {
      if (usedEntryIds.has(entry.id)) return false;
      if (entry.path && usedEntryPaths.has(entry.path)) {
        return false;
      }
      usedEntryIds.add(entry.id);
      if (entry.path) usedEntryPaths.add(entry.path);
      return true;
    });

  const matchesQuery = (entry) => {
    if (!queryTokens.length) return true;
    const text = commandSearchText(entry);
    return queryTokens.every((token) => fuzzyIncludes(text, token));
  };
  const recentEntries = pickUnique(entries.recentEntries.filter(matchesQuery));
  const favoriteEntries = pickUnique(entries.favoriteEntries.filter(matchesQuery));
  const shortcutEntries = pickUnique(workspaceShortcutEntries.filter(matchesQuery));
  const workspaceEntries = pickUnique(entries.workspaceEntries.filter(matchesQuery));
  const navEntries = pickUnique(entries.navEntries.filter(matchesQuery));
  const discoveryEntries = pickUnique(
    entries.discoveryEntries
      .filter(matchesQuery)
      .slice(0, normalizedQuery ? entries.discoveryEntries.length : 0)
  );
  const toolEntries = pickUnique(
    entries.toolEntries
      .filter(matchesQuery)
      .slice(0, normalizedQuery ? entries.toolEntries.length : MAX_DEFAULT_TOOL_ITEMS)
  );
  const visibleWorkspaceEntries = normalizedQuery
    ? workspaceEntries
    : workspaceEntries.slice(0, MAX_DEFAULT_WORKSPACE_ITEMS);
  const visibleNavEntries = normalizedQuery
    ? navEntries
    : navEntries.slice(0, MAX_DEFAULT_DESTINATION_ITEMS);
  const hasResults =
    recentEntries.length +
      favoriteEntries.length +
      shortcutEntries.length +
      visibleWorkspaceEntries.length +
      visibleNavEntries.length +
      discoveryEntries.length +
      toolEntries.length >
    0;
  const resultEntries = normalizedQuery
    ? [...recentEntries, ...favoriteEntries, ...shortcutEntries, ...workspaceEntries, ...navEntries, ...discoveryEntries, ...toolEntries]
    : [
        ...recentEntries,
        ...favoriteEntries,
        ...shortcutEntries,
        ...visibleWorkspaceEntries,
        ...visibleNavEntries,
        ...discoveryEntries,
        ...toolEntries,
      ];
  const activeEntryId = resultEntries[activeIndex]?.id;
  const handleSearchKeyDown = (event) => {
    if (!resultEntries.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % resultEntries.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + resultEntries.length) % resultEntries.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      launchEntry(resultEntries[activeIndex] || resultEntries[0]);
    }
  };

  return (
    <div className={`quick-command quick-command--${isCompact ? 'mobile' : 'desktop'}`}>
      <button
        type="button"
        className="quick-command-backdrop"
        aria-label="Close Quick Command"
        onClick={onClose}
      />
      <div
        className="quick-command-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-command-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="quick-command-header">
          <div>
            <p className="quick-command-eyebrow">CareDroid launcher</p>
            <h2 id="quick-command-title">Quick Command</h2>
          </div>
          <button type="button" className="quick-command-close" onClick={onClose} aria-label="Close Quick Command">
            <NavIcon icon={CHROME_ICONS.close} size={18} />
          </button>
        </div>

        <label className="quick-command-search">
          <span className="quick-command-search__icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.search} size={18} />
          </span>
          <span className="sr-only">Search commands and tools across workspaces and routes</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder="Launch routes, workspaces, tools, assets, and workflows..."
          />
        </label>

        <div className="quick-command-actions" aria-label="Command center utilities">
          <button type="button" onClick={onCycleTheme} className="quick-command-utility">
            <NavIcon
              icon={
                themePreference === 'system'
                  ? CHROME_ICONS.contrast
                  : resolvedTheme === 'dark'
                    ? CHROME_ICONS.moon
                    : CHROME_ICONS.sun
              }
              size={17}
              aria-hidden
            />
            <span>Theme: {themePreference}</span>
          </button>
          <span className="quick-command-shortcut">
            <NavIcon icon={CHROME_ICONS.keyboard} size={15} aria-hidden />
            Ctrl/Cmd K
          </span>
        </div>

        <div className="quick-command-results">
          {!hasResults ? (
            <p className="quick-command-empty">No matching commands. Try a tool, route, or clinical action.</p>
          ) : normalizedQuery ? (
            <Section title="Results">
              {resultEntries.map((entry) => (
                <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
              ))}
            </Section>
          ) : (
            <>
              <Section title="Recent Tools">
                {recentEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title="Favorites">
                {favoriteEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title={workspaceContextActive?.name ? `${workspaceContextActive.name} Shortcuts` : 'Workspace Shortcuts'}>
                {shortcutEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title="Workspaces">
                {visibleWorkspaceEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title="Top Destinations">
                {visibleNavEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title="Discovery">
                {discoveryEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <Section title="Suggested Tools">
                {toolEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} active={entry.id === activeEntryId} />
                ))}
              </Section>
              <p className="quick-command-scope-note">
                Search to reach all destinations, workspaces, assets, workflows, simulations, and tools.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
