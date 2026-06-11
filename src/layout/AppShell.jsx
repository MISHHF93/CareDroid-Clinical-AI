import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Bell,
  Bot,
  ChevronRight,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  Settings,
  Share2,
  Truck,
} from 'lucide-react';
import ChatInterface from '../components/ChatInterface';
import EMSPressureScore, {
  calculateEMSPressureScore,
  isEMSPressureElevated,
} from '../components/EMSPressureScore';
import ReassessmentDrawer from '../components/ReassessmentDrawer';
import { useConversation } from '../contexts/ConversationContext';
import { useUser } from '../contexts/UserContext';
import { hasPatientFlag, useEmergencyStore } from '../../store/emergencyStore';
import { PatientState } from '../../types/emergency';
import './AppShell.css';

const NAV_ITEMS = [
  {
    id: 'whiteboard',
    label: 'Whiteboard',
    path: '/workspace/emergency',
    icon: LayoutDashboard,
    activePaths: ['/workspace/emergency', '/workspace/emergency/whiteboard'],
  },
  {
    id: 'queue',
    label: 'Queue',
    path: '/workspace/emergency/queues',
    icon: ClipboardList,
    activePaths: ['/workspace/emergency/queues', '/workspace/emergency/waiting-room'],
  },
  {
    id: 'ems',
    label: 'EMS',
    path: '/workspace/emergency/ems',
    icon: Truck,
    activePaths: ['/workspace/emergency/ems', '/workspace/emergency/pre-arrival'],
  },
  {
    id: 'referrals',
    label: 'Referrals',
    path: '/workspace/emergency/referrals',
    icon: Share2,
    activePaths: ['/workspace/emergency/referrals'],
  },
  {
    id: 'capacity',
    label: 'Capacity',
    path: '/workspace/emergency/capacity',
    icon: Gauge,
    activePaths: ['/workspace/emergency/capacity', '/workspace/emergency/boarding'],
  },
  {
    id: 'copilot',
    label: 'Copilot',
    path: '/workspace/emergency/command-center',
    icon: Bot,
    activePaths: ['/workspace/emergency/command-center', '/assistant', '/chat'],
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: Settings,
    activePaths: ['/settings', '/profile/settings'],
  },
];

const ACTIVE_PATIENT_STATES = new Set(
  Object.values(PatientState).filter(
    (state) => state !== PatientState.Discharge && state !== PatientState.Deceased
  )
);

function isNavItemActive(item, pathname) {
  return item.activePaths.some((activePath) => {
    if (activePath === '/workspace/emergency') {
      return pathname === activePath;
    }

    return pathname === activePath || pathname.startsWith(`${activePath}/`);
  });
}

function formatShiftClock(date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

function CapacityBadge() {
  const capacityScore = useEmergencyStore((state) => state.capacity.score);
  return (
    <div className="ed-capacity-badge" role="status" aria-label="Capacity status">
      <span className="ed-capacity-badge__dot" aria-hidden />
      <span>Capacity</span>
      <strong>{capacityScore}</strong>
    </div>
  );
}

function StaffAvatar({ user }) {
  const initials = useMemo(() => {
    const name = user?.fullName || user?.name || user?.email || 'ED';
    return name
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }, [user]);

  return (
    <div
      className="ed-staff-avatar"
      aria-label={user?.fullName || user?.name || 'Current staff member'}
    >
      {initials || 'ED'}
    </div>
  );
}

const AppShell = ({
  isAuthed = false,
  activeConversation,
  onNewConversation,
  onSignOut,
  healthStatus = 'online',
  isDevAuthBypass = false,
  devAuthBannerLabel = 'Platform Access',
  children,
}) => {
  const location = useLocation();
  const { user, authToken } = useUser();
  const { messages, addMessage } = useConversation();
  const reassessmentCount = useEmergencyStore(
    (state) =>
      state.patients.filter(
        (patient) =>
          ACTIVE_PATIENT_STATES.has(patient.state) && hasPatientFlag(patient, 'ReassessmentDue')
      ).length
  );
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);
  const [clock, setClock] = useState(() => new Date());
  const [isCopilotCollapsed, setIsCopilotCollapsed] = useState(false);
  const [isReassessmentDrawerOpen, setIsReassessmentDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleAppendMessage = useCallback(
    (_conversationId, message) => {
      addMessage(message);
    },
    [addMessage]
  );

  const closeReassessmentDrawer = useCallback(() => {
    setIsReassessmentDrawerOpen(false);
  }, []);

  const activeNavId = useMemo(
    () => NAV_ITEMS.find((item) => isNavItemActive(item, location.pathname))?.id,
    [location.pathname]
  );
  const emsPressure = useMemo(
    () => calculateEMSPressureScore(emsArrivals, clock),
    [emsArrivals, clock]
  );
  const shouldFlashEMSNav = isEMSPressureElevated(emsPressure);

  return (
    <div
      className={[
        'ed-os-shell',
        isAuthed ? 'ed-os-shell--authed' : '',
        isCopilotCollapsed ? 'ed-os-shell--copilot-collapsed' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {isAuthed && (
        <a className="ed-skip-link" href="#main-content">
          Skip to main content
        </a>
      )}

      <aside className="ed-nav-rail" aria-label="Emergency OS navigation">
        <nav className="ed-nav-rail__items">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeNavId;

            return (
              <Link
                key={item.id}
                to={item.path}
                className={[
                  'ed-nav-rail__item',
                  isActive ? 'ed-nav-rail__item--active' : '',
                  item.id === 'ems' && shouldFlashEMSNav ? 'ed-nav-rail__item--flash' : '',
                  item.id === 'ems' && shouldFlashEMSNav
                    ? `ed-nav-rail__item--flash-${emsPressure.band.id}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={item.label}
              >
                <Icon size={21} strokeWidth={2.1} aria-hidden />
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="ed-os-shell__workspace">
        <header className="ed-os-header" aria-label="Emergency OS header">
          <div className="ed-os-header__left">
            <strong className="ed-os-wordmark">Emergency OS</strong>
            <time className="ed-shift-clock" dateTime={clock.toISOString()}>
              {formatShiftClock(clock)}
            </time>
          </div>

          <div className="ed-os-header__center">
            <CapacityBadge />
            <EMSPressureScore />
          </div>

          <div className="ed-os-header__right">
            <button
              type="button"
              className={[
                'ed-reassessment-badge',
                reassessmentCount > 0 ? 'ed-reassessment-badge--active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => setIsReassessmentDrawerOpen((open) => !open)}
              disabled={reassessmentCount === 0}
              aria-label={`${reassessmentCount} patients require reassessment`}
              aria-expanded={isReassessmentDrawerOpen}
            >
              <span className="ed-reassessment-badge__pulse" aria-hidden />
              <strong>{reassessmentCount}</strong>
            </button>
            <button type="button" className="ed-icon-button" aria-label="Open alerts">
              <Bell size={18} strokeWidth={2.1} aria-hidden />
              <span className="ed-icon-button__indicator" aria-hidden />
            </button>
            <StaffAvatar user={user} />
            <div className="ed-shift-status" aria-label={`Shift status ${healthStatus}`}>
              <span className="ed-shift-status__dot" aria-hidden />
              <span>Shift Active</span>
            </div>
            {onSignOut ? (
              <button type="button" className="ed-shift-signout" onClick={onSignOut}>
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        <ReassessmentDrawer
          open={isReassessmentDrawerOpen}
          count={reassessmentCount}
          onClose={closeReassessmentDrawer}
        />

        <div className="ed-os-shell__body">
          <main
            className="ed-os-main"
            data-layout-role="MainContent"
            id="main-content"
            tabIndex={-1}
          >
            {isAuthed && isDevAuthBypass && (
              <div className="ed-os-banner" role="status">
                <strong>{devAuthBannerLabel}</strong> active
              </div>
            )}
            {children}
          </main>

          <aside
            className="ed-copilot-panel"
            aria-label="ED Copilot chat"
            aria-expanded={!isCopilotCollapsed}
          >
            <button
              type="button"
              className="ed-copilot-panel__toggle"
              onClick={() => setIsCopilotCollapsed((collapsed) => !collapsed)}
              aria-label={isCopilotCollapsed ? 'Expand ED Copilot' : 'Collapse ED Copilot'}
              aria-expanded={!isCopilotCollapsed}
            >
              <ChevronRight size={18} strokeWidth={2.2} aria-hidden />
            </button>

            <div className="ed-copilot-panel__content" aria-hidden={isCopilotCollapsed}>
              <div className="ed-copilot-panel__header">
                <div>
                  <span>ED Copilot</span>
                  <strong>Operational Chat</strong>
                </div>
                <button type="button" onClick={onNewConversation} className="ed-copilot-panel__new">
                  New
                </button>
              </div>
              <ChatInterface
                conversationId={activeConversation}
                messages={messages}
                onAppendMessage={handleAppendMessage}
                authToken={authToken}
              />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AppShell;
