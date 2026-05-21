# Deployment runtime validation report

Date: 2026-05-20

## Summary

Status: blocked for live deployed-runtime sign-off because no deployed URL was available in the workspace, no `.vercel` project metadata exists, and neither the Vercel CLI nor GitHub CLI is installed. Local production build validation passed, and deployed-runtime smoke automation was added so the remaining checks can run against the real environment with `QA_BASE_URL`.

Run the deployed validation with:

```bash
QA_BASE_URL=https://your-deployed-spa.example.com npm run test:e2e:production
```

For strict backend-backed API validation, provide a real authenticated browser state or token:

```bash
QA_BASE_URL=https://your-deployed-spa.example.com QA_AUTH_STATE=e2e/.auth/prod-user.json QA_STRICT_API=true npm run test:e2e:production
```

## Deployment configuration report

- `vercel.json` is a static Vite deployment: install `npm ci`, build `npm run validate:vercel-env && npm run build`, output `dist`.
- `vercel.json` rewrites all paths to `/index.html`; it does not proxy `/api`, `/health`, or `/socket.io`.
- `vite.config.js` proxies `/api`, `/health`, and `/socket.io` only for dev and preview. Production must use `VITE_API_URL` or a real same-origin reverse proxy.
- `src/config/appConfig.js` reads `VITE_API_URL` as the API origin.
- `src/config/apiEnv.js` appends `/api` when an API origin exists, and uses same-origin `/api` when unset.
- `scripts/validate-vercel-env.mjs` rejects Vercel builds without `VITE_API_URL` unless `VITE_ALLOW_SAME_ORIGIN_API=true`, rejects `VITE_API_URL` ending in `/api`, and rejects `VITE_HIDE_DIVISION_MODE=false`.
- `backend/src/main.ts` sets the Nest global prefix to `/api`, excludes `/health`, and requires `FRONTEND_URL` to match the SPA origin for split deploy CORS.
- `backend/src/app.module.ts` serves `dist` only for `NODE_ENV=production` single-origin Nest deployments.

## Deployment log report

Log retrieval was not possible from this machine:

- `vercel --version` failed because Vercel CLI is not installed.
- `gh --version` failed because GitHub CLI is not installed.
- `.vercel/project.json` was not present, so no linked Vercel project metadata was available.

Required log evidence for final sign-off:

- Install step shows `npm ci` succeeded.
- Build step shows `npm run validate:vercel-env && npm run build` succeeded.
- Output step published `dist`.
- Runtime/build logs contain no missing env warnings, asset upload failures, source map policy surprises, or API rewrite warnings.

## Runtime error report

Live browser runtime was not executed because `QA_BASE_URL` was not available. The new production smoke suite records these failure classes when run against a deployment:

- Console errors and page errors.
- Failed requests.
- HTTP 4xx/5xx responses.
- Missing asset responses for scripts, styles, images, fonts, or `/assets/*`.
- `/api/api/*` duplicate-prefix requests.
- API endpoints returning HTML, which indicates SPA rewrite leakage into API traffic.
- Horizontal overflow on Android viewport checks.

Local validation results:

- `npm run validate:vercel-env` passed.
- `npm run build` passed and produced `dist`.
- `npm run backend:build` passed.
- `npm run test:e2e:production` failed fast as expected without `QA_BASE_URL`.
- `QA_BASE_URL=https://example.com npx playwright test e2e/production-smoke.spec.mjs --config=playwright.production.config.mjs --list` passed and listed 42 deployed-runtime checks.
- `npx eslint e2e/production-smoke.spec.mjs playwright.production.config.mjs` passed.

## Android runtime report

Live Android checks were not executed because `QA_BASE_URL` was not available. The added production smoke suite covers these deployed-url combinations:

- Pixel 7 portrait and landscape.
- Pixel 7 Pro portrait and landscape.
- Samsung Galaxy S class portrait and landscape.
- Samsung Galaxy A class portrait and landscape.
- Routes: `/tools`, `/tools/calculators`, `/tools/calculators/has-bled`, and `/dashboard?tool=wells-pe`.

## Missing environment report

Live validation inputs missing from this workspace:

- `QA_BASE_URL`: required deployed SPA URL for production smoke.
- `QA_AUTH_STATE` or `QA_AUTH_TOKEN`: required for strict authenticated backend/API smoke.
- Vercel or CI log access: required for deployment log verification.

Production frontend variables to verify in Vercel:

- `VITE_API_URL`: required for Vercel split API deploys; must be API origin only, without `/api`.
- `VITE_ALLOW_SAME_ORIGIN_API`: only `true` after verifying a real edge/reverse proxy forwards `/api` to Nest.
- `VITE_HIDE_DIVISION_MODE`: unset or `true` for production.
- `VITE_WS_URL`: required only when WebSockets use a different origin.
- `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, and analytics/legal/Firebase values as needed.

Production backend variables to verify:

- `NODE_ENV=production`, `PORT`, and `FRONTEND_URL`.
- Postgres `DATABASE_*` or `DATABASE_URL`; SQLite should not be used unless explicitly accepted.
- Strong `JWT_SECRET`, `ENCRYPTION_KEY`, and `ENCRYPTION_MASTER_KEY`.
- OAuth callback URLs that point to the deployed API origin.
- `OPENAI_API_KEY`, RAG/Pinecone values, NLU service URL, Redis, SMTP, Stripe, Sentry, and Datadog values as feature usage requires.

## Fix list

1. Fix the current deployed settings error by setting `VITE_API_URL` to the real backend origin, for example `https://api.example.com`, or by configuring and verifying a same-origin `/api` reverse proxy with `VITE_ALLOW_SAME_ORIGIN_API=true`.
2. Redeploy the frontend so the build-time `VITE_API_URL` is baked into the bundle.
3. Provide `QA_BASE_URL` for the deployed SPA and run `npm run test:e2e:production`.
4. Provide `QA_AUTH_STATE` or `QA_AUTH_TOKEN` plus `QA_STRICT_API=true` to verify backend-backed tools and chat without ignoring auth-only 401/403 responses.
5. Install or otherwise provide Vercel/GitHub deployment log access so install, build, output, and runtime warnings can be verified.
6. Confirm backend `FRONTEND_URL` exactly matches the deployed SPA origin to avoid CORS failures.
7. Decide source map policy before production release. The current Vite production build emits source maps.

