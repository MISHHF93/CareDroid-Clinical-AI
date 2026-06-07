import { useMemo, useState } from 'react';
import Card from '../../components/ui/card';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useUser } from '../../contexts/UserContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  buildProfileToolGraph,
  buildUserToolProfile,
  ORGANIZATION_TYPES,
  PROFILE_DEPARTMENTS,
  PROFILE_ROLES,
  PROFILE_SPECIALTIES,
  PROFILE_TRAINING_LEVELS,
} from '../../data/profileToolSegmentation';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import './ProfileIdentityPages.css';

export default function ProfileToolPreferences() {
  const toolPreferences = useToolPreferences();
  const {
    pinned,
    hiddenTools,
    profileSettings,
    togglePinned,
    toggleHidden,
    updateProfileSettings,
    resetToolRecommendations,
  } = toolPreferences;
  const { user } = useUser();
  const { account, preferences, activeWorkspace, workspaceState, updateProfile, saasProfile } = useUserIdentity();
  const { workspaces, activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const tools = useMemo(() => getUserFacingToolRegistryProjection(), []);
  const [status, setStatus] = useState('');

  const localActiveWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId),
    [activeWorkspaceId, workspaces]
  );
  const profile = useMemo(
    () =>
      buildUserToolProfile({
        account,
        user,
        preferences,
        activeWorkspace: activeWorkspace || localActiveWorkspace,
        activeWorkspaceId: workspaceState?.activeWorkspaceId || activeWorkspaceId,
        toolPreferences,
        permissions: workspaceState?.effectivePermissions || [],
      }),
    [
      account,
      activeWorkspace,
      activeWorkspaceId,
      localActiveWorkspace,
      preferences,
      toolPreferences,
      user,
      workspaceState?.activeWorkspaceId,
      workspaceState?.effectivePermissions,
    ]
  );
  const graph = useMemo(() => buildProfileToolGraph({ tools, profile }), [profile, tools]);
  const pinnedToolSet = useMemo(() => new Set(pinned), [pinned]);
  const hiddenToolSet = useMemo(() => new Set(hiddenTools), [hiddenTools]);

  const updateSetting = async (field, value) => {
    updateProfileSettings({ [field]: value });
    if (field === 'defaultWorkspace') setActiveWorkspaceId(value);
    const backendField =
      field === 'compactToolView'
        ? { compactMode: value }
        : field === 'responseStyle'
          ? { preferredAIStyle: value }
          : { [field]: value };
    await updateProfile?.(backendField);
    setStatus('Tool preferences saved.');
  };

  const handlePinnedToggle = async (toolId) => {
    const nextPinned = pinnedToolSet.has(toolId)
      ? pinned.filter((id) => id !== toolId)
      : [...pinned, toolId];
    togglePinned(toolId);
    await updateProfile?.({ pinnedAssets: nextPinned });
    setStatus(pinnedToolSet.has(toolId) ? 'Tool unpinned.' : 'Tool pinned.');
  };

  const handleHiddenToggle = async (toolId) => {
    const nextHidden = hiddenToolSet.has(toolId)
      ? hiddenTools.filter((id) => id !== toolId)
      : [...hiddenTools, toolId];
    toggleHidden(toolId);
    await updateProfile?.({ hiddenAssets: nextHidden });
    setStatus(hiddenToolSet.has(toolId) ? 'Tool restored.' : 'Tool hidden.');
  };

  const handleReset = () => {
    resetToolRecommendations();
    setStatus('Recommendations reset. Pinned tools are preserved.');
  };

  const preferenceRows = useMemo(() => {
    const rows = [];
    hiddenTools.forEach((toolId) => {
      const hiddenTool = graph.tools.find((tool) => tool.id === toolId);
      if (hiddenTool && !rows.some((tool) => tool.id === hiddenTool.id)) rows.push(hiddenTool);
    });
    graph.visibleTools.forEach((tool) => {
      if (!rows.some((row) => row.id === tool.id)) rows.push(tool);
    });
    return rows.slice(0, 40);
  }, [graph.tools, graph.visibleTools, hiddenTools]);

  return (
    <section className="profile-identity-page">
      <div className="profile-identity-page__inner">
        <header className="profile-identity-page__header">
          <h1>Tool Preferences</h1>
          <p>Personalize which tools are recommended, pinned, hidden, grouped, and prioritized for your profile.</p>
        </header>

        <Card>
          <form className="profile-identity-form" onSubmit={(event) => event.preventDefault()}>
            <div className="profile-identity-muted">
              Backend SaaS role: {saasProfile?.role || profile.role} · default workspace:{' '}
              {saasProfile?.defaultWorkspace || profileSettings.defaultWorkspace || activeWorkspaceId}
            </div>
            <label>
              Role
              <select value={profileSettings.role || profile.role} onChange={(event) => updateSetting('role', event.target.value)}>
                {PROFILE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Specialty
              <select value={profileSettings.specialty || profile.specialty} onChange={(event) => updateSetting('specialty', event.target.value)}>
                {PROFILE_SPECIALTIES.map((specialty) => <option key={specialty} value={specialty}>{specialty}</option>)}
              </select>
            </label>
            <label>
              Department
              <select value={profileSettings.department || profile.department} onChange={(event) => updateSetting('department', event.target.value)}>
                {PROFILE_DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
              </select>
            </label>
            <label>
              Default workspace
              <select value={profileSettings.defaultWorkspace || activeWorkspaceId} onChange={(event) => updateSetting('defaultWorkspace', event.target.value)}>
                {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
              </select>
            </label>
            <label>
              Training level
              <select value={profileSettings.trainingLevel || profile.trainingLevel} onChange={(event) => updateSetting('trainingLevel', event.target.value)}>
                {PROFILE_TRAINING_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
              </select>
            </label>
            <label>
              Organization type
              <select value={profileSettings.organizationType || profile.organizationType} onChange={(event) => updateSetting('organizationType', event.target.value)}>
                {ORGANIZATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span>
                <input
                  type="checkbox"
                  checked={Boolean(profileSettings.compactToolView)}
                  onChange={(event) => updateSetting('compactToolView', event.target.checked)}
                />{' '}
                Compact tool view
              </span>
            </label>
            <div className="profile-identity-actions">
              <button type="button" className="profile-identity-button" onClick={handleReset}>
                Reset recommendations
              </button>
              {status ? <span className="profile-identity-muted">{status}</span> : null}
            </div>
          </form>
        </Card>

        <section className="profile-identity-card" aria-labelledby="profile-tool-graph-settings-title">
          <h3 id="profile-tool-graph-settings-title">Profile Tool Graph</h3>
          <div className="profile-identity-list">
            <div className="profile-identity-row">
              <div><strong>{graph.counts.visible}</strong><span>Visible tools</span></div>
              <div><strong>{graph.counts.recommended}</strong><span>Recommended tools</span></div>
              <div><strong>{graph.counts.restricted}</strong><span>Restricted tools</span></div>
              <div><strong>{graph.counts.specialtyCoverage}</strong><span>Specialty coverage</span></div>
            </div>
          </div>
        </section>

        <section className="profile-identity-card" aria-labelledby="profile-tool-preference-list-title">
          <h3 id="profile-tool-preference-list-title">Pin or hide tools</h3>
          <div className="profile-identity-list">
            {preferenceRows.map((tool) => (
              <div key={tool.id} className="profile-identity-row">
                <div>
                  <strong>{tool.name}</strong>
                  <span>
                    {tool.category} · {hiddenToolSet.has(tool.id) ? 'hidden' : `score ${tool.profileScore}`}
                  </span>
                </div>
                <div className="profile-identity-actions">
                  <button type="button" className="profile-identity-button" onClick={() => handlePinnedToggle(tool.id)}>
                    {pinnedToolSet.has(tool.id) ? 'Unpin tool' : 'Pin tool'}
                  </button>
                  <button type="button" className="profile-identity-button" onClick={() => handleHiddenToggle(tool.id)}>
                    {hiddenToolSet.has(tool.id) ? 'Show tool' : 'Hide tool'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
