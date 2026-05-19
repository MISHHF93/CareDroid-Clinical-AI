# CareDroid Clinical AI

Medical AI clinical co-pilot: React + Vite SPA, NestJS API, optional Capacitor Android shell. This document is generated from the **source tree and npm scripts** (there is no separate docs folder).

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
10. [Clinical tools and catalog](#clinical-tools-and-catalog)
11. [Android (Capacitor)](#android-capacitor)
12. [MCP bridge](#mcp-bridge)
13. [Testing and quality](#testing-and-quality)
14. [Operational notes](#operational-notes)

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

## Clinical tools and catalog

Canonical **frontend** definitions and wiring (keep in sync with backend patterns when changing NLU):

| Concern | File |
|---------|------|
| Sidebar registry | [src/data/toolRegistry.js](src/data/toolRegistry.js) |
| NLU-facing catalog (15 profiles + calculator metadata) | [src/data/clinicalIntentToolCatalog.js](src/data/clinicalIntentToolCatalog.js) |
| Launch map: registry id, routes, chat seeds, orchestrator `tool` param | [src/data/clinicalCatalogWiring.js](src/data/clinicalCatalogWiring.js) |
| Source-code discovery merge (IDs, phantoms, APIs) | [src/data/sourceCodeToolDiscovery.js](src/data/sourceCodeToolDiscovery.js) |
| Unified medical index for the catalog UI | [src/data/medicalToolsCatalogIndex.js](src/data/medicalToolsCatalogIndex.js) |
| Full in-app inventory | `/tools/catalog` → [src/pages/tools/ClinicalToolCatalog.jsx](src/pages/tools/ClinicalToolCatalog.jsx) |

Backend POST executors are limited to SOFA, drug interactions, and lab interpreter. See [docs/clinical-tool-executors.md](docs/clinical-tool-executors.md), `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` in [src/data/clinicalToolIdContract.js](src/data/clinicalToolIdContract.js), and [src/data/unsupportedOrchestratorTools.js](src/data/unsupportedOrchestratorTools.js) for the full mapping and frontend-only tools.

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

*Single documentation file policy: do not reintroduce scattered root `PHASE_*.md` files; update this README and inline code comments when behavior changes.*
