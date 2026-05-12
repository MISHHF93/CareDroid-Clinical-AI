import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, Permission } from '../contexts/UserContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import PermissionGate from './PermissionGate';
import WorkspaceCreationModal from './WorkspaceCreationModal';
import toolRegistry, { toolRegistryById } from '../data/toolRegistry';
import './Sidebar.css';

/**
 * CareDroid Professional Sidebar
 * Clinical AI Platform Navigation
 */
const Sidebar = ({ 
  conversations = [], 
  activeConversation, 
  onSelectConversation,
  onNewConversation,
  onSignOut,
  healthStatus = 'online',
  currentTool = null,
  onToolSelect
}) => {
  const navigate = useNavigate();
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
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    { id: 'chat', icon: '💬', label: 'Dashboard', path: '/dashboard' },
    { id: 'profile', icon: '👤', label: 'Profile', path: '/profile' },
    { id: 'team', icon: '👥', label: 'Team', path: '/team', permission: Permission.MANAGE_USERS },
    { id: 'audit', icon: '📜', label: 'Audit Logs', path: '/audit-logs', permission: Permission.VIEW_AUDIT_LOGS },
    { id: 'analytics', icon: '📊', label: 'Analytics', path: '/analytics', permission: Permission.VIEW_ANALYTICS },
    { id: 'settings', icon: '⚙️', label: 'Settings', path: '/settings' }
  ];

  const recentConversations = conversations.slice(-5).reverse();

  const handleNavClick = (path) => {
    navigate(path);
  };

  const handleToolClick = (tool) => {
    recordToolAccess(tool.id);
    navigate(tool.path);
    onToolSelect?.(tool.id);
  };

  const renderToolCard = (tool) => {
    const isActive = location.pathname === tool.path;
    const isSelected = currentTool === tool.id;
    const isFavorite = favorites.includes(tool.id);
    const isPinned = pinned.includes(tool.id);

    return (
      <div
        key={tool.id}
        className={`tool-card ${isActive || isSelected ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          handleToolClick(tool);
        }}
        style={{
          padding: '10px',
          margin: '6px 0',
          borderRadius: '8px',
          border: `2px solid ${isActive || isSelected ? tool.color : 'transparent'}`,
          backgroundColor: isActive || isSelected
            ? `${tool.color}15`
            : 'var(--panel-background)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isActive && !isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--panel-hover, #f5f5f5)';
            e.currentTarget.style.borderColor = `${tool.color}40`;
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive && !isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--panel-background, white)';
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
            ★
          </button>
          <button
            className={`tool-action-btn ${isPinned ? 'active' : ''}`}
            title={isPinned ? 'Unpin tool' : 'Pin tool to top'}
            onClick={(e) => {
              e.stopPropagation();
              togglePinned(tool.id);
            }}
          >
            📌
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <span
            style={{
              fontSize: '22px',
              filter: isActive || isSelected ? 'none' : 'grayscale(0.2)',
              lineHeight: 1
            }}
          >
            {tool.icon}
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
    <aside className={`sidebar ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">🏥</div>
          {!isCollapsed && (
            <div className="logo-text">
              <h1>CareDroid-Clinical-AI</h1>
            </div>
          )}
        </div>
        <button 
          className="sidebar-toggle"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? '→' : '←'}
        </button>
      </div>

      {/* User Profile */}
      {!isCollapsed && (
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
          className="btn-new-conversation"
          onClick={onNewConversation}
        >
          <span className="btn-icon">✨</span>
          {!isCollapsed && <span>New Conversation</span>}
        </button>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-title">
            {!isCollapsed && 'Navigation'}
          </div>
          {navItems.map(item => {
            const NavButton = (
              <button
                key={item.id}
                className={`nav-item ${window.location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavClick(item.path)}
                title={isCollapsed ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
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
        {!isCollapsed && (
          <div className="sidebar-section">
            <div 
              className="section-header"
              onClick={() => setShowToolsSection(!showToolsSection)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              <span className="section-icon">🔧</span>
              <span className="section-title">Clinical Tools</span>
              <span style={{ 
                marginLeft: 'auto', 
                transform: showToolsSection ? 'rotate(0deg)' : 'rotate(-90deg)',
                transition: 'transform 0.2s',
                fontSize: '10px'
              }}>
                ▼
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
                    {workspace.icon ? `${workspace.icon} ` : ''}{workspace.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowWorkspaceModal(true)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #00ff88, #00ffff)',
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
                    <div className="tools-subsection-header">★ Favorites</div>
                    <div className="tools-subsection-list">
                      {favoriteTools.map(renderToolCard)}
                    </div>
                  </div>
                )}

                {recentToolItems.length > 0 && (
                  <div className="tools-subsection">
                    <div className="tools-subsection-header tools-subsection-header-row">
                      <span>🕓 Recent Tools</span>
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
                          <span className="recent-tool-icon">{tool.icon}</span>
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
                
                {/* Quick Action: View All Tools */}
                <button
                  onClick={() => navigate('/tools')}
                  style={{
                    width: '100%',
                    padding: '8px',
                    marginTop: '8px',
                    borderRadius: '6px',
                    border: '1px dashed var(--panel-border, #e0e0e0)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #666)',
                    fontSize: '11px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--primary-color, #4F46E5)';
                    e.currentTarget.style.color = 'var(--primary-color, #4F46E5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--panel-border, #e0e0e0)';
                    e.currentTarget.style.color = 'var(--text-secondary, #666)';
                  }}
                >
                  <span>⚡</span>
                  <span>View All Tools</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Conversations */}
        {!isCollapsed && recentConversations.length > 0 && (
          <div className="sidebar-section">
            <div className="section-header">
              <span className="section-icon">💭</span>
              <span className="section-title">Recent</span>
            </div>
            <div className="conversations-list">
              {recentConversations.map(conv => (
                <button
                  key={conv.id}
                  className={`conversation-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <span className="conversation-title">
                    {conv.title.length > 25 ? conv.title.substring(0, 25) + '...' : conv.title}
                  </span>
                  <span className="conversation-time">
                    {new Date(conv.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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
          className="footer-action"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          <span className="action-icon">🔔</span>
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* HIPAA Badge */}
        {!isCollapsed && (
          <div className="hipaa-badge">
            <span className="hipaa-icon">🔒</span>
            <span className="hipaa-text">HIPAA Compliant</span>
          </div>
        )}

        {/* Sign Out */}
        <button 
          className="btn-signout"
          onClick={onSignOut}
          title="Sign Out"
        >
          <span className="signout-icon">🚪</span>
          {!isCollapsed && <span>Sign Out</span>}
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
};

export default Sidebar;
