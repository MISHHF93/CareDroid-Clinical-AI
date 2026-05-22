# CareDroid Clinical AI

CareDroid Clinical AI is a clinical co-pilot application for healthcare workflows. It combines a React/Vite frontend, a NestJS backend, clinical tool routing, AI-assisted clinical workflows, audit logging, compliance surfaces, RAG retrieval, and Android packaging through Capacitor.

This README was regenerated from source and configuration files only.

## Application Overview

The app is organized around authenticated clinical workspaces:

- A dashboard and chat workspace for clinical conversations and guided actions.
- A tool catalog with direct routes for clinical calculators, drug checks, lab interpretation, protocols, diagnosis support, procedure guidance, and clinical intelligence workflows.
- A Clinical Intelligence API surface for backend-backed AI workflows that require audit, safety warnings, and clinician review.
- Compliance, audit, analytics, notification, profile, team, and subscription areas.
- Fleet workflow pages for dispatch intelligence, route optimization, predictive maintenance, and command views.
- Responsive web and Android-oriented rendering through Vite, mobile CSS, service worker registration, and Capacitor.

## Tech Stack

Frontend:

- React 18
- React Router
- Vite
- Vitest and Testing Library
- Playwright for device and production smoke tests
- Capacitor for Android builds
- Dexie, Firebase, Recharts, Lucide React, Axios

Backend:

- NestJS 10
- TypeORM
- PostgreSQL or SQLite
- JWT, Passport, OAuth, two-factor auth, biometric endpoints
- OpenAI integration
- RAG services with embeddings and Pinecone
- Stripe, Redis, Firebase Admin, email, Sentry, Datadog, Prometheus metrics
- Jest and Supertest

## Source Layout

Key frontend areas:

- `src/main.jsx` bootstraps React, global styles, service worker registration, and mobile viewport metrics.
- `src/App.jsx` defines app providers, auth gating, lazy-loaded pages, and route wiring.
- `src/pages/tools/` contains clinical tool pages and AI workflow pages.
- `src/data/` contains tool registry, inventory, route, exposure, contract, safety, and validation matrices.
- `src/services/` contains API clients and clinical workflow service calls.
- `src/routes/` contains route metadata for calculator and clinical tool pages.
- `src/styles/` contains design tokens, responsive layout, and mobile performance styles.

Key backend areas:

- `backend/src/main.ts` configures Nest bootstrap, security headers, CORS, validation, API prefixing, Swagger, and production static frontend serving.
- `backend/src/app.module.ts` wires auth, users, subscriptions, two-factor, AI, clinical data, audit, compliance, chat, clinical intelligence, analytics, notifications, medical control plane, encryption, RAG, metrics, email, and cache modules.
- `backend/src/modules/clinical-intelligence/` contains backend workflows for advanced clinical AI tools.
- `backend/src/modules/medical-control-plane/` contains intent classification, emergency escalation, and tool orchestration.
- `backend/src/modules/rag/` handles document ingestion, embedding, vector retrieval, source extraction, and retrieval confidence.
- `backend/src/modules/audit/` writes hash-chained audit logs and exposes integrity checks.

## Frontend Routing

The React app lazy-loads pages and routes authenticated users through an `AppShell`. Important route groups include:

- `/dashboard` and `/chat`
- `/tools`, `/tools/catalog`, and individual tool pages
- `/tools/calculators` and calculator-specific routes
- `/tools/ambient-scribe`
- `/tools/calculator-recommender`
- `/tools/guideline-rag`
- `/tools/differential-ai`
- `/tools/timeline-ai`
- `/tools/patient-summary-ai`
- `/tools/order-set-ai`
- `/tools/ai-explainability`
- `/tools/clinical-audit`
- `/fleet/command`, `/fleet/predictive-maintenance`, and `/fleet/route-optimizer`
- `/clinical/alerts`
- `/profile`, `/profile-settings`, `/settings`, `/notifications`, `/team`, `/audit-logs`, `/analytics`, and `/costs`
- Public legal/help routes and shared tool sessions

The Vite dev server runs on port `8000` and proxies `/api`, `/health`, and `/socket.io` to the backend target from `VITE_API_PROXY_TARGET`, defaulting to `http://localhost:3000`.

## Backend API Surfaces

The backend uses the global `/api` prefix, excluding root and health routes. Swagger is configured from `backend/src/main.ts`.

Major controller surfaces include:

- `/api/auth`
- `/api/auth/biometric`
- `/api/users`
- `/api/subscriptions`
- `/api/chat`
- `/api/tools`
- `/api/clinical-intelligence`
- `/api/audit`
- `/api/compliance`
- `/api/notifications`
- `/api/metrics`
- Clinical data controllers for drugs and protocols

## Clinical Intelligence Workflows

The clinical intelligence module is mounted at `/api/clinical-intelligence` and is guarded by JWT auth plus authorization permissions. The source defines these workflows:

- `POST /api/clinical-intelligence/ambient-scribe/generate`
  - Produces ambient clinical documentation drafts.
  - Requires clinician review.
  - Blocks auto-signing, EHR write-back, and autonomous chart modification.

- `POST /api/clinical-intelligence/guideline-rag/query`
  - Retrieves guideline evidence through RAG.
  - Returns citation-bound recommendations and source attribution.
  - Withholds unsupported summary claims when retrieved evidence is insufficient.

- `POST /api/clinical-intelligence/differential-ai/generate`
  - Produces ranked differential decision support from symptoms, labs, history, and demographics.
  - Returns supporting evidence and suggested calculators that map to shipped tools.
  - Explicitly marks output as decision support only, not a diagnosis.

- `POST /api/clinical-intelligence/timeline-ai/generate`
  - Builds encounter timelines, trend summaries, and abnormal progression flags.
  - Requires source record review.

- `POST /api/clinical-intelligence/patient-summary-ai/generate`
  - Structures active problems, medications, recent labs, alerts, and risk factors from submitted chart text.
  - Marks output as decision support requiring verification.

- `POST /api/clinical-intelligence/order-set-ai/generate`
  - Suggests evidence-linked order bundles and protocol pathways.
  - Does not place, sign, route, or activate orders.
  - Requires clinician review and local policy reconciliation.

- `GET /api/clinical-intelligence/ai-explainability/trace`
  - Summarizes confidence, source, reasoning, tool chain, and sanitized execution logs.
  - Uses audit metadata rather than exposing raw PHI prompts or transcripts.

- `GET /api/clinical-intelligence/clinical-audit/execution-logs`
  - Displays clinical AI execution logs, PHI flags, tool chains, and integrity metadata.

## Medical Control Plane

The medical control plane provides:

- Intent classification through `/api/chat/intent-classify`.
- Tool orchestration through `/api/tools`.
- Emergency escalation services.
- Registered executor routes for backend clinical tools.
- NLU and calculator recommendation support for chat-assisted workflows.

The calculator recommender uses source-defined rules for presentations such as chest pain, dyspnea or PE concern, infection or sepsis, stroke or TIA, and abdominal organ severity. It returns only known calculator/tool routes and includes decision-support safety warnings.

## Safety And Audit Model

The source code applies safety controls across AI workflows:

- Human review is required for generated notes, summaries, differentials, timelines, and order-set suggestions.
- AI workflows do not autonomously diagnose, sign notes, modify charts, place orders, or activate protocols.
- RAG guideline summaries are citation-bound and intentionally limited when source support is insufficient.
- Audit logging records run IDs, capability IDs, contract versions, PHI access flags, status, and sanitized workflow metadata.
- Audit logs are hash-chained for integrity verification.
- Permission gates protect PHI, audit, analytics, team, and AI workflow routes.

## Local Development

Install frontend dependencies:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

Create local environment files from the examples:

```bash
copy .env.example .env
copy backend\.env.example backend\.env
```

Start frontend and backend together:

```bash
npm run start:all
```

Or run them separately:

```bash
npm run dev
npm run backend:dev
```

Default local ports:

- Frontend Vite dev server: `http://localhost:8000`
- Backend Nest API: `http://localhost:3000`
- Vite proxy target: `http://localhost:3000`

SQLite is available as a development fallback through `DATABASE_CLIENT=sqlite`. PostgreSQL, Redis, OpenAI, Pinecone, Firebase, Stripe, Sentry, Datadog, and SMTP settings are configured through environment variables when those integrations are enabled.

## Production And Mobile Builds

Build the frontend:

```bash
npm run build
```

Build the backend:

```bash
npm run backend:build
```

Build both and run the backend production server:

```bash
npm run start:single
```

Build Android debug:

```bash
npm run android-debug
```

Build Android release:

```bash
npm run android-release
```

Capacitor uses `com.caredroid.clinical` as the Android app id and `dist` as the web output directory.

## Useful Scripts

Frontend:

- `npm run dev`
- `npm run dev:lan`
- `npm run build`
- `npm run preview`
- `npm run test`
- `npm run test:run`
- `npm run lint`
- `npm run typecheck:frontend`

Backend:

- `npm run backend:dev`
- `npm run backend:build`
- `npm run backend:start`
- `cd backend && npm test`
- `cd backend && npm run test:e2e`
- `cd backend && npm run migration:run`
- `cd backend && npm run seed`
- `cd backend && npm run ingest`

Validation suites:

- `npm run validate:ci`
- `npm run test:backend-exposure`
- `npm run test:contract-matrix`
- `npm run test:e2e-matrix`
- `npm run test:executor-mapping`
- `npm run test:registry-launch`
- `npm run test:tool-render-smoke`
- `npm run test:safety-compliance`
- `npm run test:visibility-matrix`
- `npm run test:responsive-regression`
- `npm run test:mobile-performance`
- `npm run test:e2e:android`
- `npm run test:e2e:production`

## Environment Configuration

Important frontend variables include:

- `VITE_API_URL`
- `VITE_ALLOW_SAME_ORIGIN_API`
- `VITE_WS_URL`
- `VITE_API_PROXY_TARGET`
- `VITE_API_TIMEOUT_MS`
- `VITE_APP_NAME`
- `VITE_APP_VERSION`
- `VITE_ENABLE_CRASH_REPORTING`
- `VITE_ENABLE_ANALYTICS`
- `VITE_ENABLE_PUSH_NOTIFICATIONS`
- `VITE_ENABLE_OFFLINE_MODE`
- `VITE_ENABLE_BIOMETRIC_AUTH`

Important backend variables include:

- `PORT`
- `FRONTEND_URL`
- `DATABASE_CLIENT`
- `SQLITE_PATH`
- PostgreSQL connection settings
- Redis settings
- JWT and session settings
- OAuth settings
- SMTP settings
- Stripe settings
- OpenAI settings
- Encryption keys
- Firebase settings
- Pinecone and RAG settings
- NLU and anomaly detection service settings
- Sentry, Datadog, and logging settings

Do not commit real `.env` files or production secrets.

## Testing Strategy

The source tree contains focused tests for:

- Frontend route rendering and launch behavior.
- Tool registry, inventory, alias, exposure, and contract drift.
- Clinical safety guardrails.
- Backend clinical intelligence services.
- Audit integrity and audit route behavior.
- Calculator forms and tool render smoke coverage.
- Responsive regression and mobile performance.
- Android and production smoke flows through Playwright.

Use focused scripts while developing and `npm run validate:ci` before release-level validation.

## Clinical Use Notice

CareDroid Clinical AI is built as clinical decision support. AI-generated content, summaries, recommendations, timelines, and order-set suggestions require clinician review and source verification. The application does not replace clinical judgment, local protocols, emergency escalation procedures, or institutional governance.
