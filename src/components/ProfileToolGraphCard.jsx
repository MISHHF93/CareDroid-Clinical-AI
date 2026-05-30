import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useConversation } from '../contexts/ConversationContext';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUser } from '../contexts/UserContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import {
  buildProfileToolGraph,
  buildUserToolProfile,
  getProfileAssistantRecommendations,
} from '../data/profileToolSegmentation';
import { getUserFacingToolRegistryProjection } from '../data/toolInventory';
import { applyRegistryToolLaunch } from '../navigation/registryToolLaunch';

function ToolButton({ tool, onLaunch }) {
  return (
    <button type="button" className="profile-tool-graph-card__tool" onClick={() => onLaunch(tool)}>
      <strong>{tool.name || tool.label || tool.id}</strong>
      <span>{tool.category}</span>
    </button>
  );
}

export default function ProfileToolGraphCard() {
  const navigate = useNavigate();
  const toolPreferences = useToolPreferences();
  const { user } = useUser();
  const { account, preferences, activeWorkspace, workspaceState } = useUserIdentity();
  const { activeWorkspaceId, workspaces } = useWorkspace();
  const { selectTool, setActiveTool, addMessage } = useConversation();

  const tools = useMemo(() => getUserFacingToolRegistryProjection(), []);
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
  const assistantRecommendations = useMemo(
    () => getProfileAssistantRecommendations(profile, tools, 4),
    [profile, tools]
  );

  const launchTool = (tool) => {
    applyRegistryToolLaunch(tool.id, {
      navigate,
      addMessage,
      selectTool,
      setActiveTool,
      recordToolAccess: toolPreferences.recordToolAccess,
    });
  };

  const pinnedCalculators = graph.pinnedTools.filter((tool) => tool.category === 'Calculator').slice(0, 4);
  const recommendedTools = graph.recommendedTools.slice(0, 5);
  const recentTools = graph.recentTools.slice(0, 4);
  const specialtyTools = graph.specialtyTools.slice(0, 4);
  const workspaceTools = graph.workspaceTools.slice(0, 4);

  return (
    <section className="profile-tool-graph-card" aria-labelledby="profile-tool-graph-title">
      <div className="profile-tool-graph-card__header">
        <div>
          <p className="profile-tool-graph-card__eyebrow">Profile Tool Graph Card</p>
          <h2 id="profile-tool-graph-title">Your Clinical Toolkit</h2>
          <p>
            {profile.role} · {profile.specialty} · {profile.workspace}
          </p>
        </div>
        <Link to="/profile/tool-preferences">Tune toolkit</Link>
      </div>

      <div className="profile-tool-graph-card__metrics" aria-label="Profile tool graph metrics">
        <span><strong>{graph.counts.visible}</strong> visible</span>
        <span><strong>{graph.counts.recommended}</strong> recommended</span>
        <span><strong>{graph.counts.restricted}</strong> restricted</span>
        <span><strong>{graph.counts.pinned}</strong> pinned</span>
        <span><strong>{graph.counts.recent}</strong> recent</span>
        <span><strong>{graph.counts.specialtyCoverage}</strong> specialty coverage</span>
      </div>

      <div className="profile-tool-graph-card__columns">
        <div>
          <h3>Recommended tools</h3>
          <div className="profile-tool-graph-card__list">
            {recommendedTools.map((tool) => <ToolButton key={tool.id} tool={tool} onLaunch={launchTool} />)}
          </div>
        </div>
        <div>
          <h3>Pinned calculators</h3>
          <div className="profile-tool-graph-card__list">
            {pinnedCalculators.length ? (
              pinnedCalculators.map((tool) => <ToolButton key={tool.id} tool={tool} onLaunch={launchTool} />)
            ) : (
              <span className="profile-tool-graph-card__empty">Pin calculators from /tools.</span>
            )}
          </div>
        </div>
        <div>
          <h3>Recent tools</h3>
          <div className="profile-tool-graph-card__list">
            {recentTools.length ? (
              recentTools.map((tool) => <ToolButton key={tool.id} tool={tool} onLaunch={launchTool} />)
            ) : (
              <span className="profile-tool-graph-card__empty">Recently used tools will appear here.</span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tool-graph-card__coverage">
        <span>Specialty-specific: {specialtyTools.map((tool) => tool.name).join(', ') || 'No specialty-specific tools yet'}</span>
        <span>Workspace-specific: {workspaceTools.map((tool) => tool.name).join(', ') || 'No workspace-specific tools yet'}</span>
        <span>Assistant context: {assistantRecommendations.map((item) => item.label).join(', ')}</span>
      </div>
    </section>
  );
}
