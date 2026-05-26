# CareDroid User Profile + Workspace Identity System

## Purpose

CareDroid needs a first-class operational identity system. The profile must be more than login state: it should drive personalization, AI behavior, permissions, workspace selection, dashboards, recent activity, preferences, notifications, saved tools, fleet access, Medical IoT access, theme settings, professional profile, and audit visibility.

This document records the current architecture investigation and proposes the target model. It is intentionally a planning artifact. The target direction is to extend the existing auth, profile, workspace, permission, audit, notification, tool preference, and personalization surfaces without creating a duplicate auth flow.

## Current User/Auth Investigation

### Frontend Findings

Current frontend auth and identity surfaces:

- `src/pages/Auth.jsx` handles email/password login, signup, 2FA verification, OAuth links, magic-link request, and direct sign-in for local development.
- `src/pages/AuthCallback.jsx` accepts an OAuth token callback, stores it through `UserContext`, and redirects to `/dashboard`.
- `src/contexts/UserContext.jsx` persists `caredroid_access_token` and `caredroid_user_profile` in `localStorage`, fetches `/api/users/profile` when a token exists without a loaded user, and exposes static role-based permission helpers.
- `src/contexts/UserIdentityContext.jsx` is the newer operational identity layer. It fetches `/api/profile/me`, normalizes workspace state, syncs active backend workspace type to the older local workspace filter, updates preferences, updates operational profile data, records safe activity, and exposes effective workspace permissions.
- `src/App.jsx` wraps the app in `UserProvider`, `WorkspaceProvider`, `UserIdentityProvider`, `ToolPreferencesProvider`, `ThemeProvider`, notification, conversation, system config, and cost providers. It protects routes through route metadata and `PermissionGate`.
- `src/pages/Profile.jsx` is the profile overview. It renders `ProfileSummaryCard`, shows safe current-user audit activity, links to `/profile/settings`, `/profile/activity`, `/profile/preferences`, `/profile/workspaces`, and `/profile/security`, and keeps admin audit views separate.
- `src/pages/ProfileSettings.jsx` edits backend-backed profile fields through the older `/api/users/profile` flow: display name, institution, specialty, license number, country, and timezone.
- `src/pages/profile/ProfilePreferences.jsx` uses `UserIdentityContext` to save theme, language, default dashboard, compact mode, and AI response preferences through `/api/profile/me/preferences`.
- `src/pages/profile/ProfileWorkspaces.jsx` uses `UserIdentityContext` to switch backend workspaces and show effective permissions.
- `src/pages/profile/ProfileActivity.jsx` renders safe recent tools, calculators, AI chats, fleet activity, IoT activity, and limited audit visibility from the operational profile.
- `src/pages/profile/ProfileSecurity.jsx` links 2FA, biometric setup, audit logs, settings, and notifications into a security route.
- `src/components/profile/ProfileSummaryCard.jsx` renders avatar/initials, display name, specialty/profession, and active workspace.
- `src/pages/CommandDashboard.jsx` already consumes `useUserIdentity()` for the profile summary, active workspace recommendations, and safe activity counts.
- `src/components/Sidebar.jsx` shows the user identity, backend operational workspace selector, local tool workspace selector, notifications, favorite/pinned/recent tools, and sign-out.
- `src/contexts/ThemeContext.jsx` still stores theme locally under `caredroid_theme_preference`.
- `src/contexts/ToolPreferencesContext.jsx` still stores favorite, pinned, and recent tools locally under `careDroid.toolPrefs.v1`.
- `src/contexts/WorkspaceContext.jsx` still stores local tool-filter workspaces under `careDroid.workspaces.v1`.

Current frontend auth flow:

1. The user signs in on `/auth`, completes OAuth callback on `/auth-callback`, verifies 2FA, or starts an explicit local dev session.
2. `UserContext` stores the JWT and user profile in `localStorage`.
3. `isAuthenticated` is currently `Boolean(authToken)`.
4. If a token exists but no user is loaded, `UserContext` calls `/api/users/profile`.
5. `UserIdentityContext` separately calls `/api/profile/me` and falls back to local user/theme/tool/workspace state if the operational profile API is unavailable.
6. `App.jsx` protects routes with static route metadata and `PermissionGate`; UI-level permission checks still primarily use the frontend copy of global role permissions.

Current frontend user model:

- There is an older loose user shape from `UserContext` with fields such as `id`, `email`, `role`, `name`, `fullName`, `institution`, and nested `profile`.
- There is a newer `OperationalProfile` shape from `UserIdentityContext` with `account`, `professional`, `preferences`, `workspace`, `activity`, `aiPersonalization`, `security`, and `audit`.
- The operational identity contract exists in practice, but it is not yet the sole source of truth across all app areas.

Current frontend workspace model:

- Backend operational workspaces are available through `UserIdentityContext`, `/api/workspaces`, and the sidebar/profile workspace selector.
- The older `WorkspaceContext` still means local tool-filter workspaces. Defaults include `all`, `diagnostic`, `calculator`, `reference`, `fleet`, and `hospital-operations`.
- The sidebar currently exposes both concepts: an operational workspace selector and an Actions/tool-filter workspace selector.

Frontend gaps:

- `UserContext`, `UserIdentityContext`, `ThemeContext`, `ToolPreferencesContext`, and `WorkspaceContext` overlap. The target system should make operational identity authoritative while preserving offline/local fallback behavior.
- `/profile/settings` and `ProfileSettings.jsx` still use the older `/api/users/profile` update API rather than the operational `/api/profile/me` profile update API.
- Route guards still use static frontend `RolePermissions`, so they can drift from backend global permissions and workspace effective permissions.
- Backend workspace permissions are displayed, but they are not yet consistently enforced in `/tools`, calculators, quick command launch, fleet, Medical IoT, hospital maps, assistant workflows, and route metadata.
- Theme, tool favorites, pinned tools, and recent tools still have local-first persistence; backend preference fields exist but are not fully wired as the source of truth.
- Recommendations exist on the dashboard, but AI assistant prompts, saved prompts, recent prompt capture, and specialty/workspace-aware workflows are not yet deeply integrated into the assistant execution flow.
- Notification preferences are backend-backed in the notification module, but the operational preference model duplicates a notification settings object and needs a reconciliation strategy.

### Backend Findings

Current backend auth and identity surfaces:

- `backend/src/modules/auth/auth.module.ts`, `auth.controller.ts`, and `auth.service.ts` support register, login, 2FA login verification, OAuth, development sessions, token generation, and `/auth/me`.
- `backend/src/modules/users/users.module.ts`, `users.controller.ts`, and `users.service.ts` expose the older `/api/users/profile` read/update behavior.
- `backend/src/modules/users/entities/user.entity.ts` defines the core global `User`: `email`, `passwordHash`, `emailVerified`, `isActive`, global `role`, login metadata, encrypted PHI placeholders, profile, OAuth accounts, 2FA, subscription, and audit logs.
- `backend/src/modules/users/entities/user-profile.entity.ts` defines the older one-to-one `UserProfile`: `fullName`, `firstName`, `lastName`, `institution`, `specialty`, `licenseNumber`, `country`, `languagePreference`, `timezone`, `verified`, `trustScore`, `avatarUrl`, PHI placeholders, and consent fields.
- `backend/src/modules/user-profile` defines the newer operational profile service and routes: `/profile/me`, `/profile/me/preferences`, `/profile/me/activity`, and `/profile/me/security`.
- `backend/src/modules/user-profile/entities/professional-profile.entity.ts` stores `username`, `profession`, `department`, credentials, certifications, specialties, experience level, clinical interests, and license region.
- `backend/src/modules/user-profile/entities/user-preference.entity.ts` stores backend-backed theme, language, default dashboard, compact mode, accessibility, calculator preferences, tool preferences, AI assistant preferences, and notification settings.
- `backend/src/modules/workspaces` defines `Organization`, `Workspace`, `WorkspaceMembership`, `WorkspaceInvitation`, and `UserWorkspaceState`, with APIs for listing, creating, switching, members, invitations, and workspace tools.
- `backend/src/modules/permissions/workspace-permissions.service.ts` merges global role permissions with workspace membership-role permissions and explicit workspace grants.
- `backend/src/modules/user-activity` records safe activity metadata and exposes current-user and workspace activity endpoints.
- `backend/src/modules/personalization` stores AI preferences, saved prompts, recent prompts, suggested tools, and recommended workflows.
- `backend/src/modules/audit` remains the compliance-grade audit system and is used for profile updates, workspace switching, registration, login, and authorization checks.

Current backend auth flow:

1. Register creates `User`, `UserProfile`, free `Subscription`, and an audit log.
2. Login loads user with `profile`, `subscription`, and `twoFactor`, validates password and active status, updates login metadata, writes an audit log, and returns JWT/refresh tokens plus a sanitized user unless 2FA is required.
3. JWT payload contains `sub`, `email`, and global `role`.
4. `JwtStrategy` rehydrates the current user with `profile` and `subscription`.
5. `/api/users/profile` returns the current user with profile/subscription and logs profile read as PHI access.
6. `/api/profile/me` builds the operational profile by joining account, professional profile, preferences, active workspace state, activity summary, AI personalization, security summary, and recent audit events.

Current backend user and role model:

- Core account identity is still one global user account with one global role: `student`, `nurse`, `physician`, or `admin`.
- Workspace memberships add workspace roles: `owner`, `admin`, `clinician`, `nurse`, `dispatcher`, `researcher`, and `viewer`.
- Effective permissions combine global role permissions, workspace role permissions, and explicit membership permissions.
- The legacy `AuthorizationGuard` still checks only global role permissions from decorators and does not resolve active workspace context.

Backend gaps:

- The operational profile, workspace, activity, and personalization modules are present, but they need broader enforcement across feature controllers and frontend route gates.
- There is no workspace-aware Nest guard/decorator yet for `@WorkspacePermission`, resource-scope resolution, or active-workspace membership validation on subsystem routes.
- `AuditLog` is not yet extended with first-class `workspaceId`, `organizationId`, `membershipId`, `actorUserId`, and `targetUserId` columns. Workspace data is currently stored in metadata for some actions.
- `Organization` exists, but organization/facility administration and onboarding are not yet developed.
- Workspace invitations are creatable, but acceptance, revocation, expiration handling, and admin UI are not complete.
- Role management is static. There is no complete admin UI/API for changing global roles, workspace membership roles, or explicit permissions with approval/audit workflow.
- Personalization recommendations are currently mostly default/static. They are not yet generated from safe activity, specialty, workspace tool availability, and explicit user preferences.
- Saved prompts exist in the backend, but prompt capture, prompt reuse, and assistant integration are not complete.
- Activity logging exists, but tool/calculator/fleet/IoT/assistant surfaces must consistently call it with safe, non-PHI metadata.

## Proposed Profile Model

The target profile is an `OperationalProfile` assembled from account identity, professional profile, preferences, AI personalization, workspace identity, safe activity, security summary, and audit summary.

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

Current mapping:

- `userId`, `email`, and global `role` map to `User`.
- `displayName`, `avatarUrl`, `specialty`, `organization`/`institution`, `country`, `timezone`, `language`, `verified`, and `trustScore` map to `UserProfile`.
- `username`, `profession`, and `department` map to `ProfessionalProfile`.

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

Safety rule: professional credentials, license information, and verification status can be sensitive. Store only what the product needs, encrypt or restrict high-risk fields, send license details only to explicit profile/security/admin screens, and audit verification changes.

### Preferences

```ts
type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultDashboard: 'command' | 'assistant' | 'operations' | 'fleet' | 'iot' | 'research' | 'admin';
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

Current mapping:

- Backend `UserPreference` already supports these categories as persisted fields.
- `ProfilePreferences.jsx` currently saves a subset: theme, language, default dashboard, compact mode, and AI assistant preferences.
- Theme, tool favorites, pinned tools, and recent tools still need a local-to-backend sync policy.
- Notification preference ownership must be clarified between `NotificationModule` and operational profile preferences.

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
    toolId?: string;
    workspaceId?: string;
  }>;
};
```

AI personalization rules:

- Do not train or personalize on PHI by default.
- Store safe prompt previews and metadata separately from full clinical chat content.
- Filter suggestions by active workspace permissions and enabled tools.
- Recommendations must explain why they are shown and must never imply clinical action without user review.

### Workspace Identity State

```ts
type WorkspaceIdentityState = {
  activeWorkspaceId: string | null;
  recentWorkspaceIds: string[];
  workspaces: Workspace[];
  activeWorkspace?: Workspace;
  memberships: WorkspaceMembership[];
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
  category: 'calculator' | 'tool' | 'ai_chat' | 'fleet' | 'iot' | 'workspace';
  label: string;
  route?: string;
  workspaceId?: string;
  occurredAt: string;
  metadata?: {
    toolId?: string;
    calculatorId?: string;
    workspaceType?: string;
    source?: string;
    status?: string;
  };
};
```

Activity rules:

- Keep PHI out of generic profile activity and dashboard activity cards.
- Use audit logs for compliance-grade access, PHI access, and sensitive clinical events.
- Use user activity for safe recents, workspace context, and personalization signals.

## Workspace System

Workspaces are backend-backed identity scopes. The older local `WorkspaceContext` can remain as a temporary tool-filter fallback, but the backend `WorkspacesModule` should be authoritative for operational identity.

### Workspace Types

- Personal workspace: individual defaults, saved tools, private AI prompt templates, and personal dashboard.
- Hospital workspace: facility-level scope for clinical tools, patients, hospital maps, departments, Medical IoT, and shared operational dashboards.
- Emergency workspace: high-priority incident mode with stricter audit logging, escalation workflows, emergency permissions, and limited-time elevated access.
- Fleet workspace: ambulance, logistics, routing, asset, predictive maintenance, and live-tracking scope.
- Research workspace: de-identified datasets, RAG corpora, protocols, cohorts, explainability, and research workflows.
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
  ownerUserId?: string;
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

- Keep the active workspace selector in the sidebar user area and `/profile/workspaces`.
- Persist active workspace through `UserWorkspaceState`.
- Return active workspace and effective permissions in `/api/profile/me`.
- Do not rely on long-lived JWT workspace claims for authorization. Resolve workspace membership server-side.

Workspace permissions:

- Compute effective permissions from global account status, workspace membership role, explicit workspace grants, resource scope, emergency state, and feature flags.
- Keep global role as account-level state, but stop using it as the only authorization source for workspace features.

Workspace-specific tools:

- Use `Workspace.settings.enabledToolIds` as the backend source of available tools.
- Filter `/tools`, calculators, sidebar tool lists, quick command launch, and assistant suggestions by active workspace enabled tools and effective permissions.
- Remove or hide saved tools when the active workspace no longer allows them.

Workspace-specific dashboards:

- Personal workspace defaults to the command dashboard.
- Hospital workspace emphasizes patients, hospital maps, clinical alerts, Medical IoT, and notifications.
- Fleet workspace emphasizes fleet live map, route optimizer, predictive maintenance, and operations telemetry.
- Emergency workspace emphasizes incident status, escalation actions, critical alerts, and audit-safe emergency workflows.
- Research workspace emphasizes de-identified tools, RAG, protocol review, explainability, and citations.
- Admin workspace emphasizes users, permissions, audit, analytics, subscriptions, and system configuration.

Workspace branding:

- Display workspace name/logo/accent in the sidebar, dashboard header, workspace route, and settings.
- Do not allow branding to obscure clinical safety warnings, permission state, emergency banners, or audit notices.

## Dashboard Integration

The dashboard should reflect user and workspace context without exposing sensitive profile details.

### Profile Summary Card

Current status:

- `src/components/profile/ProfileSummaryCard.jsx` exists.
- `src/pages/Profile.jsx` and `src/pages/CommandDashboard.jsx` render it.

Displays:

- Avatar or initials.
- Display name.
- Specialty or profession.
- Active workspace name and type.
- Optional verification/profile completion status when safe.

### Activity Card

Current status:

- `src/pages/profile/ProfileActivity.jsx` renders safe activity buckets from `UserIdentityContext`.
- `backend/src/modules/user-activity` stores safe activity metadata.

Target behavior:

- Show recent tools, calculators, AI activity, fleet activity, and IoT activity only as safe labels.
- Link to safe routes, not raw patient records unless permission and workspace scope allow it.
- Consistently record activity from tools, calculators, assistant, fleet, Medical IoT, and hospital maps.

### Favorites

Current status:

- Local favorites, pinned tools, and recent tools live in `ToolPreferencesContext`.
- Backend `UserPreference.toolPreferences` exists but is not yet fully authoritative.

Target behavior:

- Persist pinned calculators and pinned tools through backend preferences.
- Support workspace-specific saved tools.
- Keep local fallback for offline/demo mode, then reconcile with backend when authenticated.

### Recommendations

Current status:

- `PersonalizationService` returns default recommended workflows.
- `CommandDashboard.jsx` renders workspace recommendations.

Target behavior:

- Filter recommendations by active workspace, enabled tools, effective permissions, profession, specialty, and safe recent activity.
- Make recommendations explainable, dismissible, and never PHI-derived by default.

### Notifications

Current status:

- `NotificationModule`, `NotificationPreferences`, notification context, and sidebar unread count already exist.

Target behavior:

- Attach notification status to operational profile without duplicating the notification preference source of truth.
- Support workspace-specific alerts, emergency alerts, security updates, quiet hours, push/email/SMS settings, and profile notification summaries.

## Profile Route Architecture

Canonical routes already present in `src/App.jsx`:

- `/profile`
- `/profile/settings`
- `/profile/activity`
- `/profile/preferences`
- `/profile/workspaces`
- `/profile/security`

Route responsibilities:

- `/profile`: profile summary, active workspace, profile completion, favorites, recent safe activity, and links into settings/security/activity.
- `/profile/settings`: account and professional profile fields; should migrate from `/api/users/profile` to `/api/profile/me`.
- `/profile/activity`: safe activity timeline and links to audit/compliance views when permitted.
- `/profile/preferences`: theme, language, compact mode, accessibility, dashboards, calculators, AI behavior, and notification preference entry points.
- `/profile/workspaces`: active workspace switcher, recent workspaces, memberships, teams, effective permissions, and workspace branding.
- `/profile/security`: 2FA, biometric setup, session status, OAuth connections, password reset, role summary, and security audit highlights.

Migration guidance:

- Preserve `/profile-settings` as a redirect alias if it exists or is still linked externally.
- Keep `/settings` for app/global settings, privacy, billing, and data export while linking identity-specific settings to `/profile/*`.
- Keep `/notifications` as the notification center and expose notification preference entry points from `/profile/preferences` and `/profile/security`.
- Keep `/audit-logs` protected for admin/compliance views. Use `/profile/activity` for safe current-user activity.

## Backend Plan

### Current Module Shape

The planned modules already exist and are imported by `backend/src/app.module.ts`:

- `UserProfileModule`: operational profile assembly, professional profile, preferences, security summary, and safe activity surface.
- `WorkspacesModule`: workspaces, organizations, memberships, invitations, active workspace state, workspace branding, and workspace tool configuration.
- `PermissionsModule`: workspace effective permission resolution.
- `UserActivityModule`: safe activity logging for tools, calculators, AI, fleet, IoT, and workspace activity.
- `PersonalizationModule`: saved prompts, recent prompts, AI behavior, suggested tools, and recommended workflows.

Existing modules to integrate:

- `AuthModule`: keep login/session/token issuance here.
- `UsersModule`: keep core account/profile lookup during migration; do not create a second auth profile flow.
- `AuditModule`: extend audit logs with workspace dimensions and use for compliance-grade events.
- `NotificationModule`: remain the source of truth for notification preferences and unread notification state.
- `TwoFactorModule`: feed `/profile/security`.
- `SubscriptionsModule`: decide whether billing is user-scoped, workspace-scoped, organization-scoped, or mixed.
- `LiveTrackingModule` and `PlatformSystemsModule`: consume active workspace and effective permissions for fleet, Medical IoT, hospital operations, and platform systems.

### API Shape

Implemented or planned profile APIs:

- `GET /api/profile/me`
- `PATCH /api/profile/me`
- `GET /api/profile/me/preferences`
- `PATCH /api/profile/me/preferences`
- `GET /api/profile/me/activity`
- `GET /api/profile/me/security`

Implemented or planned workspace APIs:

- `GET /api/workspaces`
- `POST /api/workspaces`
- `GET /api/workspaces/:workspaceId`
- `GET /api/workspaces/:workspaceId/members`
- `POST /api/workspaces/:workspaceId/invitations`
- `POST /api/workspaces/active`
- `GET /api/workspaces/:workspaceId/tools`
- `PATCH /api/workspaces/:workspaceId/tools`

Implemented or planned personalization APIs:

- `GET /api/personalization/me`
- `PATCH /api/personalization/me`
- `GET /api/personalization/me/recommendations`
- `POST /api/personalization/me/saved-prompts`
- `DELETE /api/personalization/me/saved-prompts/:promptId`

Implemented or planned activity APIs:

- `POST /api/activity`
- `GET /api/activity/me`
- `GET /api/activity/me/summary`
- `GET /api/activity/workspaces/:workspaceId`

### Permission Strategy

Permission checks should resolve in this order:

1. Authenticated active user.
2. MFA/session/security requirements.
3. Active workspace membership.
4. Workspace role and explicit workspace permissions.
5. Resource scope, such as patient, fleet asset, IoT device, hospital map, department, team, or research dataset.
6. Emergency access state, if active.
7. Global account restrictions, such as inactive user, suspended membership, or organization policy.

Backend guard/decorator direction:

- Keep `AuthGuard('jwt')`.
- Keep global `@Permissions()` for account-level and legacy routes during migration.
- Add a workspace context resolver that extracts `workspaceId` from route params, headers, request body, query, or current user's active workspace.
- Add decorators such as `@WorkspacePermission(...)`, `@AnyWorkspacePermission(...)`, and `@RequireWorkspaceRole(...)`.
- Continue logging permission grants/denials through `AuditService`, including workspace dimensions.

Frontend permission direction:

- Keep `PermissionGate` as a UI convenience only.
- Feed route gating and feature visibility from backend effective permissions instead of static frontend role maps.
- Add or finish hooks such as `useActiveWorkspace()`, `useEffectivePermissions()`, and `useCanAccessTool(toolId)`.

## Safety And Privacy

Do not expose:

- PHI in generic profile summaries, recommendations, notification previews, or dashboard activity cards.
- License numbers, credential verification details, or trust signals outside explicit profile/security/admin screens.
- Raw audit metadata to users who only need safe activity labels.
- Workspace membership data across organizations unless the user has explicit admin permissions.
- AI prompt content that may contain PHI outside the scoped chat or audit context where it belongs.

Add or complete:

- Audit logging for profile reads/writes, workspace switching, membership changes, permission grants/denials, preference changes, saved prompt changes, notification preference changes, and emergency workspace activation.
- First-class audit dimensions for `workspaceId`, `organizationId`, `membershipId`, `actorUserId`, and `targetUserId`.
- Role and workspace permission checks for profile administration, workspace management, fleet access, Medical IoT access, hospital maps, and audit views.
- Minimal DTOs for dashboard/profile cards so sensitive fields are not accidentally sent.
- Explicit consent and retention rules for AI personalization and recent activity.
- Server-side validation that active workspace membership is still valid on every protected workspace request.

## Tests

Existing frontend tests to keep and extend:

- `src/components/profile/ProfileSummaryCard.test.jsx`
- `src/pages/Profile.activity.test.jsx`
- `src/pages/ProfileSettings.test.jsx`
- `src/pages/profile/ProfilePreferences.test.jsx`
- `src/pages/profile/ProfileWorkspaces.test.jsx`
- `src/test/WorkspaceContext.test.jsx`
- `src/components/Sidebar.toolsNavigation.test.js`
- `src/pages/CommandDashboard.test.jsx`
- `src/pages/MedicalIotDashboard.test.jsx`
- `src/pages/HospitalMapDashboard.test.jsx`
- `src/pages/fleet/FleetDashboard.test.jsx`
- `src/components/NotificationPreferences.test.jsx`

Frontend tests to add or extend:

- Profile overview renders avatar/initials, name, specialty/profession, and active workspace.
- `/profile/settings`, `/profile/activity`, `/profile/preferences`, `/profile/workspaces`, and `/profile/security` route rendering.
- Legacy `/profile-settings` redirects or aliases to `/profile/settings`.
- Workspace switching updates active operational workspace, sidebar label, and dashboard workspace label.
- Tool and calculator lists respect active workspace tool availability and effective permissions.
- Theme persistence uses backend preference sync while preserving local fallback.
- Settings persistence covers compact mode, default dashboard, accessibility, calculator defaults, and AI assistant preferences.
- Notification settings render and persist without duplicating ownership between profile and notification modules.
- AI recommendation cards render only tools/workflows allowed in the active workspace.
- Profile activity renders safe recents for tools, calculators, AI chats, fleet, and IoT without PHI.
- Permission behavior covers restricted profile, workspace, fleet, Medical IoT, hospital map, and admin routes.

Existing backend tests to keep and extend:

- `backend/src/modules/auth/auth.service.spec.ts`
- `backend/test/auth.e2e-spec.ts`
- `backend/src/modules/users/users.service.spec.ts`
- `backend/test/rbac.spec.ts`
- `backend/src/modules/audit/audit.service.spec.ts`
- `backend/src/modules/two-factor/two-factor.service.spec.ts`
- `backend/src/modules/compliance/compliance.service.spec.ts`
- `backend/src/modules/platform-systems/platform-systems.service.spec.ts`
- `backend/src/modules/permissions/workspace-permissions.service.spec.ts`

Backend tests to add or extend:

- `GET /profile/me` returns a safe operational profile and excludes sensitive fields.
- `PATCH /profile/me` updates profile and professional fields and writes audit logs.
- Preference updates persist, audit, and round-trip through `/profile/me`.
- Workspace creation, default workspace creation, active workspace selection, membership, invitation, and tool availability.
- Workspace switching rejects inactive, removed, unauthorized, or non-member workspaces.
- Workspace permissions refine global role permissions correctly.
- Workspace-aware guards protect fleet, Medical IoT, hospital maps, research, and admin routes.
- Activity logging stores only safe metadata and links to user/workspace without PHI.
- Recommendation endpoint filters by active workspace tools and permissions.
- Audit logs include workspace dimensions for workspace-sensitive actions.

## Implementation Phases

Phase 1: Source-of-truth alignment.

- Declare `UserIdentityContext` and `/api/profile/me` as the operational identity source.
- Migrate `/profile/settings` from `/api/users/profile` to `/api/profile/me`.
- Keep `UserContext` responsible for token/session state only.
- Keep local fallback behavior for offline/demo mode.

Phase 2: Preference migration.

- Sync theme, tool favorites, pinned tools, recent tools, compact mode, accessibility, default dashboard, calculator preferences, and AI behavior to backend preferences.
- Resolve ownership between notification preferences and operational profile preferences.

Phase 3: Workspace enforcement.

- Add workspace-aware backend guard/decorators.
- Enforce workspace permissions in fleet, Medical IoT, hospital maps, platform systems, tools, calculators, and assistant endpoints.
- Feed frontend route/tool visibility from backend effective permissions.

Phase 4: Dashboard and subsystem integration.

- Make command dashboard, assistant, `/tools`, calculators, fleet, Medical IoT, hospital maps, notifications, settings, and sidebar consume active workspace and operational profile consistently.
- Add workspace-specific dashboard defaults and labels.

Phase 5: Personalization and activity.

- Wire saved prompts and recent prompt previews into the assistant.
- Record safe activity from tools, calculators, AI, fleet, IoT, and workspace interactions.
- Generate recommendations from safe activity, workspace type, specialty, preferences, and enabled tools.

Phase 6: Administration and audit hardening.

- Build organization/workspace administration flows.
- Add role and membership management UI/API with audit logging.
- Add audit dimensions for workspace and actor/target relationships.

## Risks

- Auth/profile duplication: `UserContext`, `/api/users/profile`, `UserIdentityContext`, and `/api/profile/me` currently overlap.
- Permission drift: frontend static permissions can diverge from backend global and workspace effective permissions.
- PHI leakage: recents, notification previews, and AI personalization must never store raw patient data in generic profile state.
- Workspace ambiguity: current local workspaces are tool filters, while backend workspaces are identity scopes.
- JWT staleness: embedding mutable workspace permissions in tokens can leave permissions stale after membership changes.
- Audit volume: workspace switching and safe activity can generate high event volume, so compliance audit events and lightweight activity should remain distinct.
- Preference conflict: local settings, backend `UserPreference`, and notification preferences need clear conflict resolution.
- Migration complexity: preserving offline/demo fallback while making backend identity authoritative requires careful synchronization.

## Acceptance Criteria Coverage

- User profile becomes part of app architecture: covered by `UserIdentityContext`, `/api/profile/me`, profile routes, backend profile module, dashboard card, and sidebar integration.
- Workspace switching works conceptually: covered by `WorkspacesModule`, `UserWorkspaceState`, `/api/workspaces/active`, sidebar selector, and `/profile/workspaces`.
- AI personalization is planned: covered by AI preferences, saved prompts, recent prompts, suggested tools, recommendations, and assistant integration phases.
- Dashboard reflects user context: covered by `ProfileSummaryCard`, activity, favorites, recommendations, notifications, and workspace-specific dashboard direction.
- Profile system integrates with major subsystems: covered for dashboard, AI assistant, `/tools`, calculators, fleet, Medical IoT, hospital maps, notifications, settings, sidebar, auth, permissions, audit, and workspace services.
- No duplicate auth/profile flows: the plan preserves existing auth, narrows `UserContext` to session state, and makes operational profile routes the identity source of truth.
