import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import TwoFactorSettings from '../../components/TwoFactorSettings';
import ProfileSettingsShell from '../../components/profile/ProfileSettingsShell';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import './ProfileIdentityPages.css';

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

export default function ProfileSecurity() {
  const { accessSummary, profileCopy } = useProfileShellProps();
  const { authToken } = useUser();
  const { account, security } = useUserIdentity();

  return (
    <ProfileSettingsShell
      title="Security"
      subtitle="Email verification, multi-factor authentication, and biometric setup."
      accessSummary={accessSummary}
      profileCopy={profileCopy}
    >
      <div className="profile-identity-page__inner">
        <Card>
          <div className="profile-identity-grid">
            <div className="profile-identity-card">
              <h3>Email</h3>
              <p>{account?.email || 'Unknown email'}</p>
              <strong>{security?.emailVerified ? 'Verified' : 'Verification pending'}</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Role</h3>
              <p>{security?.role || account?.role || 'Not assigned'}</p>
              <strong>Admin-managed SaaS role</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Multi-factor</h3>
              <p>{security?.mfaEnabled ? 'Enabled' : 'Not enabled'}</p>
              <Link to="/two-factor-setup">Manage 2FA setup</Link>
            </div>
            <div className="profile-identity-card">
              <h3>Last login</h3>
              <p>{formatDate(security?.lastLoginAt)}</p>
              <Link to="/biometric-setup">Biometric setup</Link>
            </div>
          </div>
        </Card>

        <TwoFactorSettings authToken={authToken} />

        <Card>
          <h2 style={{ marginTop: 0 }}>Protected routes</h2>
          <p className="profile-identity-muted">
            Security-sensitive setup flows stay on dedicated routes for clearer audit trails.
          </p>
          <div className="profile-identity-list">
            <Link to="/two-factor-setup">Two-factor enrollment</Link>
            <Link to="/biometric-setup">Biometric enrollment</Link>
            <Link to="/profile/settings">Identity settings</Link>
          </div>
        </Card>
      </div>
    </ProfileSettingsShell>
  );
}
