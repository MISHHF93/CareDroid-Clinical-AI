import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import ProfileSettingsShell from '../../components/profile/ProfileSettingsShell';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { resolveProfileShellSection } from '../../config/profileDesignLanguage.config';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import './ProfileIdentityPages.css';

function formatDate(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

function ActivityList({ title, items = [] as any[] }) {
  return (
    <section className="profile-identity-card">
      <h3>{title}</h3>
      {items.length === 0 ? (
        <p>No safe activity recorded yet.</p>
      ) : (
        <div className="profile-identity-list">
          {items.map((item) => (
            <div key={item.id || `${item.label}-${item.occurredAt}`} className="profile-identity-row">
              <div>
                <strong>{item.label}</strong>
                <span>{formatDate(item.occurredAt)}</span>
              </div>
              {item.route ? <Link to={item.route}>Open</Link> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ProfileActivity() {
  const { accessSummary, profileCopy } = useProfileShellProps();
  const activitySection = resolveProfileShellSection('activity');
  const { activity, audit } = useUserIdentity();

  return (
    <ProfileSettingsShell
      title={activitySection.pageTitle}
      subtitle={activitySection.pageSubtitle}
      accessSummary={accessSummary}
      profileCopy={profileCopy}
    >
      <div className="profile-identity-page__inner">
        <div className="profile-identity-grid">
          <ActivityList title="Recent tools" items={activity?.recentTools || []} />
          <ActivityList title="Recent calculators" items={activity?.recentCalculators || []} />
          <ActivityList title="Recent AI chats" items={activity?.recentAiChats || []} />
          <ActivityList title="Recent fleet activity" items={activity?.recentFleetActivity || []} />
          <ActivityList title="Recent IoT activity" items={activity?.recentIotActivity || []} />
        </div>

        <Card>
          <h2 className="u-mt-0">Audit Visibility</h2>
          <p className="profile-identity-muted">
            Compliance-grade audit events remain protected. This page shows only safe current-user summaries.
          </p>
          <div className="profile-identity-list">
            {(audit?.recentEvents || []).slice(0, 5).map((event) => (
              <div key={event.id} className="profile-identity-row">
                <div>
                  <strong>{String(event.action || 'audit event').replace(/_/g, ' ')}</strong>
                  <span>{formatDate(event.timestamp)}</span>
                </div>
                {event.phiAccessed ? <span>PHI audited</span> : <span>Account</span>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </ProfileSettingsShell>
  );
}
