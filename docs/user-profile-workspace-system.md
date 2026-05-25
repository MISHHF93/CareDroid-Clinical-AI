# CareDroid User Profile + Workspace Identity System

## Purpose

CareDroid needs a first-class user identity and workspace system that is more than login state. The profile should become the user's operational profile: it should personalize the dashboard, AI assistant, tools, calculators, fleet views, Medical IoT, hospital maps, notifications, settings, sidebar, access checks, audit history, and workspace selection.

This document is a planning artifact only. It does not propose a second auth flow or immediate implementation. The intended direction is to extend the existing auth, profile, RBAC, audit, notification, tool preference, and workspace surfaces into one coherent identity architecture.

## Current User/Auth Investigation

### Frontend Findings

Current auth and identity surfaces:

- `src/pages/Auth.jsx` handles email/password login, signup, 2FA verification, OAuth entry links, magic-link request, and local direct sign-in.
- `src/pages/AuthCallback.jsx` accepts `?token=...`, stores it through `UserContext`, and redirects to `/dashboard`.
- `src/contexts/UserContext.jsx` persists `caredroid_access_token` and `caredroid_user_profile` in `localStorage`, fetches `/api/users/profile` when a token exists without a loaded user, and derives permissions from a static frontend `RolePermissions` map.
- `src/App.jsx` protects routes through `requiresAuth`, `publicOnly`, `permission`, and `requireAllPermissions`, then delegates permission UI enforcement to `PermissionGate`.
- `src/pages/Profile.jsx` shows a basic profile summary, recent personal audit logs, and PHI access visibility based on `VIEW_AUDIT_LOGS`.
- `src/pages/ProfileSettings.jsx` edits backend-backed profile fields: display name, institution, specialty, license number, country, and timezone.
- `src/pages/Settings.jsx` owns app settings, theme preference, privacy export/deletion, and billing.
- `src/components/NotificationPreferences.jsx` owns backend-backed notification preferences, notification history, unread count, and device registrations.
- `src/contexts/ThemeContext.jsx` stores theme preference locally under `caredroid_theme_preference`.
- `src/contexts/ToolPreferencesContext.jsx` stores favorite, pinned, and recent tools locally under `careDroid.toolPrefs.v1`.
- `src/contexts/WorkspaceContext.jsx` stores local tool-filter workspaces under `careDroid.workspaces.v1`.
- `src/components/Sidebar.jsx` shows the current user name/role, notification count, local workspace selector, tool favorites, pinned tools, and recent tools.

Current frontend auth flow:

1. The user signs in on `/auth`, completes OAuth callback on `/auth-callback`, verifies 2FA, or starts a dev session.
2. `UserContext` stores the access token and optional user profile in `localStorage`.
3. `isAuthenticated` is `Boolean(authToken)`.
4. If a token exists but no user is loaded, `UserContext` calls `/api/users/profile`.
5. Route access is enforced in `src/App.jsx`, and feature-level UI gates rely on static frontend permissions.

Current frontend user model:

- Loose user shape with fields such as `id`, `email`, `role`, `name`, `fullName`, `institution`, and nested `profile`.
- Profile fields are partially normalized in the backend response but consumed defensively across the UI.
- There is no single frontend `OperationalProfile` contract that combines professional profile, preferences, workspace identity, permissions, activity, AI preferences, and personalization.

Current frontend workspace model:

- Workspaces are local UI tool filters, not identity workspaces.
- Default workspaces include `all`, `diagnostic`, `calculator`, `reference`, `fleet`, and `hospital-operations`.
- A user can create local workspaces with selected tool IDs.
- These workspaces are not backed by the backend, not tied to organization membership, not permission-scoped, and not reflected in JWTs or audit logs.

Frontend gaps:

- No backend-backed active workspace, recent workspaces, organization, department, team, or membership model.
- No workspace-scoped permissions for fleet, Medical IoT, hospital maps, dashboards, or AI tools.
- No unified profile route tree. Existing routes include `/profile`, `/profile-settings`, `/settings`, `/notifications`, `/two-factor-setup`, and `/audit-logs`.
- No backend persistence for theme, compact mode, accessibility settings, dashboard defaults, AI preferences, saved prompts, pinned tools, or recent tools.
- No profile summary widgets on the command dashboard or assistant dashboard.
- No single identity context that combines user, active workspace, effective permissions, profile completeness, preferences, and personalization.
- Frontend role permissions are duplicated from backend RBAC and can drift.

### Backend Findings

Current backend identity surfaces:

- `backend/src/modules/auth/auth.module.ts`, `auth.controller.ts`, and `auth.service.ts` support register, login, 2FA login verification, OAuth, dev sessions, magic-link placeholder behavior, and `/auth/me`.
- `backend/src/modules/users/users.module.ts`, `users.controller.ts`, and `users.service.ts` expose `/api/users/profile` read/update behavior.
- `backend/src/modules/users/entities/user.entity.ts` defines a global `User` with `email`, `passwordHash`, `emailVerified`, `isActive`, global `role`, login metadata, encrypted PHI placeholders, profile, OAuth accounts, 2FA, subscription, and audit logs.
- `backend/src/modules/users/entities/user-profile.entity.ts` defines a one-to-one `UserProfile` with `fullName`, `firstName`, `lastName`, `institution`, `specialty`, `licenseNumber`, `country`, `languagePreference`, `timezone`, `verified`, `trustScore`, `avatarUrl`, PHI placeholders, and consent fields.
- `backend/src/modules/users/dto/update-profile.dto.ts` allows profile updates for name, institution, specialty, license number, country, language preference, timezone, and avatar URL.
- `backend/src/modules/auth/enums/permission.enum.ts` and `backend/src/modules/auth/config/role-permissions.config.ts` define static global RBAC.
- `backend/src/modules/auth/guards/authorization.guard.ts` checks route permissions by global `User.role` and logs grants/denials to audit.
- `backend/src/modules/audit` provides hash-chained audit logging, personal logs, PHI access logs, integrity verification, and statistics.
- `backend/src/modules/notifications` already persists notification preferences and devices per user.

Current backend auth flow:

1. Register creates `User`, `UserProfile`, free `Subscription`, and an audit log.
2. Login loads user with `profile`, `subscription`, and `twoFactor`, checks password and active state, records login metadata, writes audit, and returns access/refresh tokens plus a sanitized user unless 2FA is required.
3. JWT payload contains `sub`, `email`, and `role`.
4. `JwtStrategy` rehydrates the current user with `profile` and `subscription`.
5. `/api/users/profile` returns the current user with profile/subscription and logs profile read as PHI access.
6. `PATCH /api/users/profile` requires `WRITE_PHI`, sanitizes allowed fields, saves `UserProfile`, and logs `PROFILE_UPDATE`.

Current backend user model:

- Single global account.
- Single global role per user: `physician`, `nurse`, `student`, or `admin`.
- One profile per user.
- One subscription per user.
- No organization, tenant, workspace, membership, invitation, team, or workspace role entity.

Backend gaps:

- No true `Workspace`, `Organization`, `WorkspaceMembership`, `WorkspaceRole`, `WorkspacePermission`, or `WorkspaceInvitation` entities.
- No `activeWorkspaceId`, workspace membership list, or workspace claim in JWT/auth context.
- No workspace-aware guards or decorators.
- No per-resource permission model for fleet assets, IoT devices, hospital maps, departments, teams, or dashboards.
- No audit fields for `workspaceId`, `organizationId`, `membershipId`, `actorUserId`, or `targetUserId`.
- No unified preference model beyond profile fields and notification preferences.
- No personalization module for saved prompts, recent AI activity, recommendations, dashboard layout, pinned calculators, or saved workflows.

## Proposed Profile Model

The profile should be split conceptually into account identity, professional profile, preferences, AI personalization, workspace membership, and activity. Some fields already exist on `User` or `UserProfile`; the rest should be added through focused modules rather than overloading auth.

### Operational Profile Contract

```ts
type OperationalProfile = {
  userId: string;
  account: ProfileAccount;
  professional: ProfessionalProfile;
  preferences: UserPreferences;
  aiPersonalization: AiPersonalizationProfile;
  workspace: WorkspaceIdentityState;
  activity: UserActivitySummary;
  security: UserSecuritySummary;
  audit: UserAuditSummary;
};
```

### Basic Identity

```ts
type ProfileAccount = {
  userId: string;
  displayName: string;
  username?: string;
  email: string;
  avatarUrl?: string;
  profession?: string;
  specialty?: string;
  organization?: string;
  department?: string;
  role: 'student' | 'nurse' | 'physician' | 'admin';
  country?: string;
  timezone?: string;
  language?: string;
  verified?: boolean;
  trustScore?: number;
};
```

Mapping to current backend:

- `userId`, `email`, and `role` map to `User`.
- `displayName`, `avatarUrl`, `specialty`, `organization`/`institution`, `country`, `timezone`, `language`, `verified`, and `trustScore` map to `UserProfile`.
- `username`, `profession`, and `department` are new fields.

### Professional Profile

```ts
type ProfessionalProfile = {
  credentials: string[];
  certifications: Array<{
    name: string;
    issuer?: string;
    issuedAt?: string;
    expiresAt?: string;
    verificationStatus: 'self_attested' | 'pending' | 'verified' | 'rejected';
  }>;
  specialties: string[];
  experienceLevel: 'student' | 'resident' | 'junior' | 'mid' | 'senior' | 'consultant' | 'admin';
  clinicalInterests: string[];
  licenseNumber?: string;
  licenseRegion?: string;
};
```

Safety rule: professional credentials may be sensitive. Store only what the product needs, encrypt high-risk fields, avoid sending license details to the frontend unless a page explicitly needs them, and audit verification changes.

### Preferences

```ts
type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultDashboard: 'command' | 'assistant' | 'operations' | 'fleet' | 'iot' | 'research';
  compactMode: boolean;
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    fontScale: 'small' | 'default' | 'large';
  };
  calculatorPreferences: {
    pinnedCalculatorIds: string[];
    defaultUnits: 'metric' | 'imperial' | 'mixed';
    rememberInputs: boolean;
  };
  toolPreferences: {
    favoriteToolIds: string[];
    pinnedToolIds: string[];
    recentToolIds: string[];
  };
  aiAssistantPreferences: {
    responseStyle: 'concise' | 'stepwise' | 'evidence_first' | 'teaching';
    citationLevel: 'minimal' | 'standard' | 'full';
    safetyTone: 'standard' | 'strict';
    specialtyBias?: string;
  };
  notificationSettings: {
    emergencyAlerts: boolean;
    medicationReminders: boolean;
    appointmentReminders: boolean;
    labResults: boolean;
    securityAlerts: boolean;
    systemUpdates: boolean;
    marketingCommunications: boolean;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
};
```

Mapping to current frontend/backend:

- Theme currently exists only in `ThemeContext`.
- Tool favorites, pinned tools, and recent tools currently exist only in `ToolPreferencesContext`.
- Notification preferences already have backend support in `NotificationPreference`.
- Settings toggles such as compact mode, accessibility, calculator defaults, AI behavior, and dashboard defaults are new backend-backed profile preferences.

### AI Personalization

```ts
type AiPersonalizationProfile = {
  preferredBehavior: 'clinical_copilot' | 'teaching_assistant' | 'operations_commander' | 'research_assistant';
  savedPrompts: Array<{
    id: string;
    title: string;
    prompt: string;
    tags: string[];
    workspaceId?: string;
  }>;
  recentPrompts: Array<{
    id: string;
    promptPreview: string;
    toolId?: string;
    workspaceId?: string;
    createdAt: string;
  }>;
  suggestedTools: string[];
  recommendedWorkflows: Array<{
    id: string;
    title: string;
    reason: string;
    workspaceId?: string;
  }>;
};
```

AI personalization rules:

- Do not train or personalize on PHI by default.
- Store prompt previews and metadata separately from full clinical chat content.
- Use workspace permissions before suggesting tools or workflows.
- Recommendations should explain why they are shown and should never imply clinical action without user review.

### Workspace Identity State

```ts
type WorkspaceIdentityState = {
  activeWorkspaceId: string;
  recentWorkspaceIds: string[];
  memberships: WorkspaceMembershipSummary[];
  effectivePermissions: string[];
  linkedTeams: Array<{
    teamId: string;
    name: string;
    role: string;
  }>;
};
```

### Activity Summary

```ts
type UserActivitySummary = {
  recentCalculators: RecentActivityItem[];
  recentTools: RecentActivityItem[];
  recentAiChats: RecentActivityItem[];
  recentFleetActivity: RecentActivityItem[];
  recentIotActivity: RecentActivityItem[];
};

type RecentActivityItem = {
  id: string;
  label: string;
  route?: string;
  workspaceId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};
```

Activity rules:

- Keep PHI out of generic profile activity cards.
- Store patient-linked activity only as scoped audit or clinical activity with permission checks.
- Profile activity should show safe labels, timestamps, tool names, and workspace names.

## Proposed Workspace System

Workspaces should become backend-backed identity scopes. The current local `WorkspaceContext` can remain temporarily as a tool-filter preference, but the long-term workspace system should be authoritative on the backend.

### Workspace Types

- Personal workspace: individual defaults, saved tools, personal dashboard, and private AI prompt templates.
- Hospital workspace: organization/facility-level scope for clinical tools, patients, hospital maps, departments, and shared operational dashboards.
- Emergency workspace: high-priority incident mode with stricter audit logging, emergency permissions, escalation workflows, and limited-time elevated access.
- Fleet workspace: ambulance, logistics, routing, asset, and live-tracking scope.
- Research workspace: de-identified datasets, RAG corpora, protocols, cohorts, and research workflows.
- Admin workspace: user management, role assignments, billing, audit, configuration, compliance, and workspace administration.

### Workspace Model

```ts
type Workspace = {
  id: string;
  type: 'personal' | 'hospital' | 'emergency' | 'fleet' | 'research' | 'admin';
  name: string;
  slug: string;
  organizationId?: string;
  parentWorkspaceId?: string;
  branding: {
    displayName: string;
    logoUrl?: string;
    accentColor?: string;
  };
  settings: {
    defaultDashboard: string;
    enabledToolIds: string[];
    enabledModules: string[];
    emergencyModeEnabled: boolean;
  };
  createdAt: string;
  updatedAt: string;
};
```

### Workspace Membership Model

```ts
type WorkspaceMembership = {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'owner' | 'admin' | 'clinician' | 'nurse' | 'dispatcher' | 'researcher' | 'viewer';
  permissions: string[];
  teams: string[];
  department?: string;
  status: 'invited' | 'active' | 'suspended' | 'removed';
  joinedAt?: string;
  lastAccessedAt?: string;
};
```

### Workspace Capabilities

Workspace switching:

- Add an active workspace selector to the sidebar user area and profile workspace route.
- Persist active workspace on the backend per user.
- Include active workspace in frontend identity state.
- Optionally include active workspace or membership version in JWT/session metadata, while still resolving permissions server-side.

Workspace permissions:

- Compute effective permissions from global account status, workspace membership role, resource-level restrictions, emergency state, and feature flags.
- Keep global role as a fallback/account-level role during migration, but do not use it as the only authorization source for workspace features.

Workspace-specific tools:

- Extend current local workspace tool filters into backend workspace tool availability.
- Filter `/tools`, calculators, sidebar tool lists, quick command launch, and assistant suggestions by active workspace permissions.

Workspace-specific dashboards:

- Personal workspace defaults to the command dashboard.
- Hospital workspace emphasizes patients, hospital maps, clinical alerts, and Medical IoT.
- Fleet workspace emphasizes fleet live map, route optimizer, predictive maintenance, and operations telemetry.
- Emergency workspace emphasizes incident status, escalation actions, critical alerts, and audit-safe emergency workflows.
- Research workspace emphasizes de-identified tools, RAG, protocol review, and citations.
- Admin workspace emphasizes users, permissions, audit, analytics, subscriptions, and system configuration.

Workspace branding:

- Display workspace name/logo/accent in the sidebar, dashboard header, and settings.
- Do not allow branding to obscure safety-critical warnings or permission state.

## Dashboard Integration

The dashboard should reflect the user's profile and workspace context without exposing sensitive profile details.

### Profile Summary Card

Displays:

- Avatar or initials.
- Display name.
- Specialty/profession.
- Active workspace name and type.
- Profile completion or verification status if useful.

Primary integration points:

- `src/pages/CommandDashboard.jsx`
- `src/pages/Dashboard.jsx`
- `src/components/Sidebar.jsx`

### Activity Card

Displays:

- Recent tools and calculators.
- Recent AI activity as safe prompt/task previews.
- Recent fleet or IoT activity only when the active workspace grants access.
- Links back to safe routes, not raw patient records unless permission and workspace scope allow it.

Data sources:

- Existing `ToolPreferencesContext` as a short-term frontend source.
- New backend `UserActivityModule` as the long-term source.
- Existing `AuditModule` only for compliance-grade events, not general dashboard recents.

### Favorites

Displays:

- Pinned calculators.
- Pinned tools.
- Workspace-specific saved tools.

Migration path:

- Keep local favorites available while syncing to backend preferences.
- Store favorites by user and optionally by workspace.
- Remove tools from favorites if the active workspace no longer allows them.

### Recommendations

Displays:

- AI suggested tools.
- Recommended workflows.
- Specialty-aware suggestions.
- Workspace-aware next actions.

Rules:

- Recommendations must respect active workspace permissions.
- Recommendations should be explainable, dismissible, and not based on PHI unless the user is inside a permission-scoped clinical context.

### Notifications

Displays:

- Emergency alerts.
- System updates.
- Security alerts.
- Workspace-specific updates.
- Unread count and quiet-hours state.

Integration points:

- `src/components/NotificationPreferences.jsx`
- `src/services/NotificationService.js`
- `backend/src/modules/notifications`

## Route Architecture

The target route tree should make profile a first-class area while preserving current routes as aliases during migration.

Canonical routes:

- `/profile`
- `/profile/settings`
- `/profile/activity`
- `/profile/preferences`
- `/profile/workspaces`
- `/profile/security`

Migration from current routes:

- Keep `/profile` as the overview route.
- Replace `/profile-settings` with `/profile/settings`, then preserve `/profile-settings` as a redirect alias.
- Keep `/settings` for app/global settings only, or redirect relevant identity settings to `/profile/preferences`.
- Keep `/notifications` as a direct route initially, then expose notification settings from `/profile/preferences` or `/profile/settings`.
- Keep `/two-factor-setup` and `/biometric-setup` initially, then link them from `/profile/security`.
- Keep `/audit-logs` protected for admin/compliance views, and expose safe personal activity from `/profile/activity`.

Suggested page responsibilities:

- `/profile`: profile summary, active workspace, profile completion, favorites, recent safe activity.
- `/profile/settings`: account and professional profile fields.
- `/profile/activity`: safe activity timeline plus links to audit/compliance views when permitted.
- `/profile/preferences`: theme, language, compact mode, accessibility, dashboards, calculators, AI behavior, notifications.
- `/profile/workspaces`: active workspace switcher, recent workspaces, memberships, teams, workspace branding.
- `/profile/security`: 2FA, biometric setup, sessions, OAuth connections, password reset, security audit highlights.

## Backend Plan

### Module Shape

Add focused modules rather than expanding `AuthModule` into a catch-all identity system.

Proposed modules:

- `UserProfileModule`: expanded operational profile, professional profile, profile preferences, profile completion, and profile summary DTOs.
- `WorkspaceModule`: workspaces, organizations/facilities, memberships, invitations, active workspace, workspace branding, and workspace tool configuration.
- `PermissionsModule`: workspace-aware permission resolution, membership roles, effective permissions, and guard/decorator helpers.
- `UserActivityModule`: safe activity logging for tools, calculators, AI prompt metadata, fleet actions, IoT interactions, dashboard recents, and workspace recents.
- `PersonalizationModule`: saved prompts, recent prompts, recommendations, dashboard defaults, AI assistant behavior, and workflow suggestions.

Existing modules to integrate:

- `AuthModule`: keep login/session/token issuance here.
- `UsersModule`: keep core account/profile lookup during migration.
- `AuditModule`: extend audit logs with workspace dimensions and use for compliance-grade events.
- `NotificationModule`: attach notification preferences and unread counts to profile/workspace state.
- `TwoFactorModule`: expose security state in `/profile/security`.
- `SubscriptionsModule`: later decide whether billing is user-scoped, workspace-scoped, or organization-scoped.
- `LiveTrackingModule` and `PlatformSystemsModule`: consume active workspace scope for fleet, Medical IoT, hospital operations, and platform systems.

### Backend Entities

Recommended new entities:

- `Workspace`
- `Organization`
- `WorkspaceMembership`
- `WorkspaceInvitation`
- `WorkspaceToolConfig`
- `WorkspaceBranding`
- `UserPreference`
- `UserAiPreference`
- `SavedPrompt`
- `UserActivity`
- `WorkspaceRecent`

Recommended entity changes:

- Add optional `workspaceId`, `organizationId`, `actorUserId`, `targetUserId`, and `membershipId` fields to `AuditLog`.
- Add `profession`, `department`, `username`, and professional credential fields through profile-specific tables or embedded preference/profile records.
- Avoid putting large preference JSON blobs on `User` unless there is a clear indexing and migration strategy.

### API Shape

Profile:

- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/profile/me/preferences`
- `PATCH /api/profile/me/preferences`
- `GET /api/profile/me/activity`
- `GET /api/profile/me/security`

Workspaces:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `PATCH /api/workspaces/:workspaceId`
- `GET /api/workspaces/:workspaceId/members`
- `POST /api/workspaces/:workspaceId/invitations`
- `POST /api/workspaces/active`
- `GET /api/workspaces/:workspaceId/tools`
- `PATCH /api/workspaces/:workspaceId/tools`

Personalization:

- `GET /api/personalization/me`
- `PATCH /api/personalization/me`
- `GET /api/personalization/me/recommendations`
- `POST /api/personalization/me/saved-prompts`
- `DELETE /api/personalization/me/saved-prompts/:promptId`

Activity:

- `POST /api/activity`
- `GET /api/activity/me`
- `GET /api/workspaces/:workspaceId/activity`

### Permission Strategy

Permission checks should resolve in this order:

1. Authenticated active user.
2. Active workspace membership.
3. Workspace role and explicit workspace permissions.
4. Resource scope, such as patient, fleet asset, IoT device, hospital map, department, or team.
5. Emergency access state, if active.
6. Global account restrictions, such as inactive user, MFA requirement, or suspended membership.

Guard/decorator direction:

- Keep `AuthGuard('jwt')`.
- Add a workspace context resolver that extracts `workspaceId` from route params, headers, request body, query, or user active workspace.
- Add decorators such as `@WorkspacePermission(...)`, `@AnyWorkspacePermission(...)`, and `@RequireWorkspaceRole(...)`.
- Continue logging permission grants/denials through `AuditService`, including workspace dimensions.

Frontend permission direction:

- Keep route metadata but feed it from backend effective permissions instead of static frontend role maps.
- Keep `PermissionGate` as a UI convenience, not the source of truth.
- Add workspace-aware hooks such as `useActiveWorkspace()`, `useEffectivePermissions()`, and `useCanAccessTool(toolId)`.

## Safety And Privacy

Do not expose:

- PHI in generic profile summaries, recommendations, notification previews, or dashboard activity cards.
- License numbers, credentials, verification details, or trust signals except on explicit profile/security/admin screens.
- Raw audit metadata to users who only need safe activity labels.
- Workspace membership data across organizations unless the user has explicit admin permissions.
- AI prompt content that may contain PHI outside the scoped chat or audit context where it belongs.

Add:

- Audit logging for profile reads/writes, workspace switching, membership changes, permission grants/denials, preference changes, saved prompt changes, notification preference changes, and emergency workspace activation.
- Role and workspace permission checks for profile administration, workspace management, fleet access, Medical IoT access, hospital maps, and audit views.
- Minimal DTOs for dashboard/profile cards so sensitive fields are not accidentally sent.
- Explicit consent and retention rules for AI personalization and recent activity.
- Server-side validation that active workspace membership is still valid on every protected workspace request.

## Tests

Frontend tests to add or extend:

- Profile overview renders profile summary card with avatar/initials, name, specialty, and active workspace.
- `/profile/settings`, `/profile/activity`, `/profile/preferences`, `/profile/workspaces`, and `/profile/security` route rendering.
- Legacy `/profile-settings` redirects or aliases to `/profile/settings`.
- Workspace switcher updates active workspace context and visible sidebar/dashboard workspace label.
- Tool and calculator lists respect active workspace tool permissions.
- Theme persistence moves from local-only behavior to backend-synced preference behavior without breaking current local fallback.
- Notification settings render and persist through profile preferences.
- AI recommendation cards render only tools/workflows allowed in the active workspace.
- Profile activity card renders safe recent tools, calculators, AI chats, fleet activity, and IoT activity without PHI.
- Permission behavior for restricted profile, workspace, fleet, IoT, hospital map, and admin routes.

Relevant existing frontend tests to reuse:

- `src/pages/Profile.activity.test.jsx`
- `src/pages/ProfileSettings.test.jsx`
- `src/pages/Settings.privacyData.test.jsx`
- `src/pages/Settings.billing.test.jsx`
- `src/test/WorkspaceContext.test.jsx`
- `src/components/Sidebar.toolsNavigation.test.js`
- `src/pages/tools/ToolsOverview.visibility.test.jsx`
- `src/pages/CommandDashboard.test.jsx`
- `src/pages/Dashboard.chatLayout.test.jsx`
- `src/pages/MedicalIotDashboard.test.jsx`
- `src/pages/HospitalMapDashboard.test.jsx`
- `src/pages/fleet/FleetDashboard.test.jsx`
- `src/components/NotificationPreferences.test.jsx`
- `src/App.permissions.test.jsx`

Backend tests to add or extend:

- Profile summary DTO excludes sensitive data.
- Profile preference updates persist and audit.
- Workspace creation, update, membership, invitation, and active workspace selection.
- Workspace switching rejects inactive, removed, or unauthorized memberships.
- Workspace permissions override or refine global role permissions correctly.
- Fleet, Medical IoT, hospital maps, and admin routes require workspace-scoped permissions.
- Activity logging stores safe metadata and links to workspace/user without PHI.
- Recommendation endpoint filters by active workspace permissions.
- Audit logs include workspace dimensions for workspace-sensitive actions.

Relevant existing backend tests to reuse:

- `backend/src/modules/auth/auth.service.spec.ts`
- `backend/test/auth.e2e-spec.ts`
- `backend/src/modules/users/users.service.spec.ts`
- `backend/test/rbac.spec.ts`
- `backend/src/modules/audit/audit.service.spec.ts`
- `backend/src/modules/two-factor/two-factor.service.spec.ts`
- `backend/src/modules/compliance/compliance.service.spec.ts`
- `backend/src/modules/platform-systems/platform-systems.service.spec.ts`

## Implementation Phases

Phase 1: Contract and route alignment.

- Define operational profile DTOs.
- Add canonical profile route plan.
- Preserve current auth flow.
- Preserve existing `/profile`, `/profile-settings`, `/settings`, and `/notifications` behavior while planning aliases.

Phase 2: Backend profile preferences.

- Add profile preference persistence.
- Sync theme, language, compact mode, accessibility, dashboard default, AI preference, calculator preference, and tool preferences.
- Keep local fallback until backend sync is stable.

Phase 3: Workspace identity foundation.

- Add workspace, organization, membership, invitation, and active workspace APIs.
- Add workspace permission resolver and audit dimensions.
- Connect sidebar and profile workspace route to backend workspaces.

Phase 4: Subsystem integration.

- Make dashboard, AI assistant, `/tools`, calculators, fleet, Medical IoT, hospital maps, notifications, and settings consume active workspace and effective permissions.
- Add workspace-specific dashboards and tool availability.

Phase 5: Personalization and activity.

- Add saved prompts, recent prompts, recommendation service, safe user activity, profile widgets, and workspace-aware dashboard cards.
- Filter all recommendations and activity by permissions and PHI safety rules.

## Risks

- Auth/profile duplication: adding new profile routes without migrating `/profile-settings`, `/settings`, and `/notifications` could create competing settings flows.
- Permission drift: frontend static permissions already duplicate backend RBAC; adding workspace permissions without a backend effective-permissions contract would worsen drift.
- PHI leakage: recent activity and AI personalization could accidentally expose patient details if activity payloads are not explicitly safe.
- Workspace ambiguity: the current frontend `WorkspaceContext` means tool filters, while the proposed workspace system means identity scope. Naming and migration must make this distinction clear.
- JWT staleness: putting too many workspace claims in tokens can leave permissions stale after membership changes. Resolve permissions server-side and keep token claims minimal.
- Audit volume: workspace switching and activity logging can create high event volume. Separate compliance audit events from lightweight safe activity.
- Migration complexity: local `localStorage` preferences need careful migration to backend-backed settings without breaking offline/demo usage.

## Acceptance Criteria Coverage

- User profile becomes part of app architecture: achieved by defining `OperationalProfile`, route tree, backend profile modules, and dashboard/sidebar/profile integration points.
- Workspace switching works conceptually: achieved through backend workspace, membership, active workspace, workspace permissions, and route/sidebar plans.
- AI personalization is planned: achieved through AI preferences, saved prompts, recent prompts, suggested tools, and recommendation rules.
- Dashboard reflects user context: achieved through profile summary, activity, favorites, recommendations, and notifications widgets.
- Profile system integrates with major subsystems: covered for dashboard, AI assistant, `/tools`, calculators, fleet, Medical IoT, hospital maps, notifications, settings, sidebar, auth, permissions, audit, and workspace services.
- No duplicate auth/profile flows: achieved by preserving current auth, making profile a first-class route tree, and treating existing routes as aliases or linked sections during migration.
