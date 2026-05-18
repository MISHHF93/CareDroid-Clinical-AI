import React, { forwardRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, Permission } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import PermissionGate from './PermissionGate';
import WorkspaceCreationModal from './WorkspaceCreationModal';
import toolRegistry, { toolRegistryById } from '../data/toolRegistry';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getNavIcon, getToolIcon } from '../navigation/iconRegistry';
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
  const [showToolsSection, setShowToolsSection] = useState(true);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  // Medical Tools - Enhanced with navigation
  const medicalTools = toolRegistry;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeWorkspaceId);
  const workspaceToolIds = activeWorkspace?.toolIds?.length
    ? activeWorkspace.toolIds
    : medicalTools.map((tool) => tool.id);
  const workspaceTools = medicalTools.filter((tool) => workspaceToolIds.includes(tool.id));
  const favoriteTools = workspaceTools.filter((tool) => favorites.includes(tool.id));
  const pinnedTools = workspaceTools.filter((tool) => pinned.includes(tool.id));
  const unpinnedTools = workspaceTools.filter((tool) => !pinned.includes(tool.id));
  const orderedTools = [...pinnedTools, ...unpinnedTools];
  const recentToolItems = recentTools
    .map((toolId) => toolRegistryById[toolId])
    .filter((tool) => tool && workspaceToolIds.includes(tool.id));

  // Navigation Items
  const navItems = [
    { id: 'chat', label: 'Dashboard', path: '/dashboard' },
    { id: 'clinical-alerts', label: 'Alerts', path: '/clinical/alerts' },
    { id: 'profile', label: 'Profile', path: '/profile' },
    { id: 'team', label: 'Team', path: '/team', permission: Permission.MANAGE_USERS },
    { id: 'audit', label: 'Audit Logs', path: '/audit-logs', permission: Permission.VIEW_AUDIT_LOGS },
    { id: 'analytics', label: 'Analytics', path: '/analytics', permission: Permission.VIEW_ANALYTICS },
    { id: 'settings', label: 'Settings', path: '/settings' }
  ];

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
    recordToolAccess(tool.id);
    onToolSelect?.(tool.id);
    if (tool?.path) {
      navigate(tool.path);
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

  const isToolRouteActive = (tool) => {
    if (!tool.path) return false;
    if (location.pathname === tool.path) return true;
    if (tool.path === '/tools/calculators') {
      return location.pathname === '/tools/calculators';
    }
    return location.pathname.startsWith(`${tool.path}/`);
  };

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
        title={`${tool.name} - ${tool.description}\n\nShortcut: ${tool.shortcut}\nClick to navigate or use in chat with /${tool.id}`}
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: '600',
              fontSize: '12px',
              color: 'var(--text-primary, #1a1a1a)',
              marginBottom: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {tool.name}
              <span style={{
                fontSize: '9px',
                padding: '1px 4px',
                borderRadius: '3px',
                backgroundColor: 'var(--panel-border, #e0e0e0)',
                color: 'var(--text-secondary, #666)',
                fontFamily: 'monospace',
                fontWeight: '500'
              }}>
                {tool.shortcut.replace('Ctrl+', '⌘')}
              </span>
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--text-secondary, #666)',
              lineHeight: '1.3',
              marginBottom: '4px'
            }}>
              {tool.description}
            </div>
            <div style={{
              fontSize: '9px',
              padding: '2px 5px',
              borderRadius: '3px',
              backgroundColor: `${tool.color}20`,
              color: tool.color,
              display: 'inline-block',
              fontWeight: '600'
            }}>
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
          className="sidebar-toggle"
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
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                title={effectiveCollapsed ? item.label : ''}
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
              className="section-header"
              onClick={() => setShowToolsSection(!showToolsSection)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
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

            <div style={{ padding: '8px 4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                value={activeWorkspaceId}
                onChange={(e) => setActiveWorkspaceId(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--panel-background)',
                  border: '1px solid var(--panel-border)',
                  color: 'var(--text-color)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '12px'
                }}
              >
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))',
                  border: 'none',
                  color: 'var(--navy-ink)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
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

                <div className="tools-subsection">
                  <div className="tools-subsection-header">All Tools</div>
                  <div className="tools-subsection-list">
                    {orderedTools.map(renderToolCard)}
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleOpenCatalog}
                  aria-label="Open full clinical tools catalog"
                  aria-current={isOnToolsCatalog ? 'page' : undefined}
                  className={`sidebar-tools-quick-action${isOnToolsCatalog ? ' sidebar-tools-quick-action--active' : ''}`}
                >
                  <span className="section-icon--svg" aria-hidden>
                    <NavIcon icon={CHROME_ICONS.tools} size={14} />
                  </span>
                  <span>Full Catalog</span>
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
