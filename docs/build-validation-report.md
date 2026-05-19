# Build validation report

**Date:** 2026-05-19  
**Scope:** Full stack — root frontend + `backend/` Nest API  
**Policy:** No tests skipped or removed to force green builds.

---

## Executive summary

| Layer | Lint | Unit tests | Production build | Overall |
|-------|------|------------|------------------|---------|
| **Frontend** | Pass (0 errors, 107 warnings) | **4640 / 4640** | Pass | **PASS** |
| **Backend** | Fail (85 ESLint errors; script fixed to run) | **308 / 493** (13 suites failed) | Pass (after TS fix) | **FAIL** |

**Repository build status: FAIL** — backend tests and lint must be triaged before release.

---

## Commands executed

| # | Command | Result |
|---|---------|--------|
| 1 | `npm install` (root + backend, if `node_modules` missing) | Pass |
| 2 | `npm run lint` (root) | Pass (warnings only) |
| 3 | `npm run test:run` (root) | Pass |
| 4 | `npm run build` (root) | Pass |
| 5 | `npm run lint` (backend) | Fail — see below |
| 6 | `npm test` (backend) | Fail |
| 7 | `npm run build` (backend) | Pass (after fixes) |

---

## Failed commands (initial run)

1. `npm run lint` (root) — **2 ESLint errors** (fixed)
2. `npm run test:run` (root) — **31 test files** failed initially (fixed)
3. `npm run build` (backend) — **4 TypeScript errors** (`category: 'fleet'` not in `ToolPattern`) (fixed)
4. `npm run lint` (backend) — ESLint 9 ignored all files (script/config mismatch; wrapper added)
5. `npm test` (backend) — **13 suites / 185 tests** still failing

---

## Fixes applied (root causes)

### Frontend

| Issue | Fix |
|-------|-----|
| Duplicate `getToolIcon` import in `pr5Consistency.test.js` | Removed duplicate import |
| `expect` undefined in `testRenderUtils.jsx` | `import { expect, vi } from 'vitest'` |
| Wiring tests expected literal `path: '/tools/calculators/…'` in `App.jsx` | Routes are generated via `CALCULATOR_ROUTE_DEFS.map` — tests updated to use `testHelpers/calculatorRouteAudit.js` and `matchCalculatorRoute` |
| Many tests expected `resolveCatalogLaunch(unknown).path === null` | Product uses guarded `/dashboard` + chat seed for unknown tool-shaped ids — tests aligned with `clinicalCatalogLaunch.test.js` |
| Playwright `e2e/responsive-qa.spec.mjs` picked up by Vitest | Added `**/e2e/**` to `vitest.config.js` `exclude` |
| `advancedRecommendationService` emergency boost test | Tests `generateRecommendations` directly (registry filter removed phantom tool ids) |
| `ClinicalToolCatalog` clear-search test | Added `aria-label="Clear search"` on empty-state button |

### Backend

| Issue | Fix |
|-------|-----|
| `ToolPattern.category` missing `'fleet'` | Extended union in `tool.patterns.ts` and `clinical-tool.interface.ts` |
| `npm run lint` broken under ESLint 9 | Added `backend/scripts/run-eslint.mjs` with `ESLINT_USE_FLAT_CONFIG=false` |
| `backend/.env.example` `FRONTEND_URL` | Set to `http://localhost:8000` to match root Vite dev port / README |

---

## TypeScript / imports

- **Frontend:** JavaScript + Vite; production build validates imports (1860 modules). No `tsc` step.
- **Backend:** `nest build` runs TypeScript compile — **passes** after fleet category fix.
- **Broken imports:** None detected in successful builds.

---

## Environment examples

| File | Status | Notes |
|------|--------|-------|
| `.env.example` (root) | Complete | Documents `VITE_API_URL`, proxy target `:3000`, dev port `8000` |
| `backend/.env.example` | Complete | DB, Redis, JWT, OAuth; `FRONTEND_URL` corrected to port **8000** |
| `backend/ml-services/nlu/.env.example` | Present | NLU sidecar (not exercised in this run) |

**Doc note:** README states API default port **3000** in backend vs `PORT=8000` in root `.env.example` (documented as symmetry only) — intentional per README.

---

## README run commands

Verified against `package.json` scripts:

| README command | Valid |
|----------------|-------|
| `npm run dev` | Yes |
| `npm run build` / `rebuild` | Yes |
| `npm run test:run` | Yes |
| `npm run start:all` | Yes |
| `npm run backend:dev` / `backend:build` | Yes |
| `npm run mcp:server` | Yes (`mcp/package.json` exists) |
| `npm run smoke` | Yes |
| `npm run contract:write-docs` | Yes |
| `npm run tool-matrix:write-docs` | Yes |

---

## Backend test failures (not fixed in this pass)

Remaining failures are concentrated in executor/integration suites, for example:

- `test/sofa-calculator.spec.ts` — many `execute()` expectations (`success`, score bands) do not match current validation/scoring behavior
- `test/drug-checker.spec.ts`, `test/lab-interpreter.spec.ts` — metadata / AI mock expectations
- `src/modules/audit/audit.service.spec.ts`, encryption, compliance, auth — likely DB/env/mocks

**Recommendation:** Triage per suite (SOFA validation rules vs tests first); run with `DATABASE_CLIENT=sqlite` and documented test env from `backend/.env.example`.

---

## How to reproduce

```bash
# Frontend (all pass)
npm run lint
npm run test:run
npm run build

# Backend
cd backend
npm run build
npm run lint          # uses scripts/run-eslint.mjs
npm test
```

---

## Artifacts

- Production frontend bundle: `dist/`
- Backend compile output: `backend/dist/`
