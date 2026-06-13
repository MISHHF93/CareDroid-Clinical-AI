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
import { EMERGENCY_SIDEBAR_NAV_ITEMS } from '../config/navigation.config';
import './Sidebar.css';

type SidebarNavItem = {
  id: string;
  label: string;
  iconKey: string;
  path: string;
  activePaths?: string[];
};

function isSidebarNavItem(item: SidebarNavItem | undefined): item is SidebarNavItem {
  return Boolean(item?.id && item.label && item.iconKey && item.path);
}

const NAV: SidebarNavItem[] = (EMERGENCY_SIDEBAR_NAV_ITEMS as readonly (SidebarNavItem | undefined)[])
  .filter(isSidebarNavItem)
  .map((item) => ({
    id: item.id,
    label: item.label,
    iconKey: item.iconKey,
    path: item.path,
    activePaths: item.activePaths,
  }));

const ICONS: Record<string, Icon> = {
  'layout-dashboard': IconLayoutDashboard,
  'emergency-whiteboard': IconLayoutDashboard,
  'emergency-patients': IconNotes,
  notes: IconNotes,
  ambulance: IconAmbulance,
  ems: IconAmbulance,
  send: IconSend,
  intake: IconSend,
  referrals: IconSend,
  'chart-bar': IconChartBar,
  capacity: IconChartBar,
  'emergency-analytics': IconChartBar,
  'department-pulse': IconChartBar,
  'list-check': IconListCheck,
  queues: IconListCheck,
  reassessment: IconListCheck,
  boarding: IconListCheck,
  'ed-copilot': IconStethoscope,
  'shield-check': IconShieldCheck,
  shield: IconShieldCheck,
  stethoscope: IconStethoscope,
  'clinical-tools': IconStethoscope,
  report: IconReport,
  'shift-summary': IconReport,
  settings: IconSettings,
  'emergency-settings': IconSettings,
};

function isActiveRoute(pathname: string, item: SidebarNavItem): boolean {
  if (item.path === '/emergency/whiteboard') return pathname === item.path || pathname === '/emergency';
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  return Boolean(item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)));
}

export function Sidebar() {
  const location = useLocation();
  const reassessmentDueCount = useEmergencyStore(
    (store) => store.patients.filter((patient) => patient.flags.includes(PatientFlag.ReassessmentDue)).length,
  );

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
      {NAV.map((item) => {
        const IconComponent = ICONS[item.iconKey] || IconLayoutDashboard;
        const active = isActiveRoute(location.pathname, item);
        const isWhiteboard = item.id === 'emergency_whiteboard';

        return (
          <Link
            key={item.id}
            to={item.path}
            className={[
              'sidebar-nav-item',
              active ? 'sidebar-nav-item--active' : '',
              item.id === 'emergency_settings' ? 'sidebar-nav-item--settings' : '',
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
