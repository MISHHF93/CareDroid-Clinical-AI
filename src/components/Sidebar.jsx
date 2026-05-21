import React, { forwardRef, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, Permission } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import PermissionGate from './PermissionGate';
import WorkspaceCreationModal from './WorkspaceCreationModal';
import { partitionSidebarTools, SIDEBAR_CATEGORY_ORDER } from '../data/sidebarToolPresentation';
import { getSidebarToolRegistryProjection } from '../data/toolInventory';
import { useConversation } from '../contexts/ConversationContext';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';
import { matchCalculatorRoute } from '../routes/clinicalToolRoutes';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getNavIcon, getToolIcon } from '../navigation/iconRegistry';
import { isBackendCapabilityEnabled } from '../config/backendApiCapabilities';
import './Sidebar.css';

/**
 * CareDroid Professional Sidebar
 * Clinical AI Platform Navigation
 */
const Sidebar = forwardRef(function Sidebar(
  {
  conversations = [],
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onSignOut,
  healthStatus = 'online',
  currentTool = null,
  onToolSelect,
  onOpenToolsOverview,
  onOpenToolsCatalog,
  layoutCompact = false,
  mobileNavOpen = false,
  onCloseMobileNav = () => {},
  sidebarCollapsed = false,
  onSidebarCollapsedChange = () => {},
},
  ref
) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { notifications } = useNotifications();
  const {
    favorites,
    pinned,
    recentTools,
    toggleFavorite,
    togglePinned,
    recordToolAccess,
    clearRecentTools
  } = useToolPreferences();
  const {
    workspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    addWorkspace
  } = useWorkspace();
  const { addMessage, selectTool, setActiveTool } = useConversation();
  const [showToolsSection, setShowToolsSection] = useState(true);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(() =>
    Object.fromEntries(SIDEBAR_CATEGORY_ORDER.map((category) => [category, true]))
  );
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Medical Tools - Enhanced with navigation
  const medicalTools = getSidebarToolRegistryProjection();
  const sidebarToolById = Object.fromEntries(medicalTools.map((tool) => [tool.id, tool]));
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const workspaceToolIds = activeWorkspace?.toolIds?.length
    ? activeWorkspace.toolIds
    : medicalTools.map((tool) => tool.id);
  const workspaceTools = medicalTools.filter((tool) => workspaceToolIds.includes(tool.id));
  const { pinnedTools, favoriteTools, categoryGroups } = partitionSidebarTools(
    workspaceTools,
    pinned,
    favorites
  );
  const recentToolItems = recentTools
    .map((toolId) => sidebarToolById[toolId])
    .filter((tool) => tool && workspaceToolIds.includes(tool.id));

  // Navigation Items
  const navItems = [
    { id: 'chat', label: 'Dashboard', path: '/dashboard' },
    { id: 'clinical-alerts', label: 'Alerts', path: '/clinical/alerts' },
    { id: 'profile', label: 'Profile', path: '/profile' },
    { id: 'team', label: 'Team', path: '/team', permission: Permission.MANAGE_USERS },
    { id: 'audit', label: 'Audit Logs', path: '/audit-logs', permission: Permission.VIEW_AUDIT_LOGS },
    { id: 'analytics', label: 'Analytics', path: '/analytics', permission: Permission.VIEW_ANALYTICS },
    { id: 'costs', label: 'Cost analytics', path: '/costs', permission: Permission.VIEW_ANALYTICS },
    { id: 'settings', label: 'Settings', path: '/settings' },
  ].filter((item) => {
    if (item.id === 'team') {
      return isBackendCapabilityEnabled('teamManagement');
    }
    return true;
  });

  const recentConversations = conversations.slice(-5).reverse();

  const effectiveCollapsed = layoutCompact ? false : sidebarCollapsed;

  const handleNavClick = (path) => {
    if (path === '/dashboard') {
      navigate({ pathname: '/dashboard', search: '' }, { replace: true });
    } else {
      onToolSelect?.(null);
      navigate(path);
    }
    onCloseMobileNav();
  };

  const handleToolClick = (tool) => {
    if (onToolSelect) {
      onToolSelect(tool.id);
    } else {
      applyRegistryToolLaunch(tool.id, {
        navigate,
        addMessage,
        selectTool,
        setActiveTool,
        recordToolAccess,
      });
    }
    onCloseMobileNav();
  };

  const handleViewAllTools = () => {
    if (onOpenToolsOverview) {
      onOpenToolsOverview();
    } else {
      navigate('/tools');
    }
    onCloseMobileNav();
  };

  const handleOpenCatalog = () => {
    if (onOpenToolsCatalog) {
      onOpenToolsCatalog();
    } else {
      navigate('/tools/catalog');
    }
    onCloseMobileNav();
  };

  const isOnToolsOverview = location.pathname === '/tools';
  const isOnToolsCatalog = location.pathname === '/tools/catalog';

  const isNavPathActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isToolRouteActive = (tool) => {
    const path = location.pathname;
    const calcParam = new URLSearchParams(location.search).get('calc');

    if (tool.initialCalc) {
      const calcMatch = matchCalculatorRoute(path);
      if (calcMatch?.calculatorSlug === tool.initialCalc) return true;
      if (path === '/tools/calculators' && calcParam === tool.initialCalc) return true;
    }

    if (tool.path && path === tool.path) {
      if (tool.path === '/tools/calculators' && tool.id !== 'calculators') {
        return !matchCalculatorRoute(path);
      }
      return true;
    }

    if (tool.path && path.startsWith(`${tool.path}/`)) return true;

    return false;
  };

  const toggleCategoryGroup = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  useEffect(() => {
    const node = ref?.current;
    if (!node || !layoutCompact) return undefined;
    if (mobileNavOpen) {
      node.removeAttribute('inert');
    } else {
      node.setAttribute('inert', '');
    }
    return () => node.removeAttribute('inert');
  }, [layoutCompact, mobileNavOpen, ref]);

  useEffect(() => {
    if (!layoutCompact || !mobileNavOpen || !ref?.current) return;
    const active = ref.current.querySelector(
      '.nav-item.active, .sidebar-tool-card.active, .sidebar-tools-quick-action--active'
    );
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [layoutCompact, mobileNavOpen, location.pathname, location.search, ref]);

  const renderToolCard = (tool) => {
    const isSelected =
      currentTool === tool.id &&
      (location.pathname === '/dashboard' || isToolRouteActive(tool));
    const isFavorite = favorites.includes(tool.id);
    const isPinned = pinned.includes(tool.id);

    return (
      <div
        key={tool.id}
        className={`tool-card sidebar-tool-card ${isSelected ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleToolClick(tool);
        }}
        style={{
          padding: '10px',
          margin: '6px 0',
          borderRadius: '8px',
          border: `2px solid ${isSelected ? tool.color : 'transparent'}`,
          backgroundColor: isSelected
            ? `${tool.color}15`
            : 'var(--panel-background)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--panel-hover, #f5f5f5)';
            e.currentTarget.style.borderColor = `${tool.color}40`;
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--panel-background)';
            e.currentTarget.style.borderColor = 'transparent';
          }
        }}
        title={`${tool.name} - ${tool.description}${tool.shortcut ? `\n\nShortcut: ${tool.shortcut}` : ''}\nClick to navigate or use in chat with /${tool.id}`}
      >
        <div className="tool-action-buttons">
          <button
            className={`tool-action-btn ${isFavorite ? 'active' : ''}`}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(tool.id);
            }}
          >
            <NavIcon
              icon={CHROME_ICONS.star}
              size={14}
              fill={isFavorite ? 'currentColor' : 'none'}
              aria-hidden
            />
          </button>
          <button
            className={`tool-action-btn ${isPinned ? 'active' : ''}`}
            title={isPinned ? 'Unpin tool' : 'Pin tool to top'}
            onClick={(e) => {
              e.stopPropagation();
              togglePinned(tool.id);
            }}
          >
            <NavIcon icon={CHROME_ICONS.pin} size={14} aria-hidden />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span
            className="tool-card-icon-wrap"
            style={{
              filter: isSelected ? 'none' : 'grayscale(0.2)',
              lineHeight: 1,
              display: 'inline-flex',
              color: tool.color,
            }}
            aria-hidden
          >
            <NavIcon icon={getToolIcon(tool.id)} size={22} />
          </span>
          <div className="sidebar-tool-card-body">
            <div className="sidebar-tool-card-title-row">
              <span className="sidebar-tool-card-name">{tool.name}</span>
              {tool.shortcut ? (
                <span className="sidebar-tool-card-shortcut">
                  {tool.shortcut.replace('Ctrl+', '⌘')}
                </span>
              ) : null}
            </div>
            <div className="sidebar-tool-card-desc">{tool.description}</div>
            <div
              className="sidebar-tool-card-category"
              style={{
                backgroundColor: `${tool.color}20`,
                color: tool.color,
              }}
            >
              {tool.category}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
    <aside
      ref={ref}
      id="app-sidebar-nav"
      className={[
        'sidebar',
        !layoutCompact && effectiveCollapsed ? 'sidebar-collapsed' : '',
        layoutCompact ? 'sidebar--compact' : '',
        layoutCompact && mobileNavOpen ? 'sidebar--open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-hidden={layoutCompact && !mobileNavOpen ? true : undefined}
      aria-modal={layoutCompact && mobileNavOpen ? 'true' : undefined}
      role={layoutCompact && mobileNavOpen ? 'dialog' : undefined}
      aria-label={layoutCompact && mobileNavOpen ? 'Navigation menu' : undefined}
    >
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.hospital} size={28} />
          </div>
          {!effectiveCollapsed && (
            <div className="logo-text">
              <h1>CareDroid-Clinical-AI</h1>
            </div>
          )}
        </div>
        <button
          type="button"
          className={[
            'sidebar-toggle',
            layoutCompact ? 'sidebar-toggle--mobile-close' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...(layoutCompact ? { 'data-drawer-initial-focus': '' } : {})}
          onClick={() => {
            if (layoutCompact) {
              onCloseMobileNav();
            } else {
              onSidebarCollapsedChange(!sidebarCollapsed);
            }
          }}
          aria-label={layoutCompact ? 'Close menu' : effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {layoutCompact ? (
            <NavIcon icon={CHROME_ICONS.close} size={20} aria-hidden />
          ) : effectiveCollapsed ? (
            <NavIcon icon={CHROME_ICONS.chevronRight} size={20} aria-hidden />
          ) : (
            <NavIcon icon={CHROME_ICONS.chevronLeft} size={20} aria-hidden />
          )}
        </button>
      </div>

      {/* User Profile */}
      {!effectiveCollapsed && (
        <div className="sidebar-user">
          <div className="user-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Clinician'}</div>
          </div>
          <div className={`health-indicator ${healthStatus}`}>
            <div className="health-dot"></div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="sidebar-content">
        {/* New Conversation Button */}
        <button
          type="button"
          className="btn-new-conversation"
          onClick={() => {
            onNewConversation();
            onCloseMobileNav();
          }}
        >
          <span className="btn-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.sparkles} size={18} />
          </span>
          {!effectiveCollapsed && <span>New Conversation</span>}
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {!effectiveCollapsed && 'Navigation'}
          </div>
          {navItems.map(item => {
            const NavButton = (
              <button
                key={item.id}
                className={`nav-item ${isNavPathActive(item.path) ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                title={effectiveCollapsed ? item.label : ''}
                aria-current={isNavPathActive(item.path) ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden>
                  <NavIcon icon={getNavIcon(item.id)} />
                </span>
                {!effectiveCollapsed && <span className="nav-label">{item.label}</span>}
              </button>
            );

            return item.permission ? (
              <PermissionGate key={item.id} permission={item.permission} hideIfDenied>
                {NavButton}
              </PermissionGate>
            ) : NavButton;
          })}
        </nav>

        {/* Medical Tools Section - Enhanced */}
        {!effectiveCollapsed && (
          <div className="sidebar-section">
            <div
              className="section-header sidebar-section-header-toggle"
              role="button"
              tabIndex={0}
              aria-expanded={showToolsSection}
              onClick={() => setShowToolsSection(!showToolsSection)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowToolsSection((open) => !open);
                }
              }}
            >
              <span className="section-icon section-icon--svg" aria-hidden>
                <NavIcon icon={CHROME_ICONS.tools} size={16} />
              </span>
              <span className="section-title">Clinical Tools</span>
              <span
                style={{
                  marginLeft: 'auto',
                  display: 'inline-flex',
                  alignItems: 'center',
                  transform: showToolsSection ? 'rotate(0deg)' : 'rotate(-90deg)',
                  transition: 'transform 0.2s',
                  color: 'var(--sidebar-fg-muted)',
                }}
                aria-hidden
              >
                <NavIcon icon={CHROME_ICONS.chevronDown} size={14} />
              </span>
            </div>

            <div className="sidebar-workspace-controls">
              <select
                className="sidebar-workspace-select"
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="sidebar-workspace-new-btn"
                onClick={() => setShowWorkspaceModal(true)}
              >
                <span>+</span>
                <span>New Workspace</span>
              </button>
            </div>

            {showToolsSection && (
              <div className="medical-tools-list" style={{ marginTop: '8px' }}>
                {favoriteTools.length > 0 && (
                  <div className="tools-subsection">
                    <div className="tools-subsection-header tools-subsection-header--with-icon">
                      <span className="tools-subsection-header-icon" aria-hidden>
                        <NavIcon icon={CHROME_ICONS.star} size={14} fill="currentColor" />
                      </span>
                      <span>Favorites</span>
                    </div>
                    <div className="tools-subsection-list">
                      {favoriteTools.map(renderToolCard)}
                    </div>
                  </div>
                )}

                {recentToolItems.length > 0 && (
                  <div className="tools-subsection">
                    <div className="tools-subsection-header tools-subsection-header-row">
                      <span className="tools-subsection-header-row-title">
                        <span className="tools-subsection-header-icon" aria-hidden>
                          <NavIcon icon={CHROME_ICONS.clock} size={14} />
                        </span>
                        <span>Recent Tools</span>
                      </span>
                      <button
                        className="tools-clear-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearRecentTools();
                        }}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="recent-tools-list">
                      {recentToolItems.map((tool) => (
                        <button
                          key={tool.id}
                          className="recent-tool-item"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToolClick(tool);
                          }}
                          type="button"
                        >
                          <span className="recent-tool-icon" aria-hidden>
                            <NavIcon icon={getToolIcon(tool.id)} size={18} />
                          </span>
                          <span className="recent-tool-name">{tool.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {pinnedTools.length > 0 && (
                  <div className="tools-subsection">
                    <div className="tools-subsection-header tools-subsection-header--with-icon">
                      <span className="tools-subsection-header-icon" aria-hidden>
                        <NavIcon icon={CHROME_ICONS.pin} size={14} />
                      </span>
                      <span>Pinned</span>
                    </div>
                    <div className="tools-subsection-list">{pinnedTools.map(renderToolCard)}</div>
                  </div>
                )}

                {categoryGroups.map(({ category, tools }) => {
                  const groupId = `sidebar-tools-cat-${category.replace(/\s+/g, '-').toLowerCase()}`;
                  const isExpanded = expandedCategories[category] !== false;
                  return (
                    <div key={category} className="tools-subsection tools-subsection--category">
                      <div
                        className="tools-subsection-header tools-subsection-header-toggle"
                        role="button"
                        tabIndex={0}
                        aria-expanded={isExpanded}
                        aria-controls={groupId}
                        onClick={() => toggleCategoryGroup(category)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleCategoryGroup(category);
                          }
                        }}
                      >
                        <span>{category}</span>
                        <span className="tools-subsection-chevron" aria-hidden>
                          <NavIcon
                            icon={CHROME_ICONS.chevronDown}
                            size={14}
                            style={{
                              transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                              transition: 'transform 0.2s',
                            }}
                          />
                        </span>
                      </div>
                      {isExpanded ? (
                        <div id={groupId} className="tools-subsection-list">
                          {tools.map(renderToolCard)}
                        </div>
                      ) : null}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleOpenCatalog}
                  aria-label="Open developer catalog and source audit"
                  aria-current={isOnToolsCatalog ? 'page' : undefined}
                  className={`sidebar-tools-quick-action${isOnToolsCatalog ? ' sidebar-tools-quick-action--active' : ''}`}
                >
                  <span className="section-icon--svg" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.tools} size={14} />
                  </span>
                  <span>Source Audit</span>
                </button>

                <button
                  type="button"
                  onClick={handleViewAllTools}
                  aria-label="Open tools overview — browse all suite shortcuts"
                  aria-current={isOnToolsOverview ? 'page' : undefined}
                  className={`sidebar-tools-quick-action${isOnToolsOverview ? ' sidebar-tools-quick-action--active' : ''}`}
                >
                  <span className="section-icon--svg" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.bolt} size={14} />
                  </span>
                  <span>View All Tools</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Conversations */}
        {!effectiveCollapsed && recentConversations.length > 0 && (
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon section-icon--svg" aria-hidden>
                <NavIcon icon={CHROME_ICONS.messageCircle} size={16} />
              </span>
              <span className="section-title">Recent</span>
            </div>
            <div className="conversations-list">
              {recentConversations.map(conv => (
                <button
                  key={conv.id}
                  className={`conversation-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onCloseMobileNav();
                  }}
                >
                  <span className="conversation-title">
                    {conv.title.length > 25 ? conv.title.substring(0, 25) + '...' : conv.title}
                  </span>
                  <span className="conversation-time">
                    {new Date(conv.date || conv.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Notifications */}
        <button
          type="button"
          className="footer-action"
          onClick={() => {
            navigate('/notifications');
            onCloseMobileNav();
          }}
          title="Notifications"
        >
          <span className="action-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.bell} size={18} />
          </span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* HIPAA Badge */}
        {!effectiveCollapsed && (
          <div className="hipaa-badge">
            <span className="hipaa-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.lock} size={14} />
            </span>
            <span className="hipaa-text">HIPAA Compliant</span>
          </div>
        )}

        {/* Sign Out */}
        <button
          type="button"
          className="btn-signout"
          onClick={() => {
            onCloseMobileNav();
            onSignOut();
          }}
          title="Sign Out"
        >
          <span className="signout-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.logOut} size={18} />
          </span>
          {!effectiveCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>

    {/* Workspace Creation Modal */}
    <WorkspaceCreationModal
      isOpen={showWorkspaceModal}
      onClose={() => setShowWorkspaceModal(false)}
      onCreateWorkspace={(workspace) => {
        addWorkspace(workspace);
        setActiveWorkspaceId(workspace.id);
        setShowWorkspaceModal(false);
      }}
    />
    </>
  );
});

export default Sidebar;
