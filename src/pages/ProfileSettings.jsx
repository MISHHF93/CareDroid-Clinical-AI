import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import TwoFactorSettings from '../components/TwoFactorSettings';
import { useUser } from '../contexts/UserContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { updateUserProfile } from '../services/profileApi';

const ProfileSettings = ({ authToken }) => {
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [saving, setSaving] = useState(false);
  const { user, authToken: contextAuthToken, setUser } = useUser();
  const { success, error } = useNotificationActions();
  const effectiveAuthToken = authToken || contextAuthToken;
  const profile = user?.profile || {};
  const accountRole = user?.role || 'Not assigned';

  useEffect(() => {
    setDisplayName(profile.fullName || user?.fullName || user?.name || '');
    setInstitution(profile.institution || user?.institution || '');
    setSpecialty(profile.specialty || '');
    setLicenseNumber(profile.licenseNumber || '');
    setCountry(profile.country || '');
    setTimezone(profile.timezone || '');
  }, [
    profile.country,
    profile.fullName,
    profile.institution,
    profile.licenseNumber,
    profile.specialty,
    profile.timezone,
    user?.fullName,
    user?.institution,
    user?.name,
  ]);

  const payload = useMemo(
    () => ({
      fullName: displayName.trim(),
      institution: institution.trim(),
      specialty: specialty.trim(),
      licenseNumber: licenseNumber.trim(),
      country: country.trim(),
      timezone: timezone.trim(),
    }),
    [country, displayName, institution, licenseNumber, specialty, timezone]
  );

  const hasChanges = useMemo(() => {
    const current = {
      fullName: profile.fullName || user?.fullName || user?.name || '',
      institution: profile.institution || user?.institution || '',
      specialty: profile.specialty || '',
      licenseNumber: profile.licenseNumber || '',
      country: profile.country || '',
      timezone: profile.timezone || '',
    };
    return Object.entries(payload).some(([key, value]) => value !== current[key]);
  }, [payload, profile, user?.fullName, user?.institution, user?.name]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!effectiveAuthToken) {
      setStatus({ type: 'error', message: 'Sign in to update your profile.' });
      return;
    }
    if (!payload.fullName) {
      setStatus({ type: 'error', message: 'Display name is required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'loading', message: 'Saving profile to CareDroid...' });
    const result = await updateUserProfile(payload);
    setSaving(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message || 'Unable to save profile.' });
      error('Profile save failed', result.message || 'Unable to save profile.');
      return;
    }

    const updatedProfile = result.data || payload;
    setUser?.({
      ...user,
      profile: { ...profile, ...updatedProfile },
      fullName: updatedProfile.fullName || payload.fullName,
      institution: updatedProfile.institution || payload.institution,
    });
    setStatus({
      type: 'success',
      message: 'Profile saved to the backend. Profile and audit surfaces now use the latest details.',
    });
    success('Profile saved', 'Clinical profile updated.');
  };

  return (
    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '48px' }}>
      <div style={{ width: '100%', maxWidth: '720px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card>
          <h2 style={{ marginTop: 0 }}>Profile Settings</h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
            Update your backend-backed clinical profile and institutional details.
          </p>
          {!effectiveAuthToken && (
            <div className="api-state-banner api-state-banner--warning" role="status">
              Sign in to save profile changes to the backend.
            </div>
          )}
          {status.message && (
            <div
              className={`api-state-banner api-state-banner--${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : 'info'}`}
              role="status"
              style={{ marginTop: '16px' }}
            >
              {status.message}
            </div>
          )}
          <form
            id="profile-settings-form"
            onSubmit={handleSave}
            style={{ display: 'grid', gap: '12px', marginTop: '18px' }}
          >
            <Input
              type="text"
              label="Display name"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
            <Input
              type="text"
              label="Institution"
              placeholder="Institution"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
            <Input
              type="text"
              label="Specialty"
              placeholder="Specialty (e.g., Emergency Medicine)"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
            <Input
              type="text"
              label="License number"
              placeholder="License number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Input
                type="text"
                label="Country"
                placeholder="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <Input
                type="text"
                label="Timezone"
                placeholder="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              />
            </div>
            <div className="card-subtle" style={{ padding: '12px 16px', fontSize: '14px' }}>
              <strong>Account role:</strong> {accountRole}. Role changes stay controlled by backend
              membership and RBAC policies.
            </div>
          </form>
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <Button
              type="submit"
              form="profile-settings-form"
              loading={saving}
              disabled={saving || !hasChanges}
            >
              Save profile
            </Button>
            <Link to="/assistant" style={{ color: '#00FF88', textDecoration: 'none', alignSelf: 'center' }}>
              Back to Assistant
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
