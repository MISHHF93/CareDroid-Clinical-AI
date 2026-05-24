# Route/Auth Rebuild Report

## Current route tree investigation

### Key findings before rebuild
- Routing was centralized in `src/App.jsx`, but canonical user-facing tool routes (`/tools`, `/tools/catalog`, `/tools/calculators`) were redirecting into `/assistant` query-string states via `AssistantToolRedirect`. 
- Auth aliases were already partially normalized through `AUTH_PATH_ALIASES` + `AuthPathRedirect`.
- Protected-route behavior was embedded in `resolveElement` (`requiresAuth` => redirect to `/auth`).
- Wildcard `*` redirected authenticated users to `/home`, masking unknown-route UX and fragmenting route ownership.

### Current route table (pre-rebuild summary)
| Path pattern | Render/redirect target | Auth required | Layout | Status |
|---|---|---:|---|---|
| `/auth` | `AuthPage` | No (public-only) | `AuthShell` | Canonical auth |
| `/login`, `/signin`, `/sign-in`, etc | Redirect to `/auth` | No | N/A | Duplicate aliases |
| `/home` | `Dashboard` | Yes | `AppShellPage` | Competing app-entry |
| `/assistant` | `Dashboard` | Yes | `AppShellPage` | Canonical assistant/chat |
| `/chat`, `/ai`, `/copilot` | Redirect to `/assistant` | Yes | N/A | Duplicate aliases |
| `/tools` | Redirect to `/assistant?drawer=tools` | Yes | N/A | Fragmented canonical path |
| `/tools/catalog` | Redirect to `/assistant?drawer=tools&view=catalog` | Yes + permission | N/A | Fragmented developer route |
| `/tools/calculators` | Redirect to `/assistant?tool=calculators` | Yes | N/A | Fragmented calculator hub |
| `/tools/*` | `ToolsAreaFallback` | Yes | `AppShellPage` | Partial fallback |
| `*` | Redirect to `/home` or `/auth` | Mixed | N/A | Masks unknown-route context |

## `/auth` lock-in root cause

Root cause in code: unauthenticated users were correctly redirected to `/auth`, but the post-auth canonical application routes still depended on assistant-query redirect pathways, and the app had multiple competing entry points (`/home`, `/assistant`, `/tools` redirecting elsewhere). This made production behavior appear “stuck” when auth/session wasn't accepted or demo mode wasn't enabled via env flags.

Additional concrete factors:
1. `/auth` renders `AuthPage` (`AuthShell` + `Auth` component).
2. Demo button is present in `Auth` and gated by `isDevAuthBypassEnabled()`.
3. If `VITE_DEMO_MODE`/`VITE_ENABLE_DEV_AUTH_BYPASS` are not truthy at build/runtime, button is hidden by design.
4. `requiresAuth` routes redirect to `/auth` when no token exists.
5. Demo login writes auth token + user profile; `UserContext` authenticates via token presence.
6. Wildcard behavior previously redirected authenticated users to `/home`, obscuring missing-route diagnosis.

## Canonical route map (rebuilt)

### Public
- `/` -> redirect to `/auth` when unauthenticated; `/tools` when authenticated.
- `/auth` -> canonical auth page.
- `/login`, `/signin`, `/sign-in`, aliases -> redirect to `/auth`.

### Protected
- `/assistant` -> canonical assistant/chat route.
- `/home`, `/dashboard` -> redirects to `/assistant`.
- `/tools` -> canonical tools overview page (`ToolsOverview`).
- `/tools/calculators` -> canonical calculators hub (`Calculators`).
- `/tools/calculators/:slug` -> canonical calculator detail route (`Calculators`).
- `/tools/catalog` -> canonical developer catalog/source audit (`ClinicalToolCatalog`, permission-gated).
- `/operations` remains canonical fleet/operations entry; `/fleet` redirects to `/operations`.
- settings/profile/etc remain protected in single `AppShellPage`.

### Fallback
- Unknown protected tools routes (`/tools/*`) now render `ToolNotFound` inside app shell.
- Global unknown authenticated routes render `ToolNotFound` (not redirect loop / blank UI).
- Unknown unauthenticated routes redirect to `/auth`.

## Redirects added/normalized
- `/home` -> `/assistant`
- `/dashboard` -> `/assistant`
- `/chat` -> `/assistant` (existing, preserved)
- `/catalog` -> `/tools/catalog` (existing, preserved)
- Login/auth aliases -> `/auth` (existing, preserved)

## Auth gate and demo mode contract
- Single auth gate remains in `resolveElement` using `requiresAuth` and `publicOnly`.
- Public-only redirect target updated to `/tools` for authenticated users.
- Permission fallback target updated to `/tools`.
- Demo mode button remains on real `/auth` page with label “Continue in Demo / Local Dev Mode”.
- Demo requires env-gated `isDevAuthBypassEnabled()`.

## Links and canonical path consistency
- Canonical tool UX is now direct-route based (`/tools`, `/tools/calculators`, `/tools/catalog`) instead of assistant-query indirection.
- Legacy paths continue redirecting to canonical routes.

## Tests added/updated
- Added `src/routing/routeAuthRebuild.test.js` asserting:
  - canonical auth route,
  - canonical tools/calculators routes,
  - alias redirects,
  - protected not-found rendering.

## Deployment checklist
1. Build with env vars:
   - `VITE_DEMO_MODE=true`
   - `VITE_ENABLE_DEV_AUTH_BYPASS=true` (if desired for demo button)
2. Deploy.
3. Verify:
   - `/auth` shows demo button when env enabled,
   - demo click lands on `/tools`,
   - refreshing `/tools` does not bounce back to `/auth` while token persists,
   - `/login`, `/signin`, `/sign-in` redirect to `/auth`.
