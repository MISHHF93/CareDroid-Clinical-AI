# Emergency OS

Emergency Department Operating System for high-pressure EDs with small clinical teams.

Built for: about 100 patients/day and teams under 10. The primary screen is the Emergency Whiteboard at `/emergency/whiteboard`.

## Product Readiness Snapshot

The product is now one thing: a CareDroid Emergency OS demo and pilot surface, not a broad multi-app healthcare portal. The mounted app route tree is Emergency OS first:

- Start here: `/emergency/whiteboard`
- Clinical command support: `/emergency/copilot`
- Medical Tools and calculators: `/emergency/tools`
- Operational support routes: patients, EMS, intake, queues, reassessment, capacity, boarding, referrals, pulse, shift, analytics, and settings under `/emergency/*`

Legacy roots such as `/tools`, `/calculators`, `/assistant`, `/chat`, `/workspace`, and `/app` redirect into the Emergency OS route tree. Use the canonical `/emergency/*` routes when writing demo scripts or docs.

## Medical And Technical Bridge

CareDroid presents clinical work as operational decision support: queue pressure, reassessment need, EMS offload, boarding, referral delay, and calculator context are shown in one shell so clinicians can decide what needs attention next. The technical model behind that is intentionally conservative:

- The frontend is a Vite/React single page app with one active Emergency OS shell.
- Local development can run without Docker or external credentials.
- Demo and fallback data must be labeled as demo/local and must not be treated as live EHR, EMS, telemetry, or analytics truth.
- Calculators and AI-assisted flows are clinical decision support only; they do not replace clinician judgment, local protocols, or human review.

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

For a sales or pilot walkthrough, load the app, start at `/emergency/whiteboard`, and select `First Customer Demo Mode` from the Emergency OS scenario selector or from `/emergency/settings`. That mode uses deterministic local Emergency OS data so the walkthrough stays stable even when optional backend integrations are unavailable.

Useful focused commands:

```bash
npm run dev:web
npm run dev:api
npm run backend:build
npm run typecheck:frontend
npm run lint:all
```

Docs that are useful before a demo:

- `docs/architecture/first-customer-demo-mode.md`
- `docs/demo-live-state-reconciliation.md`
- `docs/architecture/chat-tools-routing-audit.md`
- `docs/feature-coverage-matrix.md`

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
