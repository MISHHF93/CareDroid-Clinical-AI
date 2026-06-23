import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import './ProfileSettingsShell.css';

const PROFILE_NAV = Object.freeze([
  { id: 'overview', label: 'Overview', path: CANONICAL_ROUTES.profile },
  { id: 'settings', label: 'Identity', path: CANONICAL_ROUTES.profileSettings },
  { id: 'preferences', label: 'Preferences', path: '/profile/preferences' },
  { id: 'tools', label: 'Tools', path: CANONICAL_ROUTES.profileToolPreferences },
  { id: 'workspaces', label: 'Workspaces', path: '/profile/workspaces' },
  { id: 'security', label: 'Security', path: '/profile/security' },
  { id: 'activity', label: 'Activity', path: '/profile/activity' },
]);

export default function ProfileSettingsShell({
  title,
  subtitle,
  children,
  accessSummary = null,
  profileCopy = null,
}) {
  const location = useLocation();
  const resolvedSubtitle = subtitle || profileCopy?.profileShellSubtitle;

  return (
    <div className="profile-settings-shell">
      <header className="profile-settings-shell__header">
        <div>
          <p className="profile-settings-shell__eyebrow">
            {profileCopy?.workspaceEyebrow || 'User profile'}
          </p>
          <h1>{title}</h1>
          {resolvedSubtitle ? (
            <p className="profile-settings-shell__subtitle">{resolvedSubtitle}</p>
          ) : null}
        </div>
        {accessSummary ? (
          <div className="profile-settings-shell__access" role="status">
            <strong>{profileCopy?.personaTitle || accessSummary.profileBenefits}</strong>
            <span>{accessSummary.profileBenefits}</span>
            <span>
              Role: {accessSummary.saasRole.replace(/-/g, ' ')}
              {accessSummary.emergencyRole
                ? ` · ED: ${accessSummary.emergencyRole.replace(/_/g, ' ')}`
                : ''}{' '}
              · {accessSummary.navigationRoutes.length} routes ·{' '}
              {accessSummary.allowedWorkspaces.length} workspaces
            </span>
            {profileCopy?.primaryFunctions?.length ? (
              <ul className="profile-settings-shell__functions">
                {profileCopy.primaryFunctions.map((fn) => (
                  <li key={fn.id} title={fn.description}>
                    {fn.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </header>

      <nav className="profile-settings-shell__nav" aria-label="Profile sections">
        {PROFILE_NAV.map((item) => {
          const active =
            location.pathname === item.path ||
            (item.path !== CANONICAL_ROUTES.profile &&
              location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.id}
              to={item.path}
              className={active ? 'is-active' : ''}
              aria-current={active ? 'page' : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="profile-settings-shell__content">{children}</div>
    </div>
  );
}
