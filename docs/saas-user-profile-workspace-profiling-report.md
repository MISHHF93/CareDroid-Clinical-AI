# SaaS User Profile And Workspace Profiling Report

## SaaS Profile Model

CareDroid now exposes a normalized `saasProfile` from `/api/profile/me` alongside the existing account, professional, preferences, workspace, activity, security, and audit sections. The profile includes `userId`, `organizationId`, `organizationType`, `displayName`, `email`, `role`, `specialty`, `department`, `defaultWorkspace`, `allowedWorkspaces`, `permissions`, `subscriptionEntitlements`, `enabledAssetPacks`, `pinnedAssets`, `hiddenAssets`, `recentAssets`, `preferredAIStyle`, `themePreference`, `compactMode`, and `onboardingStatus`.

The backend preserves existing storage: `UserProfile` stores organization and role profile identifiers, `ProfessionalProfile` stores specialty and department details, and `UserPreference` JSON stores workspace defaults, pins, hidden assets, recents, entitlements, packs, AI style, theme, compact mode, and onboarding state.

## Workspace Profile Model

Workspace taxonomy covers Emergency, ICU, Cardiology, Laboratory, Pharmacy, Operations, Fleet, Medical IoT, Education, Research, Governance, and Admin. Each workspace settings payload includes a `workspaceProfile` with `workspaceId`, `name`, `description`, `allowedRoles`, `intendedDepartments`, `defaultAssets`, `recommendedAssetPacks`, `defaultDashboardWidgets`, `recommendedAIAgents`, `visibleNavigationGroups`, `restrictedAssets`, and `defaultFilters`.

## Roles And Organizations

Canonical roles include emergency physician, ICU physician, cardiologist, nurse, pharmacist, lab technician, biomedical engineer, fleet operator, hospital administrator, researcher, educator, student, compliance officer, and platform admin. Organization types include hospital, clinic, EMS, university, research center, long-term care, telehealth, and government.

## Permission And Asset Filtering

Effective access now returns legacy `accessState` plus SaaS `effectiveAccessState`: visible, recommended, pinned, hidden, restricted, locked, demo-only, or unsupported. Ordering follows pinned assets, workspace recommendations, role recommendations, recent assets, then all permitted assets. Hidden assets remain restorable through profile tool preferences. Locked assets remain visible only in the locked view with access explanations.

## Personalization

`/dashboard` renders the active organization, workspace, role, recommended assets, pinned and recent asset counts, enabled asset packs, workspace widgets, notifications, and recommended AI agents. `/tools` uses the SaaS filter model: Recommended for Me, My Workspace, My Department, My Role, My Asset Packs, All Permitted, Locked, Hidden, Recent, and Favorites.

## Assistant Context

Assistant requests carry organization, workspace, role, specialty, department, allowed assets, enabled packs, recent assets, pinned assets, and permissions. Backend chat sanitizes this context, marks it as client-supplied, and uses it only as contextual metadata. Contextual suggestions now cover emergency chest pain, fleet active units, and biomedical/offline device prompts.

## Tenant Isolation

Workspace membership checks continue to gate workspace reads and switches. Platform asset context resolves organization entitlements server-side. Workspace switch and profile update audit events include tenant identifiers when available. Memory fabric context is tenant scoped and filters organization/workspace memory before returning recommendations.

## Tests Added

Focused frontend tests were updated for SaaS tool filters and assistant payload context. Existing memory fabric tests already cover tenant-scoped memory filtering and audit metadata.

## Remaining Risks

Some organization administration flows still need deeper admin assignment UX for roles, workspace grants, asset pack assignments, and permissions. Backend SaaS profile fields currently reuse JSON preference storage; a future migration can promote high-volume fields to first-class columns if reporting or indexing needs grow.

