import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import appConfig from '../config/appConfig';
import {
  IconActivity,
  IconAlertTriangle,
  IconAmbulance,
  IconApps,
  IconArrowsExchange,
  IconBed,
  IconBell,
  IconChartBar,
  IconClipboardPlus,
  IconClock,
  IconDots,
  IconGauge,
  IconHelpCircle,
  IconLayoutDashboard,
  IconListDetails,
  IconMap,
  IconMessages,
  IconNotes,
  IconPlugConnected,
  IconRefresh,
  IconReport,
  IconRobot,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  IconTrendingUp,
  IconUserCircle,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { PatientFlag } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { useEmergencyStore } from '../store/emergencyStore';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { resolveCopilotChromeLabels } from '../config/profileDesignLanguage.config';
import {
  getVisibleNavigation,
  type NavigationItem,
} from '../config/unified-navigation.config';
import { EMERGENCY_ACTIONS, EMERGENCY_ROLE_IDS } from '../config/emergencyRolePermissions';
import { isReceptionPipelinePath } from '../config/emergencyPipelineModel';
import { isReceptionFirstUxEnabled } from '../config/receptionFirstUx.config';
import { isAdminSaasRole } from '../config/platformEntryModel';
import { isRouteAllowedForProfile, resolveUserProfileFromSaasRole } from '../config/userProfileCatalog';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import useScreenModeCapabilities from '../hooks/useScreenModeCapabilities';
import { groupSidebarNavItems } from '../config/sidebarNavigationGroups';
import { GraphicIconBadge } from './graphics/CdlGraphicKit';
import { useNotificationShellOptional } from '../contexts/NotificationShellContext';
import SidebarChromeControls from './sidebar/SidebarChromeControls';
import './Sidebar.css';

type SidebarNavItem = {
  id: string;
  label: string;
  icon: string;
  route?: string;
  path: string;
  featureGate?: string | null;
  activePaths?: readonly string[];
  mobileLabel?: string;
  isEmergencyCore?: boolean;
};

export type SidebarProps = {
  navigationItems?: readonly NavigationItem[];
};

const ICONS: Record<string, Icon> = {
  'layout-dashboard': IconLayoutDashboard,
  'emergency-whiteboard': IconLayoutDashboard,
  'emergency-patients': IconUsers,
  journey: IconListDetails,
  notes: IconNotes,
  ambulance: IconAmbulance,
  ems: IconAmbulance,
  send: IconSend,
  intake: IconClipboardPlus,
  referrals: IconArrowsExchange,
  'provincial-health': IconShieldCheck,
  integrations: IconPlugConnected,
  'chart-bar': IconChartBar,
  capacity: IconGauge,
  'emergency-analytics': IconChartBar,
  alerts: IconBell,
  messages: IconMessages,
  'department-pulse': IconActivity,
  'surge-management': IconGauge,
  'list-check': IconListDetails,
  queues: IconListDetails,
  reassessment: IconRefresh,
  boarding: IconBed,
  'ed-copilot': IconRobot,
  'shield-check': IconShieldCheck,
  shield: IconShieldCheck,
  'safety-dashboard': IconShieldCheck,
  stethoscope: IconStethoscope,
  'virtual-care': IconStethoscope,
  'clinical-tools': IconStethoscope,
  report: IconReport,
  'shift-summary': IconReport,
  'wearable-monitor': IconReport,
  settings: IconSettings,
  'emergency-settings': IconSettings,
  account: IconUserCircle,
  users: IconUsers,
  platform: IconApps,
  activity: IconActivity,
  clock: IconClock,
  'help-circle': IconHelpCircle,
  // Additional for full nav
  fleet: IconAmbulance,
  surveillance: IconActivity,
  simulation: IconListDetails,
  laboratory: IconStethoscope,
  knowledge: IconChartBar,
  'ai-center': IconRobot,
  admin: IconSettings,
  map: IconMap,
  'triage-priority': IconAlertTriangle,
  'predictive-trend': IconTrendingUp,
};

function matchesNavigationPath(pathname: string, path: string): boolean {
  return pathname === path || (path !== '/emergency' && pathname.startsWith(`${path}/`));
}

function isActiveRoute(pathname: string, item: SidebarNavItem, search = ''): boolean {
  const route = item.route || item.path;
  if (item.id === 'reception') {
    return (
      pathname === CANONICAL_ROUTES.emergencyReception &&
      (isReceptionPipelinePath(pathname, search) || !search)
    );
  }
  if (route === '/emergency' || item.path === '/emergency/whiteboard') {
    return (
      pathname === route ||
      pathname === item.path ||
      pathname === '/emergency' ||
      Boolean(item.activePaths?.some((path) => matchesNavigationPath(pathname, path)))
    );
  }
  if (item.path === '/emergency/whiteboard')
    return pathname === item.path || pathname === '/emergency';
  if (matchesNavigationPath(pathname, item.path)) return true;
  if (matchesNavigationPath(pathname, route)) return true;
  return Boolean(
    item.activePaths?.some((path) => matchesNavigationPath(pathname, path)),
  );
}

export function Sidebar({ navigationItems }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const emergencyRole = useEmergencyRolePermissions();
  const screenCapabilities = useScreenModeCapabilities();
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const patients = useEmergencyStore((state) => state.patients);
  const reassessmentDueCount = useMemo(
    () =>
      patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
    [patients],
  );
  const { saasRole, profileCopy } = useEffectiveUserProfile();
  const copilotChrome = useMemo(() => resolveCopilotChromeLabels(profileCopy), [profileCopy]);
  const visibleNav: readonly SidebarNavItem[] = useMemo(
    () => navigationItems || getVisibleNavigation(emergencyRole.role, { saasRole }),
    [emergencyRole.role, navigationItems, saasRole],
  );
  const desktopPrimaryNav = useMemo(
    () => visibleNav.filter((item) => item.isEmergencyCore !== false),
    [visibleNav],
  );
  const groupedDesktopPrimaryNav = useMemo(
    () => groupSidebarNavItems(desktopPrimaryNav),
    [desktopPrimaryNav],
  );
  const desktopUtilityNav = useMemo(() => {
    // Account lives in the header UserAccountMenu (Profile overview), not the
    // sidebar — drop any nav-config "account" item so it is not duplicated.
    const utility = visibleNav.filter(
      (item) => item.isEmergencyCore === false && item.id !== 'account',
    );
    if (
      isAdminSaasRole(saasRole) &&
      isRouteAllowedForProfile(resolveUserProfileFromSaasRole(saasRole), CANONICAL_ROUTES.adminOperations) &&
      !utility.some((item) => item.id === 'admin-console')
    ) {
      return [
        ...utility,
        {
          id: 'admin-console',
          label: 'Admin',
          icon: 'settings',
          path: CANONICAL_ROUTES.adminOperations,
          route: CANONICAL_ROUTES.adminOperations,
          isEmergencyCore: false,
        },
      ];
    }
    return utility;
  }, [saasRole, visibleNav]);
  const mobilePrimaryIds = useMemo(() => {
    if (isReceptionFirstUxEnabled()) {
      return visibleNav
        .filter((item) => item.isEmergencyCore !== false)
        .slice(0, 3)
        .map((item) => item.id);
    }
    if (emergencyRole.role === EMERGENCY_ROLE_IDS.registrationClerk) {
      return ['reception', 'patients'];
    }
    return ['reception', 'whiteboard', 'patients'];
  }, [emergencyRole.role, visibleNav]);
  const mobilePrimaryNav = useMemo(() => {
    return mobilePrimaryIds
      .map((id) => visibleNav.find((item) => item.id === id))
      .filter((item): item is SidebarNavItem => Boolean(item));
  }, [mobilePrimaryIds, visibleNav]);
  const moreNav = useMemo(() => {
    // Account chrome lives in the header UserAccountMenu, not mobile "More".
    return visibleNav.filter(
      (item) => !mobilePrimaryIds.includes(item.id) && item.id !== 'account',
    );
  }, [mobilePrimaryIds, visibleNav]);
  const moreHasActiveItem = useMemo(
    () => moreNav.some((item) => isActiveRoute(location.pathname, item, location.search)),
    [location.pathname, location.search, moreNav],
  );
  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canUseCopilot = copilotPresentation.visible && copilotPresentation.enabled;
  const notificationShell = useNotificationShellOptional();
  const globalUnreadCount = notificationShell?.unreadAlertCount ?? 0;

  const navAlertCount = useCallback(
    (item: SidebarNavItem) => {
      if (item.id === 'alerts') return globalUnreadCount;
      if (item.id === 'reassessment') return reassessmentDueCount;
      return 0;
    },
    [globalUnreadCount, reassessmentDueCount],
  );

  const renderNavCountBadge = (
    count: number,
    kind: 'alert' | 'due',
    ariaLabel: string,
  ) => {
    if (count <= 0) return null;
    return (
      <span
        className={[
          'sidebar-nav-item__count',
          kind === 'alert' ? 'sidebar-nav-item__count--alert' : 'sidebar-nav-item__count--due',
        ].join(' ')}
        aria-label={ariaLabel}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  };

  // HEAL-211: this nav item renders with aria-pressed={copilotOpen} and
  // active-state styling -- both signal a real toggle button per WAI-ARIA
  // authoring practices, and clicking it while open visually looks like it
  // should close the panel. It didn't: this unconditionally called
  // setCopilotOpen(true), so a second click while already open was a
  // silent no-op, and the panel (plus the shrunk main-content width behind
  // it) had no way to close from this entry point -- confirmed live via a
  // 2-click reproduction. toggleCopilot (already destructured above, the
  // same store action the mobile-fallback nav button already correctly
  // uses) also maintains the 'ed:copilot-dismissed' sessionStorage flag
  // AppShell.tsx's auto-open effect depends on, which a bare
  // setCopilotOpen(false) would have skipped.
  const toggleDockedCopilot = useCallback(() => {
    if (location.pathname === CANONICAL_ROUTES.emergencyCopilot) {
      setCopilotOpen(true);
      navigate(`${CANONICAL_ROUTES.emergencyWhiteboard}${location.search}`);
      return;
    }
    toggleCopilot();
  }, [location.pathname, location.search, navigate, setCopilotOpen, toggleCopilot]);

  const desktopNavLink = (item: SidebarNavItem) => {
    const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
    const active =
      item.id === 'copilot'
        ? copilotOpen
        : isActiveRoute(location.pathname, item, location.search);
    const alertCount = navAlertCount(item);
    const destination =
      item.id === 'reception' ? CANONICAL_ROUTES.emergencyReception : item.route || item.path;

    // Sole conversational AI entry — opens docked CareDroid Copilot (not a second chrome strip).
    if (item.id === 'copilot') {
      if (!canUseCopilot && !navigationItems) return null;
      return (
        <button
          key={item.id}
          type="button"
          className={[
            'sidebar-nav-item',
            active ? 'sidebar-nav-item--active' : '',
            item.isEmergencyCore === false ? 'sidebar-nav-item--utility' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={toggleDockedCopilot}
          aria-label={copilotChrome.shortName}
          {...((copilotOpen) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
          title={canUseCopilot ? copilotChrome.openTitle : copilotChrome.unavailableTitle}
          data-nav-id={item.id}
          data-icon-key={item.icon}
          data-ai-node="caredroid-copilot"
        >
          <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="sm" className="sidebar-nav-item__graphic-badge" />
          <span className="sidebar-nav-item__label">{copilotChrome.shortName}</span>
          <span className="sidebar-nav-item__tooltip">{copilotChrome.shortName}</span>
        </button>
      );
    }

    if (item.id === 'alerts' && notificationShell) {
      return (
        <button
          key={item.id}
          type="button"
          className={[
            'sidebar-nav-item',
            'sidebar-nav-item--alerts',
            notificationShell.panelOpen ? 'sidebar-nav-item--active' : '',
            notificationShell.pulseActive ? 'sidebar-nav-item--pulse' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={notificationShell.togglePanel}
          aria-label={`${item.label}${globalUnreadCount ? `: ${globalUnreadCount} unread` : ''}`}
          aria-haspopup="dialog"
          {...((notificationShell.panelOpen) ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
          title={item.label}
          data-nav-id={item.id}
          data-icon-key={item.icon}
        >
          <IconComponent size={16} stroke={2} className="sidebar-nav-item__icon" />
          <span className="sidebar-nav-item__label">{item.label}</span>
          {renderNavCountBadge(
            globalUnreadCount,
            'alert',
            `${globalUnreadCount} unread alert${globalUnreadCount === 1 ? '' : 's'}`,
          )}
          <span className="sidebar-nav-item__tooltip">{item.label}</span>
        </button>
      );
    }

    const navLink = (
      <Link
        key={item.id}
        to={destination}
        className={[
          'sidebar-nav-item',
          active ? 'sidebar-nav-item--active' : '',
          item.id === 'settings' ? 'sidebar-nav-item--settings' : '',
          item.isEmergencyCore === false ? 'sidebar-nav-item--utility' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={item.label}
        {...(active ? { 'aria-current': 'page' as const } : {})}
        title={item.label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
      >
        <IconComponent size={16} stroke={2} className="sidebar-nav-item__icon" />
        <span className="sidebar-nav-item__label">{item.label}</span>
        {renderNavCountBadge(
          alertCount,
          item.id === 'reassessment' ? 'due' : 'alert',
          `${alertCount} active alert${alertCount === 1 ? '' : 's'}`,
        )}
        <span className="sidebar-nav-item__tooltip">{item.label}</span>
      </Link>
    );

    return navLink;
  };

  const mobileNavLink = (item: SidebarNavItem) => {
    const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
    const active =
      item.id === 'copilot'
        ? copilotOpen
        : isActiveRoute(location.pathname, item, location.search);
    const label = item.id === 'whiteboard' ? 'Whiteboard' : item.mobileLabel || item.label;
    const alertCount = navAlertCount(item);
    const destination =
      item.id === 'reception' ? CANONICAL_ROUTES.emergencyReception : item.route || item.path;

    if (item.id === 'copilot') {
      if (!canUseCopilot && !navigationItems) return null;
      return (
        <button
          key={item.id}
          type="button"
          className={['sidebar-item', active ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')}
          onClick={() => {
            setMoreOpen(false);
            toggleDockedCopilot();
          }}
          aria-label={copilotChrome.shortName}
          {...((copilotOpen) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
          title={canUseCopilot ? copilotChrome.openTitle : copilotChrome.unavailableTitle}
          data-nav-id={item.id}
          data-icon-key={item.icon}
          data-ai-node="caredroid-copilot"
        >
          <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="sm" className="sidebar-item__graphic-badge" />
          <span className="sidebar-nav-item__label">{copilotChrome.shortName}</span>
        </button>
      );
    }

    if (item.id === 'alerts' && notificationShell) {
      return (
        <button
          key={item.id}
          type="button"
          className={[
            'sidebar-item',
            notificationShell.panelOpen ? 'sidebar-item--active' : '',
            notificationShell.pulseActive ? 'sidebar-item--pulse' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => {
            setMoreOpen(false);
            notificationShell.togglePanel();
          }}
          aria-label={`${label}${globalUnreadCount ? `: ${globalUnreadCount} unread` : ''}`}
          {...((notificationShell.panelOpen) ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
          data-nav-id={item.id}
          data-icon-key={item.icon}
        >
          <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
          {renderNavCountBadge(
            globalUnreadCount,
            'alert',
            `${globalUnreadCount} unread alert${globalUnreadCount === 1 ? '' : 's'}`,
          )}
          <span className="sidebar-nav-item__label">{label}</span>
        </button>
      );
    }

    const navLink = (
      <Link
        key={item.id}
        to={destination}
        className={['sidebar-item', active ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')}
        aria-label={label}
        {...(active ? { 'aria-current': 'page' as const } : {})}
        title={label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
        onClick={() => setMoreOpen(false)}
      >
        <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
        {renderNavCountBadge(
          alertCount,
          item.id === 'reassessment' ? 'due' : 'alert',
          `${alertCount} active alert${alertCount === 1 ? '' : 's'}`,
        )}
        <span className="sidebar-nav-item__label">{label}</span>
      </Link>
    );

    return navLink;
  };

  // sidebar__body scrolls independently of the fixed sidebar__footer below it
  // (utility shortcuts + session controls) -- correct, deliberate layout. But
  // nothing ever scrolled the active item into view on navigation, so landing
  // directly on a route whose nav entry falls near the bottom edge of the
  // body's own scroll window (e.g. Queues, right where the scrollable list
  // meets the footer) rendered as a highlighted bar with its icon and label
  // clipped off -- confirmed live via screenshot, not a CSS overlap bug, just
  // a missing "reveal the current page" behavior every other item already
  // gets for free by being fully within the initial scroll position.
  useEffect(() => {
    const active = sidebarBodyRef.current?.querySelector('.sidebar-nav-item--active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [location.pathname]);

  return (
    <aside className="sidebar sidebar--clinical" aria-label="Emergency navigation">
      <header className="sidebar__brand">
        <div className="sidebar__brand-mark" aria-hidden="true">
          C
        </div>
        <div className="sidebar__brand-copy">
          <span className="sidebar__brand-name">CareDroid</span>
          <span className="sidebar__brand-tag">Clinical OS</span>
        </div>
      </header>
      <nav className="sidebar-desktop-nav" aria-label="Emergency desktop navigation">
        <div className="sidebar__body" ref={sidebarBodyRef}>
          {groupedDesktopPrimaryNav.map(({ group, items }) => (
            <div key={group} className="sidebar-nav-group" role="group" aria-label={group}>
              <span className="sidebar-nav-group__label">{group}</span>
              <div className="sidebar-nav-group__items">{items.map(desktopNavLink)}</div>
            </div>
          ))}
        </div>
        <footer className="sidebar__footer">
          {desktopUtilityNav.length ? (
            <div className="sidebar-desktop-nav__utility" aria-label="Emergency utility navigation">
              {desktopUtilityNav.map(desktopNavLink)}
            </div>
          ) : null}
          <SidebarChromeControls />
        </footer>
      </nav>
      <nav className="sidebar-mobile-nav" aria-label="Emergency mobile navigation">
        {mobilePrimaryNav.map(mobileNavLink)}
        {/* Only inject a mobile copilot control when nav list has no copilot item (avoid double entry). */}
        {canUseCopilot &&
        !screenCapabilities.isRegistrationScreen &&
        !mobilePrimaryIds.includes('copilot') &&
        !visibleNav.some((item) => item.id === 'copilot') ? (
        <button
          type="button"
          className={['sidebar-item', copilotOpen ? 'sidebar-item--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={toggleCopilot}
          disabled={!canUseCopilot}
          {...((copilotOpen) ? { 'aria-pressed': 'true' as const } : { 'aria-pressed': 'false' as const })}
          aria-label={copilotChrome.shortName}
          title={canUseCopilot ? copilotChrome.openTitle : copilotChrome.unavailableTitle}
          data-nav-id="copilot"
          data-ai-node="caredroid-copilot"
        >
          <GraphicIconBadge iconKey="ed-copilot" accent="brand" size="sm" className="sidebar-item__graphic-badge" />
          <span className="sidebar-nav-item__label">{copilotChrome.shortName}</span>
        </button>
        ) : null}
        {moreNav.length ? (
        <button
          type="button"
          className={['sidebar-item', moreOpen || moreHasActiveItem ? 'sidebar-item--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setMoreOpen((open) => !open)}
          {...((moreOpen) ? { 'aria-expanded': 'true' as const } : { 'aria-expanded': 'false' as const })}
          aria-controls="sidebar-more-sheet"
          aria-label="More"
        >
          <IconDots size={20} stroke={2} className="sidebar-nav-item__icon" />
          <span className="sidebar-nav-item__label">More</span>
        </button>
        ) : null}
      </nav>
      {moreOpen ? (
        <div
          className="sidebar-more-backdrop"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions -- onClick only stops propagation to the backdrop's close handler, it is not an interactive control itself */}
          <section
            id="sidebar-more-sheet"
            className="sidebar-more-sheet"
            aria-label="More navigation"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <strong>More</strong>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                aria-label="Close more navigation"
              >
                Close
              </button>
            </header>
            <div className="sidebar-more-sheet__items">
              {moreNav.map((item) => {
                const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
                const active = isActiveRoute(location.pathname, item);
                const alertCount = navAlertCount(item);
                const navLink = (
                  <Link
                    key={item.id}
                    to={item.route || item.path}
                    className={['sidebar-more-item', active ? 'sidebar-more-item--active' : '']
                      .filter(Boolean)
                      .join(' ')}
                    {...(active ? { 'aria-current': 'page' as const } : {})}
                    aria-label={item.label}
                    title={item.label}
                    data-nav-id={item.id}
                    data-icon-key={item.icon}
                    onClick={() => setMoreOpen(false)}
                  >
                    <IconComponent size={18} stroke={2} />
                    <span>{item.label}</span>
                    {renderNavCountBadge(
                      alertCount,
                      item.id === 'reassessment' ? 'due' : 'alert',
                      `${alertCount} active alert${alertCount === 1 ? '' : 's'}`,
                    )}
                  </Link>
                );
                return navLink;
              })}
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
