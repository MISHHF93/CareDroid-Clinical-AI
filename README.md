# Emergency OS

Emergency Department Operating System for high-pressure EDs with small clinical teams.

Built for: ~100 patients/day, teams under 10
Primary screen: Emergency Whiteboard

## Technical And Medical Coverage

CareDroid Emergency OS is a human-reviewed emergency department operating layer for patient flow, queue visibility, EMS and referral coordination, clinical workflow guidance, analytics, and ED Copilot support. It is not positioned as autonomous diagnosis, prescribing, order entry, discharge, admission, acuity assignment, or EHR writeback.

Medical coverage centers on high-pressure ED workflows: triage review, waiting room visibility, reassessment, EMS offload, referral delay, boarding, discharge readiness, protocol and calculator access, evidence retrieval, handoff support, documentation readiness, and simulation/training. The current catalog includes emergency calculators and risk scores such as qSOFA, NEWS2, SOFA, HEART, Wells PE/DVT, Shock Index, NIHSS, GCS, PERC, and related specialty assistants, with many tools running as frontend/local or chat-assisted workflows and a narrower set backed by live executor APIs.

Technically, the app is a React/Vite Emergency OS frontend with a NestJS API, TypeORM persistence, SQLite for local development, PostgreSQL when configured, and optional Redis, Python NLU, observability, and integration services. Platform assets, product packs, feature coverage, tool contracts, AI governance, audit, and demo/live source-state labeling are documented in generated inventory reports under `docs/`.

The first deployment posture is demo/manual-data-first with clear source labels and no live clinical writeback. Integration readiness is tracked for FHIR, HL7, PACS, LIS, EMR/EHR, identity providers, government APIs, and scheduling systems, with production use requiring customer approval, validated connectors, governance controls, and human review.

## Stack

- Frontend: React 18, Vite, React Router, Zustand, mostly JS/JSX with some TS/TSX.
- Backend: NestJS 10 on Express, TypeORM, SQLite for local development, PostgreSQL when configured.
- Optional services: Redis cache, Python NLU service, and observability services for deeper local/production-like runs.
- Package manager: npm, with separate root, backend, and MCP package locks.

## Local Full-Stack Development

Use Node 20 or newer. The repo baseline is captured in `.node-version` and the root/backend `engines` fields.

Install root and backend dependencies once:

```bash
npm install
npm --prefix backend install
```

Start the frontend and backend together:

```bash
npm start
```

The local stack uses SQLite and disables optional ML/RAG services by default so the app can boot without Docker or external credentials.

- Frontend: `http://localhost:8000`
- Backend API: `http://localhost:3000/api`
- Backend health: `http://localhost:3000/health`
- API docs: `http://localhost:3000/api/docs`

Useful focused commands:

```bash
npm run dev:web
npm run dev:api
npm run backend:build
npm run backend:start
npm run typecheck:frontend
npm run lint:all
```

The backend build emits `backend/dist/backend/src/main.js`; `npm run backend:start` runs that compiled entrypoint.

## Docker App Stack

For an app-only Docker run:

```bash
npm run compose:app:build
```

To include the optional Python NLU service:

```bash
npm run compose:app:ml
```

The larger `docker-compose.yml` remains available for the full database, cache, monitoring, and observability stack.

The product is now one thing. One name. One purpose. One codebase.
