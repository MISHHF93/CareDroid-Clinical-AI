import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconChevronDown } from '@tabler/icons-react';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isAdminSaasRole } from '../../config/platformEntryModel';
import { DEMO_PERSONA, isDemoPersonaUser } from '../../config/demoPersonaModel';
import useProfileSwitcherVisibility from '../../hooks/useProfileSwitcherVisibility';
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

export default function UserAccountMenu() {
  const { user } = useUser() as { user: AppUser | null };
  const { account } = useUserIdentity() as { account: AppAccount | null };
  const { accessSummary, profileCopy } = useEffectiveUserProfile();
  const { enabled: simulationEnabled, active: simulationActive, toggle: toggleSimulation } =
    useSimulationMode();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

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
    'demo mode';
  const workspaceMeta = profileCopy?.workspaceEyebrow;
  const demoMeta = useMemo(() => {
    if (!isDemoPersonaUser(user)) return null;
    return `${DEMO_PERSONA.title} · ${DEMO_PERSONA.department}`;
  }, [user]);
  const accountMeta = demoMeta || workspaceMeta || 'Demo mode';
  const showAdminLink = isAdminSaasRole(accessSummary?.saasRole || user?.role);
  const showProfileSwitcher = useProfileSwitcherVisibility();

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const triggerInner = (
    <>
      <span className="account-menu__avatar" aria-hidden="true">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(displayName)}
      </span>
      <span className="account-menu__label">
        <span className="account-menu__name">{displayName}</span>
        <span className="account-menu__meta">{accountMeta}</span>
      </span>
      <IconChevronDown size={14} className="account-menu__chevron" aria-hidden="true" />
    </>
  );

  return (
    <div className="account-menu" ref={rootRef}>
      {/* Dual trigger branches use static aria-expanded true/false tokens. */}
      {open ? (
        <button
          type="button"
          className="account-menu__trigger account-menu__trigger--open"
          aria-haspopup="true"
          aria-expanded="true"
          aria-controls="account-menu-panel"
          id="account-menu-trigger"
          onClick={() => setOpen(false)}
        >
          {triggerInner}
        </button>
      ) : (
        <button
          type="button"
          className="account-menu__trigger"
          aria-haspopup="true"
          aria-expanded="false"
          aria-controls="account-menu-panel"
          id="account-menu-trigger"
          onClick={() => setOpen(true)}
        >
          {triggerInner}
        </button>
      )}

      {open ? (
        <div
          className="account-menu__panel"
          id="account-menu-panel"
          role="region"
          aria-labelledby="account-menu-trigger"
        >
          <div className="account-menu__section">
            <div className="account-menu__item account-menu__item--static">
              <strong>{displayName}</strong>
              <span className="account-menu__role-chip">{roleLabel}</span>
            </div>
          </div>

          {showProfileSwitcher ? (
            <div className="account-menu__section account-menu__section--profiles">
              <ProfileRoleSwitcher variant="menu" onSwitch={() => setOpen(false)} />
            </div>
          ) : null}

          {simulationEnabled ? (
            <div className="account-menu__section">
              {simulationActive ? (
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
              )}
            </div>
          ) : null}

          {/* Account actions as labeled navigation (plain buttons). */}
          <nav className="account-menu__section" aria-label="Account links">
            <button
              type="button"
              className="account-menu__item"
              onClick={() => go(CANONICAL_ROUTES.profile)}
            >
              Profile overview
            </button>
            <button
              type="button"
              className="account-menu__item"
              onClick={() => go(CANONICAL_ROUTES.platformStart)}
            >
              Entry hub
            </button>
            {showAdminLink ? (
              <button
                type="button"
                className="account-menu__item"
                onClick={() => go(CANONICAL_ROUTES.adminOperations)}
              >
                Admin console
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
