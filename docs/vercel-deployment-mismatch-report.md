# Vercel Deployment Mismatch Report

## 1. Root Cause

Local Git and GitHub `main` are currently aligned, so the verified mismatch is not caused by an unpushed local commit.

The strongest repo-side causes were:

- No visible build identity in the deployed UI, making it impossible to prove which commit Vercel was serving from `/auth` or `/tools`.
- Hosted demo auth depends on `VITE_DEMO_MODE=true`; `VITE_ENABLE_DEV_AUTH_BYPASS=true` alone is local-dev oriented and is disabled in production bundles unless demo mode or explicit demo auth is enabled.
- The service worker used a long-lived app-shell cache name (`caredroid-v4-static-shell`), which made stale shell/cache diagnosis harder after repeated deploys.
- The local checkout is not linked to a Vercel project (`.vercel/project.json` is absent) and the Vercel CLI is not authenticated on this machine, so dashboard-only settings and deployment logs could not be read locally.

Fixes applied in this pass:

- Added build metadata injection in `vite.config.js`.
- Added a public `/version` route showing app version, commit hash, branch, build time, environment, repository, deployment URL, and deployment ID.
- Added a compact build badge to `/auth`.
- Added build commit metadata to the public shell footer.
- Updated the service worker cache from `caredroid-v4-static-shell` to `caredroid-v5-static-shell` and made navigation fetches use `cache: 'no-store'`.
- Updated Vercel env validation so Vercel demo builds fail if `VITE_DEMO_MODE=true` or `VITE_ENABLE_DEV_AUTH_BYPASS=true` is missing.
- Updated `vercel.json` so Vercel exports hosted-demo defaults before validation and build when the dashboard env vars are absent.
- Documented optional build metadata env values in `.env.example`.

## 2. Local Commit Hash

- Branch: `main`
- Local `HEAD`: `335222a1b73f1cd5544074a8c4402a09c990eba6`
- Working tree before this fix pass: clean
- Working tree after this fix pass: expected local changes for version metadata, service worker cache hardening, Vercel env validation, and this report

## 3. GitHub Commit Hash

- Remote: `origin`
- GitHub repo URL: `https://github.com/MISHHF93/CareDroid-Clinical-AI.git`
- `origin/main`: `335222a1b73f1cd5544074a8c4402a09c990eba6`
- `git ls-remote origin main`: `335222a1b73f1cd5544074a8c4402a09c990eba6`

Local `HEAD`, local `origin/main`, and GitHub `main` matched at investigation time.

## 4. Vercel Deployed Commit Hash

Not available from this workstation during the investigation.

Reasons:

- `vercel` was not installed globally.
- `npx vercel whoami` started a login flow and reported no existing credentials.
- `.vercel/project.json` is not present, so the local checkout is not linked to a specific Vercel project.
- No deployment URL was available in the repo config.

After this fix is deployed, the deployed commit can be checked directly at:

- `https://<vercel-domain>/version`
- `/auth`, using the build badge at the bottom of the auth panel

## 5. Vercel Project Settings

The repository defines the intended settings in `vercel.json`. Confirm the Vercel dashboard matches these values:

- Connected GitHub repo: `MISHHF93/CareDroid-Clinical-AI`
- Production branch: `main`
- Root directory: repository root, not `backend`, `src`, or another subfolder
- Framework preset: `Vite`
- Install command: `npm ci --audit=false --fund=false`
- Build command: `export VITE_ALLOW_SAME_ORIGIN_API="${VITE_ALLOW_SAME_ORIGIN_API:-true}" VITE_DEMO_MODE="${VITE_DEMO_MODE:-true}" VITE_ENABLE_DEV_AUTH_BYPASS="${VITE_ENABLE_DEV_AUTH_BYPASS:-true}" && npm run validate:vercel-env && npm run build`
- Output directory: `dist`
- Node version: use the Vercel project default compatible with Vite 7, or pin Node 22 if the dashboard allows it

If any dashboard value differs from `vercel.json`, the dashboard override can cause Vercel to build a different app than local.

## 6. Build Command

Local production build:

```bash
npm run build
```

Vercel build command from `vercel.json`:

```bash
export VITE_ALLOW_SAME_ORIGIN_API="${VITE_ALLOW_SAME_ORIGIN_API:-true}" VITE_DEMO_MODE="${VITE_DEMO_MODE:-true}" VITE_ENABLE_DEV_AUTH_BYPASS="${VITE_ENABLE_DEV_AUTH_BYPASS:-true}" && npm run validate:vercel-env && npm run build
```

The Vercel command intentionally exports default hosted-demo flags first, runs env validation, then runs the same production Vite build used locally.

## 7. Output Directory

- Vite output directory in `vite.config.js`: `dist`
- Vercel output directory in `vercel.json`: `dist`
- Capacitor web output also expects `dist`

These are aligned.

## 8. Required Env Vars

Required for the current hosted demo behavior:

```bash
VITE_DEMO_MODE=true
VITE_ENABLE_DEV_AUTH_BYPASS=true
```

These are defaulted in `vercel.json` for the hosted demo build, but they should still be set explicitly in the Vercel dashboard for clarity.

API routing must use one of these approaches:

```bash
# Preferred when the Nest API is deployed separately:
VITE_API_URL=https://<api-host>
VITE_ALLOW_SAME_ORIGIN_API=false
```

or:

```bash
# Only when Vercel has a verified same-origin API reverse proxy:
VITE_API_URL=
VITE_ALLOW_SAME_ORIGIN_API=true
```

Optional but useful:

```bash
VITE_APP_NAME=CareDroid-Clinical-AI
VITE_APP_VERSION=1.0.0
VITE_APP_ENVIRONMENT=production
VITE_WS_URL=
```

Vercel automatically provides Git metadata such as `VERCEL_GIT_COMMIT_SHA` and `VERCEL_GIT_COMMIT_REF`; `vite.config.js` now injects those into the app build.

## 9. Cache / Service Worker Findings

Findings:

- `vercel.json` correctly disables long-lived caching for `/`, `/index.html`, `/sw.js`, and `/firebase-messaging-sw.js`.
- Static hashed assets under `/assets/*` correctly use `max-age=31536000, immutable`.
- The app registers `/sw.js` from `src/main.jsx`.
- The previous service worker cache name was `caredroid-v4-static-shell`.
- Navigation requests used network-first behavior, but the request did not explicitly bypass browser HTTP cache.

Fixes:

- Updated cache name to `caredroid-v5-static-shell`, forcing old shell cache cleanup on activation.
- Updated navigation network fetches to use `cache: 'no-store'`.

Manual browser recovery if a user still sees stale UI:

1. Open DevTools.
2. Go to Application > Service Workers.
3. Click Update or Unregister for the current service worker.
4. Go to Application > Storage and clear site data.
5. Hard refresh the site.
6. Visit `/version` and compare the commit hash.

## 10. Fixes Applied

Changed files:

- `.env.example`
- `vite.config.js`
- `scripts/validate-vercel-env.mjs`
- `public/sw.js`
- `src/config/buildInfo.js`
- `src/components/BuildInfoBadge.jsx`
- `src/components/BuildInfoBadge.css`
- `src/pages/Version.jsx`
- `src/pages/Version.css`
- `src/pages/Version.test.jsx`
- `src/pages/Auth.jsx`
- `src/pages/Auth.css`
- `src/layout/PublicShell.jsx`
- `src/layout/PublicShell.css`
- `src/App.jsx`
- `vercel.json`
- `docs/vercel-deployment-mismatch-report.md`

## 11. Verification Steps

Local verification:

```bash
npm run validate:vercel-env
npm run test:run -- src/pages/Version.test.jsx
npm run build
```

Vercel verification after commit/push/redeploy:

1. Confirm Vercel production deployment source is `MISHHF93/CareDroid-Clinical-AI`, branch `main`.
2. Confirm root directory is the repository root.
3. Confirm build command and output directory match this report.
4. Confirm env vars include `VITE_DEMO_MODE=true` and `VITE_ENABLE_DEV_AUTH_BYPASS=true`.
5. Trigger a clean redeploy without build cache.
6. Open `/version` on Vercel and confirm the commit equals the latest GitHub `main` commit.
7. Open `/auth` on Vercel and confirm the build badge shows the same commit.
8. Confirm Direct Sign In appears on `/auth`.
9. Use Direct Sign In, navigate to `/tools`, and confirm the tools route loads.
10. In browser DevTools, confirm the loaded JS bundles are from the latest deployment and no old service worker cache is controlling the page.
