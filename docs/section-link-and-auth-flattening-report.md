# Section Link and Auth Flattening Report

## Summary

This pass re-audited the actual auth and route code instead of assuming earlier work succeeded. The first unauthenticated screen is `/`, rendered by `WelcomePage` in `src/App.jsx`; protected routes redirect unauthenticated users to `/auth`.

The visible local/dev entry point now exists on both:

- `/` via `WelcomePage`
- `/auth` via `src/pages/Auth.jsx`

The button is gated by `VITE_ENABLE_DEV_AUTH_BYPASS=true` and `src/config/appConfig.js` forces it off in production Vite bundles.

## Dev Auth Bypass Notes

| Item | Result |
| --- | --- |
| First unauthenticated screen | `/` (`WelcomePage`) |
| Canonical auth screen | `/auth` |
| Dev button label | `Continue in Demo / Local Dev Mode` |
| Gate | `VITE_ENABLE_DEV_AUTH_BYPASS=true` |
| Production behavior | Disabled by `!isProductionBuild()` in `appConfig` |
| Session behavior | Calls `/api/auth/dev-session` when available; falls back to local mock clinician profile only when explicitly enabled |
| Post-login route | `/tools` from welcome page, `/home` from auth page |
| Visible banner after login | `AppShell` dev mode banner |

## Canonical Route Map

| Route | Status | Notes |
| --- | --- | --- |
| `/` | canonical public | Landing page and first unauthenticated screen |
| `/auth` | canonical auth | Sign in and create account live on one page |
| `/login`, `/signin`, `/sign-in` | alias/redirect | Redirect to `/auth` |
| `/signup`, `/sign-up`, `/register`, `/join`, `/create-account` | alias/redirect | Redirect to `/auth?mode=signup` when no mode is supplied |
| `/auth-callback` | canonical OAuth callback | Redirects to `/home` after token save |
| `/auth/callback` | legacy redirect | Redirects to `/auth-callback` |
| `/home` | canonical home | Main authenticated landing/dashboard |
| `/dashboard` | legacy redirect | Redirects to `/home` |
| `/assistant` | canonical chat/assistant | User-facing AI assistant route |
| `/chat` | legacy redirect | Redirects to `/assistant` |
| `/tools` | canonical tools catalog | User-facing feature browser |
| `/tools/catalog` | developer-only | Developer Catalog / Source Audit, gated by `Permission.CONFIGURE_SYSTEM` |
| `/catalog` | legacy redirect | Redirects to `/tools/catalog` |
| `/tools/calculators` | canonical calculator hub | Calculator browser and guided chat hub |
| `/tools/calculators/:slug` | canonical calculator page | Dedicated calculator routes |
| `/tools/calculator/:slug` | legacy redirect | Specific old singular calculator paths redirect to plural canonical routes |
| `/operations` | canonical operations | Operations workspace |
| `/fleet/command` | canonical fleet command | Fleet dashboard |
| `/fleet` | legacy redirect | Redirects to `/fleet/command` |
| `/settings` | canonical settings | Settings and account controls |

## Link Inventory

| Section | Label | Route | Source file | Canonical? | Works? | Duplicate? | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | Sign In or Create Account | `/auth` | `src/App.jsx` | yes | yes | no | kept |
| Home | Continue in Demo / Local Dev Mode | `/tools` after click | `src/App.jsx` | yes | yes when flag true | no | added to first screen |
| Auth/Login | Continue in Demo / Local Dev Mode | `/home` after click | `src/pages/Auth.jsx` | yes | yes when flag true | no | shared bypass utility |
| Auth/Login | Back to home | `/` | `src/pages/Auth.jsx` | yes | yes | no | kept |
| Auth aliases | Login aliases | `/auth` | `src/routing/authPathAliases.js`, `src/App.jsx` | alias | yes | yes, intentional | redirect preserved |
| Auth aliases | Signup aliases | `/auth?mode=signup` | `src/routing/authPathAliases.js`, `src/App.jsx` | alias | yes | yes, intentional | signup intent preserved |
| Sidebar | Home | `/home` | `src/navigation/primaryNavigation.js` | yes | yes | no | kept |
| Sidebar | Assistant | `/assistant` | `src/navigation/primaryNavigation.js` | yes | yes | no | kept |
| Sidebar | Tools | `/tools` | `src/navigation/primaryNavigation.js` | yes | yes | no | kept |
| Sidebar | Developer Catalog / Source Audit | `/tools/catalog` | `src/components/Sidebar.jsx` | developer-only | yes for admins | no | hidden from normal users |
| Header/mobile nav | Primary nav buttons | `/home`, `/assistant`, `/tools`, `/patients`, `/operations`, `/settings` | `src/layout/AppShell.jsx` | yes | yes | no | kept |
| Tools | Developer Catalog / Source Audit | `/tools/catalog` | `src/pages/tools/ToolsOverview.jsx` | developer-only | yes for admins | no | hidden from normal users |
| Tools | Tool cards | registry launch resolver | `src/pages/tools/ToolsOverview.jsx`, `src/navigation/registryToolLaunch.js` | yes | yes | no | resolver normalized |
| Calculators | Dedicated calculator cards | `/tools/calculators/:slug` | `src/data/toolRegistry.js`, `src/routes/clinicalToolRoutes.js` | yes | yes | no | singular routes redirected |
| Chat-assisted tools | Start guided chat | `/assistant?tool=:id` | `src/routes/clinicalToolRoutes.js`, `src/navigation/registryToolLaunch.js` | yes | yes | no | `/chat` drift removed from resolver |
| AI tools | Tool pages | `/tools/*` | `src/App.jsx` | yes | yes | no | kept |
| Fleet/operations | Operations cards | `/operations`, `/fleet/*`, `/clinical/alerts`, `/analytics`, `/audit-logs` | `src/pages/Operations.jsx` | yes | permission-based | no | kept |
| Settings | Back to Assistant | `/assistant` | `src/pages/Settings.jsx` | yes | yes | no | fixed old `/` back link |
| OAuth callback | Success redirect | `/home` | `src/pages/AuthCallback.jsx` | yes | yes | no | fixed old `/dashboard` redirect |
| Fallbacks | Unknown tools/fleet | `ToolsAreaFallback` | `src/pages/tools/ToolsAreaFallback.jsx` | internal | yes | no | kept |

## Fixes Applied

- Added shared dev auth session logic in `src/auth/devAuthBypass.js`.
- Added first-screen dev bypass CTA to `WelcomePage` in `src/App.jsx`.
- Kept `/auth` dev bypass using the same shared session logic.
- Added production guard for `VITE_ENABLE_DEV_AUTH_BYPASS`.
- Documented the env flag in `.env.example`.
- Preserved signup alias intent with `/auth?mode=signup`.
- Normalized chat-assisted navigation to `/assistant`.
- Normalized legacy Tier A calculator paths from `/tools/calculator/*` to `/tools/calculators/*`.
- Added legacy redirects for singular calculator paths.
- Added `/catalog` redirect to `/tools/catalog`.
- Gated Developer Catalog / Source Audit links and route with `Permission.CONFIGURE_SYSTEM`.
- Fixed OAuth callback and settings links that still pointed at legacy `/dashboard`, `/`, or chat wording.

## Remaining Risks

- Some legacy tests and generated audit datasets still mention `/chat`, `/dashboard`, or `/tools/calculator/*` as historical aliases. The user-facing route strategy is normalized, and aliases are preserved, but broader generated audit cleanup may require a separate churn-heavy pass.
- Local command execution in this environment previously lacked `npm` on PATH, so final test/build validation depends on whether npm is available in the active shell.
