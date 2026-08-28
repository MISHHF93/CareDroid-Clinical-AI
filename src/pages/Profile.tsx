import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import ProfileSummaryCard from '../components/profile/ProfileSummaryCard';
import ProfileCopilotCard from '../components/profile/ProfileCopilotCard';
import ProfileInsightsPanel from '../components/profile/ProfileInsightsPanel';
import ProfileSectionHeader from '../components/profile/ProfileSectionHeader';
import ProfileSettingsShell from '../components/profile/ProfileSettingsShell';
import ReceptionJobProfileCard from '../components/profile/ReceptionJobProfileCard';
import { useEmergencyRolePermissions } from '../hooks/useEmergencyRolePermissions';
import {
  resolveProfileOverviewCard,
  resolveProfileShellSection,
} from '../config/profileDesignLanguage.config';
import useEffectiveUserProfile from '../hooks/useEffectiveUserProfile';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { Permission, useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { buildCompetencyCredentialingSnapshot } from '../data/competencyCredentialingCatalog';
import { toolRegistryById } from '../data/toolRegistry';
import { fetchMyAuditLogs, fetchPhiAccessLogs } from '../services/auditApi';
import { usePractitionerSurfaceVisibility } from '../contexts/PractitionerVisibilityContext';
import './Profile.css';

const ACTION_LABELS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  REGISTRATION: 'Registration',
  PASSWORD_CHANGE: 'Password change',
  EMAIL_VERIFICATION: 'Email verification',
  TWO_FACTOR_ENABLE: '2FA enabled',
  TWO_FACTOR_DISABLE: '2FA disabled',
  SUBSCRIPTION_CHANGE: 'Subscription change',
  DATA_EXPORT: 'Data export',
  DATA_DELETION: 'Data deletion',
  PHI_ACCESS: 'PHI access',
  AI_QUERY: 'AI query',
  CLINICAL_DATA_ACCESS: 'Clinical data access',
  SECURITY_EVENT: 'Security event',
  PROFILE_UPDATE: 'Profile update',
};

function formatAction(action) {
  return ACTION_LABELS[action] || String(action || 'Account activity').replace(/_/g, ' ');
}

function formatDate(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

const Profile = () => {
  const surfaces = usePractitionerSurfaceVisibility();
  const { user, hasPermission } = useUser();
  const emergencyRole = useEmergencyRolePermissions();
  const { account, preferences, activity, activeWorkspace, accessSummary, saasProfile } = useUserIdentity();
  const { accessSummary: hookAccessSummary, profileCopy } = useEffectiveUserProfile();
  const resolvedAccessSummary = accessSummary || hookAccessSummary;
  const { favorites, pinned, recentTools } = useToolPreferences();
  const [activityState, setActivityState] = useState<any>({
    loading: true,
    error: '',
    logs: [],
    total: 0,
  });
  const [phiState, setPhiState] = useState<any>({
    loading: false,
    error: '',
    logs: [],
    total: 0,
  });

  const canViewPhiAccess = hasPermission(Permission.VIEW_AUDIT_LOGS);
  const displayName = account?.displayName || user?.fullName || user?.name || user?.profile?.fullName || '—';
  const email = account?.email || user?.email || '—';
  const role = account?.role || user?.role || '—';
  const specialty = account?.specialty || user?.profile?.specialty || '—';
  const workspaceName =
    activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'Personal workspace';
  const recentToolItems = useMemo(() => {
    const profileItems = activity?.recentTools || [];
    if (profileItems.length > 0) return profileItems;
    return (recentTools || []).map((toolId) => ({
      id: toolId,
      label: toolRegistryById[toolId]?.name || toolId,
      route: toolRegistryById[toolId]?.path,
    }));
  }, [activity?.recentTools, recentTools]);
  const savedTools = useMemo(() => {
    const profileToolPrefs = preferences?.toolPreferences || {};
    const ids = [
      ...(profileToolPrefs.favoriteToolIds || []),
      ...(profileToolPrefs.pinnedToolIds || []),
      ...(favorites || []),
      ...(pinned || []),
    ];
    return [...new Set(ids)].map((toolId) => ({
      id: toolId,
      label: toolRegistryById[toolId]?.name || toolId,
      route: toolRegistryById[toolId]?.path,
    }));
  }, [favorites, pinned, preferences?.toolPreferences]);
  const aiPreferences = preferences?.aiAssistantPreferences || {};
  const recentPhiCount = useMemo(
    () => activityState.logs.filter((log) => log.phiAccessed || log.action === 'PHI_ACCESS').length,
    [activityState.logs]
  );
  const competencySnapshot = useMemo(
    () => buildCompetencyCredentialingSnapshot({ role, specialty }),
    [role, specialty]
  );
  const overviewSection = resolveProfileShellSection('overview');
  const identityCard = resolveProfileOverviewCard('identity');
  const recentToolsCard = resolveProfileOverviewCard('recentTools');
  const competencyCard = resolveProfileOverviewCard('competency');
  const savedToolsCard = resolveProfileOverviewCard('savedTools');
  const preferencesCard = resolveProfileOverviewCard('preferences');
  const activityCard = resolveProfileOverviewCard('activity');
  const phiCard = resolveProfileOverviewCard('phiVisibility');

  useEffect(() => {
    let cancelled = false;

    async function loadMyActivity() {
      setActivityState((current) => ({ ...current, loading: true, error: '' }));
      const result = await fetchMyAuditLogs(5);
      if (cancelled) return;
      if (!result.ok) {
        setActivityState({ loading: false, error: result.message, logs: [], total: 0 });
        return;
      }
      setActivityState({
        loading: false,
        error: '',
        logs: result.logs,
        total: result.total,
      });
    }

    loadMyActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPhiAccess() {
      if (!canViewPhiAccess) {
        setPhiState({ loading: false, error: '', logs: [], total: 0 });
        return;
      }
      setPhiState((current) => ({ ...current, loading: true, error: '' }));
      const result = await fetchPhiAccessLogs();
      if (cancelled) return;
      if (!result.ok) {
        setPhiState({ loading: false, error: result.message, logs: [], total: 0 });
        return;
      }
      setPhiState({
        loading: false,
        error: '',
        logs: result.logs.slice(0, 5),
        total: result.total,
      });
    }

    loadPhiAccess();
    return () => {
      cancelled = true;
    };
  }, [canViewPhiAccess]);

  return (
    <ProfileSettingsShell
      title={overviewSection.pageTitle}
      subtitle={profileCopy.profileShellSubtitle || overviewSection.pageSubtitle}
      accessSummary={resolvedAccessSummary}
      profileCopy={profileCopy}
    >
    {saasProfile?.onboardingStatus && saasProfile.onboardingStatus !== 'complete' ? (
      <Card className="profile-onboarding-banner">
        <strong>Finish setting up your profile</strong>
        <p>
          Complete the welcome wizard to personalize focus areas and safety preferences.
        </p>
        <Link to="/welcome">
          Continue onboarding →
        </Link>
      </Card>
    ) : null}
    <section className="profile-page">
      <Card>
        <h2 className="profile-card__title">{identityCard.title}</h2>
        {surfaces.profile.showNestedSubtitles && identityCard.subtitle ? (
          <p className="profile-card__subtitle">{identityCard.subtitle}</p>
        ) : null}
        <div className="profile-summary-wrap">
          <ProfileSummaryCard />
        </div>
        {surfaces.profile.showNestedSubtitles ? (
        <div className="profile-detail-grid">
          <div className="card-subtle profile-detail-row"><strong>Name:</strong> {displayName}</div>
          <div className="card-subtle profile-detail-row"><strong>Email:</strong> {email}</div>
          <div className="card-subtle profile-detail-row"><strong>Role:</strong> {role}</div>
          <div className="card-subtle profile-detail-row"><strong>Workspace:</strong> {workspaceName}</div>
        </div>
        ) : (
          <p className="profile-card__workspace" role="status">
            {role} · {workspaceName}
          </p>
        )}

        <ProfileInsightsPanel
          profileCopy={profileCopy}
          activityLogs={activityState.logs}
          activityLoading={activityState.loading}
          activityTotal={activityState.total}
          recentTools={recentToolItems}
          competencySummary={competencySnapshot.summary}
          showCompetency={surfaces.profile.showCompetencyCard}
        />

        <ReceptionJobProfileCard
          role={
            emergencyRole.role ||
            resolvedAccessSummary?.emergencyRole ||
            account?.role ||
            user?.role ||
            role
          }
        />

        <section className="profile-overview-grid" aria-label="Profile tools and preferences">
          <ProfileCopilotCard />

          <div className="profile-overview-card">
            <ProfileSectionHeader
              title={recentToolsCard.title}
              iconKey="clinical-tools"
              accent="action"
              ctaLabel={recentToolsCard.ctaLabel}
              ctaPath={recentToolsCard.ctaPath}
            />
            <div className="profile-overview-list">
              {recentToolItems.length > 0 ? (
                recentToolItems.slice(0, 3).map((tool) => (
                  <div key={tool.id || tool.label} className="profile-overview-row">
                    <span>{tool.label}</span>
                    {tool.route ? <Link to={tool.route}>Open</Link> : null}
                  </div>
                ))
              ) : (
                <p>{recentToolsCard.empty}</p>
              )}
            </div>
          </div>

          {surfaces.profile.showCompetencyCard ? (
          <div className="profile-overview-card profile-competency-status">
            <ProfileSectionHeader
              title={competencyCard.title}
              subtitle={competencyCard.subtitle}
              iconKey="shield-check"
              accent="information"
              ctaLabel={competencyCard.ctaLabel}
              ctaPath={competencyCard.ctaPath}
            />
            <div className="profile-competency-summary">
              <div>
                <strong>{competencySnapshot.summary.overallReadiness}%</strong>
                <span>overall readiness</span>
              </div>
              <div>
                <strong>{competencySnapshot.summary.activeCredentials}</strong>
                <span>active credentials</span>
              </div>
            </div>
            <div
              className="profile-competency-progress"
              aria-label="Profile competency readiness"
              style={{ '--competency-progress': `${competencySnapshot.summary.overallReadiness}%` } as any}
            >
              <span />
            </div>
            <div className="profile-overview-row">
              <span>Training status: {competencySnapshot.summary.trainingStatus}</span>
              <Link to="/credentials">Credentials</Link>
            </div>
            <p>
              {competencySnapshot.competencyGaps.length} competency gaps tracked from simulation,
              skill, CME, and certification state.
            </p>
          </div>
          ) : null}

          <div className="profile-overview-card">
            <ProfileSectionHeader
              title={savedToolsCard.title}
              iconKey="notes"
              accent="neutral"
              ctaLabel={savedToolsCard.ctaLabel}
              ctaPath={savedToolsCard.ctaPath}
            />
            <div className="profile-overview-list">
              {savedTools.length > 0 ? (
                savedTools.slice(0, 3).map((tool) => (
                  <div key={tool.id} className="profile-overview-row">
                    <span>{tool.label}</span>
                    {tool.route ? <Link to={tool.route}>Open</Link> : null}
                  </div>
                ))
              ) : (
                <p>{savedToolsCard.empty}</p>
              )}
            </div>
          </div>

          <div className="profile-overview-card">
            <ProfileSectionHeader
              title={preferencesCard.title}
              iconKey="settings"
              accent="neutral"
              ctaLabel={preferencesCard.ctaLabel}
              ctaPath={preferencesCard.ctaPath}
            />
            <dl className="profile-preference-list">
              <div>
                <dt>Theme</dt>
                <dd>{preferences?.theme || 'system'}</dd>
              </div>
              <div>
                <dt>AI style</dt>
                <dd>{aiPreferences.responseStyle || 'concise'}</dd>
              </div>
              <div>
                <dt>Citations</dt>
                <dd>{aiPreferences.citationLevel || 'standard'}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="profile-activity-card" aria-labelledby="profile-activity-title">
          <div className="profile-activity-card__header">
            <div>
              <h3 id="profile-activity-title">{activityCard.title}</h3>
              {surfaces.profile.showNestedSubtitles && activityCard.subtitle ? (
              <p>{activityCard.subtitle}</p>
              ) : null}
            </div>
            <span className="profile-activity-card__badge">{activityCard.badge || 'My logs'}</span>
          </div>

          {activityState.loading && (
            <div className="profile-activity-state">Loading recent account activity...</div>
          )}

          {!activityState.loading && activityState.error && (
            <div className="profile-activity-state profile-activity-state--error">
              {activityState.error}
            </div>
          )}

          {!activityState.loading && !activityState.error && activityState.logs.length === 0 && (
            <div className="profile-activity-empty">
              <strong>No recent account activity found.</strong>
              <span>
                Your personal audit route is available, but there are no recent events to show.
              </span>
            </div>
          )}

          {!activityState.loading && activityState.logs.length > 0 && (
            <div className="profile-activity-list" aria-label="Recent account activity">
              {activityState.logs.slice(0, 3).map((log) => (
                <article key={log.id || `${log.action}-${log.timestamp}`} className="profile-activity-item">
                  <div>
                    <div className="profile-activity-item__title">{formatAction(log.action)}</div>
                    <div className="profile-activity-item__meta">
                      {formatDate(log.timestamp)} {log.resource ? `· ${log.resource}` : ''}
                    </div>
                  </div>
                  {log.phiAccessed || log.action === 'PHI_ACCESS' ? (
                    <span className="profile-activity-pill profile-activity-pill--phi">PHI</span>
                  ) : (
                    <span className="profile-activity-pill">Account</span>
                  )}
                </article>
              ))}
            </div>
          )}

          <div className="profile-activity-summary">
            <div>
              <span className="profile-activity-summary__value">{activityState.total}</span>
              <span className="profile-activity-summary__label">personal audit events</span>
            </div>
            {surfaces.profile.showPhiActivity ? (
              <div>
                <span className="profile-activity-summary__value">{recentPhiCount}</span>
                <span className="profile-activity-summary__label">recent PHI-marked events</span>
              </div>
            ) : null}
          </div>

          {surfaces.profile.showPhiActivity ? (
          <div className="profile-phi-panel">
            <div>
              <h4>{phiCard.title}</h4>
              {canViewPhiAccess ? (
                <p>
                  Your role can view PHI access visibility. A limited summary is shown here; the full
                  audit log view remains on the protected audit page.
                </p>
              ) : (
                <p>
                  Your role does not include direct PHI access-log visibility. You can request a
                  compliance export instead of opening admin-only logs.
                </p>
              )}
            </div>

            {canViewPhiAccess ? (
              <div className="profile-phi-panel__content">
                {phiState.loading && <span>Loading PHI access summary...</span>}
                {!phiState.loading && phiState.error && (
                  <span className="profile-activity-state--error">{phiState.error}</span>
                )}
                {!phiState.loading && !phiState.error && phiState.logs.length === 0 && (
                  <span>No PHI access events found for the recent window.</span>
                )}
                {!phiState.loading && phiState.logs.length > 0 && (
                  <>
                    <span>{phiState.total} PHI access events in the recent window.</span>
                    <Link to="/audit">Open protected audit logs</Link>
                  </>
                )}
              </div>
            ) : (
              <div className="profile-phi-panel__content">
                <Link to="/settings" className="profile-activity-cta">
                  Request audit/export
                </Link>
              </div>
            )}
          </div>
          ) : null}
        </section>

        <div className="profile-nav-links">
          <Link className="profile-nav-link" to="/profile/settings">Edit profile</Link>
          <Link className="profile-nav-link" to="/profile/tool-preferences">Tool preferences</Link>
          <Link className="profile-nav-link" to="/profile/activity">Activity</Link>
          <Link className="profile-nav-link" to="/profile/workspaces">Manage workspaces</Link>
          <Link className="profile-nav-link" to="/profile/security">Security</Link>
          <Link className="profile-nav-link" to="/settings">Platform settings</Link>
          {canViewPhiAccess && <Link className="profile-nav-link" to="/audit">Audit logs</Link>}
        </div>
        <div className="profile-back-link-wrap">
          <Link to="/dashboard" className="profile-back-link">
            ← Back to Dashboard
          </Link>
        </div>
      </Card>
    </section>
    </ProfileSettingsShell>
  );
};

export default Profile;
