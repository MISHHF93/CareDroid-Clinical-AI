import { Link, Outlet, useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { isAdminSaasRole } from '../../config/platformEntryModel';
import {
  isRouteAllowedForProfile,
  resolveUserProfileFromSaasRole,
} from '../../config/userProfileCatalog';
import './AdminOperationsShell.css';

const ADMIN_NAV = Object.freeze([
  { id: 'home', label: 'Overview', path: CANONICAL_ROUTES.adminOperations },
  { id: 'staff', label: 'ED staff & workflows', path: CANONICAL_ROUTES.adminEdStaff },
  { id: 'team', label: 'Team', path: `${CANONICAL_ROUTES.adminOperations}/team` },
  { id: 'tenant', label: 'Tenant settings', path: `${CANONICAL_ROUTES.adminOperations}/tenant` },
  { id: 'organization', label: 'Organization', path: CANONICAL_ROUTES.organization },
]);

export default function AdminOperationsShell() {
  const location = useLocation();
  const { saasRole, accessSummary } = useEffectiveUserProfile();
  const isAdmin = isAdminSaasRole(saasRole);
  const profile = resolveUserProfileFromSaasRole(saasRole);
  const visibleNav = ADMIN_NAV.filter((item) => isRouteAllowedForProfile(profile, item.path));

  return (
    <div className="admin-ops-shell">
      <header className="admin-ops-shell__header">
        <p className="admin-ops-shell__eyebrow">Platform admin</p>
        {/* HEAL-186: was an <h1>, demoted to a <p> -- this shell wraps every admin route (team,
            staff workflows, tenant settings, system health, ...) and always showed this same
            static text, duplicating (and for routes with a real registered title, like
            SystemHealth post-HEAL-185, actively disagreeing with) AppShell's real shell-level
            <h1> for whichever specific route is active. Each child route owns its own real
            title via useRouteChromeRegistration; this is section-level wayfinding text, not a
            page heading. */}
        <p className="admin-ops-shell__title">Operations console</p>
        <p className="admin-ops-shell__subtitle">
          Role assignments, workflow previews, team invites, and tenant policies.
          {isAdmin ? null : ' Demo mode — changes stay local during the build phase.'}
        </p>
        {accessSummary ? (
          <p className="admin-ops-shell__role">
            Current role: <strong>{accessSummary.saasRole.replace(/-/g, ' ')}</strong>
          </p>
        ) : null}
      </header>

      <nav className="admin-ops-shell__nav" aria-label="Admin sections">
        {visibleNav.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== CANONICAL_ROUTES.adminOperations &&
              location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              className={active ? 'admin-ops-nav-link is-active' : 'admin-ops-nav-link'}
            >
              {item.label}
            </Link>
          );
        })}
        <Link to={CANONICAL_ROUTES.platformStart} className="admin-ops-nav-link">
          ← Platform entry
        </Link>
      </nav>

      <div className="admin-ops-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
