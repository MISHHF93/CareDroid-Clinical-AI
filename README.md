# CareDroid

SaaS emergency department operating platform for hospitals and emergency departments.

Built for ~100 patients/day and teams under 10. CareDroid is a **reception-first, first-resolution** emergency department operating platform: registration clerks prepare each patient card at the front desk, then triage, charge nurse, physician, and display roles consume the shared whiteboard. An embedded **CareDroid Copilot** provides human-reviewed decision support — not autonomous clinical authority.

## Product suites

CareDroid organizes work into eleven normalized suites:

| # | Suite | Focus |
|---|-------|-------|
| 1 | Reception & Arrival | Intake, identity verification, waiting-room handoff |
| 2 | Emergency Whiteboard | Queue visibility, patient cards, board state |
| 3 | Triage / Reassessment / Clinical Flow | Triage review, reassessment, calculators |
| 4 | EMS / Referral / Boarding | Pre-arrival, offload, referrals, boarding |
| 5 | Physician / Clinical Copilot | Case-aware AI, evidence, documentation support |
| 6 | Charge Nurse / Command Center | Throughput, surge, operational command |
| 7 | Analytics / Simulation / QA | Training, simulation, operational analytics |
| 8 | Fleet / Ambulance Extension | Dispatch, telemetry, route optimization |
| 9 | Telemetry / IoT / Digital Twin | Device feeds, digital twin views |
| 10 | Platform Admin / SaaS Packaging | Entitlements, billing, tenant admin |
| 11 | Integration Hub / Automation | Connectors, workflows, shared platform services |

Suite definitions live in `lib/features/suiteRegistry.ts`. Feature metadata is applied in `lib/features/featureRegistry.ts`.

## Clinical scope

CareDroid is a human-reviewed emergency department operating layer for patient flow, queue visibility, EMS and referral coordination, clinical workflow guidance, analytics, and copilot support.

It is **not** positioned as autonomous diagnosis, prescribing, order entry, discharge, admission, acuity assignment, or EHR writeback.

Medical coverage centers on high-pressure ED workflows: triage review, waiting room visibility, reassessment, EMS offload, referral delay, boarding, discharge readiness, protocol and calculator access, evidence retrieval, handoff support, documentation readiness, and simulation/training.

The catalog includes emergency calculators and risk scores such as qSOFA, NEWS2, SOFA, HEART, Wells PE/DVT, Shock Index, NIHSS, GCS, and PERC. Many tools run as frontend/local or chat-assisted workflows; a narrower set is backed by live executor APIs.

The default deployment posture is demo/manual-data-first with clear source labels and no live clinical writeback. Production integration requires customer approval, validated connectors, governance controls, and human review.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, React Router, Zustand, JS/JSX with selective TS/TSX |
| Backend | NestJS 10, TypeORM, SQLite (local dev), PostgreSQL (production) |
| Optional | Redis cache, Python NLU service, observability stack |
| Mobile | Capacitor 5 (Android) |
| Package manager | npm (separate locks for root, backend, and MCP) |

**Requirements:** Node `>=20.19.0 <25`, npm `>=10` (see `.node-version`).

## One application architecture

CareDroid is **one Vite + React application** for emergency department operations — not a bundle of separate products.

| Canonical path | Purpose |
|----------------|---------|
| `src/main.jsx` | Single Vite entry |
| `src/app/App.tsx` | Application root (providers + router) |
| `src/app/router.jsx` | Unified route table (ED routes are primary) |
| `src/layouts/DisplayShell.tsx` | Overhead / wall display chrome |
| `src/domain/` | Shared types, permissions, constants |
| `src/store/emergencyStore.ts` | Unified ED state (root `store/` re-exports this) |
| `src/services/emergencyOsApi.js` | Unified backend API facade |
| `src/config/edApplication.config.ts` | Single-app manifest + extension redirects |

**Primary routes:** `/whiteboard`, `/reception`, `/triage`, `/charge`, `/physician`, `/ems`, `/copilot`, `/calculators`, `/analytics`, `/admin`, `/display/whiteboard` (aliases redirect to `/emergency/*` canonical paths).

Default home is the **ED whiteboard** (`/emergency/whiteboard`). With `VITE_ED_SINGLE_APPLICATION=true` (default), legacy platform URLs (`/start`, `/fleet`, `/cosmos`, `/dashboard`, etc.) redirect into ED surfaces. Extension code remains in the repo for future entitlements but does not present as a separate app shell.

The `frontend/` folder is a **compatibility shim** only — do not add new features there.

## Repository layout

```
CareDroid-Clinical-AI/
├── src/                  # React frontend (pages, components, services, store) — THE application
├── lib/                  # Shared feature/suite registries and orchestration
├── backend/              # NestJS API, TypeORM entities, executors
├── scripts/              # Dev stack, audits, QA, and build utilities
├── e2e/                  # Playwright end-to-end specs
├── tests/                # Cross-stack integration tests
├── mcp/                  # MCP server package
├── docker-compose*.yml   # Container orchestration
├── .env.example          # Frontend environment template
└── backend/.env.example  # Backend environment template
```

## Quick start

Install dependencies:

```bash
npm install
npm --prefix backend install
```

Copy environment files and adjust as needed:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Start the full local stack (frontend + backend):

```bash
npm start
```

Local defaults use SQLite and disable optional ML/RAG services so the app boots without Docker or external credentials.

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8000 |
| Backend API | http://localhost:3000/api |
| Health check | http://localhost:3000/health |
| API docs | http://localhost:3000/api/docs |

### Focused dev commands

```bash
npm run dev:web          # Frontend only (Vite on :8000)
npm run dev:api          # Backend only (Nest on :3000)
npm run backend:build    # Compile NestJS
npm run backend:start    # Run compiled backend
npm run typecheck:frontend
npm run lint:all
```

The backend build emits `backend/dist/backend/src/main.js`.

## Environment configuration

**Frontend** (`.env`): API proxy target, feature flags, realtime SSE path, demo auth bypass, analytics, and Sentry settings. Leave `VITE_API_URL` empty in local dev so Vite proxies `/api` to Nest on port 3000.

**Backend** (`backend/.env`): Database client (SQLite or PostgreSQL), JWT secrets, CORS origin, OAuth providers, Redis, and optional ML service URLs.

For split frontend/API deployments (e.g. Vercel), set `VITE_API_URL` to the deployed API origin.

## Testing

```bash
npm test                 # Vitest watch mode
npm run test:run         # Single Vitest pass
npm run test:all         # Frontend + backend unit tests
npm run validate:ci      # Full CI validation pipeline
npm run test:e2e:responsive   # Playwright responsive QA
```

Backend tests run from `backend/`:

```bash
cd backend && npm test
```

## Docker

App-only stack:

```bash
npm run compose:app:build
```

With optional Python NLU service:

```bash
npm run compose:app:ml
```

The root `docker-compose.yml` provides the full database, cache, monitoring, and observability stack.

## Security and privacy notes

CareDroid is designed with audit-minded SaaS patterns, but **does not claim HIPAA, PHIPA, or regulatory certification** unless your deployment implements and validates those controls independently.

| Area | Current posture |
|------|-----------------|
| Tenant isolation | `TenantContextInterceptor` + `TenantIsolationGuard` on protected routes; organization/workspace scoping on platform APIs |
| RBAC | JWT auth, permission enums, emergency role matrix on the frontend |
| Audit logging | TypeORM `audit_logs` with hash chaining; emergency patient reads logged as `phi_access` where feasible |
| Secrets | Use `.env` / `backend/.env` — never commit credentials |
| Frontend logs | Do not log PHI in browser consoles; demo tokens are dev-only |
| AI / Copilot | Labeled decision support; outputs require clinician review; no autonomous diagnosis or orders |
| Clinical calculators | Deterministic utilities with disclaimers and source labels — not diagnostic truth |
| Display mode | Privacy-safe field masking via `useEmergencyDisplayPrivacy` for overhead screens |

Before production pilot: rotate `JWT_SECRET` and `ENCRYPTION_KEY`, enable PostgreSQL, configure CORS, review entitlements (`VITE_STRICT_SAAS_ENTITLEMENTS`), and complete customer BAA/governance if required.

## Documentation

| Document | Audience |
|----------|----------|
| [User Manual](docs/USER-MANUAL.md) | ED staff, clinical evaluators, Codespace manual testers |
| [User Manual § Cleanup Playbook](docs/USER-MANUAL.md#10-cleanup-playbook--making-the-platform-practitioner-ready) | Data, visual, and process cleanup before pilot onboarding |

## Key routes

Canonical paths are defined in `src/config/routes.config.js`.

| Route | Purpose |
|-------|---------|
| `/start` | Entry hub — demo, clinical home, admin |
| `/emergency/reception` | **Default landing** — reception & arrival (first resolution) |
| `/emergency/whiteboard` | Department whiteboard — operational awareness |
| `/emergency/ems` | EMS coordination & handoff |
| `/emergency/copilot` | CareDroid Copilot (human review required) |
| `/tools/calculators` | Clinical calculators |
| `/profile` | User profile & tool policy |
| `/admin` | Platform administration (hidden in pilot nav) |

## Android build

```bash
npm run android-debug     # Debug APK
npm run android-release   # Release APK
```

Requires Android SDK and Gradle. Capacitor config is in `capacitor.config.json`.

## License

Proprietary. See backend `package.json` license field.

---

One product. One name. One codebase.