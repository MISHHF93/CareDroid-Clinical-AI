import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import useEffectiveUserProfile from '../../hooks/useEffectiveUserProfile';
import { isAdminSaasRole } from '../../config/platformEntryModel';
import { isRouteAllowedForProfile, resolveUserProfileFromSaasRole } from '../../config/userProfileCatalog';
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
        <p className="admin-ops-shell__eyebrow">Administration</p>
        <h1 className="admin-ops-shell__title">Emergency department operations console</h1>
        <p className="admin-ops-shell__subtitle">
          Assign canonical roles, preview workflow access, invite staff, and configure tenant policies.
          {isAdmin ? null : ' You are viewing admin tools in demo mode — changes stay local during the build phase.'}
        </p>
        {accessSummary ? (
          <p className="admin-ops-shell__subtitle" style={{ marginTop: 8 }}>
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
            <Link key={item.id} to={item.path} className={active ? 'is-active' : ''}>
              {item.label}
            </Link>
          );
        })}
        <Link to={CANONICAL_ROUTES.platformStart}>← Platform entry</Link>
      </nav>

      <div className="admin-ops-shell__content">
        <Outlet />
      </div>
    </div>
  );
}
