import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  IconActivity,
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
  IconLayoutDashboard,
  IconListDetails,
  IconNotes,
  IconPlugConnected,
  IconRefresh,
  IconReport,
  IconRobot,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  IconUserCircle,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { PatientFlag, type Alert } from '../types/emergency';
import { CANONICAL_ROUTES } from '../config/routes.config';
import { useEmergencyStore } from '../store/emergencyStore';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
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

type SidebarProps = {
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
  // Additional for full nav
  fleet: IconAmbulance,
  surveillance: IconActivity,
  simulation: IconListDetails,
  laboratory: IconStethoscope,
  knowledge: IconChartBar,
  'ai-center': IconRobot,
  admin: IconSettings,
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

function alertMatchesNavigation(alert: Alert, item: SidebarNavItem): boolean {
  const id = item.id.toLowerCase();
  const text = `${alert.type || ''} ${alert.title} ${alert.message} ${alert.source || ''}`.toLowerCase();
  if (id === 'whiteboard') return true;
  if (id.includes('capacity')) return text.includes('capacity');
  if (id.includes('ems')) return text.includes('ems');
  if (id.includes('boarding')) return text.includes('boarding') || text.includes('boarder');
  if (id.includes('reassessment')) return text.includes('reassessment') || text.includes('reassess');
  if (id.includes('referral')) return text.includes('referral') || text.includes('transfer');
  if (id.includes('queue')) return text.includes('queue') || text.includes('wait');
  return false;
}

export function Sidebar({ navigationItems }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const emergencyRole = useEmergencyRolePermissions();
  const screenCapabilities = useScreenModeCapabilities();
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const setCopilotOpen = useEmergencyStore((state) => state.setCopilotOpen);
  const alerts = useEmergencyStore((state) => state.alerts);
  const patients = useEmergencyStore((state) => state.patients);
  const activeAlerts = useMemo(() => alerts.filter((alert) => !alert.dismissed), [alerts]);
  const reassessmentDueCount = useMemo(
    () =>
      patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
    [patients],
  );
  const { saasRole } = useEffectiveUserProfile();
  const visibleNav: readonly SidebarNavItem[] = useMemo(
    () => navigationItems || getVisibleNavigation(emergencyRole.role, { saasRole }),
    [emergencyRole.role, navigationItems, saasRole],
  );
  const desktopPrimaryNav = useMemo(
    () => visibleNav.filter((item) => item.isEmergencyCore !== false),
    [visibleNav],
  );
  const desktopUtilityNav = useMemo(() => {
    const utility = visibleNav.filter((item) => item.isEmergencyCore === false);
    const withAccount = utility.some((item) => item.id === 'account')
      ? utility
      : [
          ...utility,
          {
            id: 'account',
            label: 'Account',
            icon: 'account',
            path: CANONICAL_ROUTES.profile,
            route: CANONICAL_ROUTES.profile,
            isEmergencyCore: false,
          },
        ];
    if (
      isAdminSaasRole(saasRole) &&
      isRouteAllowedForProfile(resolveUserProfileFromSaasRole(saasRole), CANONICAL_ROUTES.adminOperations) &&
      !withAccount.some((item) => item.id === 'admin-console')
    ) {
      return [
        ...withAccount,
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
    return withAccount;
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
    return visibleNav.filter((item) => !mobilePrimaryIds.includes(item.id));
  }, [mobilePrimaryIds, visibleNav]);
  const moreHasActiveItem = useMemo(
    () => moreNav.some((item) => isActiveRoute(location.pathname, item, location.search)),
    [location.pathname, location.search, moreNav],
  );
  const copilotPresentation = emergencyRole.presentAction(EMERGENCY_ACTIONS.useCopilot);
  const canUseCopilot = copilotPresentation.visible && copilotPresentation.enabled;
  const navAlertCount = useCallback(
    (item: SidebarNavItem) => {
      const alertCount = activeAlerts.filter((alert) => alertMatchesNavigation(alert, item)).length;
      if (item.id === 'reassessment') return Math.max(alertCount, reassessmentDueCount);
      if (item.id === 'whiteboard') return Math.max(alertCount, reassessmentDueCount);
      return alertCount;
    },
    [activeAlerts, reassessmentDueCount],
  );

  const openDockedCopilot = useCallback(() => {
    setCopilotOpen(true);
    if (location.pathname === CANONICAL_ROUTES.emergencyCopilot) {
      navigate(`${CANONICAL_ROUTES.emergencyWhiteboard}${location.search}`);
    }
  }, [location.pathname, location.search, navigate, setCopilotOpen]);

  const desktopNavLink = (item: SidebarNavItem) => {
    const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
    const active =
      item.id === 'copilot'
        ? copilotOpen
        : isActiveRoute(location.pathname, item, location.search);
    const alertCount = navAlertCount(item);
    const destination =
      item.id === 'reception' ? CANONICAL_ROUTES.emergencyReception : item.route || item.path;

    if (item.id === 'copilot') {
      if (!canUseCopilot) return null;
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
          onClick={openDockedCopilot}
          aria-label={item.label}
          aria-pressed={copilotOpen}
          title={item.label}
          data-nav-id={item.id}
          data-icon-key={item.icon}
        >
          <IconComponent size={18} stroke={2} className="sidebar-nav-item__icon" />
          <span className="sidebar-nav-item__label">{item.label}</span>
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
        aria-current={active ? 'page' : undefined}
        title={item.label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
      >
        <IconComponent size={18} stroke={2} className="sidebar-nav-item__icon" />
        <span className="sidebar-nav-item__label">{item.label}</span>
        {alertCount > 0 ? (
          <span
            className="sidebar-nav-item__badge"
            aria-label={`${alertCount} active alert${alertCount === 1 ? '' : 's'}`}
          >
            {alertCount}
          </span>
        ) : null}
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
      if (!canUseCopilot) return null;
      return (
        <button
          key={item.id}
          type="button"
          className={['sidebar-item', active ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')}
          onClick={() => {
            setMoreOpen(false);
            openDockedCopilot();
          }}
          aria-label={label}
          aria-pressed={copilotOpen}
          title={label}
          data-nav-id={item.id}
          data-icon-key={item.icon}
        >
          <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
          <label>{label}</label>
        </button>
      );
    }

    const navLink = (
      <Link
        key={item.id}
        to={destination}
        className={['sidebar-item', active ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        title={label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
        onClick={() => setMoreOpen(false)}
      >
        <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
        {alertCount > 0 ? (
          <span
            className="sidebar-nav-item__badge"
            aria-label={`${alertCount} active alert${alertCount === 1 ? '' : 's'}`}
          >
            {alertCount}
          </span>
        ) : null}
        <label>{label}</label>
      </Link>
    );

    return navLink;
  };

  return (
    <aside className="sidebar" aria-label="Emergency navigation">
      <div className="sidebar__brand" aria-hidden="true">
        <div className="sidebar__brand-mark">C</div>
        <span className="sidebar__brand-name">CareDroid</span>
      </div>
      <nav className="sidebar-desktop-nav" aria-label="Emergency desktop navigation">
        {desktopPrimaryNav.map(desktopNavLink)}
        {desktopUtilityNav.length ? (
          <div className="sidebar-desktop-nav__utility" aria-label="Emergency utility navigation">
            {desktopUtilityNav.map(desktopNavLink)}
          </div>
        ) : null}
      </nav>
      <nav className="sidebar-mobile-nav" aria-label="Emergency mobile navigation">
        {mobilePrimaryNav.map(mobileNavLink)}
        {canUseCopilot && !screenCapabilities.isRegistrationScreen ? (
        <button
          type="button"
          className={['sidebar-item', copilotOpen ? 'sidebar-item--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={toggleCopilot}
          disabled={!canUseCopilot}
          aria-pressed={copilotOpen}
          aria-label={canUseCopilot ? 'Copilot' : 'Copilot unavailable'}
          title={canUseCopilot ? 'Copilot' : 'Copilot unavailable'}
        >
          <IconRobot size={20} stroke={2} className="sidebar-nav-item__icon" />
          <label>Copilot</label>
        </button>
        ) : null}
        {moreNav.length ? (
        <button
          type="button"
          className={['sidebar-item', moreOpen || moreHasActiveItem ? 'sidebar-item--active' : '']
            .filter(Boolean)
            .join(' ')}
          onClick={() => setMoreOpen((open) => !open)}
          aria-expanded={moreOpen}
          aria-controls="sidebar-more-sheet"
          aria-label="More"
        >
          <IconDots size={20} stroke={2} className="sidebar-nav-item__icon" />
          <label>More</label>
        </button>
        ) : null}
      </nav>
      {moreOpen ? (
        <div
          className="sidebar-more-backdrop"
          role="presentation"
          onClick={() => setMoreOpen(false)}
        >
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
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                    title={item.label}
                    data-nav-id={item.id}
                    data-icon-key={item.icon}
                    onClick={() => setMoreOpen(false)}
                  >
                    <IconComponent size={18} stroke={2} />
                    <span>{item.label}</span>
                    {alertCount > 0 ? (
                      <span
                        className="sidebar-nav-item__badge"
                        aria-label={`${alertCount} active alert${alertCount === 1 ? '' : 's'}`}
                      >
                        {alertCount}
                      </span>
                    ) : null}
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
