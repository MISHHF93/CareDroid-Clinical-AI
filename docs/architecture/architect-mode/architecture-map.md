# CareDroid — Implemented Architecture Map (Architect Mode)

**Status:** Implemented truth as of 2026-07-15 Stage A  
**Authority:** Traced from source entry points — not planning docs  
**Supersedes for runtime truth:** `docs/architecture/architecture-map.md` (2026-06-26 *planning — not implemented*)

---

## 1. Runtime spine

```
Browser
  src/main.tsx
    → theme CSS + observability + deferred startup
    → reception preload ONLY on reception/intake paths (Cycle 68)
    → src/app/App.tsx
         → AppProviders
         → BrowserRouter
         → AppRoutes (src/app/router.tsx)
              → CareDroidRouteGuard / screen-mode redirects
              → AppShell (src/components/AppShell.tsx)  [canonical chrome]
                   → Header + Sidebar + route outlet
                   → engines (reassessment, capacity, workflow, …)
                   → Copilot / command palette / drawers
              → DisplayShell (wall / public display modes)
              → console route trees (admin, governance, ops, platform, …)

API (same process in fullstack dev)
  backend/src/main.ts
    → NestFactory(AppModule)
    → ValidationPipe + ApiExceptionFilter + helmet
    → Nest controllers (modules/**)
    → optional: Mongoose + registerAllRoutes (Express) under /api and /api/emergency
    → EMS / Edge / Sentinel websockets (JWT middleware when configured)
    → TypeORM DataSource (SQLite dev / Postgres prod path)
```

---

## 2. Frontend layers (active)

| Layer | Canonical location | Notes |
|-------|-------------------|--------|
| Entry | `src/main.tsx`, `src/app/App.tsx` | `src/App.tsx` is deprecated re-export |
| Routing mount | `src/app/router.tsx` | Must not invent paths |
| Route authority | `src/config/routes.config.ts` | `CANONICAL_ROUTES`, breadcrumbs |
| Shell | `src/components/AppShell.tsx` | Active |
| Shell named exports | `src/shell/*` | **Re-exports** AppShell/Header/Sidebar — not a parallel UI (see shell/index.ts) |
| Header | `src/components/Header.tsx` | Active operational header |
| Sidebar | `src/components/Sidebar.tsx` | + mobile nav |
| Nav config | `src/config/unified-navigation.config.ts` | Visibility by role/permissions |
| ED permissions | `src/config/emergencyRolePermissions.ts` + `emergencyPermissionRegistry` | ~12 roles |
| State | `src/store/emergencyStore.ts` | Dominant ED operational SoT |
| Sync | `src/store/emergencyOperationalSync.ts` | Backend sync layer (must stay explicit) |
| Contracts | `src/contracts/results.ts`, `domains.ts` | Result/error taxonomy present; not fully adopted |
| Reception | `src/pages/emergency/ReceptionWorkspace.tsx` + `components/reception/**` + `services/reception*` | Reference role |
| Design | `src/styles/design-system.css`, tokens, role accents, reception-desk theme | Multiple CSS namespaces remain |

### Shell clarification (inventory correction)

`HEADER_SHELL_INVENTORY.md` (2025-01) claimed 7 competing headers. As of Stage A source:

- `src/shell/ApplicationShell` → re-exports `AppShell`
- `src/shell/ApplicationHeader` → re-exports real header path (verify consumers)
- WorkspaceHeader / PageCommandBar: **not separate live components**; shell/index.ts documents them as roadmap, not fakes

Residual risk: page-level headers (`PageHeader`, reception toolbars) still create visual fragmentation — UX Stage E.

---

## 3. Backend layers (active)

| Layer | Canonical location | Notes |
|-------|-------------------|--------|
| Entry | `backend/src/main.ts` | Nest primary |
| Modules | `backend/src/modules/**` | Auth, RAG, AI, emergency-os, audit, tenant, … |
| Express legacy | `backend/src/api/routes-registry.ts` | 18 route groups (health, capacity, ems, intake, copilot, governance, …) |
| Runtime auth | `backend/src/api/runtime-auth.ts` | JWT + PHI permission for legacy mounts (Cycle security) |
| Services (legacy style) | `backend/src/services/**` | EMS, OCR, smart-intake, copilot, capacity, … |
| Migrations | `backend/src/database/migrations/**` | Including pgvector `1772701300000-*` |
| Config | `backend/src/config/**` | env validation, rag, auth, feature flags |

### Express ROUTES (enabled groups)

`/health`, `/capacity`, `/ems`, `/surge`, `/boarding`, `/protocol`, `/deterioration`, `/copilot`, `/intake`, `/moh`, `/wearable`, `/iot`, `/simulation`, `/governance`, `/handover`, `/federated`, `/digital-twin`, (+ remaining in file)

Mounted at `/api/*` and optionally `/api/emergency/*` when `enableMongooseEmergencyOs`.

---

## 4. Data plane

| Store | Technology | Role |
|-------|------------|------|
| Primary relational | TypeORM → SQLite (dev) / Postgres (prod) | Users, patients, audit, AI queries, RAG tables |
| Optional document | Mongoose (flagged) | Legacy emergency OS routes/services |
| FE operational | Zustand emergencyStore | Patients, queues, EMS arrivals, flags (session + sync) |
| Vectors | In-memory / Pinecone / pgvector | RAG retrieval adapters |
| Offline | `src/db/offline*` | Client offline support |

---

## 5. AI / RAG / OCR (active paths)

```
Ingest: medical-knowledge / knowledge-registry
  → DocumentChunker
  → EmbeddingService (Xenova / hash / OpenAI config)
  → Vector store (interface)
  → RetrievalService (tenant filter; adversarial specs exist)
  → RerankingService (Cohere optional / local lexical)
  → CitationService + ClinicalContextService
  → Chat / Copilot / AI gateway consumers

LLM egress: lib/ai/providers/* + transportSafety (timeout, circuit, PHI)
Demo provider: Groq (configurable; not production default)

OCR: backend/src/services/ocr.service.ts → intake/document flows
  Gate: OCR must not become authoritative without validation (Stage G enforce)
```

Global RAG scope sentinel: `RAG_GLOBAL_ORG_SCOPE = '__global__'` in `rag.service.ts`.

---

## 6. Reception reference path (source-traced)

```
Route: /emergency/reception (CANONICAL_ROUTES + router lazy ReceptionWorkspace)
Role: registration_clerk (EMERGENCY_ROLE_IDS)
UI: ReceptionWorkspace + ReceptionDeskToolbar + queues + UnifiedIntakePanel
URL contract: receptionIntakeBridge.RECEPTION_PIPELINE_URL_CONTRACT
  express/quickIntake/intake/queue=ems|verification|pretriage/patientId/q

Actions:
  Quick/express intake → reception services → emergencyStore patient create
  EMS convert → convertEmsArrivalForReception → convertEMSArrivalToPatient
              → enterEmsRegistrationQueue → reception verify path
  Handoff/escalation → receptionHandoff / receptionEscalationWorkflow
  Optional API → smart-intake / emergency-os / EMS routes (when backend online)

State: useEmergencyStore
Chrome: AppShell (minimal chrome when reception screen mode)
Copilot: shell CopilotPanel (permission-gated)
```

---

## 7. Duality map (must resolve by stage)

| Duality | Canonical (target) | Secondary (until parity) |
|---------|-------------------|--------------------------|
| HTTP API | Nest controllers | Express routes-registry + flag |
| Authz server | Nest Permission + guards | runtime-auth on Express |
| Authz client ED | emergencyPermissionRegistry | Platform asset entitlements |
| Nest role enum | Map *from* emergency roles | UserRole: physician/nurse/student/admin only |
| Shell | components/AppShell | shell/* re-exports only |
| Routes | routes.config + router | Console trees must import canonical paths |
| Patients | TypeORM + store sync | Mongoose emergency OS |
| Vectors | pgvector durable multi-tenant | in-memory unit; Pinecone optional |
| Errors | src/contracts ErrorCode | Ad-hoc throws / empty catches residual |

---

## 8. What is NOT proven yet

- Full HTTP multi-tenant isolation suite on Postgres (partial: RAG adversarial unit)
- Every Nest controller listed with FE consumer (API catalogue Stage A draft)
- Production synchronize = false under all production config paths
- Medical Light as single token namespace across all pages
- AI recommendation envelope (evidence, model version, human-review) on all surfaces
- All engines started by AppShell as durable vs session-only

---

## 9. Proof method for future claims

A capability may be labeled **VERIFIED ACTIVE** only when:

1. User action or API entry is identified in source  
2. Handler → state/API → backend service → persistence/event path is cited with file paths  
3. A test or runtime trace shows observable outcome  
4. Auth and tenant boundaries are asserted where PHI is involved  
