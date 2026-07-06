# CareDroid — Emergency Department Operating Platform

> **Reception-first. First-resolution. Human-reviewed AI.**

CareDroid is a single-application emergency department (ED) operating platform built for hospitals running ~100 patients/day with teams under 10. It gives every ED role — from the registration clerk at the front desk to the charge nurse commanding the floor — a unified real-time surface for patient flow, queue pressure, EMS coordination, clinical decision support, and AI-assisted workflows.

The embedded **CareDroid Copilot** provides human-reviewed, evidence-linked clinical decision support. It is never an autonomous clinician — every AI output carries a required human-review disclaimer and falls under a per-tenant governance framework.

---

## What makes CareDroid different

| Principle | What it means |
|-----------|---------------|
| **Reception-first architecture** | Registration clerks build patient cards at the front desk; triage, charge, physician, and display roles consume the shared whiteboard downstream |
| **20-stage 911 → outcome journey** | Every patient flows through a tracked, role-appropriate operational journey from dispatch call to final disposition |
| **23 hospital roles, one platform** | A fine-grained RBAC matrix gives each role the right surfaces, permissions, and AI scope — with no duplicate shells |
| **AI you can audit** | All AI requests are logged with full audit trails, governed by safety constraints, and surfaced in an AI transparency dashboard |
| **Prompt caching + RAG** | Stable system prompts are cached at Anthropic's API; clinical knowledge is retrieved from a Pinecone vector store |
| **Edge-ready EMS** | Edge AI ambulance model analyzes vital streams and ultrasound signals pre-arrival; federated EMS triage aggregates local models without exposing patient-level source data |
| **Display/wall mode** | An overhead screen mode with privacy-safe field masking shows board state on wall monitors without exposing protected fields |

---

## Product suites

CareDroid organizes every surface into eleven normalized suites. The first seven are **core** (included in every ED deployment); suites 8–9 are **extensions** (opt-in); suites 10–11 are **platform** (SaaS packaging and integrations).

| # | Suite | Layer | Focus |
|---|-------|-------|-------|
| 1 | **Reception & Arrival** | Core | Arrivals, intake, identity verification, waiting-room handoff |
| 2 | **Emergency Whiteboard** | Core | Patient whiteboard, queue visibility, patient cards, board state |
| 3 | **Triage / Reassessment / Clinical Flow** | Core | Triage review, reassessment, deterioration tracking, calculators |
| 4 | **EMS / Referral / Boarding Coordination** | Core | EMS pre-arrival, offload, referrals, boarding, capacity |
| 5 | **Physician / Clinical Copilot** | Core | Case-aware AI copilot, calculators, summaries, evidence links |
| 6 | **Charge Nurse / Command Center** | Core | Department pulse, surge, shift handoff, command visibility |
| 7 | **Analytics / Simulation / QA** | Core | Throughput analytics, simulation, training, quality assurance |
| 8 | **Fleet / Ambulance Operations** | Extension | Ambulance fleet command, routing, predictive maintenance |
| 9 | **Telemetry / IoT / Digital Twin** | Extension | Medical IoT, surveillance, hospital maps, digital twin intelligence |
| 10 | **Platform Admin / SaaS / Entitlements** | Platform | Tenant admin, billing, feature flags, RBAC, commercial packaging |
| 11 | **Integration Hub / Automation** | Platform | FHIR/HL7 connectors, automation, MCP tooling, shared services |

Suite definitions live in [`lib/features/suiteRegistry.ts`](lib/features/suiteRegistry.ts). Feature metadata is in [`lib/features/featureRegistry.ts`](lib/features/featureRegistry.ts).

---

## Active clinical surfaces

All routes live under `/emergency/*`. Legacy paths (`/tools`, `/calculators`, `/whiteboard`, `/reception`, `/ems`, etc.) redirect to canonical ED routes.

| Route | Surface | Suite |
|-------|---------|-------|
| `/emergency/whiteboard` | **Emergency Whiteboard** — patient board, queue state, acuity overview | 2 |
| `/emergency/reception` | **Reception Command Desk** — walk-in registration, arrival queue, intake | 1 |
| `/emergency/ems` | **EMS Pipeline** — pre-arrival cards, handoff checklist, offload pressure | 4 |
| `/emergency/dispatch` | **Dispatch Console** — 911 call coordination, unit assignment | 4 |
| `/emergency/command-center` | **Hospital Command Center** — full 20-stage journey, surge view | 6 |
| `/emergency/copilot` | **CareDroid Copilot** — AI decision support, chat, tool launcher | 5 |
| `/emergency/tools` | **Medical Tools Hub** — calculators, clinical tools, specialty assistants | 3 |
| `/emergency/patients` | **Patient Management** — patient list, profile drawers | 2 |
| `/emergency/queues` | **Queue Intelligence** — pre-triage, triage, treatment queues | 2 |
| `/emergency/triage` | **Triage Workspace** — acuity review, vital signs, triage actions | 3 |
| `/emergency/reassessment` | **Reassessment Engine** — reassessment tracking, deterioration flags | 3 |
| `/emergency/capacity` | **Capacity Intelligence** — bed availability, boarding, department load | 4 |
| `/emergency/boarding` | **Boarding Intelligence** — boarding pressure, inpatient hold monitoring | 4 |
| `/emergency/referrals` | **Referral Intelligence** — inbound/outbound referral tracking | 4 |
| `/emergency/diagnostics` | **Diagnostics Coordination** — lab, imaging, results coordination | 3 |
| `/emergency/handoffs` | **Handoff Management** — structured shift handoff, SBAR summaries | 4 |
| `/emergency/intake` | **Smart Intake** — guided patient intake form, AI field suggestions | 1 |
| `/emergency/pulse` | **Department Pulse** — real-time ED health metrics | 6 |
| `/emergency/shift` | **Shift Summary** — shift performance snapshot for charge nurse | 6 |
| `/emergency/analytics` | **Emergency Analytics** — throughput, door-to-doctor, LOS trends | 7 |
| `/emergency/reports` | **Operational Reports** — exportable shift and period reports | 7 |
| `/emergency/alerts` | **Clinical Alerts** — escalated alerts and acknowledgment workflow | 7 |
| `/emergency/ed-readiness` | **ED Readiness** — pre-shift readiness dashboard | 4 |
| `/emergency/settings` | **Emergency Settings** — scenario selector, thresholds, feature flags | 10 |
| `/emergency/help` | **Help Hub** — user manual, onboarding, role guides | 6 |
| `/emergency/patient-room` | **Patient Room Display** — wall/TV room display with privacy masking | 2 |
| `/emergency/self-arrival` | **Self-Arrival Check-In** — patient kiosk intake | 1 |
| `/fleet/command` | **Fleet Command** — ambulance fleet dashboard | 8 |
| `/fleet/live-map` | **Fleet Live Map** — real-time unit tracking | 8 |
| `/hospital-map` | **Hospital Map** — department layout, bed zones | 9 |
| `/medical-iot` | **Medical IoT Dashboard** — device telemetry, alerts | 9 |
| `/integrations/hub` | **Integration Hub** — connector status, FHIR/HL7 links | 11 |
| `/audit` | **Governance Workspace** — audit logs, AI oversight, compliance | 7 |
| `/admin` | **Admin Console** — tenant administration, staff, system health | 10 |

---

## Hospital roles

CareDroid supports 23 distinct hospital roles with per-role route access, AI scope, data minimization level, and break-glass permissions.

**Clinical staff:** `emergency_physician` · `attending_physician` · `resident_physician` · `specialist` · `charge_nurse` · `triage_nurse` · `registered_nurse`

**EMS & dispatch:** `paramedic` · `dispatcher` · `ems_coordinator`

**Operations:** `registration_clerk` · `patient_flow_coordinator` · `lab_technician` · `radiology_technician` · `pharmacist` · `social_worker` · `security_officer`

**Administration:** `hospital_admin` · `ed_director` · `it_admin` · `quality_safety_officer` · `super_admin` · `demo_observer`

Role definitions live in [`src/lib/users/userTypes.ts`](src/lib/users/userTypes.ts). Permission matrices are in [`src/lib/users/permissions.ts`](src/lib/users/permissions.ts) and [`src/lib/users/roleAccess.ts`](src/lib/users/roleAccess.ts).

---

## Clinical calculators & specialty tools

Over 30 validated clinical calculators and risk scores are available via `/emergency/tools`, contextual patient drawers, and AI-assisted tool suggestion:

**Emergency risk scores:** qSOFA · NEWS2 · SOFA · HEART · Wells PE · Wells DVT · Shock Index · NIHSS · GCS · CURB-65 · TIMI · PEWS · Alvarado

**Mental health:** PHQ-9 · GAD-7 · Columbia Suicide Severity Rating Scale

**Dosing & physiology:** Pediatric Drug Calculator · Drug Dose Calculator · IV Fluid Calculator · eGFR · Anion Gap · Corrected QT · Pediatric drug weight calc

**Specialty clinical assistants** (deep-link routes `/emergency/tools/<specialty>/:toolId`):
Cardiology · Nephrology · Neurology · Gastroenterology · Endocrine & Metabolic · Pediatrics & Ob/Gyn · Psychiatry · Pulmonology

**Clinical workflows:** ICD-10 lookup · Lab results panel · Imaging orders · Medication history · Visit history · Vitals history chart · Guideline RAG · Differential AI · Lab Interpreter · Drug Checker · Ambient Scribe · Clinical Audit

---

## AI platform

CareDroid runs **17 distinct AI services** across generation, prediction, edge inference, and NLP workloads. The platform is provider-agnostic and defaults to **Anthropic Claude** (`claude-sonnet-4-6`).

> Full details, safety constraints, governance model, and per-service configuration reference: **[`docs/AI_FEATURES.md`](docs/AI_FEATURES.md)**

### Active AI services (quick reference)

| Service | Purpose | Status |
|---------|---------|--------|
| ED Copilot | Operational workflow assistant — wait times, queues, EMS, capacity | Active |
| Smart Intake Verification | Field verification and missing-info suggestions at reception | Active |
| Referral Summarization | Urgency, context, destination, and missing-info summaries | Active |
| Analytics Explanation | Plain-language explanation of throughput, boarding, EMS trends | Active |
| Clinical Workflow Launcher | Suggests relevant checklists, calculators, and protocols for human launch | Active |
| Calculator Explanation | Score bands, missing inputs, limitations, next steps | Active |
| Smart Handover | AI-drafted SBAR handoff summaries from patient data | Legacy |
| Protocol Auto-Trigger | Rule-based deterioration detection → protocol activation | Local/deterministic |
| Deterioration Prediction | Probabilistic deterioration risk from operational and clinical signals | Roadmap |
| Discharge Prediction | Discharge readiness and timing estimates | Roadmap |
| START-AI (Admission Prediction) | Pre-physician admission likelihood for proactive bed coordination | Roadmap |
| AI Triage Assistant | Acuity considerations for nurse triage review | Legacy |
| Ambient Clinical Documentation | Draft SOAP notes from encounter audio (Azure OpenAI) | Legacy |
| Clinical Text Mining | Local entity extraction from clinical notes | Local/deterministic |
| MoH Patient Matching | Embedding-based patient record matching for identity resolution | Roadmap |
| Federated EMS Triage | Coordinated edge triage with federated local model aggregation | Roadmap |
| Edge AI Ambulance | Vital stream and ultrasound frame analysis at the ambulance edge | Roadmap |

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite 5, React Router v6, Zustand, TypeScript |
| Backend | NestJS 10, TypeORM, SQLite (local dev), PostgreSQL (production) |
| AI runtime | Anthropic Claude API (default), OpenAI, Azure OpenAI, Gemini, Local |
| Vector knowledge | Pinecone (RAG for medical knowledge retrieval) |
| NLU (intent routing) | In-process TypeScript classifier on Nest `/api/nlu` (Xenova embeddings + MLP head) |
| Anomaly detection | External ML service (`anomaly-detection:5000`) |
| Real-time | WebSocket + SSE (`WebSocketManager`, `RealTimeCostService`) |
| MCP tooling | Custom MCP server package (`mcp/`) |
| Charts | Recharts |
| Icons | Tabler Icons, Lucide React |
| Optional | Redis cache, observability stack |
| Package manager | npm (separate locks for root, `backend/`, and `mcp/`) |

**Requirements:** Node `>=20.19.0 <25`, npm `>=10` (see `.node-version`).

---

## One-application architecture

CareDroid is **one Vite + React application** — not a bundle of separate products.

```
CareDroid-Clinical-AI/
├── src/                   # React frontend — THE application
│   ├── app/               # Router, App root, providers
│   ├── components/        # Shared components (Header, Shell, Chrome, etc.)
│   ├── pages/             # Page components organized by domain
│   ├── services/          # 300+ service modules (API, AI, flow, analytics)
│   ├── store/             # Zustand state (emergencyStore.ts is canonical)
│   ├── styles/            # Design system CSS (design-system.css is the entry)
│   ├── lib/               # Auth, AI client, user types, navigation
│   └── config/            # Routes, theme, screen modes, feature config
├── lib/                   # Shared registries (suites, features, AI config)
│   ├── features/          # suiteRegistry.ts, featureRegistry.ts
│   └── ai/                # AI platform config, safety policy
├── backend/               # NestJS API, TypeORM entities, AI executors
│   └── src/modules/       # Patients, AI, auth, audit, tenant, fleet, …
├── mcp/                   # MCP server package
├── e2e/                   # Playwright end-to-end specs
├── tests/                 # Cross-stack integration tests
├── scripts/               # Dev stack, audits, QA, build utilities
└── docs/                  # Architecture, demo guides, AI features
```

**Canonical entry points:**

| File | Role |
|------|------|
| `src/main.jsx` | Single Vite entry point |
| `src/app/App.tsx` | Application root (providers + router) |
| `src/app/router.tsx` | Unified route table |
| `src/store/emergencyStore.ts` | Unified ED state |
| `src/services/emergencyOsApi.js` | Backend API facade |
| `lib/features/suiteRegistry.ts` | Suite taxonomy |
| `lib/ai/config.ts` | AI platform configuration |

---

## Quick start

Install all dependencies:

```bash
npm install
npm --prefix backend install
```

Copy environment templates:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Start the full local stack (frontend on :5190 — Vite proxies `/api` to Nest on :3350):

```bash
npm start
```

Local defaults use **SQLite** and disable optional ML/RAG services so the app boots without Docker or external credentials.

| Service | URL |
|---------|-----|
| App (frontend + API proxy) | http://localhost:5190 |
| API (proxied) | http://localhost:5190/api |
| Backend (direct, internal) | http://localhost:3350 |
| Health check | http://localhost:5190/health |
| API docs (Swagger) | http://localhost:5190/api/docs |

### Focused commands

```bash
npm run dev:web          # Frontend only (Vite on :5190)
npm run dev:api          # Backend only (Nest on :3350)
npm run backend:build    # Compile NestJS
npm run backend:start    # Run compiled backend
npm run typecheck:frontend
npm run lint:all
```

### Demo walkthrough

For a pilot or sales demo: start at `/emergency/whiteboard` and select **First Customer Demo Mode** from the scenario selector (or from `/emergency/settings`). This mode uses deterministic local data and stays stable even when optional backend integrations are unavailable.

Key walkthrough surfaces in order:
1. `/emergency/reception` — register a walk-in patient
2. `/emergency/whiteboard` — see the patient appear on the board
3. `/emergency/ems` — review an inbound ambulance handoff
4. `/emergency/copilot` — query the AI about queue pressure
5. `/emergency/tools` — run a HEART score or NEWS2 calculation
6. `/emergency/pulse` — review charge nurse command overview

---

## Environment configuration

### Frontend (`.env`)

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Leave empty in local dev (same-origin `/api` via Vite on :5190) |
| `VITE_ED_SINGLE_APPLICATION` | `true` (default) — activates Emergency OS as single app |
| `AI_ENABLED` | Enable AI features globally |
| `ED_COPILOT_AI_ENABLED` | Enable the ED Copilot specifically |
| `ANTHROPIC_API_KEY` | Anthropic API key for Copilot and AI services |
| `AI_MODEL` | Override the default model (`claude-sonnet-4-6`) |
| `RAG_ENABLED` | Enable Pinecone RAG for knowledge retrieval |
| `VITE_STRICT_SAAS_ENTITLEMENTS` | Enforce SaaS feature gating |

See `.env.example` for the full variable list.

### Backend (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_CLIENT` | `sqlite` (local dev) or `pg` (production) |
| `JWT_SECRET` | Must be rotated before any production pilot |
| `ENCRYPTION_KEY` | Must be rotated before any production pilot |
| `CORS_ORIGIN` | API CORS origin |
| `AI_PROVIDER` | `anthropic` (default), `openai`, `azure-openai`, `gemini` |
| `ANTHROPIC_API_KEY` | Backend AI key |
| `PINECONE_API_KEY` | Pinecone API key for RAG |
| `NLU_SERVICE_MODE` | `in-process` (default) or `http` for an external NLU deployment |
| `NLU_SERVICE_URL` | NLU base URL (default `http://127.0.0.1:3350/api/nlu` when in-process) |
| `ANOMALY_DETECTION_URL` | Anomaly detection service URL |
| `REDIS_URL` | Optional Redis cache |

---

## Testing

```bash
npm test                       # Vitest watch mode
npm run test:run               # Single Vitest pass
npm run test:all               # Frontend + backend unit tests
npm run validate:ci            # Full CI validation pipeline
npm run test:e2e:responsive    # Playwright responsive QA
```

Backend tests from `backend/`:

```bash
cd backend && npm test
```

---

## Docker

App-only stack:

```bash
npm run compose:app:build
```

With NLU enabled in-process on the backend (no separate sidecar):

```bash
npm run compose:app:ml
```

The root `docker-compose.yml` provides the full database, cache, monitoring, and observability stack.

---

## Security & governance

CareDroid is designed with audit-minded SaaS patterns. **It does not claim HIPAA, PHIPA, or regulatory certification** unless your deployment independently implements and validates those controls.

| Area | Posture |
|------|---------|
| Tenant isolation | `TenantContextInterceptor` + `TenantIsolationGuard`; org/workspace scoping on platform APIs |
| RBAC | JWT auth, 23-role permission matrix, emergency role matrix on the frontend |
| Audit logging | TypeORM `audit_logs` with hash chaining; patient reads logged as `phi_access` |
| AI governance | Per-tenant AI settings, required disclaimers, safety constraint registry, 7-year audit retention default |
| Secrets | Never commit `.env` or `backend/.env`; rotate `JWT_SECRET` and `ENCRYPTION_KEY` before production |
| Frontend logs | Do not log PHI in browser consoles; demo tokens are dev-only |
| AI outputs | Labeled decision support; outputs require clinician review; no autonomous diagnosis or orders |
| Calculators | Deterministic utilities with source labels and disclaimers — not diagnostic truth |
| Display mode | Privacy-safe field masking via `useEmergencyDisplayPrivacy` for overhead screens |
| Data minimization | Per-user `dataMinimizationLevel` (none → metadata_only) controls what each role sees |

**Before production pilot:** rotate `JWT_SECRET` and `ENCRYPTION_KEY`, enable PostgreSQL, configure CORS, review entitlements, complete customer BAA/governance if required.

---

## Documentation

**Start at the [Documentation Center](docs/DOCUMENTATION_CENTER.md)** — the canonical index into every architecture, API, data model, deployment, configuration, glossary, ADR, and role-guide document in this repository, organized by persona.

| Document | Audience |
|----------|----------|
| [Platform Architecture Overview](docs/architecture/platform-architecture-overview.md) | Developers, architects |
| [API Reference](docs/api/api-reference.md) | Backend/API engineers |
| [Data Model Reference](docs/data-model/data-model-reference.md) | Backend engineers, data engineers |
| [Developer Guide](docs/developer-guide.md) | New contributors |
| [Deployment Guide](docs/deployment-guide.md) | IT/DevOps, SRE |
| [Configuration Reference](docs/configuration-reference.md) | IT/DevOps, backend engineers |
| [Glossary](docs/glossary.md) | Everyone |
| [AI Features Reference](docs/AI_FEATURES.md) | Developers, clinical informatics, AI reviewers |
| [AI Patient Intake](docs/AI_PATIENT_INTAKE.md) | Clinical informatics, registration, EMS coordinators |
| [Medical KPIs & Biomedical Informatics](docs/MEDICAL_KPIS_AND_BIOMEDICAL_INFORMATICS.md) | Clinical informatics, biomedical engineers, clinical leads |
| [AI Architecture](docs/ai/ai-documentation.md) | Developers, AI reviewers |
| [User Manual](docs/manuals/caredroid-master-user-manual.md) | ED staff, clinical evaluators, Codespace testers |
| [Feature Coverage Matrix](docs/architecture/feature-coverage-matrix.md) | Product, clinical informatics |
| [System Architecture](docs/architecture/system-architecture.md) | Developers |

---

## Clinical scope

CareDroid is a **human-reviewed emergency department operating layer** for patient flow, queue visibility, EMS and referral coordination, clinical workflow guidance, analytics, and copilot support.

It is **not** positioned as autonomous diagnosis, prescribing, order entry, discharge, admission, acuity assignment, or EHR writeback.

Medical coverage centers on high-pressure ED workflows: triage review, waiting-room visibility, reassessment, EMS offload, referral delay, boarding, discharge readiness, protocol and calculator access, evidence retrieval, handoff support, documentation readiness, and simulation/training.

The default deployment posture is **demo/manual-data-first** with clear source labels and no live clinical writeback. Production integration requires customer approval, validated connectors, governance controls, and human review.

---

## License

Proprietary. See `backend/package.json` license field.

---

*One product. One name. One codebase.*
