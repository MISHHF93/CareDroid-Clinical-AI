# Auth Route Rebuild Report

## 1) Auth route inventory
- Canonical auth UI route: `/auth` renders `AuthShell` + `AuthPage` (`Auth` component).
- OAuth callback: `/auth-callback` renders `AuthCallback`; legacy `/auth/callback` redirects there.
- Aliases normalized to `/auth` via `AUTH_PATH_ALIASES`: `/login`, `/signin`, `/sign-in`, `/signup`, `/register`, etc.
- Protected routes use one resolver in `AppRoutes` that redirects unauthenticated users to `/auth`.

## 2) Root cause of /auth lock-in
- Dev/demo button visibility was gated by `enableDevAuthBypass` in config, and that flag was forcibly disabled in production bundles regardless of `VITE_ENABLE_DEV_AUTH_BYPASS`. This made the direct login button disappear in production-like builds even when explicitly enabled.

## 3) Canonical auth route chosen
- `/auth` remains the single canonical authentication entry point.

## 4) Redirect aliases added/confirmed
- Existing auth aliases continue redirecting to `/auth`.
- Added calculators alias normalization: `/calculators` -> `/tools/calculators`.

## 5) Auth provider/protected route changes
- Kept a single `UserProvider`.
- Kept one protected-route decision path in `resolveElement`.
- Updated catch-all unauthenticated fallback to route to `/auth` directly.

## 6) Dev/demo bypass behavior
- `VITE_ENABLE_DEV_AUTH_BYPASS=true` now fully controls bypass visibility in all build modes.
- Bypass still requires explicit opt-in and writes `caredroid_access_token` + `caredroid_user_profile` keys and `authMode: local-dev-demo`.

## 7) Demo mode banner behavior
- `AppShell` demo banner remains active when `isDevAuthBypass` is true from user context.

## 8) Other route conflicts found
- Tools aliases already normalized (`/all-tools`, `/clinical-tools` -> `/tools`).
- Assistant aliases already normalized (`/chat`, `/ai`, `/copilot` -> `/assistant`).
- Home aliases already normalized (`/dashboard` -> `/home`).

## 9) Tests added/updated
- Added `src/routing/authRouteFlow.test.jsx` for canonical auth and alias wiring assertions.

## 10) Commands run
- See terminal command list in task summary.

## 11) Remaining risks
- If env is not injected at runtime/build time, bypass visibility still depends on deployment configuration.
