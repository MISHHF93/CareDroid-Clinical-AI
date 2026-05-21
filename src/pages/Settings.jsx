import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { useTheme } from '../contexts/ThemeContext';

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [safetyBanner, setSafetyBanner] = useState(true);
  const { preference, resolvedTheme, setPreference } = useTheme();
  const { success } = useNotificationActions();

  const handleSave = () => {
    success('Settings saved', 'Settings saved.');
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <Card style={{ width: '100%', maxWidth: '720px' }}>
        <h2 style={{ marginTop: 0 }}>Settings</h2>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Configure CareDroid preferences and notifications.
        </p>

        <div style={{ marginTop: '20px', display: 'grid', gap: '14px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Theme preference</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>
                System, light, or dark (active: {resolvedTheme})
              </div>
            </div>
            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              style={{
                background: 'transparent',
                color: 'var(--text-color)',
                border: '1px solid var(--panel-border)',
                borderRadius: '8px',
                padding: '6px 10px'
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Notifications</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>AI results and alerts</div>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
            />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            borderRadius: '12px',
            border: '1px solid var(--panel-border)'
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>Safety banner</div>
              <div style={{ fontSize: '12px', color: 'var(--muted-text)' }}>Always show clinical disclaimer</div>
            </div>
            <input
              type="checkbox"
              checked={safetyBanner}
              onChange={() => setSafetyBanner(!safetyBanner)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <Button onClick={handleSave}>Save changes</Button>
          <Link to="/" style={{ color: 'var(--accent-green)', textDecoration: 'none', alignSelf: 'center' }}>
            Back to chat
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
