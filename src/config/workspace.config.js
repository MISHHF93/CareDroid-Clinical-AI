/**
 * Canonical workspace configuration projection.
 *
 * Workspace data remains in `data/workspaceArchitecture.js` because existing
 * inventory/report code imports it directly. New active UI consumers should use
 * this module.
 */
export {
  CARE_WORKSPACES,
  DEFAULT_CARE_WORKSPACE_ID,
  WORKSPACE_ROUTE_SHORTCUTS,
  buildCareWorkspaceModel,
  getCareWorkspaceById,
  getCareWorkspaceRouteEntries,
  getCareWorkspaceToolEntries,
} from '../data/workspaceArchitecture';
