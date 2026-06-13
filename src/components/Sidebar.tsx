import { Link, useLocation } from 'react-router-dom';
import {
  IconAmbulance,
  IconChartBar,
  IconLayoutDashboard,
  IconListCheck,
  IconNotes,
  IconReport,
  IconSend,
  IconSettings,
  IconShieldCheck,
  IconStethoscope,
  type Icon,
} from '@tabler/icons-react';
import { PatientFlag } from '../types/emergency';
import { useEmergencyStore } from '../store/emergencyStore';
import { getVisibleNavigation, type NavigationItem } from '../config/unified-navigation.config';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import './Sidebar.css';

type SidebarNavItem = {
  id: string;
  label: string;
  icon: string;
  path: string;
  activePaths?: readonly string[];
};

type SidebarProps = {
  navigationItems?: readonly NavigationItem[];
};

const ICONS: Record<string, Icon> = {
  'layout-dashboard': IconLayoutDashboard,
  'emergency-whiteboard': IconLayoutDashboard,
  'emergency-patients': IconNotes,
  journey: IconListCheck,
  notes: IconNotes,
  ambulance: IconAmbulance,
  ems: IconAmbulance,
  send: IconSend,
  intake: IconSend,
  referrals: IconSend,
  'provincial-health': IconShieldCheck,
  integrations: IconSettings,
  'chart-bar': IconChartBar,
  capacity: IconChartBar,
  'emergency-analytics': IconChartBar,
  'department-pulse': IconChartBar,
  'surge-management': IconChartBar,
  'list-check': IconListCheck,
  queues: IconListCheck,
  reassessment: IconListCheck,
  boarding: IconListCheck,
  'ed-copilot': IconStethoscope,
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
  if (item.path === '/emergency/whiteboard') return pathname === item.path || pathname === '/emergency';
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  return Boolean(item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)));
}

export function Sidebar({ navigationItems }: SidebarProps) {
  const location = useLocation();
  const emergencyRole = useEmergencyRolePermissions();
  const reassessmentDueCount = useEmergencyStore(
    (store) => store.patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
  );
  const visibleNav: readonly SidebarNavItem[] = navigationItems || getVisibleNavigation(emergencyRole.role);

  return (
    <aside
      style={{
        width: 56,
        height: '100vh',
        flexShrink: 0,
        background: '#0D1117',
        borderRight: '1px solid #1F2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        overflowY: 'auto',
      }}
      aria-label="Emergency navigation"
    >
      {visibleNav.map((item) => {
        const IconComponent = ICONS[item.icon] || IconLayoutDashboard;
        const active = isActiveRoute(location.pathname, item);
        const isWhiteboard = item.id === 'emergency_whiteboard';

        return (
          <Link
            key={item.id}
            to={item.path}
            className={[
              'sidebar-nav-item',
              active ? 'sidebar-nav-item--active' : '',
              item.id === 'settings' ? 'sidebar-nav-item--settings' : '',
            ].filter(Boolean).join(' ')}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <IconComponent size={20} stroke={2} className="sidebar-nav-item__icon" />
            {isWhiteboard && reassessmentDueCount > 0 ? (
              <span className="sidebar-nav-item__badge" aria-label={`${reassessmentDueCount} reassessments due`}>
                {reassessmentDueCount}
              </span>
            ) : null}
            <span className="sidebar-nav-item__tooltip">{item.label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
