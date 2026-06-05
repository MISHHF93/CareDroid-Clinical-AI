import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import WorkspaceSwitcher from '../components/WorkspaceSwitcher';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { useDrawerFocus } from '../hooks/useDrawerFocus';
import QuickCommandLauncher from '../components/QuickCommandLauncher';
import {
  COMPACT_MEDIA_QUERY,
  getIsCompactViewport,
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
} from '../config/layout.config';
import './AppShell.css';

const AppShell = ({
  isAuthed = false,
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onSignOut,
  healthStatus,
  isDevAuthBypass = false,
  devAuthBannerLabel = 'Demo Mode',
  children,
}) => {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState(getIsCompactViewport);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [quickCommandOpen, setQuickCommandOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const menuButtonRef = useRef(null);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_MEDIA_QUERY);
    const onChange = () => {
      setIsCompact(mq.matches);
      if (!mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const mainInsetPx = useMemo(() => {
    if (isCompact) return 0;
    return sidebarCollapsed ? SIDEBAR_WIDTH_COLLAPSED_PX : SIDEBAR_WIDTH_EXPANDED_PX;
  }, [isCompact, sidebarCollapsed]);

  const cycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    const i = order.indexOf(preference);
    setPreference(order[(i + 1) % order.length]);
  };

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const navigateToUtility = useCallback(
    (path) => navigate({ pathname: path, search: '' }),
    [navigate]
  );
  const openQuickCommand = useCallback(() => {
    setQuickCommandOpen(true);
    setMobileNavOpen(false);
  }, []);
  const closeQuickCommand = useCallback(() => setQuickCommandOpen(false), []);
  const isConversationViewport = ['/chat', '/assistant'].includes(location.pathname);
  const mainContentClassName = [
    'app-shell-main-content',
    'app-shell-page-body',
    isConversationViewport
      ? 'app-shell-main-content--conversation app-shell-page-body--conversation'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  useEffect(() => {
    closeMobileNav();
    closeQuickCommand();
  }, [location.pathname, location.search, closeMobileNav, closeQuickCommand]);

  useEffect(() => {
    if (!isAuthed) return undefined;
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openQuickCommand();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthed, openQuickCommand]);

  useDrawerFocus({
    isOpen: isAuthed && isCompact && mobileNavOpen,
    containerRef: sidebarRef,
    restoreFocusRef: menuButtonRef,
  });

  useEffect(() => {
    if (!mobileNavOpen || !isCompact) return;
    const onKey = (e) => {
      if (e.key === 'Escape') closeMobileNav();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen, isCompact, closeMobileNav]);

  return (
    <div
      className={[
        'app-shell',
        isCompact ? 'app-shell--compact' : '',
        isAuthed ? 'app-shell--authed' : '',
        isCompact && mobileNavOpen ? 'app-shell--nav-open' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        ['--app-main-inset']: `${mainInsetPx}px`,
      }}
    >
      {isAuthed && (
        <a className="app-skip-link" href="#main-content">
          Skip to main content
        </a>
      )}

      {isAuthed && isCompact && mobileNavOpen && (
        <button
          type="button"
          className="app-shell-nav-backdrop"
          aria-label="Close navigation menu"
          onClick={closeMobileNav}
        />
      )}

      <Sidebar
        ref={sidebarRef}
        conversations={conversations}
        activeConversation={activeConversation}
        onSelectConversation={onSelectConversation}
        onNewConversation={onNewConversation}
        onSignOut={onSignOut}
        healthStatus={healthStatus}
        layoutCompact={isCompact}
        mobileNavOpen={mobileNavOpen}
        onCloseMobileNav={closeMobileNav}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarCollapsedChange={setSidebarCollapsed}
      />

      <div className="app-shell-main-wrap">
        {isAuthed && (
          <header className="app-shell-header" aria-label="Application header">
            {isCompact && (
              <button
                ref={menuButtonRef}
                type="button"
                className="app-shell-menu-btn"
                onClick={() => setMobileNavOpen((open) => !open)}
                aria-expanded={mobileNavOpen}
                aria-controls="app-sidebar-nav"
                aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              >
                <span className="app-shell-menu-icon" aria-hidden>
                  <NavIcon icon={CHROME_ICONS.menu} size={22} />
                </span>
              </button>
            )}
            {isCompact && (
              <button
                type="button"
                className="app-shell-command-btn"
                onClick={openQuickCommand}
                aria-expanded={quickCommandOpen}
                aria-haspopup="dialog"
                aria-label="Open Quick Command"
              >
                <span aria-hidden>
                  <NavIcon icon={CHROME_ICONS.search} size={22} />
                </span>
              </button>
            )}
            <div className="app-shell-workspace-bar" aria-label="Workspace switcher">
              <WorkspaceSwitcher compact={isCompact} />
              {!isCompact && (
                <div className="app-shell-header-utilities" aria-label="Header utilities">
                  <button
                    type="button"
                    className="app-shell-header-command"
                    onClick={openQuickCommand}
                    aria-expanded={quickCommandOpen}
                    aria-haspopup="dialog"
                    aria-label="Open Quick Command"
                  >
                    <span aria-hidden>
                      <NavIcon icon={CHROME_ICONS.search} size={17} />
                    </span>
                    <span>Search</span>
                    <kbd>Ctrl K</kbd>
                  </button>
                  <button
                    type="button"
                    className="app-shell-header-action"
                    onClick={() => navigateToUtility('/notifications')}
                    aria-label="Open notifications"
                    title="Notifications"
                  >
                    <NavIcon icon={CHROME_ICONS.bell} size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="app-shell-header-action"
                    onClick={() => navigateToUtility('/profile')}
                    aria-label="Open profile"
                    title="Profile"
                  >
                    <NavIcon icon={CHROME_ICONS.user} size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="app-shell-header-action"
                    onClick={() => navigateToUtility('/settings')}
                    aria-label="Open settings"
                    title="Settings"
                  >
                    <NavIcon icon={CHROME_ICONS.settings} size={18} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="app-shell-header-action"
                    onClick={() => onSignOut?.()}
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <NavIcon icon={CHROME_ICONS.logOut} size={18} aria-hidden />
                  </button>
                </div>
              )}
            </div>
          </header>
        )}
        {isAuthed && (
          <QuickCommandLauncher
            isOpen={quickCommandOpen}
            isCompact={isCompact}
            onClose={closeQuickCommand}
            themePreference={preference}
            resolvedTheme={resolvedTheme}
            onCycleTheme={cycleTheme}
          />
        )}
        <main
          className={mainContentClassName}
          data-layout-role="MainContent"
          id="main-content"
          tabIndex={-1}
        >
          {isAuthed && isDevAuthBypass && (
            <div className="app-shell-dev-mode-banner" role="status">
              <strong>{devAuthBannerLabel}</strong> is active. This session uses a local clinician
              profile and does not weaken production authentication.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
