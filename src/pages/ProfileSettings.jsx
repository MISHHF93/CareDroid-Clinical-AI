import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import ProfileSettingsShell from '../components/profile/ProfileSettingsShell';
import useProfileShellProps from '../hooks/useProfileShellProps';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import {
  ActionRow,
  DashboardSection,
} from '../components/ui/CareDroidPrimitives';
import './ProfileSettings.css';

const ProfileSettings = ({ authToken }) => {
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [saving, setSaving] = useState(false);
  const { accessSummary, profileCopy } = useProfileShellProps();
  const { user, authToken: contextAuthToken, setUser } = useUser();
  const {
    account,
    professional,
    updateProfile,
    isLoading: identityLoading,
  } = useUserIdentity();
  const { success, error } = useNotificationActions();
  const effectiveAuthToken = authToken || contextAuthToken;
  const profile = user?.profile || {};
  const currentProfile = useMemo(
    () => ({
      displayName: account?.displayName || profile.fullName || user?.fullName || user?.name || '',
      institution: account?.organization || profile.institution || user?.institution || '',
      specialty:
        account?.specialty ||
        profile.specialty ||
        professional?.specialties?.[0] ||
        '',
      licenseNumber: professional?.licenseNumber || profile.licenseNumber || '',
      country: account?.country || profile.country || '',
      timezone: account?.timezone || profile.timezone || '',
      role: account?.role || user?.role || 'Not assigned',
    }),
    [
      account?.country,
      account?.displayName,
      account?.organization,
      account?.role,
      account?.specialty,
      account?.timezone,
      professional?.licenseNumber,
      professional?.specialties,
      profile.country,
      profile.fullName,
      profile.institution,
      profile.licenseNumber,
      profile.specialty,
      profile.timezone,
      user?.fullName,
      user?.institution,
      user?.name,
      user?.role,
    ],
  );
  const accountRole = currentProfile.role;

  useEffect(() => {
    setDisplayName(currentProfile.displayName);
    setInstitution(currentProfile.institution);
    setSpecialty(currentProfile.specialty);
    setLicenseNumber(currentProfile.licenseNumber);
    setCountry(currentProfile.country);
    setTimezone(currentProfile.timezone);
  }, [
    currentProfile.country,
    currentProfile.displayName,
    currentProfile.institution,
    currentProfile.licenseNumber,
    currentProfile.specialty,
    currentProfile.timezone,
  ]);

  const payload = useMemo(
    () => ({
      displayName: displayName.trim(),
      organization: institution.trim(),
      specialty: specialty.trim(),
      licenseNumber: licenseNumber.trim(),
      country: country.trim(),
      timezone: timezone.trim(),
    }),
    [country, displayName, institution, licenseNumber, specialty, timezone]
  );

  const hasChanges = useMemo(() => {
    const current = {
      displayName: currentProfile.displayName,
      organization: currentProfile.institution,
      specialty: currentProfile.specialty,
      licenseNumber: currentProfile.licenseNumber,
      country: currentProfile.country,
      timezone: currentProfile.timezone,
    };
    return Object.entries(payload).some(([key, value]) => value !== current[key]);
  }, [currentProfile, payload]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!effectiveAuthToken) {
      setStatus({ type: 'error', message: 'Profile API unavailable — changes stay local in demo mode.' });
      return;
    }
    if (!payload.displayName) {
      setStatus({ type: 'error', message: 'Display name is required.' });
      return;
    }

    setSaving(true);
    setStatus({ type: 'loading', message: 'Saving profile to CareDroid...' });
    const result = await updateProfile(payload);
    setSaving(false);

    if (!result.ok) {
      setStatus({ type: 'error', message: result.message || 'Unable to save profile.' });
      error('Profile save failed', result.message || 'Unable to save profile.');
      return;
    }

    const updatedAccount = result.data?.account || {};
    const updatedProfessional = result.data?.professional || {};
    setUser?.({
      ...user,
      profile: {
        ...profile,
        fullName: updatedAccount.displayName || payload.displayName,
        institution: updatedAccount.organization || payload.organization,
        specialty: updatedAccount.specialty || payload.specialty,
        licenseNumber: updatedProfessional.licenseNumber || payload.licenseNumber,
        country: updatedAccount.country || payload.country,
        timezone: updatedAccount.timezone || payload.timezone,
      },
      fullName: updatedAccount.displayName || payload.displayName,
      institution: updatedAccount.organization || payload.organization,
    });
    setStatus({
      type: 'success',
      message: 'Operational profile saved. Profile, workspace, and audit surfaces now use the latest details.',
    });
    success('Profile saved', 'Clinical profile updated.');
  };

  return (
    <ProfileSettingsShell
      title="Identity"
      subtitle="Clinical profile and institutional details. Your role is assigned by an administrator."
      accessSummary={accessSummary}
      profileCopy={profileCopy}
    >
        <DashboardSection
          className="profile-settings-section"
          title="Clinical profile"
          description="Backend-backed clinical profile and institutional details."
        >
          {!effectiveAuthToken && (
            <div className="api-state-banner api-state-banner--warning" role="status">
              Profile changes save locally during the build phase when the backend profile API is offline.
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
            <div className="profile-settings-grid">
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
          <ActionRow className="profile-settings-actions">
            <Button
              type="submit"
              form="profile-settings-form"
              loading={saving}
              disabled={saving || identityLoading || !hasChanges}
            >
              Save profile
            </Button>
            <Link to="/profile" style={{ color: '#00FF88', textDecoration: 'none', alignSelf: 'center' }}>
              Back to Profile
            </Link>
          </ActionRow>
        </DashboardSection>
    </ProfileSettingsShell>
  );
};

export default ProfileSettings;
