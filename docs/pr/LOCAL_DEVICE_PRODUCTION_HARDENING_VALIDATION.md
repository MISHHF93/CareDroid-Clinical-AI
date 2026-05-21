# Local Device Validation and Production Hardening Report

Generated: 2026-05-20

## Summary

Status: local validation passed; external Vercel backend-origin setup still required for production deploy.

The local validation pass fixed production hardening issues across backend e2e coverage, security headers, audit integrity, 2FA error contracts, key rotation behavior, tool alias drift, and frontend/backend validation. Frontend lint/type/build/bundle checks pass, backend lint/build/unit/e2e tests pass, and the local backend/frontend runtime works with Vite proxy calls to the API.

Android/Pixel-sized validation completed against the local runtime with 105/105 Playwright checks passing across Pixel, Galaxy, OnePlus, Motorola, tablet, portrait, landscape, route smoke, sidebar, catalog, calculator, touch target, and backend API coverage.

## Commands Run

| Command | Result |
| --- | --- |
| `npm run validate:ci` | Passed after fixes. |
| `npm run test:tool-render-smoke` | Passed: 4 files, 140 tests. |
| `npm run test:responsive-regression` | Passed: 11 files, 221 tests. |
| `npm run test:mobile-performance` | Passed: 1 file, 9 tests. |
| `npx vitest run src/data/toolRegistry.test.js src/data/clinicalCatalogWiring.test.js src/data/frontendApiCallsInventory.schedule.test.js src/services/apiClient.auth.test.js src/services/clinicalOrchestratorApi.registry.test.js src/components/ChatInterface.nlu.test.jsx src/test/ExportService.test.js` | Passed: 7 files, 160 tests. |
| `cd backend && npm test` | Passed after fixes: 45 suites, 503 tests. |
| `cd backend && npm run lint` | Passed with warnings only. |
| `cd backend && npm run build` | Passed. |
| `cd backend && npm run test:e2e` | Passed: 9 suites, 201 tests; 1 live external RAG suite skipped unless OpenAI/Pinecone env vars are present. |
| `npm run lint` | Passed with warnings only. |
| `npm run typecheck:frontend` | Passed. |
| `npm run build` | Passed. |
| `npm run test:bundle-budget` | Passed: 1 test. |
| `Invoke-RestMethod http://localhost:3000/health` | Passed; returned API health JSON. |
| `Invoke-WebRequest http://localhost:8000/` | Passed; returned HTTP 200. |
| `Invoke-RestMethod http://localhost:8000/api/config/system` | Passed through Vite proxy; returned JSON. |
| `QA_BASE_URL=http://127.0.0.1:8000 QA_WORKERS=1 npm run test:e2e:android` | Passed: 105/105 Android device profile checks. |

## Fixes Applied

- Fixed route and sidebar smoke test flakiness without removing coverage.
- Hardened backend unit tests for current constructor dependencies and service contracts.
- Fixed `backend:start` so production backend startup uses `dist/src/main.js`.
- Prevented production static frontend serving from activating inside Jest workers.
- Hardened drug checker validation and alias normalization for common user inputs.
- Added SOFA flat organ score compatibility fields and safer edge-range handling.
- Added lab interpreter `patientSex` validation and separated critical counts from non-critical abnormal counts.
- Fixed intent patterns so explicit SOFA/qSOFA calculator requests are not treated as sepsis emergencies, added suicide phrasing coverage, and improved cardiac/CHA2DS2-VASc launch matching.
- Kept Vercel deploy hardening changes from the prior pass: environment validation, cleaned install command, and production smoke test wiring.
- Repaired backend e2e specs to use current source paths, DTOs, auth requirements, route contracts, and explicit local test harnesses instead of booting unnecessary external infrastructure.
- Added e2e test setup defaults for SQLite, disabled Redis/RAG external calls, and local JWT/encryption config.
- Hardened audit hash integrity for null/undefined metadata and monotonic timestamps.
- Added security header hardening for `Permissions-Policy` and `upgrade-insecure-requests`.
- Hardened 2FA controller/service HTTP contracts for invalid tokens and already-enabled setup.
- Added key rotation compatibility fields and deterministic local version assignment for concurrent rotations.
- Documented allowed cardiac-risk backend keyword overlap between ASCVD and HEART score launch phrases.

## Remaining Blockers

- Vercel production deployment remains externally blocked until a real backend API origin is deployed and configured as `VITE_API_URL`.
- Live external RAG system e2e tests are skipped unless valid `OPENAI_API_KEY` and `PINECONE_API_KEY` are provided; local chat/RAG contract e2e tests pass with controlled mocks.

## Acceptance Criteria

- All tests pass: yes for local deterministic suites; live external RAG suite is explicitly env-gated.
- Lint/type checks pass: yes, warnings only.
- Frontend build passes: yes.
- Backend build passes: yes.
- Local app runs: yes, backend on `3000`, frontend on `8000`.
- Local API proxy works: yes, `/api/config/system` returned JSON through Vite.
- Android layout works: yes, 105/105 Android Playwright checks passed.
- No missing/null user-facing tools remain: covered by passing frontend registry/render/contract suites run in this pass.
- No frontend calls nonexistent backend routes: covered by passing backend exposure/contract suites from `validate:ci` before the backend e2e blocker.
- No backend user-facing function hidden without documentation: covered by passing backend exposure/orphan audits and backend e2e.
- Commit and push: ready after staging verified changes.
