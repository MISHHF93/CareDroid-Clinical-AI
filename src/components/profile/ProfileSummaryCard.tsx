import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { resolveProfileIdentityCard } from '../../config/profileDesignLanguage.config';
import Card from '../ui/card';
import './ProfileSummaryCard.css';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default function ProfileSummaryCard({ compact = false }) {
  const { account, activeWorkspace, isLoading } = useUserIdentity();
  const { profileCopy } = useProfileShellProps();
  const identityCopy = useMemo(() => resolveProfileIdentityCard(profileCopy), [profileCopy]);
  const displayName = account?.displayName || 'CareDroid User';
  const specialty = account?.specialty || account?.profession || 'Clinical user';
  const organization = account?.organization || account?.department || 'No organization set';
  const role = account?.role || 'No role set';
  const workspaceName =
    activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'Personal workspace';

  return (
    <Card className={`profile-summary-card${compact ? ' profile-summary-card--compact' : ''}`}>
      <div className="profile-summary-card__avatar" aria-hidden>
        {account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : initials(displayName)}
      </div>
      <div className="profile-summary-card__body">
        <p className="profile-summary-card__eyebrow">{identityCopy.eyebrow}</p>
        <h2>{displayName}</h2>
        <p>{specialty}</p>
        <div className="profile-summary-card__meta" aria-label="Profile organization and role">
          <span>{organization}</span>
          <span>{role}</span>
        </div>
        <div className="profile-summary-card__workspace">
          <span>{workspaceName}</span>
          {activeWorkspace?.type ? <strong>{activeWorkspace.type}</strong> : null}
        </div>
        {isLoading ? (
          <span className="profile-summary-card__status">{identityCopy.syncingLabel}</span>
        ) : null}
      </div>
      <Link to="/profile/workspaces" className="profile-summary-card__link">
        {identityCopy.switchWorkspaceLabel}
      </Link>
    </Card>
  );
}
