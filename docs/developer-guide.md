# Developer Guide

> For product framing and the fast local quick start, see the [root README](../README.md#quick-start). This guide covers what the README doesn't: repo-layout gotchas, path aliases, testing infrastructure, and the living-documentation generator.

## Repo layout gotchas

CareDroid's repo has a few directory-naming collisions that are easy to trip over:

| Gotcha | Detail |
|---|---|
| **Two `lib/` directories** | `src/lib/` (RBAC via `src/lib/users/`, auth, browser-safe AI client) vs. top-level `lib/` (aliased `@lib` in `vite.config.ts`; holds `native-ai/`, `patient-orchestration/`, and the AI config/tool/prompt registries shared by frontend and backend). |
| **`agent-tools/` is not a tool registry** | It's gitignored session-transcript `.txt` files and screenshots (repo-local, count varies by session). The real tool registries are `lib/ai/toolRegistry.ts` and `backend/src/modules/medical-control-plane/tool-orchestrator/`. |
| **One backend route system (as of the Express→Nest decommission)** | All 10 real legacy Express route groups were migrated to NestJS controllers and the 6 placeholder-only groups deleted; `backend/src/api/routes-registry.ts` itself was deleted, not just emptied. `backend/src/modules/**/*.controller.ts` (NestJS) is the sole HTTP routing authority — there is no second, bare-Express mount to confuse it with. See [API Reference](api/api-reference.md). |
| **Separate npm installs** | Root, `backend/`, and `mcp/` each have their own `package.json`/lockfile — `npm install` at the root does not install backend or MCP dependencies. |

## Path aliases

From `vite.config.ts`:

| Alias | Resolves to |
|---|---|
| `@` | `src/` |
| `@lib` | top-level `lib/` (not `src/lib/`) |
| `@store` | `src/store/` |

## Frontend architecture at a glance

- React 18.2 + Vite 7, `react-router-dom` v6 single route tree (`src/app/router.tsx`), Zustand 5 + ~27 React Context providers, Tailwind with CSS-variable-driven semantic tokens (no fixed hex palette, no dark mode currently), Dexie/IndexedDB offline cache, native `WebSocket` + Firebase Cloud Messaging for realtime/push.
- No React Query/SWR — API calls go through a hand-rolled axios client (`src/services/apiClient.ts`).
- 297 page files across 20 populated domain folders under `src/pages/` (plus 5 empty placeholder folders with routes already defined but no components yet: `auth/`, `cosmos/`, `customer-portal/`, `success-center/`, `surveillance/`).
- Full details: [Platform Architecture Overview §Frontend](architecture/platform-architecture-overview.md#2-frontend).

## Backend architecture at a glance

- NestJS 10 on Express, TypeORM (Postgres/SQLite) + optional Mongoose for the clinical patient domain (`ENABLE_MONGOOSE_EMERGENCY_OS`).
- Global middleware: Sentry, Helmet, structured logging, validation pipe, exception filter, HTTP metrics, tenant isolation. RBAC (`AuthorizationGuard`) is per-controller, not global.
- Full details: [Platform Architecture Overview §Backend](architecture/platform-architecture-overview.md#3-backend), [API Reference](api/api-reference.md).

## Testing infrastructure

| Layer | Tool | Config | Notes |
|---|---|---|---|
| Frontend unit/integration | Vitest | `vitest.config.ts` | jsdom, `pool: 'threads'`, 917 `*.test.*` files under `src/` |
| Heavy route-tree test (isolated) | Vitest | `vitest.route-tree.config.ts` | Forces `pool: 'forks'`, `maxWorkers: 1` — avoids OOM/hangs on the canonical route redirect test |
| Root integration | Jest | `jest.config.cjs` | Runs `tests/integration/**/*.test.ts` only (currently `emergency-os.test.ts`) |
| Backend unit/e2e | Jest | `backend/test/jest-e2e.json` | Run via `cd backend && npm test` (`jest --runInBand`). Covers auth/RBAC/2FA/encryption/audit e2e, RAG/chat e2e, intent classification, tool-orchestrator, and a large bank of clinical-calculator spec files (NEWS2, HEART, Wells PE/DVT, PERC, GRACE ACS, SOFA, MELD, Child-Pugh, NIHSS, PHQ-9, GAD-7, STOP-BANG, ABCD2, CHA2DS2-VASc/HAS-BLED, Ottawa ankle, NEXUS/Canadian C-spine, PECARN, CKD staging, COPD GOLD) |
| E2E | Playwright | `playwright.config.ts` (responsive QA, 4 browsers), `playwright.canonical-routes.config.ts` (serial route verification), `playwright.production.config.ts` (smoke test against a real deployed `QA_BASE_URL`, mobile Chromium profile) | |

Key scripts (`package.json`, root):

```bash
npm test                    # Vitest watch mode
npm run test:run            # Single Vitest pass
npm run test:coverage       # Vitest + v8 coverage
npm run test:integration    # jest tests/integration
npm run test:all            # Frontend + backend unit tests
npm run test:e2e:responsive # Playwright responsive QA
npm run test:e2e:production # Playwright production smoke (needs QA_BASE_URL)
npm run validate:ci         # Full CI gate: lint, typecheck, targeted suites, backend build+test+e2e, frontend build, bundle-budget test
```

Many narrow `test:*` scripts exist scoped to specific console/route groups (e.g. `test:admin-routes`, `test:platform-routes`, `test:training-routes`) — these back the `*:write-docs` generators (below) and are worth running before touching routing config in those areas.

`qa/` is **not** an automated test suite — it's QA audit artifacts (JSON reports, screenshots) produced by `qa:*` scripts (`qa:responsive`, `qa:page-screenshots`, `qa:dashboard-resize`, `qa:reception-swarm`, etc.).

## The verification loop

The intended path through this repo, and the one command that owns each step:

```
CLONE -> INSTALL -> DOCTOR -> START -> VERIFY -> DEVELOP -> TEST -> HEAL -> PRODUCTION CHECK
```

| Step | Command | Notes |
|---|---|---|
| INSTALL | `npm install && npm --prefix backend install` | Two package trees; the backend is **not** a workspace |
| DOCTOR | `npm run doctor` | `scripts/doctor.mjs`. Diagnoses only — changes nothing |
| START | `npm start` | Frontend :3000, Nest :8000, `/api` proxied |
| VERIFY | `npm run verify` | Static gate, runs no tests |
| TEST | `npm run test:run:parallel` | The whole frontend suite. Plain `vitest run` is serial |
| PRODUCTION CHECK | `npm run production:check` | `verify:full` plus both builds |

### What `doctor` checks

Node and npm against `engines`, both lockfiles, both `node_modules` trees, stray
yarn/pnpm lockfiles (a real source of "works on my machine"), env keys missing
from `.env` against `.env.example` — **by name only, values are never read or
printed** — ports 3000/8000, backend `/health`, installed Playwright browsers,
generated-docs freshness, and the knip config. It exits non-zero only on a FAIL;
warnings are informational so the command stays worth running.

### What `architecture:check` enforces

`scripts/architecture-check.mjs` builds the import graph across `src/` and
`backend/src/` (skipping `*.test.*`/`*.spec.*`, which may legitimately import
across boundaries for fixtures) and applies two rules:

1. **No new import cycles.** Cycles are not a style preference here: a module
   calling into a partially-initialized module is how
   `ReferenceError: Cannot access 'X' before initialization` reaches production,
   which has happened in this repo. Detected with an iterative Tarjan SCC pass
   and held to `MAX_IMPORT_CYCLES` rather than zero — the existing cycles are
   real debt needing individually-verified refactors, several running through
   permission and role resolution, and a permanently-red gate gets ignored.
   Lower the baseline whenever you genuinely break one; that is the point.
2. **No `src/` -> `backend/src/` imports.** The boundary is the HTTP API.

### Composite commands

```bash
verify           = typecheck:all && lint && docs:check && deps:integrity && architecture:check
verify:full      = verify && test:run:parallel && test:integration
production:check = verify:full && build && build:backend
```

`deps:integrity` is `knip --include unlisted,unresolved`: it fails on an import
with no matching dependency declaration, which is narrower (and far more
actionable) than knip's full unused-code report.

`validate:ci` is a different thing and should not be mistaken for the full
suite: it runs `lint:all`, `typecheck:frontend`, a **named subset** of frontend
tests, the backend build/test/e2e, the frontend build and a bundle-budget check.
A green CI therefore does not imply a green `verify:full`.
## Living documentation generator

`docs/generated/` is regenerated from source, not hand-maintained:

```bash
npm run docs:generate   # regenerate docs/generated/*
npm run docs:check      # verify generated docs are up to date (CI gate)
```

Related narrower generators feed specific architecture docs:

```bash
npm run contract:write-docs              # docs/architecture/backend-frontend-tool-contract.md, tool-contract-matrix.md
npm run feature-coverage-matrix:write-docs
npm run inventory:report                 # docs/architecture/platform-inventory.md
npm run product-packaging-audit:write-docs
```

If you change `src/config/routes.config.ts`, `src/lib/users/permissions.ts`, `lib/ai/config.ts`, or similar registry files, re-run `npm run docs:generate` before committing — CI's `docs:check` will otherwise fail.

## Where AI/ML training lives

If you're working on the NLU intent classifier or artifact-router (see [Platform Architecture Overview §AI Platform](architecture/platform-architecture-overview.md#5-ai-platform)):

```bash
npm run nlu:pipeline              # augment-artifacts → prepare-data → train → evaluate (NLU)
npm run train:unified-models      # orchestrates both NLU + artifact-router training with hard-example mining
npm run artifact-intelligence:generate  # regenerate the artifact catalog that feeds artifact-router training data
```

Training data and trained weights live in `backend/ml-services/nlu/data/` and `backend/ml-services/models/`. Never commit an untested `classifier.json` — `npm run nlu:evaluate` / the unified trainer's held-out test set is the gate.

## Coding conventions (observed, not aspirational)

- TypeScript throughout both frontend and backend; class-validator DTOs on the NestJS side.
- Feature-module pattern on the frontend (`src/features/*Feature.tsx` + `use*.ts` hook + `index.ts`) for encapsulated domain slices (alerts-center, capacity, copilot, ems-module, patient-detail, triage-queue, whiteboard).
- Backend modules follow standard Nest structure (`*.module.ts`, `*.controller.ts`, `*.service.ts`, `entities/*.entity.ts`).
- No UI component library dependency — `src/components/primitives/` (Text, Button, Input, Textarea, Badge, Avatar, Checkbox, Divider, Icon, IconButton, Skeleton, Spinner, Switch) is the intended shared atom library, but real adoption is currently thin (5 files, all in `src/components/collaboration/`) — treat it as the direction for new code, not yet an "observed" repo-wide pattern.
- AI provider access is server-side only — never add an Anthropic/OpenAI API key to frontend code; go through `lib/ai/serverClient.ts` via a backend endpoint.

See also: [Platform Architecture Overview](architecture/platform-architecture-overview.md), [API Reference](api/api-reference.md), [Data Model Reference](data-model/data-model-reference.md), [Deployment Guide](deployment-guide.md), [Configuration Reference](configuration-reference.md).
