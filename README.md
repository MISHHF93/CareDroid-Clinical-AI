# CareDroid

SaaS emergency department operating platform for hospitals and emergency departments.

Built for ~100 patients/day and teams under 10. The primary screen is the **Emergency Whiteboard**. CareDroid is reception-first, whiteboard-centered, and role-based, with an embedded clinical AI copilot.

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

## Repository layout

```
CareDroid-Clinical-AI/
├── src/                  # React frontend (pages, components, services, store)
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

## Key routes

Canonical paths are defined in `src/config/routes.config.js`.

| Route | Purpose |
|-------|---------|
| `/emergency/whiteboard` | Primary ED whiteboard |
| `/emergency/reception` | Reception workspace |
| `/emergency/intake` | Smart intake |
| `/emergency/ems` | EMS coordination |
| `/emergency/command-center` | Charge nurse command center |
| `/emergency/copilot` | Clinical copilot |
| `/tools/calculators` | Clinical calculators |
| `/assistant` | General AI assistant |
| `/admin` | Platform administration |

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