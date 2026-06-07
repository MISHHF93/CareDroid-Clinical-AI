/**
 * Canonical workspace configuration projection.
 *
 * Workspace data remains in `data/workspaceArchitecture.js` because existing
 * inventory/report code imports it directly. New active UI consumers should use
 * this module.
 */
export {
  CARE_WORKSPACES,
  CLIENT_PROFILE_STORAGE_KEY,
  DEFAULT_CARE_WORKSPACE_ID,
  WORKSPACE_ROUTE_SHORTCUTS,
  buildCareWorkspaceModel,
  buildClientWorkspaceProfile,
  buildWorkspaceSetupFromRegistry,
  filterWorkspacesForClient,
  getCareWorkspaceById,
  getCareWorkspaceRouteEntries,
  getCareWorkspaceToolEntries,
  getCanonicalWorkspaceRegistry,
  getWorkspacePresetForOrganizationType,
  readLocalClientProfile,
  saveLocalClientProfile,
  WORKSPACE_ORGANIZATION_PRESETS,
} from '../data/workspaceArchitecture';
