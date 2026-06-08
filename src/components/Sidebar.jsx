import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWhiteLabel } from '../contexts/WhiteLabelContext';
import PermissionGate from './PermissionGate';
import {
  PRIMARY_SIDEBAR_NAV_ITEMS,
  primaryNavPathMatches,
} from '../config/navigation.config';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS, getNavIcon } from '../navigation/iconRegistry';
import './Sidebar.css';

/**
 * Compact CareDroid navigation shell.
 *
 * Feature routes remain registered in App.jsx. The sidebar exposes one obvious
 * path to each major user task. Other capabilities remain workspace, search,
 * and recommendation driven.
 */
const Sidebar = forwardRef(function Sidebar(
  {
    conversations = [],
    activeConversation,
    onSelectConversation,
    onNewConversation,
    onSignOut,
    healthStatus = 'online',
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
  const {
    account,
    organization,
  } = useUserIdentity();
  const { branding } = useWhiteLabel();
  const displayName = account?.displayName || user?.fullName || user?.name || 'User';
  const displayRole = account?.specialty || account?.role || user?.role || 'Clinician';
  const displayOrganization =
    branding.displayName || organization?.name || account?.organization || user?.institution || 'Personal workspace';
  const effectiveCollapsed = layoutCompact ? false : sidebarCollapsed;
  const recentConversations = conversations.slice(-2).reverse();

  const hiddenNavIds = useMemo(() => {
    const settings = organization?.settings || {};
    const nav = settings.navigation || settings.configuration?.navigation || {};
    return new Set(nav.hiddenNavIds || []);
  }, [organization?.settings]);

  const filterNav = useCallback(
    (items) => items.filter((item) => !hiddenNavIds.has(item.id)),
    [hiddenNavIds]
  );

  const primaryNavItems = useMemo(
    () => filterNav(PRIMARY_SIDEBAR_NAV_ITEMS),
    [filterNav]
  );

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
    const active = ref.current.querySelector('.nav-item.active');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [layoutCompact, mobileNavOpen, location.pathname, ref]);

  const handleNavClick = (path) => {
    navigate({ pathname: path, search: '' });
    onCloseMobileNav();
  };

  const handleNewChat = () => {
    onNewConversation?.();
    navigate('/assistant');
    onCloseMobileNav();
  };

  const renderNavButton = (item) => {
    const isActive = primaryNavPathMatches(item, location.pathname);
    const button = (
      <button
        key={item.id}
        type="button"
        className={`nav-item${isActive ? ' active' : ''}`}
        onClick={() => handleNavClick(item.path)}
        title={effectiveCollapsed ? item.label : ''}
        aria-current={isActive ? 'page' : undefined}
        aria-label={item.label}
      >
        <span className="nav-icon" aria-hidden>
          <NavIcon icon={getNavIcon(item.id)} />
        </span>
        {!effectiveCollapsed && <span className="nav-label">{item.label}</span>}
      </button>
    );

    return item.permission ? (
      <PermissionGate
        key={item.id}
        permission={item.permission}
        requireAll={item.requireAllPermissions}
      >
        {button}
      </PermissionGate>
    ) : (
      button
    );
  };

  return (
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
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon" aria-hidden>
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="sidebar-logo-img" />
            ) : (
              <NavIcon icon={CHROME_ICONS.hospital} size={28} />
            )}
          </div>
          {!effectiveCollapsed && (
            <div className="logo-text">
              <h1>{branding.displayName || 'CareDroid'}</h1>
            </div>
          )}
        </div>
        <button
          type="button"
          className={['sidebar-toggle', layoutCompact ? 'sidebar-toggle--mobile-close' : '']
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
          aria-label={
            layoutCompact
              ? 'Close menu'
              : effectiveCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
          }
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

      {!effectiveCollapsed && (
        <div className="sidebar-user">
          <button
            type="button"
            className="sidebar-user-main"
            onClick={() => handleNavClick('/profile')}
            aria-label="Open profile"
          >
            <div className="user-avatar">
              {account?.avatarUrl ? (
                <img src={account.avatarUrl} alt="" />
              ) : (
                displayName.charAt(0).toUpperCase()
              )}
            </div>
            <div className="user-info">
              <div className="user-name">{displayName}</div>
              <div className="user-role">{displayRole}</div>
              <div className="user-organization">{displayOrganization}</div>
            </div>
          </button>
          <div
            className={`health-indicator ${healthStatus}`}
            role="status"
            aria-label={`System status: ${healthStatus}`}
          >
            <div className="health-dot" aria-hidden />
          </div>
        </div>
      )}

      <div className="sidebar-content">
        <button
          type="button"
          className="btn-new-conversation"
          onClick={handleNewChat}
          aria-label="Start a new chat"
        >
          <span className="btn-icon" aria-hidden>
            <NavIcon icon={CHROME_ICONS.sparkles} size={18} />
          </span>
          {!effectiveCollapsed && <span>New Chat</span>}
        </button>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <div className="nav-section-title">{!effectiveCollapsed && 'Main'}</div>
          {primaryNavItems.map((item) => renderNavButton(item))}
        </nav>

        {!effectiveCollapsed && recentConversations.length > 0 && (
          <div className="sidebar-section sidebar-section--recent-chats">
            <div className="section-header">
              <span className="section-icon section-icon--svg" aria-hidden>
                <NavIcon icon={CHROME_ICONS.messageCircle} size={16} />
              </span>
              <span className="section-title">Recent Chats</span>
            </div>
            <div className="conversations-list">
              {recentConversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`conversation-item ${activeConversation === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    navigate('/assistant');
                    onCloseMobileNav();
                  }}
                >
                  <span className="conversation-title">
                    {conv.title.length > 25 ? `${conv.title.substring(0, 25)}...` : conv.title}
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

      <div className="sidebar-footer">
        {!effectiveCollapsed && (
          <div className="hipaa-badge">
            <span className="hipaa-icon" aria-hidden>
              <NavIcon icon={CHROME_ICONS.lock} size={14} />
            </span>
            <span className="hipaa-text">HIPAA</span>
          </div>
        )}

        <button
          type="button"
          className="btn-signout"
          aria-label="Sign out"
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
  );
});

export default Sidebar;
