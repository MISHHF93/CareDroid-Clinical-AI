import React from 'react';
import { Link } from 'react-router-dom';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import Card from '../ui/card';
import './ProfileSummaryCard.css';

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export default function ProfileSummaryCard({ compact = false }) {
  const { account, activeWorkspace, isLoading } = useUserIdentity();
  const displayName = account?.displayName || 'CareDroid User';
  const specialty = account?.specialty || account?.profession || 'Clinical user';
  const workspaceName = activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'Personal workspace';

  return (
    <Card className={`profile-summary-card${compact ? ' profile-summary-card--compact' : ''}`}>
      <div className="profile-summary-card__avatar" aria-hidden>
        {account?.avatarUrl ? <img src={account.avatarUrl} alt="" /> : initials(displayName)}
      </div>
      <div className="profile-summary-card__body">
        <p className="profile-summary-card__eyebrow">Operational profile</p>
        <h2>{displayName}</h2>
        <p>{specialty}</p>
        <div className="profile-summary-card__workspace">
          <span>{workspaceName}</span>
          {activeWorkspace?.type ? <strong>{activeWorkspace.type}</strong> : null}
        </div>
        {isLoading ? <span className="profile-summary-card__status">Syncing identity...</span> : null}
      </div>
      <Link to="/profile/workspaces" className="profile-summary-card__link">
        Switch workspace
      </Link>
    </Card>
  );
}
