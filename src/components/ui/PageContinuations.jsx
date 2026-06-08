import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useToolPreferences } from '../../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../../contexts/UserIdentityContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CANONICAL_ROUTES } from '../../config/routes.config';
import { DEFAULT_CARE_WORKSPACE_ID } from '../../config/workspace.config';
import { getUserFacingToolRegistryProjection } from '../../data/toolInventory';
import './PageContinuations.css';

const MAX_SECTION_ITEMS = 3;

function toolPath(tool) {
  return tool?.path || tool?.navigationPath || tool?.route || CANONICAL_ROUTES.tools;
}

function toolLabel(tool) {
  return tool?.name || tool?.label || tool?.title || 'Open asset';
}

function scoreToolForRoute(tool, pathname) {
  const routeTokens = String(pathname || '')
    .split(/[/?#&=_-]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 2);
  if (!routeTokens.length) return 0;

  const blob = [
    tool?.id,
    tool?.name,
    tool?.label,
    tool?.category,
    tool?.description,
    tool?.path,
    tool?.route,
    ...(tool?.workspaceTags || []),
    ...(tool?.aliases || []),
    ...(tool?.useCases || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return routeTokens.reduce((score, token) => score + (blob.includes(token) ? 1 : 0), 0);
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    const id = item?.id || item?.assetId || item?.path || item?.title;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export default function PageContinuations({ className = '', compact = false }) {
  const location = useLocation();
  const {
    activeWorkspaceId,
    activeWorkspace,
    visibleAssetIds = [],
    recommendations = [],
  } = useWorkspace();
  const { recentTools = [] } = useToolPreferences();
  const { activity = null } = useUserIdentity();

  const allTools = useMemo(() => getUserFacingToolRegistryProjection(), []);
  const toolById = useMemo(
    () => Object.fromEntries(allTools.map((tool) => [tool.id, tool])),
    [allTools]
  );
  const workspaceId = activeWorkspaceId || activeWorkspace?.id || DEFAULT_CARE_WORKSPACE_ID;
  const workspaceName = activeWorkspace?.name || activeWorkspace?.label || 'Workspace';
  const workspaceToolIds = visibleAssetIds.length
    ? visibleAssetIds
    : activeWorkspace?.toolIds || activeWorkspace?.settings?.enabledToolIds || [];

  const relatedAssets = useMemo(() => {
    const workspaceTools = workspaceToolIds.length
      ? workspaceToolIds.map((id) => toolById[id]).filter(Boolean)
      : allTools;
    return uniqueById(
      [...workspaceTools].sort(
        (a, b) => scoreToolForRoute(b, location.pathname) - scoreToolForRoute(a, location.pathname)
      )
    ).slice(0, MAX_SECTION_ITEMS);
  }, [allTools, location.pathname, toolById, workspaceToolIds]);

  const recommendedActions = useMemo(() => {
    const recommendationTools = recommendations
      .map((recommendation) => {
        const tool = toolById[recommendation.assetId || recommendation.toolId || recommendation.id];
        if (!tool) return null;
        return {
          id: `recommendation-${tool.id}`,
          title: toolLabel(tool),
          description: recommendation.reason || tool.description || 'Recommended for this workspace.',
          path: toolPath(tool),
        };
      })
      .filter(Boolean);

    return uniqueById([
      ...recommendationTools,
      {
        id: 'recommendations',
        title: 'Open recommendations',
        description: 'Review workspace-aware next-best actions.',
        path: CANONICAL_ROUTES.recommendations,
      },
      {
        id: 'assistant',
        title: 'Ask Assistant',
        description: `Continue with ${workspaceName} context.`,
        path: CANONICAL_ROUTES.assistant,
      },
      {
        id: 'tools',
        title: 'Browse related tools',
        description: 'Find tools filtered by role, workspace, and access.',
        path: CANONICAL_ROUTES.tools,
      },
    ]).slice(0, MAX_SECTION_ITEMS);
  }, [recommendations, toolById, workspaceName]);

  const recentActivity = useMemo(() => {
    const identityRecentTools = (activity?.recentTools || [])
      .map((item) => (typeof item === 'string' ? item : item?.id || item?.toolId))
      .filter(Boolean);
    const recentToolItems = [...recentTools, ...identityRecentTools]
      .map((toolId) => toolById[toolId])
      .filter(Boolean)
      .map((tool) => ({
        id: `recent-${tool.id}`,
        title: toolLabel(tool),
        description: tool.category || 'Recent tool activity',
        path: toolPath(tool),
      }));

    return uniqueById([
      ...recentToolItems,
      {
        id: 'timeline',
        title: 'Open timeline',
        description: 'Review recent workflow, tool, and assistant activity.',
        path: CANONICAL_ROUTES.timeline,
      },
    ]).slice(0, MAX_SECTION_ITEMS);
  }, [activity?.recentTools, recentTools, toolById]);

  return (
    <nav
      className={['page-continuations', compact ? 'page-continuations--compact' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Page continuations"
    >
      <section className="page-continuations__panel" aria-labelledby="page-continuations-related">
        <h2 id="page-continuations-related">Related Assets</h2>
        <div className="page-continuations__links">
          {relatedAssets.map((tool) => (
            <Link key={tool.id} to={toolPath(tool)}>
              <strong>{toolLabel(tool)}</strong>
              <span>{tool.category || tool.description || 'Workspace asset'}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-continuations__panel" aria-labelledby="page-continuations-next">
        <h2 id="page-continuations-next">Recommended Next Actions</h2>
        <div className="page-continuations__links">
          {recommendedActions.map((action) => (
            <Link key={action.id} to={action.path}>
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-continuations__panel" aria-labelledby="page-continuations-recent">
        <h2 id="page-continuations-recent">Recent Activity</h2>
        <div className="page-continuations__links">
          {recentActivity.map((item) => (
            <Link key={item.id} to={item.path}>
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="page-continuations__panel page-continuations__panel--workspace" aria-labelledby="page-continuations-workspace">
        <h2 id="page-continuations-workspace">Back to Workspace</h2>
        <p>Return to the active workspace command surface before moving to another module.</p>
        <Link className="page-continuations__workspace-link" to={`/workspace/${workspaceId}`}>
          Back to {workspaceName}
        </Link>
      </section>
    </nav>
  );
}
