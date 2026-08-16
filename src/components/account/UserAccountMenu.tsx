import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { isAdminSaasRole } from '../../config/platformEntryModel';
import { DEMO_PERSONA } from '../../config/demoPersonaModel';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
import { resolveAccountMenuDestinations } from './accountChrome.config';
import ProfileRoleSwitcher from './ProfileRoleSwitcher';
import './UserAccountMenu.css';

function getInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'CD';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

type AppUser = {
  displayName?: string;
  fullName?: string;
  name?: string;
  avatarUrl?: string;
  role?: string;
  [key: string]: unknown;
};

type AppAccount = {
  displayName?: string;
  avatarUrl?: string;
  [key: string]: unknown;
};

type PanelPosition = {
  top: number;
  right: number;
  maxHeight: number;
};

/**
 * Canonical account/session chrome (header top-right).
 *
 * Destinations and placement rules come from accountChrome.config.
 * Panel is portaled to document.body so header overflow:hidden cannot clip it.
 */
export default function UserAccountMenu() {
  const { user } = useUser() as { user: AppUser | null };
  const { account } = useUserIdentity() as { account: AppAccount | null };
  const { accessSummary, profileCopy } = useEffectiveUserProfile();
  const { enabled: simulationEnabled, active: simulationActive, toggle: toggleSimulation } =
    useSimulationMode();
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const reactId = useId();
  const triggerId = `account-menu-trigger-${reactId}`;
  const panelId = `account-menu-panel-${reactId}`;

  const displayName = useMemo(
    () =>
      account?.displayName ||
      user?.fullName ||
      user?.name ||
      DEMO_PERSONA.displayName,
    [account?.displayName, user?.fullName, user?.name],
  );

  const avatarUrl = account?.avatarUrl || user?.avatarUrl || '';
  const roleLabel =
    profileCopy?.personaTitle ||
    accessSummary?.saasRole?.replace(/-/g, ' ') ||
    user?.role ||
    'Staff';
  // Clinical chrome: show role/workspace only — not “Demo mode” product labels.
  const accountMeta =
    profileCopy?.workspaceEyebrow ||
    (typeof user?.role === 'string' ? String(user.role).replace(/-/g, ' ') : '') ||
    roleLabel;
  const showAdminLink = isAdminSaasRole(accessSummary?.saasRole || user?.role);
  const destinations = useMemo(
    () => resolveAccountMenuDestinations({ showAdmin: showAdminLink }),
    [showAdminLink],
  );
  const showProfileSwitcher = useProfileSwitcherVisibility();
  const showSessionSection = showProfileSwitcher || simulationEnabled;
  const triggerLabel = `Account menu for ${displayName}`;

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 12;
    const top = rect.bottom + gap;
    const right = Math.max(viewportPadding, window.innerWidth - rect.right);
    const maxHeight = Math.max(160, window.innerHeight - top - viewportPadding);
    setPanelPosition({ top, right, maxHeight });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return undefined;
    }
    updatePanelPosition();
    const handleReposition = () => updatePanelPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const panel =
    open && panelPosition && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={panelRef}
            className="account-menu__panel account-menu__panel--portal"
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            style={{
              top: panelPosition.top,
              right: panelPosition.right,
              maxHeight: panelPosition.maxHeight,
            }}
          >
            <div className="account-menu__section account-menu__section--identity">
              <div className="account-menu__item account-menu__item--static">
                <strong className="account-menu__identity-name">{displayName}</strong>
                <span className="account-menu__role-chip">{roleLabel}</span>
                {accountMeta ? (
                  <span className="account-menu__identity-meta">{accountMeta}</span>
                ) : null}
              </div>
            </div>

            <nav className="account-menu__section" aria-label="Account links">
              {destinations.map((destination) => (
                <button
                  key={destination.id}
                  type="button"
                  className={[
                    'account-menu__item',
                    destination.primary ? 'account-menu__item--primary' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => go(destination.path)}
                >
                  {destination.label}
                </button>
              ))}
            </nav>

            {showSessionSection ? (
              <div className="account-menu__section account-menu__section--session">
                <div className="account-menu__section-title">Session</div>

                {showProfileSwitcher ? (
                  <div className="account-menu__section--profiles">
                    <ProfileRoleSwitcher variant="menu" onSwitch={() => setOpen(false)} />
                  </div>
                ) : null}

                {simulationEnabled ? (
                  simulationActive ? (
                    <button
                      type="button"
                      className="account-menu__item"
                      aria-pressed="true"
                      onClick={() => {
                        toggleSimulation();
                        setOpen(false);
                      }}
                    >
                      Training scenario: On
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="account-menu__item"
                      aria-pressed="false"
                      onClick={() => {
                        toggleSimulation();
                        setOpen(false);
                      }}
                    >
                      Training scenario: Off
                    </button>
                  )
                ) : null}
              </div>
            ) : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={['account-menu__trigger', open ? 'account-menu__trigger--open' : '']
          .filter(Boolean)
          .join(' ')}
        aria-label={triggerLabel}
        aria-haspopup="true"
        {...(open
          ? { 'aria-expanded': 'true' as const }
          : { 'aria-expanded': 'false' as const })}
        aria-controls={panelId}
        id={triggerId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-menu__avatar" aria-hidden="true">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(displayName)}
        </span>
        <span className="account-menu__label" aria-hidden="true">
          <span className="account-menu__name">{displayName}</span>
          <span className="account-menu__meta">{accountMeta}</span>
        </span>
        <ChevronDown size={14} className="account-menu__chevron" aria-hidden="true" />
      </button>
      {panel}
    </div>
  );
}
