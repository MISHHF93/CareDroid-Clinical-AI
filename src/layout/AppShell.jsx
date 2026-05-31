import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
        onOpenQuickCommand={openQuickCommand}
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
        <main className={mainContentClassName} data-layout-role="MainContent" id="main-content">
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
