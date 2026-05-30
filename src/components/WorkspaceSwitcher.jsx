import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  getCareWorkspaceById,
} from '../config/workspace.config';
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
  const activeWorkspaceId = workspaceIdFromPath(location.pathname);
  const activeWorkspace = getCareWorkspaceById(activeWorkspaceId);
  const ActiveIcon = useMemo(
    () => getWorkspaceIcon(activeWorkspace.icon),
    [activeWorkspace.icon]
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
        value={activeWorkspace.id}
        onChange={(event) => navigate(`/workspace/${event.target.value}`)}
        aria-label="Switch CareDroid workspace"
      >
        {CARE_WORKSPACES.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.label}
          </option>
        ))}
      </select>
    </div>
  );
}
