import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import ProfileSettingsShell from '../../components/profile/ProfileSettingsShell';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { resolveProfileShellSection } from '../../config/profileDesignLanguage.config';
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
  const securitySection = resolveProfileShellSection('security');
  const { account, security } = useUserIdentity();

  return (
    <ProfileSettingsShell
      title={securitySection.pageTitle}
      subtitle={securitySection.pageSubtitle}
      accessSummary={accessSummary}
      profileCopy={profileCopy}
    >
      <div className="profile-identity-page__inner">
        <Card>
          <div className="profile-identity-grid">
            <div className="profile-identity-card">
              <h3>Email</h3>
              <p>{account?.email || 'Demo profile email'}</p>
              <strong>{security?.emailVerified ? 'Verified' : 'Demo mode'}</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Role</h3>
              <p>{security?.role || account?.role || 'Not assigned'}</p>
              <strong>Demo SaaS role</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Session</h3>
              <p>Open-access build preview</p>
              <strong>No sign-in required</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Last activity</h3>
              <p>{formatDate(security?.lastLoginAt)}</p>
              <Link to="/profile/settings">Identity settings</Link>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="u-mt-0">Profile routes</h2>
          <p className="profile-identity-muted">
            Use profile settings to adjust demo identity, tools, and workspace preferences.
          </p>
          <div className="profile-identity-list">
            <Link to="/profile/settings">Identity settings</Link>
            <Link to="/profile/preferences">Preferences</Link>
            <Link to="/profile/tool-preferences">Tool preferences</Link>
          </div>
        </Card>
      </div>
    </ProfileSettingsShell>
  );
}
