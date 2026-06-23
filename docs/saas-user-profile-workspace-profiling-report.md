# Unified User Profile Catalog

## Overview

CareDroid uses one **canonical SaaS role** per user (admin-assigned via `roleProfileId`) to drive Emergency OS, TrackMind, navigation, clinical tools, and workspace access. User personalization is limited to pins, hidden tools (within allowed bounds), theme, and AI preferences.

## Catalog schema

Each entry in `src/config/user-profile-catalog.data.json` includes:

| Field | Purpose |
|-------|---------|
| `saasRole` | Canonical role id (`emergency-physician`, `student`, …) |
| `label` | Display label for profile and admin UI |
| `domain` | `clinical`, `operations`, `education`, `governance`, `trackmind`, `platform` |
| `hierarchyLevel` | 1 (student) – 6 (platform admin) |
| `emergencyRoleId` | Emergency OS role or `null` |
| `trackMindRoleId` | TrackMind persona or `null` |
| `allowedWorkspaces` | Workspace ids the role may use |
| `navigationGroups` | High-level product areas |
| `defaultScreenMode` | Emergency screen mode when applicable |
| `toolPolicy` | `allowedPacks`, `restrictedToolIds` |
| `requiredToolIds` | Tools that cannot be hidden by users |
| `profileBenefits` | Human-readable access summary for profile hub |

## API

`GET /api/profile/me` returns:

- `saasProfile` — persisted preferences and entitlements
- `effectiveProfile` — resolved catalog entry + permission presets
- `accessSummary` — `{ navigationRoutes, allowedWorkspaces, emergencyRole, trackMindRole, … }`

`PATCH /api/profile/me` rejects user-initiated `role`, `permissions`, and `allowedWorkspaces` changes unless the caller has `MANAGE_ROLES` or `MANAGE_USERS`. Hidden assets are validated against `requiredToolIds`.

## Admin workflow

1. Org admin assigns canonical role via membership / `roleProfileId` in Tenant Administration Center.
2. Use **Role access preview** to see routes, workspaces, Emergency/TrackMind mapping, and benefits before assignment.
3. Org-level `emergencyRoleMapping` remains as an override layer atop catalog defaults.

## Runtime wiring

- `resolveEmergencyRoleId` — catalog first, then org mapping
- `resolveTrackMindRoleId` — catalog first, then user overrides
- `getVisibleNavigation(role, { saasRole })` — filters sidebar from catalog routes
- `assetAccess.js` — respects catalog `toolPolicy`
- `useEffectiveUserProfile` — frontend hook for profile hub and AppShell

## Auth and account UX

CareDroid keeps **open-access demo mode** as the default session while offering optional sign-in:

| Session | Behavior |
|---------|----------|
| Open access | `OPEN_ACCESS_USER` + dev token; demo strip + “Sign in” in account menu |
| Authenticated | Real JWT from login/OAuth/magic link; profile hydration via `/api/auth/me` + `/api/profile/me` |

### Auth routes

| Route | Purpose |
|-------|---------|
| `/auth` | Sign in / create account (open + institution invite CTA) |
| `/auth/forgot-password` | Request reset email |
| `/reset-password?token=` | Complete password reset |
| `/verify-email?token=` | Email verification |
| `/auth/magic-link?token=` | Magic link sign-in |
| `/auth/invite?token=` | Workspace invitation accept flow |
| `/auth-callback` | OAuth token hydration |
| `/welcome` | Post-sign-up onboarding (`onboardingStatus`) |

### Profile page map

All `/profile/*` routes use `ProfileSettingsShell` with access summary:

- **Overview** — `/profile`
- **Identity** — `/profile/settings` (clinical fields only)
- **Preferences** — `/profile/preferences` (theme, density, AI, notifications)
- **Tools** — `/profile/tool-preferences`
- **Workspaces** — `/profile/workspaces`
- **Security** — `/profile/security` (2FA, biometric links)
- **Activity** — `/profile/activity`

Global account chrome: header `UserAccountMenu` (avatar, profile, sign in/out) and sidebar **Account** link.

## Tests

- `src/config/userProfileCatalog.test.ts`
- `src/config/userProfileIsolation.test.ts`
- `src/auth/authSession.test.ts`
- `src/components/account/UserAccountMenu.test.tsx`
