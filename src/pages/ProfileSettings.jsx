import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import TwoFactorSettings from '../components/TwoFactorSettings';
import { useNotificationActions } from '../hooks/useNotificationActions';

const ProfileSettings = ({ authToken }) => {
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('');
  const [role, setRole] = useState('');
  const { success } = useNotificationActions();

  const handleSave = () => {
    success('Profile saved', 'Profile settings saved.');
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>Profile Settings</h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
            Update your clinical profile and institutional details.
          </p>
          <div style={{ display: 'grid', gap: '12px', marginTop: '18px' }}>
            <Input
              type="text"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Role (e.g., RN, MD)"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px' }}>
            <Button onClick={handleSave}>Save profile</Button>
            <Link to="/" style={{ color: '#00FF88', textDecoration: 'none', alignSelf: 'center' }}>
              Back to chat
            </Link>
          </div>
        </Card>

        {/* Two-Factor Authentication Settings */}
        <TwoFactorSettings authToken={authToken} />
      </div>
    </div>
  );
};

export default ProfileSettings;
