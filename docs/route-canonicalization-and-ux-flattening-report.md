# Route Canonicalization and UX Flattening Report

## Summary

This pass normalizes the visible CareDroid route system around one clinician-facing information architecture:

- `/home` is the authenticated home / pulse surface.
- `/assistant` is the primary AI assistant workspace.
- `/tools` is the canonical user-facing tool browser.
- `/tools/calculators` is the calculator-filtered tool view.
- `/tools/catalog` remains Developer Catalog / Source Audit only and is permission gated.
- `/operations` is the canonical operations landing route.
- `/auth` remains the implemented SPA sign-in / create-account page.

Legacy and duplicate paths now redirect to the canonical route where practical instead of rendering competing UI.

## Route Inventory

### Public and Auth Routes

- `/` — canonical public welcome route; public-only, authenticated users redirect to `/home`.
- `/auth` — canonical auth route; public-only sign-in / create-account UI.
- `/auth-callback` — canonical OAuth callback handoff route.
- `/auth/callback` — alias/redirect to `/auth-callback`.
- `/login`, `/log-in`, `/signin`, `/sign-in`, `/signup`, `/sign-up`, `/register`, `/join`, `/create-account`, `/account/login`, `/account/signup`, `/account/register`, `/accounts/login`, `/accounts/signup` — auth aliases/redirects to `/auth`; signup aliases preserve `mode=signup`.
- `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help` — canonical public legal/help routes.
- `/shared/tools/:shareId` — canonical public shared-tool session route.

### Authenticated Canonical App Routes

- `/home` — canonical home / pulse route; renders in `AppShell`.
- `/assistant` — canonical AI assistant workspace; renders in `AppShell`.
- `/patients` — canonical patients route; renders in `AppShell`.
- `/operations` — canonical operations landing route; renders in `AppShell`.
- `/settings`, `/profile`, `/profile-settings`, `/notifications` — canonical account/settings routes; render in `AppShell`.
- `/two-factor-setup`, `/biometric-setup`, `/onboarding` — canonical setup/onboarding routes; render in `AppShell`.
- `/consent`, `/consent-history` — canonical consent routes; render in `AppShell`.
- `/team`, `/audit-logs`, `/analytics`, `/costs` — canonical admin/analytics routes; render in `AppShell` and remain permission gated where applicable.
- `/clinical/alerts` — canonical clinical intelligence alerts route; renders in `AppShell`.

### Tools Routes

- `/tools` — canonical user-facing tool browser; renders `ToolsOverview` in `AppShell`.
- `/tools/calculators` — canonical calculator hub / filtered calculator view; renders `Calculators` in `AppShell`.
- `/tools/calculators/:slug` generated from `CALCULATOR_ROUTE_DEFS` — canonical dedicated calculator deep links.
- `/tools/drug-checker`, `/tools/lab-interpreter`, `/tools/protocols`, `/tools/diagnosis`, `/tools/procedures`, `/tools/calculator-recommender`, `/tools/ambient-scribe`, `/tools/guideline-rag`, `/tools/differential-ai`, `/tools/timeline-ai`, `/tools/patient-summary-ai`, `/tools/order-set-ai`, `/tools/ai-explainability`, `/tools/clinical-audit` — canonical tool detail routes, permission gated where required.
- `/tools/catalog` — developer-only Developer Catalog / Source Audit; permission gated by `Permission.CONFIGURE_SYSTEM`.
- `/tools/*` — internal fallback route; redirects mistyped known tool/calculator links or renders a nonblank `ToolNotFound`.

### Fleet and Operations Routes

- `/operations` — canonical operations/fleet landing concept.
- `/fleet` — alias/redirect to `/operations`.
- `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer` — remaining canonical fleet sub-workflows; render in `AppShell`.
- `/fleet/*` — internal fallback route; renders a nonblank `ToolNotFound`.

### Aliases and Deprecated Routes

- `/dashboard` — alias/redirect to `/home`.
- `/chat` — alias/redirect to `/assistant`.
- `/ai`, `/copilot` — aliases/redirects to `/assistant`.
- `/all-tools`, `/clinical-tools` — aliases/redirects to `/tools`.
- `/catalog` — alias/redirect to `/tools/catalog`.
- `/tools/calculator/sofa`, `/tools/calculator/gfr`, `/tools/calculator/bmi`, `/tools/calculator/chads2vasc` — legacy calculator aliases/redirects to plural `/tools/calculators/...` routes.
- `*` — catch-all redirects authenticated users to `/home` and unauthenticated users to `/`.

## Canonical Route Map

- Auth: `/auth`
- Public landing: `/`
- Authenticated home: `/home`
- Assistant: `/assistant`
- User-facing tools: `/tools`
- Calculators: `/tools/calculators`
- Developer/source audit catalog: `/tools/catalog`
- Operations: `/operations`
- Fleet sub-workflows: `/fleet/command`, `/fleet/predictive-maintenance`, `/fleet/route-optimizer`
- Settings/account: `/settings`, `/profile`, `/profile-settings`, `/notifications`

## Redirects Added or Changed

- Added `/ai` -> `/assistant`.
- Added `/copilot` -> `/assistant`.
- Added `/all-tools` -> `/tools`.
- Added `/clinical-tools` -> `/tools`.
- Changed `/fleet` from `/fleet/command` to `/operations` so the top-level operations/fleet concept has one canonical landing route.
- Preserved existing `/dashboard` -> `/home`, `/chat` -> `/assistant`, `/catalog` -> `/tools/catalog`, auth aliases -> `/auth`, and singular calculator aliases -> plural calculator routes.

Redirect helpers preserve query strings and hashes for protected aliases.

## Links Updated

- `ProfileSettings` now links back to `/assistant` instead of `/`.
- `Onboarding` now links back to `/assistant` instead of `/`.
- Tool fallback copy now points users to All Tools and labels Developer Catalog / Source Audit as developer-only.
- Developer catalog search is now labelled "Search developer catalog" instead of "Search clinical catalog".
- Primary navigation metadata now records `/ai`, `/copilot`, `/all-tools`, `/clinical-tools`, and `/fleet` as legacy aliases while keeping visible navigation on canonical paths.
- Platform inventory now lists the AI workspace as `/home` and `/assistant` instead of `/dashboard`.

## Remaining Developer and Internal Routes

- `/tools/catalog` is intentionally developer/audit only and remains permission gated.
- `/audit-logs`, `/analytics`, `/costs`, and `/team` are internal/admin routes and remain permission gated where applicable.
- `/tools/*` and `/fleet/*` are fallback routes for safe nonblank error states and deep-link repair.
- `/fleet/command`, `/fleet/predictive-maintenance`, and `/fleet/route-optimizer` remain direct fleet sub-workflows because they are specific operational screens, not competing top-level operations landings.

## Tests Updated

- `src/routing/canonicalRouteRedirects.test.js` now verifies assistant/tool alias constants, `/fleet` -> `/operations`, developer catalog separation, calculator aliases, and no blank/null route elements.
- `src/routing/sectionLinkInventory.test.js` now verifies canonical visible links, Profile Settings assistant link, legacy redirects, and that visible link sources do not point to deprecated route aliases.
- `src/test/responsiveRegression.routes.js` and `src/test/routePagesSmoke.test.jsx` now smoke canonical `/home` and `/assistant` instead of legacy `/dashboard` and `/chat`.
- Dashboard mobile/chat layout tests now open `/assistant` for chat-mode coverage.
- Tool fallback tests now expect chat-assisted fallback redirects to `/assistant`.
- Legacy data/catalog wiring tests were updated from `/chat` or `/dashboard` expectations to `/assistant` where the production resolver already returned the canonical assistant route.
- Developer catalog tests now expect the developer-specific search label.

## Risks and Notes

- Auth canonicalization intentionally keeps `/auth` as canonical because it is the currently implemented SPA auth route. `/login` remains an alias instead of becoming a second login UI.
- `/` remains the public welcome route, not a hard redirect to `/home`, to preserve unauthenticated production behavior and the dev bypass entry point. Authenticated public-only routing still redirects `/` to `/home`.
- Query/hash preservation is handled for protected legacy redirects. The OAuth legacy redirect preserves query strings for token handoff.
- The app still contains legacy route strings in redirect definitions, matching metadata, and tests by design; visible links are covered by `sectionLinkInventory.test.js`.

## Test Results

Completed:

- IDE linter diagnostics for edited files: passed, no reported errors.
- `node scripts/validate-assets.mjs`: passed.
- `node scripts/validate-vercel-env.mjs`: passed.

Blocked in this local shell:

- `npm run test:registry-launch`: blocked because `npm` is not on `PATH`.
- Direct Vitest fallback via `node_modules/.bin/vitest.cmd`: blocked because the local `node_modules` Vitest binary is not present.
- Full `npm run lint`, `npm run test:run`, and `npm run build`: blocked by the same missing `npm`/dependency installation state.
- `git diff --check`: blocked by the existing dirty working tree line-ending/trailing-whitespace state across many prior changed files. The output is dominated by `LF will be replaced by CRLF` and trailing-whitespace warnings from files outside this pass as well as files touched earlier in the branch.
