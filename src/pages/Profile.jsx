import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';

const Profile = () => {
  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <Card style={{ width: '100%', maxWidth: '640px' }}>
        <h2 style={{ marginTop: 0 }}>Profile</h2>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Your profile details will appear here once authentication is connected.
        </p>
        <div style={{
          marginTop: '18px',
          display: 'grid',
          gap: '12px',
          fontSize: '14px'
        }}>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Name:</strong> —</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Email:</strong> —</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Role:</strong> —</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Institution:</strong> —</div>
        </div>
        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '14px',
          }}
        >
          <Link to="/profile-settings">Profile settings</Link>
          <Link to="/settings">App settings</Link>
          <Link to="/notifications">Notifications</Link>
          <Link to="/onboarding">Onboarding</Link>
          <Link to="/biometric-setup">Biometric setup</Link>
        </div>
        <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--muted-text)' }}>
          <Link to="/dashboard" style={{ color: '#00FF88', textDecoration: 'none' }}>
            ← Back to dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
