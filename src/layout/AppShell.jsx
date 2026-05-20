import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from '../components/Sidebar';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import { useDrawerFocus } from '../hooks/useDrawerFocus';
import {
  COMPACT_MEDIA_QUERY,
  getIsCompactViewport,
  SIDEBAR_WIDTH_COLLAPSED_PX,
  SIDEBAR_WIDTH_EXPANDED_PX,
} from './breakpoints';
import './AppShell.css';

const AppShell = ({
  isAuthed = false,
  conversations,
  activeConversation,
  onSelectConversation,
  onNewConversation,
  onSignOut,
  authToken,
  healthStatus,
  currentTool = null,
  currentFeature = null,
  onToolSelect = null,
  onOpenToolsOverview = null,
  onOpenToolsCatalog = null,
  onFeatureSelect = null,
  children,
}) => {
  const { preference, resolvedTheme, setPreference } = useTheme();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState(getIsCompactViewport);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  useEffect(() => {
    closeMobileNav();
  }, [location.pathname, location.search, closeMobileNav]);

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
        currentTool={currentTool}
        onToolSelect={onToolSelect}
        onOpenToolsOverview={onOpenToolsOverview}
        onOpenToolsCatalog={onOpenToolsCatalog}
        layoutCompact={isCompact}
        mobileNavOpen={mobileNavOpen}
        onCloseMobileNav={closeMobileNav}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarCollapsedChange={setSidebarCollapsed}
      />

      <div className="app-shell-main-wrap">
        {isAuthed && isCompact && (
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
        {isAuthed && (
          <button
            type="button"
            className="app-shell-theme-fab"
            onClick={cycleTheme}
            title="Cycle theme (system / light / dark)"
            aria-label={`Theme: ${preference}, active ${resolvedTheme}. Click to cycle.`}
          >
            <span aria-hidden>
              <NavIcon
                icon={
                  preference === 'system'
                    ? CHROME_ICONS.contrast
                    : resolvedTheme === 'dark'
                      ? CHROME_ICONS.moon
                      : CHROME_ICONS.sun
                }
                size={22}
              />
            </span>
            <span className="app-shell-theme-fab-label">{preference}</span>
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default AppShell;
