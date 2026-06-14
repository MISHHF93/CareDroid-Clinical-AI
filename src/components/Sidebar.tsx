import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  IconActivity,
  IconAmbulance,
  IconArrowsExchange,
  IconBed,
  IconChartBar,
  IconClipboardPlus,
  IconDots,
  IconGauge,
  IconLayoutDashboard,
  IconListDetails,
  IconNotes,
  IconRefresh,
  IconReport,
  IconRobot,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  IconUsers,
  type Icon,
} from '@tabler/icons-react';
import { PatientFlag } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import {
  getVisibleNavigation,
  resolveFeatureGate,
  type NavigationItem,
} from '../config/unified-navigation.config';
import { EMERGENCY_ACTIONS } from '../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import FeatureGate from './FeatureGate';
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
  integrations: IconSettings,
  'chart-bar': IconChartBar,
  capacity: IconGauge,
  'emergency-analytics': IconChartBar,
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
};

function isActiveRoute(pathname: string, item: SidebarNavItem): boolean {
  const route = item.route || item.path;
  if (route === '/emergency' || item.path === '/emergency/whiteboard') {
    return (
      pathname === route ||
      pathname === item.path ||
      pathname === '/emergency' ||
      Boolean(item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)))
    );
  }
  if (item.path === '/emergency/whiteboard')
    return pathname === item.path || pathname === '/emergency';
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  if (pathname === route || pathname.startsWith(`${route}/`)) return true;
  return Boolean(
    item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)),
  );
}

export function Sidebar({ navigationItems }: SidebarProps) {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const emergencyRole = useEmergencyRolePermissions();
  const copilotOpen = useEmergencyStore((state) => state.copilotOpen);
  const toggleCopilot = useEmergencyStore((state) => state.toggleCopilot);
  const reassessmentDueCount = useEmergencyStore(
    (store) =>
      store.patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue))
        .length,
  );
  const visibleNav: readonly SidebarNavItem[] =
    navigationItems || getVisibleNavigation(emergencyRole.role);
  const mobilePrimaryIds = ['whiteboard', 'patients', 'intake'];
  const mobilePrimaryNav = mobilePrimaryIds
    .map((id) => visibleNav.find((item) => item.id === id))
    .filter((item): item is SidebarNavItem => Boolean(item));
  const moreNav = visibleNav.filter((item) => !mobilePrimaryIds.includes(item.id));
  const moreHasActiveItem = moreNav.some((item) => isActiveRoute(location.pathname, item));
  const canUseCopilot = emergencyRole.can(EMERGENCY_ACTIONS.useCopilot);

  const desktopNavLink = (item: SidebarNavItem) => {
    const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
    const active = isActiveRoute(location.pathname, item);
    const isWhiteboard = item.id === 'whiteboard';
    const navLink = (
      <Link
        key={item.id}
        to={item.route || item.path}
        className={[
          'sidebar-nav-item',
          active ? 'sidebar-nav-item--active' : '',
          item.id === 'settings' ? 'sidebar-nav-item--settings' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        title={item.label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
      >
        <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
        {isWhiteboard && reassessmentDueCount > 0 ? (
          <span
            className="sidebar-nav-item__badge"
            aria-label={`${reassessmentDueCount} reassessments due`}
          >
            {reassessmentDueCount}
          </span>
        ) : null}
        <span className="sidebar-nav-item__tooltip">{item.label}</span>
      </Link>
    );

    const featureGate = resolveFeatureGate(item.featureGate);
    return featureGate ? (
      <FeatureGate key={item.id} feature={featureGate}>
        {navLink}
      </FeatureGate>
    ) : (
      navLink
    );
  };

  const mobileNavLink = (item: SidebarNavItem) => {
    const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
    const active = isActiveRoute(location.pathname, item);
    const label = item.id === 'whiteboard' ? 'Whiteboard' : item.mobileLabel || item.label;
    const navLink = (
      <Link
        key={item.id}
        to={item.route || item.path}
        className={['sidebar-item', active ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        title={label}
        data-nav-id={item.id}
        data-icon-key={item.icon}
        onClick={() => setMoreOpen(false)}
      >
        <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
        <label>{label}</label>
      </Link>
    );

    const featureGate = resolveFeatureGate(item.featureGate);
    return featureGate ? (
      <FeatureGate key={item.id} feature={featureGate}>
        {navLink}
      </FeatureGate>
    ) : (
      navLink
    );
  };

  return (
    <aside
      className="sidebar"
      style={{
        width: 56,
        height: 'var(--app-viewport-height, 100dvh)',
        flexShrink: 0,
        background: '#0D1117',
        borderRight: '1px solid #1F2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        overflowX: 'hidden',
        overflowY: 'auto',
      }}
      aria-label="Emergency navigation"
    >
      <nav className="sidebar-desktop-nav" aria-label="Emergency desktop navigation">
        {visibleNav.map(desktopNavLink)}
      </nav>
      <nav className="sidebar-mobile-nav" aria-label="Emergency mobile navigation">
        {mobilePrimaryNav.map(mobileNavLink)}
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
                  </Link>
                );
                const featureGate = resolveFeatureGate(item.featureGate);
                return featureGate ? (
                  <FeatureGate key={item.id} feature={featureGate}>
                    {navLink}
                  </FeatureGate>
                ) : (
                  navLink
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
