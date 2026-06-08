import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import TwoFactorSettings from '../components/TwoFactorSettings';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useNotificationActions } from '../hooks/useNotificationActions';
import { PageContainer } from '../layout/PageContainer';
import './ProfileSettings.css';

const ProfileSettings = ({ authToken }) => {
  const [displayName, setDisplayName] = useState('');
  const [institution, setInstitution] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState({ type: 'idle', message: '' });
  const [preferenceStatus, setPreferenceStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefForm, setPrefForm] = useState({
    theme: 'system',
    responseStyle: 'concise',
    citationLevel: 'standard',
    safetyTone: 'standard',
    defaultWorkspace: 'emergency',
    compactMode: false,
    pushEnabled: true,
    emailEnabled: true,
    securityAlerts: true,
  });
  const { user, authToken: contextAuthToken, setUser } = useUser();
  const {
    account,
    professional,
    preferences,
    updateProfile,
    savePreferences,
    isLoading: identityLoading,
    workspaces,
    saasProfile,
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

  useEffect(() => {
    setPrefForm({
      theme: preferences?.theme || 'system',
      responseStyle: preferences?.aiAssistantPreferences?.responseStyle || 'concise',
      citationLevel: preferences?.aiAssistantPreferences?.citationLevel || 'standard',
      safetyTone: preferences?.aiAssistantPreferences?.safetyTone || 'standard',
      defaultWorkspace: saasProfile?.defaultWorkspace || 'emergency',
      compactMode: Boolean(saasProfile?.compactMode ?? preferences?.compactMode),
      pushEnabled: preferences?.notificationSettings?.pushEnabled !== false,
      emailEnabled: preferences?.notificationSettings?.emailEnabled !== false,
      securityAlerts: preferences?.notificationSettings?.securityAlerts !== false,
    });
  }, [preferences, saasProfile?.compactMode, saasProfile?.defaultWorkspace]);

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
      setStatus({ type: 'error', message: 'Sign in to update your profile.' });
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

  const updatePreferenceField = (field, value) => {
    setPrefForm((current) => ({ ...current, [field]: value }));
    setPreferenceStatus('');
  };

  const handleSavePreferences = async (event) => {
    event.preventDefault();
    const result = await savePreferences({
      theme: prefForm.theme,
      compactMode: prefForm.compactMode,
      aiAssistantPreferences: {
        responseStyle: prefForm.responseStyle,
        citationLevel: prefForm.citationLevel,
        safetyTone: prefForm.safetyTone,
      },
      notificationSettings: {
        ...(preferences?.notificationSettings || {}),
        pushEnabled: prefForm.pushEnabled,
        emailEnabled: prefForm.emailEnabled,
        securityAlerts: prefForm.securityAlerts,
      },
    });
    if (result.ok) {
      await updateProfile({
        defaultWorkspace: prefForm.defaultWorkspace,
        preferredAIStyle: prefForm.responseStyle,
        themePreference: prefForm.theme,
        compactMode: prefForm.compactMode,
      });
    }
    setPreferenceStatus(result.ok ? 'Preferences saved.' : result.message || 'Unable to save preferences.');
  };

  return (
    <PageContainer
      as="main"
      size="narrow"
      className="profile-settings-page"
      aria-labelledby="profile-settings-title"
    >
      <div className="page-stack profile-settings-stack">
        <Card>
          <h2 id="profile-settings-title" style={{ marginTop: 0 }}>
            Profile Settings
          </h2>
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
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
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
          </div>
        </Card>

        <Card>
          <h2 style={{ marginTop: 0 }}>AI, Notification, and Theme Preferences</h2>
          <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
            Tune the assistant response style, notification channels, security alerts, and app theme.
          </p>
          <form
            id="profile-preferences-form"
            onSubmit={handleSavePreferences}
            style={{ display: 'grid', gap: '12px', marginTop: '18px' }}
          >
            <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
              Default workspace
              <select
                value={prefForm.defaultWorkspace}
                onChange={(event) => updatePreferenceField('defaultWorkspace', event.target.value)}
              >
                {(workspaces || []).map((workspace) => (
                  <option key={workspace.id} value={workspace.type || workspace.workspaceKey || workspace.id}>
                    {workspace.branding?.displayName || workspace.name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
              Theme
              <select
                value={prefForm.theme}
                onChange={(event) => updatePreferenceField('theme', event.target.value)}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={prefForm.compactMode}
                onChange={(event) => updatePreferenceField('compactMode', event.target.checked)}
              />{' '}
              Compact mode
            </label>
            <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
              AI response style
              <select
                value={prefForm.responseStyle}
                onChange={(event) => updatePreferenceField('responseStyle', event.target.value)}
              >
                <option value="concise">Concise</option>
                <option value="stepwise">Stepwise</option>
                <option value="evidence_first">Evidence first</option>
                <option value="teaching">Teaching</option>
              </select>
            </label>
            <div className="profile-settings-grid">
              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
                Citation level
                <select
                  value={prefForm.citationLevel}
                  onChange={(event) => updatePreferenceField('citationLevel', event.target.value)}
                >
                  <option value="minimal">Minimal</option>
                  <option value="standard">Standard</option>
                  <option value="full">Full</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: '6px', fontSize: '14px', fontWeight: 600 }}>
                Safety tone
                <select
                  value={prefForm.safetyTone}
                  onChange={(event) => updatePreferenceField('safetyTone', event.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="strict">Strict</option>
                </select>
              </label>
            </div>
            <div className="card-subtle" style={{ display: 'grid', gap: '10px', padding: '12px 16px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={prefForm.pushEnabled}
                  onChange={(event) => updatePreferenceField('pushEnabled', event.target.checked)}
                />{' '}
                Push notifications
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={prefForm.emailEnabled}
                  onChange={(event) => updatePreferenceField('emailEnabled', event.target.checked)}
                />{' '}
                Email notifications
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={prefForm.securityAlerts}
                  onChange={(event) => updatePreferenceField('securityAlerts', event.target.checked)}
                />{' '}
                Security alerts
              </label>
            </div>
          </form>
          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', flexWrap: 'wrap' }}>
            <Button type="submit" form="profile-preferences-form" disabled={identityLoading}>
              Save preferences
            </Button>
            {preferenceStatus ? (
              <span style={{ color: 'var(--muted-text)', alignSelf: 'center', fontSize: '14px' }}>
                {preferenceStatus}
              </span>
            ) : null}
          </div>
        </Card>

        {/* Two-Factor Authentication Settings */}
        <TwoFactorSettings authToken={authToken} />
      </div>
    </PageContainer>
  );
};

export default ProfileSettings;
