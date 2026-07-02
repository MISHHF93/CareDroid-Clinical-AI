import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/ui/card';
import ProfileSettingsShell from '../../components/profile/ProfileSettingsShell';
import useProfileShellProps from '../../hooks/useProfileShellProps';
import { resolveProfileShellSection } from '../../config/profileDesignLanguage.config';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { isFutureWorkspace } from '../../config/workspace.config';
import './ProfileIdentityPages.css';

export default function ProfileWorkspaces() {
  const { accessSummary, profileCopy } = useProfileShellProps();
  const workspacesSection = resolveProfileShellSection('workspaces');
  const {
    activeWorkspace,
    workspaces,
    workspaceState,
    switchWorkspace,
    updateProfile,
    saasProfile,
    isLoading,
    error,
  } = useUserIdentity();
  const { switchWorkspace: switchWorkspaceContext } = useWorkspace();
  const visibleWorkspaces = workspaces.filter(
    (workspace) => !isFutureWorkspace(workspace.workspaceKey || workspace.type || workspace.id)
  );

  const handleSwitch = async (workspaceId) => {
    await switchWorkspaceContext(workspaceId);
    await switchWorkspace(workspaceId);
  };

  const handleSetDefault = async (workspace) => {
    await updateProfile?.({ defaultWorkspace: workspace.type || workspace.workspaceKey || workspace.id });
  };

  return (
    <ProfileSettingsShell
      title={workspacesSection.pageTitle}
      subtitle={workspacesSection.pageSubtitle}
      accessSummary={accessSummary}
      profileCopy={profileCopy}
    >
      <div className="profile-identity-page__inner">
        <Card>
          <h2 style={{ marginTop: 0 }}>Change Workspace</h2>
          <div className="profile-identity-row">
            <div>
              <strong>{activeWorkspace?.branding?.displayName || activeWorkspace?.name || 'No active workspace'}</strong>
              <span>{activeWorkspace?.type || 'personal'} workspace</span>
              <span>Default: {saasProfile?.defaultWorkspace || 'not set'}</span>
            </div>
            <select
              aria-label="Active workspace"
              value={workspaceState?.activeWorkspaceId || ''}
              onChange={(event) => handleSwitch(event.target.value)}
              disabled={isLoading}
            >
              {visibleWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.branding?.displayName || workspace.name}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="profile-identity-muted">{error}</p> : null}
        </Card>

        <div className="profile-identity-grid">
          {visibleWorkspaces.map((workspace) => (
            <section key={workspace.id} className="profile-identity-card">
              <h3>{workspace.branding?.displayName || workspace.name}</h3>
              <p>{workspace.type} workspace</p>
              {workspace.workspaceProfile?.description ? <p>{workspace.workspaceProfile.description}</p> : null}
              <p>
                {(workspace.settings?.enabledToolIds || []).length} tools ·{' '}
                {(workspace.settings?.enabledModules || []).join(', ') || 'dashboard'}
              </p>
              <p>
                Widgets:{' '}
                {(workspace.workspaceProfile?.defaultDashboardWidgets || workspace.defaultDashboardWidgets || [])
                  .slice(0, 4)
                  .join(', ') || 'recommended assets'}
              </p>
              <button
                type="button"
                className="profile-identity-button"
                onClick={() => handleSetDefault(workspace)}
                disabled={saasProfile?.defaultWorkspace === (workspace.type || workspace.workspaceKey || workspace.id)}
              >
                {saasProfile?.defaultWorkspace === (workspace.type || workspace.workspaceKey || workspace.id)
                  ? 'Default'
                  : 'Set default'}
              </button>
            </section>
          ))}
        </div>

        <Card>
          <h2 style={{ marginTop: 0 }}>Effective Permissions</h2>
          <p className="profile-identity-muted">
            These permissions combine account role, active workspace membership, and explicit workspace grants.
          </p>
          <div className="profile-identity-list">
            {(workspaceState?.effectivePermissions || []).slice(0, 24).map((permission) => (
              <div key={permission} className="profile-identity-row">
                <strong>{permission}</strong>
              </div>
            ))}
          </div>
        </Card>
        <p className="profile-identity-muted">
          <Link to="/profile/preferences">Adjust display preferences</Link>
        </p>
      </div>
    </ProfileSettingsShell>
  );
}
