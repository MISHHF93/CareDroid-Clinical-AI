import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { PRIMARY_NAV_ITEMS } from '../navigation/primaryNavigation';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getNavIcon, getToolIcon } from '../navigation/iconRegistry';
import './QuickCommandLauncher.css';

const MAX_RECENT_ITEMS = 5;
const MAX_DEFAULT_TOOL_ITEMS = 18;

function commandSearchText(entry) {
  return [
    entry.id,
    entry.label,
    entry.description,
    entry.category,
    entry.path,
    entry.shortcut,
    ...(entry.aliases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function makeNavEntry(item) {
  return {
    id: `nav:${item.id}`,
    sourceId: item.id,
    kind: 'nav',
    label: item.label,
    description: item.id === 'home' ? 'Open the CareDroid Command Dashboard' : `Open ${item.label}`,
    category: 'Destination',
    path: item.path,
    icon: getNavIcon(item.id),
    shortcut: item.id === 'assistant' ? '/ask' : null,
  };
}

function makeToolEntry(tool) {
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
    aliases: [tool.nluToolId, ...(tool.features || []), ...(tool.useCases || [])],
  };
}

export function buildQuickCommandEntries({
  tools = getUserFacingToolRegistryProjection(),
  navItems = PRIMARY_NAV_ITEMS,
  recentToolIds = [],
} = {}) {
  const navEntries = navItems.map(makeNavEntry);
  const navPathSet = new Set(navEntries.map((entry) => entry.path).filter(Boolean));
  const allToolEntries = tools
    .filter((tool) => tool?.id && !navPathSet.has(tool.path))
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
  const toolEntries = allToolEntries.filter((entry) => !recentSourceIds.has(entry.sourceId));

  return { navEntries, toolEntries, recentEntries };
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

function CommandItem({ entry, onLaunch }) {
  return (
    <button
      type="button"
      className="quick-command-item"
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
  const { recentTools, recordToolAccess } = useToolPreferences();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const entries = useMemo(
    () => buildQuickCommandEntries({ recentToolIds: recentTools }),
    [recentTools]
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

  const launchEntry = (entry) => {
    if (entry.kind === 'tool') {
      applyRegistryToolLaunch(entry.sourceId, {
        navigate,
        addMessage,
        selectTool,
        setActiveTool,
        recordToolAccess,
      });
    } else {
      navigate({ pathname: entry.path, search: '' });
    }
    onClose?.();
  };

  if (!isOpen) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const usedEntryIds = new Set();
  const pickUnique = (items) =>
    items.filter((entry) => {
      if (usedEntryIds.has(entry.id)) return false;
      usedEntryIds.add(entry.id);
      return true;
    });

  const matchesQuery = (entry) => commandSearchText(entry).includes(normalizedQuery);
  const recentEntries = pickUnique(entries.recentEntries.filter(matchesQuery));
  const navEntries = pickUnique(entries.navEntries.filter(matchesQuery));
  const toolEntries = pickUnique(
    entries.toolEntries
      .filter(matchesQuery)
      .slice(0, normalizedQuery ? entries.toolEntries.length : MAX_DEFAULT_TOOL_ITEMS)
  );
  const hasResults = recentEntries.length + navEntries.length + toolEntries.length > 0;

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
          <span className="sr-only">Search commands and tools</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search destinations, calculators, tools..."
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
              {[...recentEntries, ...navEntries, ...toolEntries].map((entry) => (
                <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} />
              ))}
            </Section>
          ) : (
            <>
              <Section title="Recent Tools">
                {recentEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} />
                ))}
              </Section>
              <Section title="Destinations">
                {navEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} />
                ))}
              </Section>
              <Section title="Canonical Tools">
                {toolEntries.map((entry) => (
                  <CommandItem key={entry.id} entry={entry} onLaunch={launchEntry} />
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
