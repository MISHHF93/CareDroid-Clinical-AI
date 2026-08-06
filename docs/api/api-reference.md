# API Reference

> Consolidates both of CareDroid's API surfaces into one reference. For the frontend-page-consumption view (which page calls which endpoint), see [`docs/generated/apis.md`](../generated/apis.md) — that file is generated from `pageApiBinding.registry.ts` and `emergencyOsApi.ts` and should be treated as authoritative for those 50 bindings. This document is the endpoint inventory for the current, single NestJS routing system (§2) plus the small set of files still mounted directly on the Express app underneath it (§1).
>
> **Live, always-current source of truth:** the Swagger UI at `http://localhost:5190/api/docs` (all NestJS controllers, request/response schemas). Regenerate this document's NestJS section by re-reading `backend/src/modules/**/*.controller.ts` if it drifts.

## One routing system, not two

`backend/src/api/routes-registry.ts` — the legacy Express route registry and its `GET /api/routes` discovery endpoint — was deleted outright in the Express→Nest decommission (see `backend/src/api/express-nest-parity.spec.ts` for the full retirement history: which Nest controller replaced each of the 16 original route groups, and in which cycle). `app.setGlobalPrefix('api')` in `backend/src/main.ts` puts every NestJS controller under `/api/*`; NestJS is now the sole routing authority. §1 below is not a second, parallel system — it's the 3 files still mounted directly on the underlying Express app for reasons that don't fit the Nest DI/guard model (a health check needed before Nest's DI container is ready, a raw WebSocket handler, and a JWT-verification helper both of those use).

**Authentication:** NestJS controllers are protected per-controller via `AuthGuard('jwt')` + `AuthorizationGuard` (see [Platform Architecture Overview §Authorization](../architecture/platform-architecture-overview.md#authorization--rbac)). The one exception is `/health`, which is deliberately unauthenticated (see §1).

---

## 1. Files still mounted directly on Express (`backend/src/api/`)

| File | Mounted as | Endpoints | Why it's not a Nest controller |
|---|---|---|---|
| `health.routes.ts` | `/health`, `/api/health` | `GET /`, `GET /live` | Deliberately unauthenticated liveness/readiness check, mounted before Nest's DI container is guaranteed ready |
| `ems.socket.ts` | Raw WebSocket handlers (`registerEMSWebSocketSupport`, `registerEdgeAIAmbulanceWebSocketSupport`) on the HTTP server | — | WebSocket upgrade handling, guarded by `JwtQueryAuthGuard` |
| `runtime-auth.ts` | Not a route — a JWT-verification helper (`createRuntimeJwtAuthenticator`, `createSocketJwtAuthMiddleware`) | — | Shared by the two files above, which run before/outside Nest's own guard pipeline |

**Everything else that used to live here was migrated to a real NestJS controller, not deleted silently:** `/capacity`→`CapacityController`, `/governance`→`NestAiGovernanceController`, `/copilot`→`EdCopilotNestParityController`, `/deterioration`→`DeteriorationController`, `/protocol`→`ProtocolController`, `/reassessment`→`ReassessmentController`, `/ems`→`EmsController`, `/boarding`→`BoardingController`, `/intake`→`SmartIntakeController`, `/federated`→`FederatedEMSController`, `/surge`→`SurgeController`. The 6 remaining groups (`/moh`, `/wearable`, `/iot`, `/simulation`, `/handover`, `/digital-twin`) were pure placeholder stubs with zero real functionality and were deleted outright rather than migrated — `/handover`'s real functionality lives in `ERPulseHandoverController` and `/digital-twin`'s in `OrganizationalDigitalTwinController`, both listed under Emergency-OS in §2 below.

---

## 2. NestJS modules (`backend/src/modules/`)

All paths below are relative to `/api`. JWT-guarded modules are noted; assume JWT + RBAC (`AuthorizationGuard`) applies unless the module is explicitly public (auth, webhooks).

### Identity, auth & tenancy

| Module | Base | Key endpoints |
|---|---|---|
| `auth` | `auth` | `POST /register`, `POST /login`, `POST /dev-session`, `POST /verify-2fa`, `GET /verify-email`, `GET /google(+/callback)`, `GET /linkedin(+/callback)`, `POST /magic-link`, `GET /magic-link/verify`, `POST /forgot-password`, `POST /reset-password`, `GET /me` |
| `auth/biometric` | `auth/biometric` | `POST /enroll`, `POST /verify`, `GET /config`, `GET /stats`, `DELETE /disable/:deviceId`, `DELETE /delete/:deviceId`, `GET /available` |
| `two-factor` | `two-factor` | `GET /generate`, `POST /enable`, `DELETE /disable`, `POST /verify`, `GET /status` |
| `users` | `users` | `GET /profile`, `PATCH /profile` |
| `user-profile` | `profile` | `GET /me`, `PATCH /me`, `GET/PATCH /me/preferences`, `GET /me/activity`, `GET /me/workspaces`, `PATCH /me/workspaces/active`, `GET /me/security` |
| `user-activity` | `activity` | `POST /`, `GET /me`, `GET /me/summary`, `GET /workspaces/:workspaceId` |
| `workspaces` | `workspaces` | `GET/POST /`, `POST /active`, `GET /context`, `GET /:id(+/context,+/members)`, `POST /:id/invitations`, `GET/PATCH /:id/tools`; invitations: `GET /invitations/:token`, `POST /invitations/:token/accept` |
| `organizations` | `organizations` | `GET /`, `GET/POST /current(+/engine)`, `POST /onboarding`, `GET /:id(+/engine,+/tenant-admin,+/feature-flags)`, `PATCH /:id(+/tenant-admin,+/feature-flags,+/settings)`; white-label: `GET /white-label/:tenantId`; `GET/PATCH /settings/features` |
| `tenant-context` | `tenant` | `GET /context`, `GET /isolation-audit` |

### Billing & entitlements

| Module | Base | Key endpoints |
|---|---|---|
| `subscriptions` | `subscriptions` | `GET /plans`, `GET /config`, `POST /create-checkout`, `POST /portal`, `GET /current`, `GET /lifecycle`, `POST /entitlements/resolve`, `POST /upgrade`, `POST /downgrade`, `POST /trial/convert`, `GET /billing`, `GET /usage(+/metering)`, `POST /usage/events`, `POST /webhook` (Stripe, unauthenticated by design) |
| `product-catalog` | (root) | `GET /products(+/pack-map,+/builder,+/:slug,+/:slug/assets)`, `GET /asset-packs`, `GET /commercial-plans(+/:id)`, `GET /specialties(+/:slug,+/:slug/assets)`, `GET /care-pathways(+/:slug)`, `GET /agents`, `GET /integrations-marketplace`, `GET /integration-readiness`, `POST /solution-builder/recommendations(+/apply)`, `GET /dependency-graph`, `GET /maturity-assessments/questionnaire`, `POST /maturity-assessments`, org-scoped: `GET /organizations/:id/outcomes(+/value-tracking)`, `PATCH /organizations/:id/configuration(+/commercial-plan)`, `POST /organizations/:id/integrations/request` |
| `platform-assets` | `platform` | `GET /context`, `PATCH /me/role-profile`, `GET /users/me/assets(+/recommendations)`, `POST /users/me/pinned-assets(+/hidden-assets)`, `GET /assets(+/:id)`, `GET /governance-registry`, `GET /departments(+/:id)`, `GET /service-lines(+/:id)`, `GET /packs(+/:id)`, `GET /marketplace/packs(+/:id)`, `GET /role-profiles(+/:id)`, `GET /organizations/:id/entitlements`, `POST /organizations/:id/packs/:packId/install(+/remove)`, `PATCH /assets/:id/lifecycle`, `GET /digital-twin`, `GET /organizations/:id/analytics(+/customer-success)` |

### AI & clinical intelligence

| Module | Base | Key endpoints |
|---|---|---|
| `ai` | `ai` | `POST /query`, `POST /structured`, `POST /node`, `GET /usage`, `GET /organizations/:id/usage`, `GET /remaining-queries` |
| `chat` | `chat` | `POST /message-3d`, `POST /intent-classify`, `POST /message`, `POST /suggest-action`, `POST /analyze-vitals`; emergency-ai (absolute paths): `POST /emergency/copilot/message`, `POST /emergency/intake/ai/message`, `POST /emergency/referrals/ai/message`, `POST /emergency/analytics/ai/message`, `POST /ai/node/conversational` |
| `unified-ai-node` | `ai/node/models` | `GET /health`, `GET /manifest`, `POST /route` — the combined NLU + artifact-router endpoint |
| `nlu` (ml-services) | `nlu` | intent classification (`NluService.predict`/`predictBatch`) |
| `clinical` | `drugs`, `protocols` | Full CRUD (`GET/POST/PUT/DELETE`) plus `GET /categories`, `GET /:id` on each |
| `clinical-intelligence` | `clinical-intelligence` | `POST /ambient-scribe/generate`, `POST /guideline-rag/query`, `POST /differential-ai/generate`, `POST /timeline-ai/generate`, `POST /patient-summary-ai/generate`, `POST /order-set-ai/generate`, `GET /ai-explainability/trace`, `GET /clinical-audit/execution-logs` |
| `clinical-alerts` | `clinical/alerts` | `GET /`, `POST /:id/acknowledge`, `POST /:id/dismiss` |
| `native-ai` | `native-ai` | `GET /registry`, `GET /drift`, `POST /drift/evaluate`, `POST /route`, `POST /clinical-acuity`, `GET/POST /triage-rules(+/evaluate)`, `POST /specialists/infer` |
| `tool-calling` | `tool-calling` | `POST /execute`, `GET /catalog`, `GET /resolve`, `GET /logs` |
| `tool-orchestrator` (medical-control-plane) | `tools` | `GET /`, `GET /available`, `GET /statistics`, `GET /catalog/executors`, `GET /:id`, `POST /:id/validate`, `POST /:id/execute`, `POST /execute`, `POST /results` — **only 3 tools have real executors:** `sofa-calculator`, `drug-interactions`, `lab-interpreter` |
| `training` | `training` | `GET /pipeline(+/dashboard,+/runs)`, `POST /runs(+/:id/evaluate)`, `GET /moe-plan` |
| `evaluation` | `evaluation` | `GET /dashboard(+/metrics,+/runs)`, `POST /runs` |
| `cost-optimizer` | `cost-optimizer` | `POST /route`, `GET /dashboard` |
| `rag` | `rag` | `GET /health`, `GET /stats` |
| `equity` | `equity` | `GET /summary` |
| `human-review` | `human-review` | `GET /items`, `POST /items/:id/decision` |
| `personalization` | `personalization` | `GET/PATCH /me`, `GET /me/recommendations`, `POST /me/saved-prompts`, `DELETE /me/saved-prompts/:id` |

### Governance, compliance & audit

> Three separate controllers expose governance data — `ai-governance` (`GET /summary`), `v1/governance`, and `emergency/governance` (the latter two duplicate the same 6 endpoints). See [Known Documentation Debt](../DOCUMENTATION_CENTER.md#known-documentation-debt).

| Module | Base | Key endpoints |
|---|---|---|
| `governance` (×3 controllers) | `ai-governance`, `v1/governance`, `emergency/governance` | `GET /summary`; and (on the latter two) `GET /registry`, `GET /safety-rules`, `GET /compliance`, `GET /violations`, `GET /validate-prompts`, `POST /evaluate-priority-change` |
| `platform-governance` | `platform-governance` | `GET /summary`, `POST /gate/evaluate`, `GET /security/events`, `GET/POST /review/items(+/:id/decision)`, `GET /consent/:patientId`, `POST /consent/:patientId/:scope`, `POST /privacy/:patientId/:requestType`, `GET /source-provenance/:sourceId`, `GET /synthetic/fhir(+/hl7)`, `GET/POST /validation/scenarios`, `GET /observability` |
| `llm-security` | `security` | `GET /summary`, `POST /evaluate` |
| `interoperability` | `interoperability` | `GET /summary`, `POST/GET /events(+/:id)` |
| `regulatory` | `regulatory` | `GET /summary` |
| `ehr-audit` | `ehr-audit` | `GET /summary` |
| `privacy-center` | `privacy` | `GET /summary`, `POST /requests` |
| `audit` | `audit` | `POST /sync`, `GET /logs(+/my-logs,+/phi-access)`, `GET /verify-integrity`, `GET /statistics` |
| `automation-audit` | `automation-audit` | `GET /`, `POST /` |
| `compliance` | `compliance` | `POST /export`, `DELETE /delete-account`, `GET/POST /consent` |
| `artifacts` | `artifacts` | `GET /(+/graph)`, `POST /`, `GET /:id(+/versions)`, `PATCH /:id` |
| `memory` | `memory` | `GET /dashboard`, `POST/GET /short`, `POST/GET /long`, `POST/GET /clinical`, `GET /fabric/context`, `POST /fabric/signals` |

### Operations, telemetry & fleet

| Module | Base | Key endpoints |
|---|---|---|
| `observability` | `observability` | `POST /events`, `GET /diagnostics(+/health,+/performance)`, `GET /traces/:correlationId`; plus `system-health` (`GET /`) and `saas-health` (`GET /`) |
| `metrics` | `metrics` | `GET /` — Prometheus scrape endpoint |
| `telemetry` | (root) | `GET /devices/live`, `GET /telemetry/live`, `GET /alerts/devices`, `GET /medical-iot/snapshot` |
| `fleet` | `fleet` | `GET /vehicles/live`, `GET /routes/active`, `GET /alerts`, `GET /snapshot` |
| `surveillance` | `surveillance` | `GET /nexus/snapshot`, `GET /cameras/registry`, `GET /iot/registry`, `GET /zones`, `GET /health`, `GET /alerts`, `GET /incidents`, `GET /integrations` |
| `hospital-map` | `hospital-map` | `GET /floors`, `GET /rooms`, `GET /devices(+/:id)`, `GET /search` |
| `simulation` | `simulation` | `GET /scenarios(+/:id)`, `POST /runs(+/:id/steps,+/:id/complete)`, `GET /outcomes`, `GET /recommendations` |
| `notifications` | `notifications` | `POST /devices/register`, `GET /devices`, `DELETE /devices/:token`, `GET/PATCH /preferences(+/toggle-all)`, `GET /`, `GET /unread/count`, `PATCH /:id/read`, `POST /read-all`, `DELETE /:id`, `POST /test` |
| `analytics` | (root) | `POST /analytics/events`, `GET /analytics/metrics`, `POST /crashes`, `POST /health` |

### Emergency-OS (largest single controller — ~90 endpoints)

`emergency-os.controller.ts`, base `emergency`. Covers: whiteboard/central-node/operational-intelligence snapshots; patients CRUD (`/patients`, `/patients/:id/workflow-logs`, `/document-artifacts`, `/orchestration`); `/ems`, `/reception/snapshot(+/handoff)`, `/triage/assist`, `/intake(+/vertical-slice)`, `/queues`, `/reassessment`, `/operating-surfaces/:id`, `/workflow-orchestration(+/review)`, `/patient-flow(+/:id)`, `/capacity`, `/boarding`, `/referrals`, `/provincial-health`, `/integrations`, `/copilot(+/query,+/interactions)`, `/clinical-calculators/results`, `/analytics`, `/upgrade-harness/*`, `/settings`, `/simulation/update-live|evaluate|compare|recommendations`, `/federated-learning/*`, `/digital-twin/*`.

Sibling controllers: `emergency-os.research.controller.ts` (`handover` → `POST /er-pulse`; `ems/federated` → `POST /112-call`; `federated/lmecs` → `POST /select`, `POST /predict`; `ems` → `POST /ai-call-interrogation(+/ecg)`; `emergency/digital-twin/organizational` → `POST /synchronize`, `POST /simulate`); `emergency-realtime.controller.ts` (`emergency/realtime`, WebSocket-adjacent).

### General-purpose systems controller

`platform-systems.controller.ts` (no fixed prefix, ~1290 lines — the second-largest controller): patients/staff/rooms/shift/ems/referrals CRUD; capability/pack lookups; FHIR & HL7 interoperability (`/integrations/fhir/*`, `/integrations/hl7/*`, `/patients/import/*`, `/patients/:id/workspace|source-data|summary|timeline|events|risk-scores|care-plan`); clinical-intelligence AI endpoints; documentation drafting (`/documentation/soap|dictation|discharge-summary|referral|prior-auth/draft`, `/documentation/:id/approve|export`); the full governance suite under `/governance/*`; consent & privacy; human review; audit; operations/observability (`/operations/*`).

---

## 3. MCP server (`mcp/`)

Separate stdio process for MCP-compatible clients (Claude Desktop, Cursor). See [Platform Architecture Overview §AI Platform](../architecture/platform-architecture-overview.md#ai-platform) for the full picture.

- **Tool:** `caredroid_execute_clinical_tool` — `{ toolId: 'sofa-calculator'|'drug-interactions'|'lab-interpreter', parameters, conversationId? }` → proxies to `POST {CAREDROID_API_URL}/api/tools/:toolId/execute`
- **Resources:** `mcp-readme`, `tool-registry`
- **Prompt:** `caredroid_clinical_tool_brief`
- **Config:** `CAREDROID_API_URL` (default `http://localhost:8000`), `CAREDROID_JWT`
- **Run:** `npm --prefix mcp install && npm --prefix mcp start`

---

## 4. Third-party integration surfaces (called by the backend, not exposed by it)

| Integration | Purpose | Called from |
|---|---|---|
| Anthropic Claude | Primary LLM | `lib/ai/serverClient.ts` |
| Stripe | Billing, webhook consumer at `POST /api/subscriptions/webhook` | `modules/subscriptions/` |
| Pinecone | Vector DB for RAG | `modules/rag/vector-db/pinecone.service.ts` |
| Firebase Cloud Messaging | Push notifications | `modules/notifications/services/firebase.service.ts` |
| SMTP (Nodemailer) | Transactional email | `modules/email/email.service.ts` |
| Google / LinkedIn OAuth2 | Social login | `modules/auth/strategies/` |
| Sentry, Datadog | Error tracking, APM | `main.ts`, `observability/datadog.ts` |
| Prometheus | Metrics scraping | `GET /metrics` (excluded from the global `/api` prefix) |

See [Configuration Reference](../configuration-reference.md) for every environment variable these integrations need.
