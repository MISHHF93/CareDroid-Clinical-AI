/**
 * Canonical workspace configuration projection.
 *
 * Workspace data remains in `data/workspaceArchitecture.ts` because existing
 * inventory/report code imports it directly. New active UI consumers should use
 * this module.
 */
export {
  CARE_WORKSPACES,
  CLIENT_PROFILE_STORAGE_KEY,
  DEFAULT_CARE_WORKSPACE_ID,
  FUTURE_WORKSPACE_IDS,
  FUTURE_WORKSPACE_LIFECYCLE,
  WORKSPACE_ROUTE_SHORTCUTS,
  WORKSPACE_FUNCTIONALITY_MODES,
  buildCareWorkspaceModel,
  buildClientWorkspaceProfile,
  buildWorkspaceModeModel,
  buildWorkspaceSetupFromRegistry,
  filterWorkspacesForClient,
  getActiveWorkspaceRegistry,
  getCareWorkspaceById,
  getCareWorkspaceRouteEntries,
  getCareWorkspaceToolEntries,
  getCanonicalWorkspaceRegistry,
  getWorkspaceFunctionalityMode,
  getWorkspacePresetForOrganizationType,
  getWorkspaceSubpageById,
  getWorkspaceSubpageEntries,
  isFutureWorkspace,
  readLocalClientProfile,
  saveLocalClientProfile,
  WORKSPACE_ORGANIZATION_PRESETS,
} from '../data/workspaceArchitecture';
