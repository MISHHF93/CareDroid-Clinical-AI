# Auth and Route Conflict Resolution Report

## 1) Auth route inventory
Canonical/public auth routes in `src/App.jsx`:
- `/auth` (single auth UI)
- `/auth-callback` (OAuth handoff)
- `/auth/callback` (legacy redirect to `/auth-callback`)

Auth aliases redirected to canonical `/auth` via `AUTH_PATH_ALIASES` + `AuthPathRedirect`:
- `/login`, `/signin`, `/sign-in`
- `/signup`, `/register`
- `/account/login`, `/account/signup`, `/account/register`
- `/accounts/login`, `/accounts/signup`

Source of alias list: `src/routing/authPathAliases.js`.

## 2) Root cause of `/auth` lock-in
Two conflicts were found:
1. `LegacyOAuthCallbackRedirect` was accidentally duplicated in `src/App.jsx` (double function declaration), which risks brittle routing behavior and parser/transform instability.
2. `/home` was configured as a redirect hop, which made auth/publicOnly transitions bounce through legacy redirects before landing at app content.

Together these increased the chance of perceived auth-loop behavior when auth state transitions were delayed.

## 3) Canonical auth route chosen
- Canonical auth UI: **`/auth`**.
- Canonical authenticated app shell landing: **`/home`** (with authenticated content), and auth success/dev bypass continue to **`/tools`**.

## 4) Redirects added/confirmed
Already present and preserved:
- `/login|/signin|/sign-in|/signup|/register|...` -> `/auth`
- `/auth/callback` -> `/auth-callback`
- `/dashboard` -> `/home`
- `/chat|/ai|/copilot` -> `/assistant`
- `/all-tools|/clinical-tools` -> `/tools`
- `/catalog` -> `/tools/catalog`
- `/fleet` -> `/operations`

## 5) Dev/demo bypass behavior
- Toggle: `VITE_ENABLE_DEV_AUTH_BYPASS=true`.
- Button shown on real rendered auth page (`src/pages/Auth.jsx`) and welcome page (`src/App.jsx`) only when enabled.
- Hidden when disabled/missing.
- Bypass creates/stores demo session via `src/auth/devAuthBypass.js` and enters app at `/tools`.
- In-session banner is shown in AppShell when demo mode active.

## 6) General duplicate route findings
- Assistant concept canonicalized to `/assistant` (legacy `/chat`, `/ai`, `/copilot` redirect).
- Tools concept canonicalized to `/tools` (legacy `/all-tools`, `/clinical-tools` redirect).
- Developer/source audit kept separate at `/tools/catalog` and permission-gated.
- Fleet landing canonicalized under operations with `/fleet` redirecting to `/operations`.
- Calculators canonicalized under `/tools/calculators/*` and legacy singular aliases redirected.

## 7) Canonical route map
- Auth: `/auth`
- Home: `/home`
- Assistant: `/assistant`
- Tools Browser: `/tools`
- Calculators Hub: `/tools/calculators`
- Developer Catalog / Source Audit: `/tools/catalog`
- Operations: `/operations`

## 8) Links updated
- No broad link rewrites were needed in this patch; existing link inventory tests already enforce canonical links and no deprecated visible aliases.

## 9) Tests added/updated
- Existing route-conflict tests were run and validated:
  - `src/routing/canonicalRouteRedirects.test.js`
  - `src/routing/sectionLinkInventory.test.js`
  - `src/config/appConfig.devBypass.test.js`
  - `src/services/apiClient.auth.test.js`

## 10) Remaining risks
- `npm run lint` passes with pre-existing warnings unrelated to this route fix. Converting warnings to zero is separate cleanup work.
- Some routes intentionally remain as aliases/redirects for backward compatibility; removing them would require comms + migration.
