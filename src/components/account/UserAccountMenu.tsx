import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { IconChevronDown } from '@tabler/icons-react';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { buildAuthUrl } from '../../auth/authSession';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { isAdminSaasRole } from '../../config/platformEntryModel';
import { DEMO_PERSONA, isDemoPersonaUser } from '../../config/demoPersonaModel';
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

export default function UserAccountMenu() {
  const { user, signOut, isRealSession } = useUser();
  const { account, refreshIdentity } = useUserIdentity();
  const { accessSummary, profileCopy } = useEffectiveUserProfile();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = useMemo(
    () =>
      account?.displayName ||
      user?.fullName ||
      user?.name ||
      (isRealSession ? 'Signed-in user' : 'Demo mode'),
    [account?.displayName, isRealSession, user?.fullName, user?.name],
  );

  const avatarUrl = account?.avatarUrl || user?.avatarUrl || '';
  const roleLabel =
    profileCopy?.personaTitle ||
    accessSummary?.saasRole?.replace(/-/g, ' ') ||
    user?.role ||
    'open access';
  const workspaceMeta = profileCopy?.workspaceEyebrow;
  const demoMeta = useMemo(() => {
    if (isRealSession || !isDemoPersonaUser(user)) return null;
    return `${DEMO_PERSONA.title} · ${DEMO_PERSONA.department}`;
  }, [isRealSession, user]);
  const accountMeta = isRealSession
    ? workspaceMeta || roleLabel
    : demoMeta || workspaceMeta || 'Demo mode';
  const showAdminLink = isAdminSaasRole(accessSummary?.saasRole || user?.role);

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

  const handleSignOut = () => {
    signOut();
    refreshIdentity();
    setOpen(false);
  };

  const signInHref = buildAuthUrl({ returnUrl: location.pathname + location.search });

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        type="button"
        className="account-menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-menu__avatar" aria-hidden>
          {avatarUrl ? <img src={avatarUrl} alt="" /> : getInitials(displayName)}
        </span>
        <span className="account-menu__label">
          <span className="account-menu__name">{displayName}</span>
          <span className="account-menu__meta">{accountMeta}</span>
        </span>
        <IconChevronDown size={14} aria-hidden />
      </button>

      {open ? (
        <div className="account-menu__panel" role="menu">
          <div className="account-menu__section">
            <div className="account-menu__item" style={{ cursor: 'default' }}>
              <strong>{displayName}</strong>
              <span className="account-menu__role-chip">{roleLabel}</span>
            </div>
          </div>

          <div className="account-menu__section">
            <Link className="account-menu__item" to={CANONICAL_ROUTES.profile} role="menuitem">
              Profile overview
            </Link>
            {isRealSession ? (
              <Link className="account-menu__item" to="/profile/security" role="menuitem">
                Security
              </Link>
            ) : null}
            {showAdminLink || !isRealSession ? (
              <Link
                className="account-menu__item"
                to={CANONICAL_ROUTES.adminOperations}
                role="menuitem"
              >
                Admin console
              </Link>
            ) : null}
          </div>

          <div className="account-menu__section">
            {isRealSession ? (
              <button
                type="button"
                className="account-menu__item account-menu__item--danger"
                role="menuitem"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                className="account-menu__item"
                role="menuitem"
                onClick={() => navigate(signInHref)}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
