import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import './ProfileIdentityPages.css';

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString();
}

export default function ProfileSecurity() {
  const { account, security } = useUserIdentity();

  return (
    <main className="profile-identity-page">
      <div className="profile-identity-page__inner">
        <header className="profile-identity-page__header">
          <h1>Profile Security</h1>
          <p>Review account verification, role, MFA, biometric setup, and protected security routes.</p>
        </header>

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
              <strong>Workspace permissions refine route access</strong>
            </div>
            <div className="profile-identity-card">
              <h3>Multi-factor</h3>
              <p>{security?.mfaEnabled ? 'Enabled' : 'Not enabled'}</p>
              <Link to="/two-factor-setup">Manage 2FA</Link>
            </div>
            <div className="profile-identity-card">
              <h3>Last login</h3>
              <p>{formatDate(security?.lastLoginAt)}</p>
              <Link to="/biometric-setup">Biometric setup</Link>
            </div>
          </div>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>Protected Areas</h2>
          <div className="profile-identity-actions">
            <Link to="/audit-logs">Audit logs</Link>
            <Link to="/settings">Privacy and billing settings</Link>
            <Link to="/notifications">Notification security alerts</Link>
          </div>
        </Card>
      </div>
    </main>
  );
}
