import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  DEFAULT_CARE_WORKSPACE_ID,
  getCareWorkspaceById,
} from '../config/workspace.config';
import { useTenantContext } from '../contexts/TenantContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { NavIcon } from '../navigation/NavIcon';
import { getWorkspaceIcon } from '../navigation/iconRegistry';
import './WorkspaceSwitcher.css';

function workspaceIdFromPath(pathname) {
  const match = String(pathname || '').match(/^\/workspace\/([^/]+)/);
  return match?.[1] || DEFAULT_CARE_WORKSPACE_ID;
}

export default function WorkspaceSwitcher({ compact = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeWorkspaceId: contextWorkspaceId,
    activeWorkspace: contextActiveWorkspace,
    switchWorkspace,
    workspaces,
    workspaceEmptyState,
  } = useWorkspace();
  const { refreshTenantContext } = useTenantContext();
  const { refreshIdentity } = useUserIdentity();
  const activeWorkspaceId = contextWorkspaceId || workspaceIdFromPath(location.pathname);
  const activeWorkspace = contextActiveWorkspace || getCareWorkspaceById(activeWorkspaceId);
  const switcherWorkspaces = workspaces?.length ? workspaces : [getCareWorkspaceById(DEFAULT_CARE_WORKSPACE_ID)];
  const ActiveIcon = useMemo(
    () => getWorkspaceIcon(activeWorkspace.icon || activeWorkspace.workspaceProfile?.icon),
    [activeWorkspace.icon, activeWorkspace.workspaceProfile?.icon]
  );

  return (
    <div className={`workspace-switcher${compact ? ' workspace-switcher--compact' : ''}`}>
      <label htmlFor="care-workspace-switcher" className="workspace-switcher__label">
        <NavIcon icon={ActiveIcon} size={16} aria-hidden />
        <span>Workspace</span>
      </label>
      <select
        id="care-workspace-switcher"
        className="workspace-switcher__select"
        value={activeWorkspace.id || activeWorkspace.workspaceId}
        onChange={async (event) => {
          const nextWorkspaceId = event.target.value;
          await switchWorkspace(nextWorkspaceId);
          await refreshTenantContext();
          await refreshIdentity();
          navigate(`/workspace/${nextWorkspaceId}`);
        }}
        aria-label="Switch CareDroid workspace"
      >
        {switcherWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.label || workspace.name}
          </option>
        ))}
      </select>
      {workspaceEmptyState ? <p className="workspace-switcher__empty">{workspaceEmptyState}</p> : null}
    </div>
  );
}
