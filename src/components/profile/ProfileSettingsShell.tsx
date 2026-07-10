import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import {
  PROFILE_SHELL_SECTIONS,
  resolveProfileShellEyebrow,
} from '../../config/profileDesignLanguage.config';
import { usePractitionerSurfaceVisibility } from '../../contexts/PractitionerVisibilityContext';
import type { UserProfileAccessSummary } from '../../config/userProfileCatalog';
import type { ProfileCopyStack } from '../../config/userProfileCopyModel';
import './ProfileSettingsShell.css';

export default function ProfileSettingsShell({
  title,
  subtitle,
  children,
  accessSummary = null,
  profileCopy = null,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  accessSummary?: UserProfileAccessSummary | null;
  profileCopy?: ProfileCopyStack | null;
}) {
  const surfaces = usePractitionerSurfaceVisibility();
  const location = useLocation();
  const resolvedSubtitle = subtitle || profileCopy?.profileShellSubtitle;

  return (
    <div className="profile-settings-shell">
      <header className="profile-settings-shell__header">
        <div>
          {surfaces.profile.showShellEyebrow ? (
            <p className="profile-settings-shell__eyebrow">
              {resolveProfileShellEyebrow(profileCopy)}
            </p>
          ) : null}
          <h1>{title}</h1>
          {surfaces.profile.showNestedSubtitles && resolvedSubtitle ? (
            <p className="profile-settings-shell__subtitle">{resolvedSubtitle}</p>
          ) : null}
        </div>
        {surfaces.profile.showAccessSummary && accessSummary ? (
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
                {profileCopy.primaryFunctions.map((fn: { id: string; label: string; description: string }) => (
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
        {PROFILE_SHELL_SECTIONS.map((item) => {
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
