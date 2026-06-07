# SaaS Client Workspace Profiling Report

## Existing Workspace System Found

CareDroid already had a frontend workspace selector and registry. The selector is `src/components/WorkspaceSwitcher.jsx`, backed by `src/contexts/WorkspaceContext.jsx` and the canonical registry exported from `src/config/workspace.config.js`. The registry source remains `src/data/workspaceArchitecture.js`, which was intentionally extended instead of creating another workspace system.

Backend workspace provisioning already existed in `backend/src/modules/workspaces/workspace-taxonomy.ts` and `backend/src/modules/organizations/tenant-provisioning.service.ts`.

## Canonical Workspace Registry

`CARE_WORKSPACES` is now the canonical frontend registry. Each workspace includes:

- `workspaceId`, `label`, `description`
- `allowedOrganizationTypes`, `allowedRoles`
- `defaultAssetPacks`, `defaultAssets`
- `defaultDashboardWidgets`, `defaultAIAgents`
- `defaultNavigationGroups`, `subscriptionTier`, `status`

The registry covers Emergency, ICU, Cardiology, Laboratory, Operations, Fleet, Medical IoT, Education, Research, Governance, Simulation, and AI Evaluation.

## Client Onboarding Profile Model

`buildClientWorkspaceProfile()` creates the local/frontend `ClientProfile` model with:

- Organization identity and type
- Subscription plan and selected products
- Enabled asset packs, assets, and workspaces
- Default workspace and dashboard route
- Users, roles, departments, integrations, and branding

Local/demo persistence uses `careDroid.clientProfile.v1` and dispatches a workspace context refresh event so the existing selector updates immediately.

## Organization Presets

Workspace presets are centralized in `WORKSPACE_ORGANIZATION_PRESETS`:

- Hospital: Emergency, ICU, Cardiology, Laboratory, Operations, Medical IoT, Governance
- Clinic: Cardiology, Laboratory, Governance
- EMS: Emergency, Fleet, Operations
- University: Education, Research, Simulation, Governance
- Research Center: Research, Governance, AI Evaluation
- Long-Term Care: Medical IoT, Laboratory, Operations, Governance

Backend tenant provisioning defaults were aligned with these presets.

## Workspace Assignment Rules

`filterWorkspacesForClient()` applies:

- Organization-enabled workspaces
- Organization type eligibility
- Subscription tier allowance
- Role access
- Optional user workspace assignment

If filtering returns no workspaces, the selector falls back to a safe default and exposes a clear empty-state message.

## Asset Resonance

Workspace changes already flow through `WorkspaceContext`, so the same active workspace feeds dashboard context, `/tools` visible asset IDs, assistant context, command palette workspace entries, route shortcuts, simulations, workflows, maps, IoT, and fleet surfaces. The canonical registry now supplies the workspace assets, agents, widgets, packs, and navigation groups that drive that resonance in local/demo mode.

## Onboarding Flow

`/onboarding` now builds workspace setup from the canonical registry, emits `clientProfile`, `enabledWorkspaces`, `enabledAssetPacks`, `enabledAssets`, and `defaultWorkspace`, and saves a local/demo tenant profile if backend persistence is unavailable. The configured profile summary explicitly shows Organization -> Enabled Workspaces -> Enabled Asset Packs -> Enabled Assets -> User Roles -> Default Dashboard.

## Tenant Admin Flow

`/tenant-admin/workspaces` reuses the existing `TenantAdministrationCenter`. Admins can enable or disable canonical workspaces, assign role and asset-pack defaults, set the default workspace, and preview whether the first loaded role can see the workspace. The raw JSON editor remains as an advanced escape hatch.

## Tests Added

Focused tests cover:

- Hospital, EMS, university, and research center presets
- SaaS workspace registry contract
- Role, subscription, organization, and assignment filtering
- Onboarding payload output with enabled workspaces and client profile
- Tenant admin workspace enable/save behavior

## Remaining Risks

- Backend persistence still depends on seeded assets, packs, and workspace migrations in each environment.
- Some SaaS admin role assignment remains text/JSON based rather than a full invitation workflow.
- Local/demo profile persistence is browser-local and should be replaced by backend tenant persistence in production deployments.
