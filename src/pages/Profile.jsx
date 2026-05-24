import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/card';
import { Permission, useUser } from '../contexts/UserContext';
import { fetchMyAuditLogs, fetchPhiAccessLogs } from '../services/auditApi';
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
  const { user, hasPermission } = useUser();
  const [activityState, setActivityState] = useState({
    loading: true,
    error: '',
    logs: [],
    total: 0,
  });
  const [phiState, setPhiState] = useState({
    loading: false,
    error: '',
    logs: [],
    total: 0,
  });

  const canViewPhiAccess = hasPermission(Permission.VIEW_AUDIT_LOGS);
  const displayName = user?.fullName || user?.name || user?.profile?.fullName || '—';
  const email = user?.email || '—';
  const role = user?.role || '—';
  const institution = user?.institution || user?.profile?.institution || '—';
  const recentPhiCount = useMemo(
    () => activityState.logs.filter((log) => log.phiAccessed || log.action === 'PHI_ACCESS').length,
    [activityState.logs]
  );

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
    <div className="profile-page">
      <Card style={{ width: '100%', maxWidth: '820px' }}>
        <h2 style={{ marginTop: 0 }}>Profile</h2>
        <p style={{ color: 'var(--muted-text)', fontSize: '14px' }}>
          Review your account profile, recent activity, and access visibility.
        </p>
        <div style={{
          marginTop: '18px',
          display: 'grid',
          gap: '12px',
          fontSize: '14px'
        }}>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Name:</strong> {displayName}</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Email:</strong> {email}</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Role:</strong> {role}</div>
          <div className="card-subtle" style={{ padding: '12px 16px' }}><strong>Institution:</strong> {institution}</div>
        </div>

        <section className="profile-activity-card" aria-labelledby="profile-activity-title">
          <div className="profile-activity-card__header">
            <div>
              <h3 id="profile-activity-title">Profile Activity / My Access Logs</h3>
              <p>
                Recent account activity comes from your protected audit log endpoint. Admin-only audit
                logs remain behind role-based access control.
              </p>
            </div>
            <span className="profile-activity-card__badge">My logs</span>
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
              {activityState.logs.map((log) => (
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
            <div>
              <span className="profile-activity-summary__value">{recentPhiCount}</span>
              <span className="profile-activity-summary__label">recent PHI-marked events</span>
            </div>
          </div>

          <div className="profile-phi-panel">
            <div>
              <h4>PHI Access Visibility</h4>
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
                    <Link to="/audit-logs">Open protected audit logs</Link>
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
        </section>

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
          {canViewPhiAccess && <Link to="/audit-logs">Audit logs</Link>}
        </div>
        <div style={{ marginTop: '18px', fontSize: '12px', color: 'var(--muted-text)' }}>
          <Link to="/dashboard" style={{ color: '#00FF88', textDecoration: 'none' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Profile;
