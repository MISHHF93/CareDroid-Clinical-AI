# CareDroid Clinical AI

Medical AI clinical co-pilot: React + Vite SPA, NestJS API, optional Capacitor Android shell. **This README is the only Markdown file in the repository root**; extended matrices and checklists live under `docs/`.

---

## Contents

1. [Repository layout](#repository-layout)
2. [Ports and HTTP proxy](#ports-and-http-proxy)
3. [Environment variables](#environment-variables)
4. [Scripts: root `package.json`](#scripts-root-packagejson)
5. [Scripts: `backend/package.json`](#scripts-backendpackagejson)
6. [Scripts: `mcp/package.json`](#scripts-mcppackagejson)
7. [Repo `scripts/`](#repo-scripts)
8. [Frontend (Vite + React)](#frontend-vite--react)
9. [Backend (NestJS)](#backend-nestjs)
10. [Platform inventory](#platform-inventory)
11. [Clinical tools and catalog](#clinical-tools-and-catalog)
12. [Android (Capacitor)](#android-capacitor)
13. [MCP bridge](#mcp-bridge)
14. [Testing and quality](#testing-and-quality)
15. [Operational notes](#operational-notes)

---

## Repository layout

| Path | Role |
|------|------|
| `src/` | React 18 SPA: routing, pages, contexts, services |
| `backend/` | NestJS API (`/api` prefix), TypeORM, clinical + chat modules |
| `android/` | Capacitor Android project (Gradle) |
| `mcp/` | Model Context Protocol stdio server bridging tools API |
| `scripts/` | Node maintenance utilities (`clean`, smoke checklist, PWA icons) |
| `public/` | Static assets, PWA icons (see `scripts/generate-icons.js`) |

---

## Ports and HTTP proxy

| Service | Default port | Source |
|---------|----------------|--------|
| Vite dev server | **8000** | `package.json` → `vite --port 8000` |
| Vite preview | **4173** | `vite.config.js` → `preview.port` |
| Nest API | **3000** | `backend/src/main.ts` — `process.env.PORT` or default `3000` |

**Local dev:** [vite.config.js](vite.config.js) proxies `/api` and `/socket.io` to `http://localhost:3000`. Use **empty** `VITE_API_URL` in dev so the browser calls same-origin `/api` and Vite forwards to Nest.

**Split deploy:** set `VITE_API_URL` to the API origin; configure Nest CORS via `FRONTEND_URL` (comma-separated origins allowed in [backend/src/main.ts](backend/src/main.ts)).

---

## Environment variables

Copy examples and tune for your environment:

- **Frontend / shared:** [.env.example](.env.example) — `VITE_*` feature flags, `VITE_API_URL`, optional Sentry, Firebase, demo auth flags.
- **Proxy / API client audit:** [docs/proxy-config-audit.md](docs/proxy-config-audit.md) — dev vs split deploy, Vite proxy paths, centralized `apiClient`, `backendApiCapabilities.js` gating, layout scroll visibility (`layout-visibility.css`).
- **Backend exposure:** [docs/backend-exposure-report.md](docs/backend-exposure-report.md) — which routes exist vs phantom frontend calls.
- **Orchestrator executors:** [docs/unsupported-orchestrator-tools.md](docs/unsupported-orchestrator-tools.md) — three POST executors vs NLU-only tools (`npm run orchestrator:write-docs` to regenerate).
- **Executor readiness (candidates):** [docs/executor-readiness-report.md](docs/executor-readiness-report.md) — MELD, GRACE, ASCVD, CKD, fleet route/maintenance; planning only, no new executors on mapping branches.
- **Render / execute matrix:** [docs/tool-render-execute-matrix.md](docs/tool-render-execute-matrix.md) — per-tool route, Tier A/B/C mode, smoke paths (`npm run tool-matrix:write-docs` to regenerate; `npm run test:tool-render-smoke` for automated checks).
- **Backend:** [backend/.env.example](backend/.env.example) — `PORT`, `FRONTEND_URL`, `DATABASE_*` / `SQLITE_PATH`, Redis, JWT, OAuth, OpenAI, Stripe, etc.

Root `.env.example` documents `PORT=8000` for documentation symmetry; the **API** listens on **`PORT` in `backend/.env`** (default **3000**). Align `FRONTEND_URL` with where users load the SPA (e.g. `http://localhost:8000` when using Vite on 8000).

---

## Scripts: root `package.json`

| Script | Command / purpose |
|--------|-------------------|
| `dev` | Vite dev server on port 8000 |
| `dev:lan` | Vite with `--host` for LAN devices |
| `build` / `build:frontend` | Production SPA to `dist/` |
| `clean` | `node scripts/clean.mjs` — removes `dist/` and `node_modules/.vite` |
| `rebuild` | `clean` then `build` |
| `preview` / `preview:lan` | Vite preview (port 4173) with same `/api` proxy |
| `test` | Vitest (watch) |
| `test:run` | Vitest single run |
| `test:run:frontend` | Vitest on `src/` only |
| `test:coverage` | Coverage run |
| `lint` | ESLint on `src` |
| `format` | Prettier on `src` JS/JSX/JSON/CSS |
| `start:all` | Concurrently: `backend:dev` + `dev` |
| `backend:dev` | `cd backend && npm run start:dev` |
| `backend:build` / `backend:start` | Nest build / prod start |
| `start:single` | Build frontend then backend prod |
| `android-debug` | Build SPA → `cap sync android` → `gradlew.bat assembleDebug` (Windows path) |
| `android-release` | Same with `assembleRelease` |
| `mcp:server` | `cd mcp && npm run start` |
| `smoke` | `node scripts/print-smoke-checklist.mjs` |
| `inventory:report` | `node scripts/print-platform-inventory.mjs` — registry, NLU, calculator, and feature counts |

---

## Scripts: `backend/package.json`

| Script | Purpose |
|--------|---------|
| `start:dev` | Nest watch mode |
| `start:prod` | `node dist/main` |
| `build` | `nest build` |
| `test` / `test:e2e` | Jest unit / e2e |
| `migration:*` | TypeORM CLI via `src/data-source.ts` |
| `seed` | Database seeds |
| `ingest` | `scripts/ingest-documents.ts` |

---

## Scripts: `mcp/package.json`

| Script | Purpose |
|--------|---------|
| `start` | `node src/server.mjs` (stdio MCP server) |
| `test` | `node --check src/server.mjs` |

---

## Repo `scripts/`

| File | Behavior |
|------|----------|
| [scripts/clean.mjs](scripts/clean.mjs) | Deletes `dist/` and `node_modules/.vite` for a clean build |
| [scripts/print-smoke-checklist.mjs](scripts/print-smoke-checklist.mjs) | Prints manual smoke steps (auth, chat, intent classify, tool execute, LAN) |
| [scripts/generate-icons.js](scripts/generate-icons.js) | Optional **sharp**-based PNG generation from `public/logo.svg` into PWA icon sizes under `public/`; if `sharp` is missing, prints manual steps |

---

## Frontend (Vite + React)

- **Entry:** [src/main.jsx](src/main.jsx) → [src/App.jsx](src/App.jsx)
- **Router:** `react-router-dom` v6; public vs authenticated shells (`PublicShell`, `AuthShell`, `AppShell`).
- **Providers (order matters):** `ThemeProvider` → `UserProvider` → `NotificationProvider` → `WorkspaceProvider` → `CostTrackingProvider` → `ToolPreferencesProvider` → `ConversationProvider` → `SystemConfigProvider` → `OfflineProvider` → `ErrorBoundary` ([src/App.jsx](src/App.jsx)).
- **Lazy routes:** Heavy pages use `lazyWithRetry` from [src/utils/lazyWithRetry.js](src/utils/lazyWithRetry.js).

**Representative authenticated routes** (see [src/App.jsx](src/App.jsx) for the full list):

- `/dashboard` — main chat workspace  
- `/tools`, `/tools/catalog`, `/tools/drug-checker`, `/tools/lab-interpreter`, calculator routes, `/tools/protocols`, `/tools/diagnosis`, `/tools/procedures`  
- `/clinical/alerts`  
- `/profile`, `/settings`, consent, 2FA/biometric, onboarding  
- `/team`, `/audit-logs`, `/analytics`, `/costs` (permission-gated)

**Public routes:** `/`, `/auth`, `/auth-callback`, legal/help pages, `/shared/tools/:shareId`.

---

## Backend (NestJS)

- **Bootstrap:** [backend/src/main.ts](backend/src/main.ts) — helmet, CORS, global prefix `api` (with `health` and root excluded), Swagger at `/api`, listens on `PORT` (default 3000).
- **Root module:** [backend/src/app.module.ts](backend/src/app.module.ts) — `ConfigModule`, TypeORM (SQLite or Postgres from env), throttling, scheduled tasks, static SPA optional, imports below.

**Feature modules** (under `backend/src/modules/`):

`auth`, `users`, `subscriptions`, `two-factor`, `ai`, `clinical`, `audit`, `compliance`, `chat`, `analytics`, `medical-control-plane` (intent classifier, tool orchestrator, emergency escalation), `encryption`, `rag`, `notifications`, `email`, `cache`, `logger`, `metrics`.

Intent patterns for clinical tools live under `backend/src/modules/medical-control-plane/intent-classifier/`.

---

## Platform inventory

*Reverse-engineered from shipped source. Regenerate counts: `npm run inventory:report`. Programmatic source: [`src/data/platformInventory.js`](src/data/platformInventory.js).*

### Summary

| Layer | Count | Primary source |
|-------|------:|----------------|
| Sidebar registry tools | **35** | [`src/data/toolRegistry.js`](src/data/toolRegistry.js) |
| NLU / AI clinical profiles | **40** | [`src/data/clinicalIntentToolCatalog.js`](src/data/clinicalIntentToolCatalog.js) |
| Dedicated calculator UI forms | **17** | `builtinUiCalculators` in catalog |
| Calculator SPA routes | **17** | [`src/routes/clinicalToolRoutes.js`](src/routes/clinicalToolRoutes.js) |
| Unified catalog rows (search) | **43** | `/tools/catalog` index |
| Known tool-area paths | **28** | `KNOWN_TOOL_AREA_PATHS` |
| Backend POST executors | **3** | SOFA, drug interactions, lab interpreter |
| E2E validation matrix rows | **35** | [`src/data/e2eToolValidationMatrix.js`](src/data/e2eToolValidationMatrix.js) |

### Medical tools by delivery tier

| Tier | Count | Shipped tools |
|------|------:|---------------|
| **A** | 16 | ASCVD 10-year risk, AUDIT-C, BMI, CHA₂DS₂-VASc, Child-Pugh, CKD staging (KDIGO), eGFR (CKD-EPI), GAD-7, HAS-BLED, MELD, MELD-Na, NEWS2, PHQ-9, qSOFA (quick SOFA), STOP-Bang, TIMI (UA/NSTEMI) |
| **B** | 8 | Canadian C-Spine Rule, COPD GOLD, GRACE ACS Risk, NIH Stroke Scale (NIHSS), Ottawa Ankle Rule, PERC, Rome IV IBS, Wells PE |
| **C** | 3 | Drug Checker, Lab Interpreter, SOFA Score |
| **clinical-page** | 3 | Clinical Protocols, Diagnosis Assistant, Procedure Guide |
| **fleet-A** | 3 | Fleet Command, Predictive Maintenance, Route Optimization |
| **fleet-B** | 1 | Dispatch Intelligence |
| **hub** | 1 | All calculators |

**Tier semantics**

- **A** — Dedicated calculator form in `Calculators.jsx` (client-side scoring).
- **B** — Chat-assisted from calculators hub (structured chat seed, no standalone form).
- **C** — Full page + registered POST `/api/tools/:id/execute`.
- **clinical-page** — Protocols, diagnosis assistant, procedure guide (chat via `POST /api/chat/message`).
- **fleet-A** — Fleet operations pages under `/fleet/*`.
- **fleet-B** — Dispatch intelligence (chat-assisted via hub).
- **hub** — Calculators overview (`/tools/calculators`).

### Built-in calculator forms (17)

| Calculator | Slug | Route |
|------------|------|-------|
| SOFA Score | `sofa` | `/tools/calculator/sofa` |
| qSOFA (quick SOFA) | `qsofa` | `/tools/calculators/qsofa` |
| NEWS2 | `news2` | `/tools/calculators/news2` |
| Child-Pugh | `child-pugh` | `/tools/calculators/child-pugh` |
| HAS-BLED | `has-bled` | `/tools/calculators/has-bled` |
| MELD | `meld` | `/tools/calculators/meld` |
| MELD-Na | `meld-na` | `/tools/calculators/meld-na` |
| TIMI (UA/NSTEMI) | `timi-ua-nstemi` | `/tools/calculators/timi-ua-nstemi` |
| ASCVD 10-year risk | `ascvd-risk` | `/tools/calculators/ascvd-risk` |
| CKD staging (KDIGO) | `ckd-staging` | `/tools/calculators/ckd-staging` |
| STOP-Bang | `stop-bang` | `/tools/calculators/stop-bang` |
| AUDIT-C | `audit-c` | `/tools/calculators/audit-c` |
| PHQ-9 | `phq9` | `/tools/calculators/phq9` |
| GAD-7 | `gad7` | `/tools/calculators/gad7` |
| eGFR (CKD-EPI) | `gfr` | `/tools/calculator/gfr` |
| BMI | `bmi` | `/tools/calculator/bmi` |
| CHA₂DS₂-VASc | `chads2vasc` | `/tools/calculator/chads2vasc` |

### NLU hub-only profiles (4)

Routed through the calculators hub without a dedicated form yet: `apache2-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator`.

Additional NLU-only chat profiles (protocol lookup, ACLS/ATLS, dose calculator, ABG interpreter, differential diagnosis, antibiotic guide, fleet NLU, etc.) are included in the **40** NLU profiles and the unified catalog.

### Sidebar registry categories

| Category | Count |
|----------|------:|
| Calculator | 26 |
| Diagnostic | 3 |
| Fleet | 4 |
| Reference | 2 |

### Product & platform capabilities (SPA)

| Area | Routes |
|------|--------|
| AI workspace | `/dashboard` |
| Clinical tools hub | `/tools`, `/tools/catalog`, `/tools/calculators` |
| Clinical intelligence | `/clinical/alerts` |
| Account & security | `/profile`, `/profile-settings`, `/settings`, `/notifications`, `/two-factor-setup`, `/biometric-setup`, `/onboarding`, `/consent`, `/consent-history` |
| Administration (RBAC) | `/team`, `/audit-logs`, `/analytics`, `/costs` |
| Public & legal | `/`, `/auth`, `/privacy`, `/terms`, `/gdpr`, `/hipaa`, `/help`, `/shared/tools/:shareId` |

### Marketing / discovery inventory (16)

Six clinical tool prompts plus ten platform capability entries in [`src/data/featureInventory.js`](src/data/featureInventory.js) (AI workflow, audit logging, drug database, offline access, FHIR/HL7/DICOM, custom branding, dedicated support, SSO/SAML, team management, AI query limits).

### Regenerate detailed matrices

```bash
npm run inventory:report           # print this summary to stdout
npm run e2e-matrix:write-docs      # docs/e2e-tool-validation-matrix.md
npm run contract:write-docs        # docs/backend-frontend-tool-contract.md
npm run tool-matrix:write-docs     # docs/tool-render-execute-matrix.md
```

---

## Clinical tools and catalog

Canonical **frontend** definitions and wiring (keep in sync with backend patterns when changing NLU):

| Concern | File |
|---------|------|
| Sidebar registry | [src/data/toolRegistry.js](src/data/toolRegistry.js) |
| NLU-facing catalog (40 profiles + calculator metadata) | [src/data/clinicalIntentToolCatalog.js](src/data/clinicalIntentToolCatalog.js) |
| **Backend ↔ frontend contract matrix** (regenerate) | [docs/backend-frontend-tool-contract.md](docs/backend-frontend-tool-contract.md) |
| Launch map: registry id, routes, chat seeds, orchestrator `tool` param | [src/data/clinicalCatalogWiring.js](src/data/clinicalCatalogWiring.js) |
| Source-code discovery merge (IDs, phantoms, APIs) | [src/data/sourceCodeToolDiscovery.js](src/data/sourceCodeToolDiscovery.js) |
| Unified medical index for the catalog UI | [src/data/medicalToolsCatalogIndex.js](src/data/medicalToolsCatalogIndex.js) |
| Full in-app inventory | `/tools/catalog` → [src/pages/tools/ClinicalToolCatalog.jsx](src/pages/tools/ClinicalToolCatalog.jsx) |

Backend POST executors are limited to SOFA, drug interactions, and lab interpreter. See [docs/backend-frontend-tool-contract.md](docs/backend-frontend-tool-contract.md) (full 17-column matrix), [docs/clinical-tool-executors.md](docs/clinical-tool-executors.md), `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` in [src/data/clinicalToolIdContract.js](src/data/clinicalToolIdContract.js), and [src/data/unsupportedOrchestratorTools.js](src/data/unsupportedOrchestratorTools.js) for the full mapping and frontend-only tools.

Regenerate the contract doc after wiring changes: `npm run contract:write-docs` (runs `npm run test:contract-matrix` drift gates).

Backend route inventory and frontend call audit: [docs/backend-api-inventory.md](docs/backend-api-inventory.md).

---

## Android (Capacitor)

- Capacitor dependencies: `@capacitor/core`, `@capacitor/android` (root [package.json](package.json)).
- **Build:** from repo root, `npm run android-debug` or `npm run android-release` (runs Vite build, `cap sync`, then Gradle). On macOS/Linux, replace `.\gradlew.bat` with `./gradlew` inside `android/` as appropriate.
- **Play Store:** listing copy and graphics previously lived under `android/*.md` and `android/play-store-assets/`; those Markdown files were removed in favor of this README. Maintain store text and screenshots in your release process or versioned assets outside this repo if needed.

---

## MCP bridge

- **Package:** [mcp/](mcp/) — stdio MCP server for clinical tools API integration.
- **Run:** `npm run mcp:server` from repo root (or `cd mcp && npm start`).

---

## Testing and quality

| Layer | Command |
|-------|---------|
| Frontend unit / component tests | `npm run test:run` or `npm run test:run:frontend` |
| Backend | `cd backend && npm test` |
| Manual wiring checklist | `npm run smoke` |

---

## Operational notes

- **Swagger:** With API on port 3000, OpenAPI UI is at `http://localhost:3000/api` (see [backend/src/main.ts](backend/src/main.ts)).
- **Metrics:** `/metrics` on the API host (see bootstrap logs in `main.ts`).
- **Legal / compliance copy** for the product remains in the SPA under `src/pages/legal/` and related public pages — not in this README.

---

*Root documentation policy: keep **only this `README.md`** at the repository root. Put matrices, PR bodies, and QA reports under `docs/`, `qa/`, or `release/`. Update counts via `npm run inventory:report` when tools ship or retire.*
