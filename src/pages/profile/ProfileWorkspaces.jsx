import React from 'react';
import Card from '../../components/ui/card';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import './ProfileIdentityPages.css';

export default function ProfileWorkspaces() {
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

  const handleSwitch = async (workspaceId) => {
    await switchWorkspace(workspaceId);
  };

  const handleSetDefault = async (workspace) => {
    await updateProfile?.({ defaultWorkspace: workspace.type || workspace.workspaceKey || workspace.id });
  };

  return (
    <section className="profile-identity-page">
      <div className="profile-identity-page__inner">
        <header className="profile-identity-page__header">
          <h1>Workspaces</h1>
          <p>Switch between personal, hospital, emergency, fleet, research, and admin operating contexts.</p>
        </header>

        <Card>
          <h2 style={{ marginTop: 0 }}>Active Workspace</h2>
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
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.branding?.displayName || workspace.name}
                </option>
              ))}
            </select>
          </div>
          {error ? <p className="profile-identity-muted">{error}</p> : null}
        </Card>

        <div className="profile-identity-grid">
          {workspaces.map((workspace) => (
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
                className="profile-identity-button profile-identity-button--secondary"
                onClick={() => handleSwitch(workspace.id)}
                disabled={workspace.id === workspaceState?.activeWorkspaceId}
              >
                {workspace.id === workspaceState?.activeWorkspaceId ? 'Active' : 'Switch'}
              </button>
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
      </div>
    </section>
  );
}
