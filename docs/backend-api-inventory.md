# Backend API inventory and frontend wiring audit

Generated: 2026-05-19  
Global prefix: `api` (`backend/src/main.ts` — `app.setGlobalPrefix('api', { exclude: ['health', ''] })`)  
Effective route = `/api` + `@Controller(path)` + handler path.

> **Related:** [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md), [clinical-tool-executors.md](./clinical-tool-executors.md)

---

## 1. Controllers (16)

| Controller | File | `@Controller` path | Global prefix | Route base |
|------------|------|------------------|---------------|------------|
| AppController | `backend/src/app.controller.ts` | _(empty)_ | partial exclude | `/health`, `/api/config/system`, SPA `*` |
| AuthController | `modules/auth/auth.controller.ts` | `auth` | yes | `/api/auth` |
| BiometricController | `modules/auth/biometric.controller.ts` | `auth/biometric` | yes | `/api/auth/biometric` |
| UsersController | `modules/users/users.controller.ts` | `users` | yes | `/api/users` |
| TwoFactorController | `modules/two-factor/two-factor.controller.ts` | `two-factor` | yes | `/api/two-factor` |
| SubscriptionsController | `modules/subscriptions/subscriptions.controller.ts` | `subscriptions` | yes | `/api/subscriptions` |
| ChatController | `modules/chat/chat.controller.ts` | `chat` | yes | `/api/chat` |
| ToolOrchestratorController | `modules/medical-control-plane/tool-orchestrator/tool-orchestrator.controller.ts` | `tools` | yes | `/api/tools` |
| DrugController | `modules/clinical/drug.controller.ts` | `drugs` | yes | `/api/drugs` |
| ProtocolController | `modules/clinical/protocol.controller.ts` | `protocols` | yes | `/api/protocols` |
| AuditController | `modules/audit/audit.controller.ts` | **`api/audit`** ⚠️ | yes | **`/api/api/audit`** ⚠️ |
| ComplianceController | `modules/compliance/compliance.controller.ts` | `compliance` | yes | `/api/compliance` |
| NotificationController | `modules/notifications/notification.controller.ts` | `notifications` | yes | `/api/notifications` |
| AnalyticsController | `modules/analytics/analytics.controller.ts` | _(empty)_ | yes | `/api/analytics/*`, `/api/crashes`, `/api/health` |
| AiController | `modules/ai/ai.controller.ts` | `ai` | yes | `/api/ai` |
| MetricsController | `modules/metrics/metrics.controller.ts` | `metrics` | yes | `/api/metrics` |

**Medical control plane** has no standalone HTTP controller for intent classification. It is consumed internally by `ChatService` via `IntentClassifierService` and `ToolOrchestratorService`.

---

## 2. Full API route inventory

### App (excluded from `/api` prefix where noted)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/health` | no | Liveness |
| GET | `/api/config/system` | no | RAG + session timeouts |
| GET | `/` | no | SPA index (single-port deploy) |
| GET | `/*` | no | SPA fallback |

### Auth — `/api/auth`

| Method | Path | DTO / body | Frontend usage |
|--------|------|------------|----------------|
| POST | `/register` | `RegisterDto` | `Auth.jsx` |
| POST | `/login` | `LoginDto` | `Auth.jsx` |
| POST | `/dev-session` | — | `Auth.jsx` (dev) |
| POST | `/verify-2fa` | `{ userId, token }` | `Auth.jsx` |
| GET | `/verify-email` | query `token` | — |
| GET | `/google`, `/google/callback` | OAuth | `Auth.jsx` redirect |
| GET | `/linkedin`, `/linkedin/callback` | OAuth | `Auth.jsx` redirect |
| POST | `/magic-link` | `{ email }` | `Auth.jsx` |
| GET | `/oidc`, `/saml` | placeholders | `Auth.jsx` ping |
| GET | `/me` | — | — |

### Biometric — `/api/auth/biometric`

| Method | Path | Frontend |
|--------|------|----------|
| POST | `/enroll` | `BiometricSetup.jsx` |
| POST | `/verify` | `BiometricSetup.jsx` |
| GET | `/config` | `BiometricSetup.jsx` |
| GET | `/stats` | `BiometricSetup.jsx` |
| DELETE | `/disable/:deviceId` | `BiometricSetup.jsx` |
| DELETE | `/delete/:deviceId` | — |
| GET | `/available` | — |

### Users — `/api/users`

| Method | Path | DTO | Frontend |
|--------|------|-----|----------|
| GET | `/profile` | — | `UserContext.jsx` |
| PATCH | `/profile` | body (untyped) | — |

### Two-factor — `/api/two-factor`

| Method | Path | DTO | Frontend |
|--------|------|-----|----------|
| GET | `/generate` | — | `TwoFactorSetup.jsx` |
| POST | `/enable` | `EnableTwoFactorDto` | `TwoFactorSetup.jsx` |
| DELETE | `/disable` | `VerifyTwoFactorDto` | `TwoFactorSettings.jsx` |
| POST | `/verify` | `VerifyTwoFactorDto` | — |
| GET | `/status` | — | `TwoFactorSettings.jsx` |

### Subscriptions — `/api/subscriptions`

| Method | Path | Frontend |
|--------|------|----------|
| GET | `/plans` | `configService.js` (broken client — see §10) |
| GET | `/config` | — |
| POST | `/create-checkout` | `CreateCheckoutDto` | — |
| POST | `/portal` | — |
| GET | `/current` | `configService.js` (broken client) |
| POST | `/webhook` | Stripe |

### Chat — `/api/chat` (medical-control-plane consumer)

| Method | Path | Body | Frontend |
|--------|------|------|----------|
| POST | `/message` | `ChatMessageDto` | Dashboard, tools, `clinicalChatService.js` |
| POST | `/intent-classify` | `IntentClassifyDto` | `advancedRecommendationService.js` |
| POST | `/message-3d` | `ChatMessage3DDto` | — |
| POST | `/suggest-action` | `{ patientId, context }` | — |
| POST | `/analyze-vitals` | `{ vitals }` | phantom `vitals-monitor` only |

All chat routes: `AuthGuard('jwt')` + `AuthorizationGuard` + permission decorators.

### Tools (orchestrator) — `/api/tools`

| Method | Path | DTO | Frontend |
|--------|------|-----|----------|
| GET | `/` | — | `clinicalToolsApi.js` |
| GET | `/available` | — | `clinicalToolsApi.js`, catalog |
| GET | `/statistics` | — | — |
| GET | `/catalog/executors` | — | catalog docs panel |
| GET | `/:id` | — | — |
| POST | `/:id/validate` | `{ parameters }` | — |
| POST | `/:id/execute` | `{ parameters, conversationId? }` | SOFA, drug, lab pages |
| POST | `/execute` | `ExecuteToolDto` | — |
| POST | `/results` | body | `syncService.js` |

### Clinical CRUD — `/api/drugs`, `/api/protocols`

| Resource | Methods | DTOs | Frontend |
|----------|---------|------|----------|
| Drugs | GET, GET categories, GET `:id`, POST, PUT, DELETE | `drug.dto.ts` | **No direct UI** (drug checker uses orchestrator) |
| Protocols | same pattern | `protocol.dto.ts` | **No direct UI** (Protocols page uses chat) |

### Compliance — `/api/compliance`

| Method | Path | DTO | Frontend |
|--------|------|-----|----------|
| POST | `/export` | — | — |
| DELETE | `/delete-account` | `DeleteAccountDto` | — |
| GET | `/consent` | — | — |
| POST | `/consent` | `UpdateConsentDto` | — |

### Notifications — `/api/notifications`

| Method | Path | Frontend |
|--------|------|----------|
| POST | `/devices/register` | `NotificationService.js` |
| GET | `/devices` | — |
| DELETE | `/devices/:token` | — |
| GET/PATCH | `/preferences` | `NotificationService.js` |
| POST | `/preferences/toggle-all` | — |
| GET | `/` | `NotificationService.js`, `syncService.js` |
| GET | `/unread/count` | — |
| PATCH | `/:id/read` | `NotificationService.js`, `syncService.js` |
| POST | `/read-all` | — |
| DELETE | `/:id` | `NotificationService.js` |
| POST | `/test` | `NotificationService.js` |

### Analytics — `/api`

| Method | Path | Frontend |
|--------|------|----------|
| POST | `/analytics/events` | `analyticsService.ts` |
| GET | `/analytics/metrics` | `AnalyticsDashboard.jsx` |
| POST | `/crashes` | `ErrorBoundary.jsx` |
| POST | `/health` | — (analytics module health, not app `/health`) |

### AI — `/api/ai`

| Method | Path | DTO | Frontend |
|--------|------|-----|----------|
| POST | `/query` | `ai.dto.ts` | — |
| POST | `/structured` | `ai.dto.ts` | — |
| GET | `/usage` | — | — |
| GET | `/remaining-queries` | — | `configService.js` (broken client) |

### Audit — ⚠️ double prefix

| Method | Path (actual Nest) | Frontend calls | Match |
|--------|-------------------|----------------|-------|
| GET | `/api/api/audit/logs` | `/api/audit/logs` | **NO** |
| GET | `/api/api/audit/my-logs` | — | — |
| GET | `/api/api/audit/phi-access` | — | — |
| GET | `/api/api/audit/verify-integrity` | `/api/audit/verify-integrity` | **NO** |
| GET | `/api/api/audit/statistics` | `/api/audit/statistics` | **NO** |
| POST | `/api/api/audit/sync` | `/api/audit/sync` | **NO** |

**Root cause:** `@Controller('api/audit')` duplicates the global `api` prefix.

### Metrics — `/api/metrics`

| Method | Path | Frontend |
|--------|------|----------|
| GET | `/` | — (Prometheus/internal) |

---

## 3. Medical-control-plane surface

| Component | HTTP exposed? | How frontend reaches it |
|-----------|---------------|-------------------------|
| Intent classifier (`IntentClassifierService`) | **No** | `POST /api/chat/message`, `POST /api/chat/intent-classify` |
| Emergency escalation (`EmergencyEscalationService`) | **No** | Embedded in chat response `metadata.emergencyAlert` |
| Tool patterns (`tool.patterns.ts`) | **No** | Classifier only |
| Tool orchestrator (`ToolOrchestratorService`) | **Yes** | `/api/tools/*` |

Internal flow for `POST /api/chat/message`:

1. `ChatService.processMessage` → `IntentClassifierService.classify`
2. If `CLINICAL_TOOL` → `handleClinicalTool` → `ToolOrchestratorService` (3 registered tools only)
3. If emergency → `EmergencyEscalationService`
4. Else RAG + `AiService.invokeLLMWithTools`

---

## 4. Orchestrator execution endpoints

| Method | Path | Executor IDs | Request | Response |
|--------|------|--------------|---------|----------|
| POST | `/api/tools/sofa-calculator/execute` | `sofa-calculator` | `ExecuteToolDto` | `ToolExecutionResponseDto` |
| POST | `/api/tools/drug-interactions/execute` | `drug-interactions` | same | same |
| POST | `/api/tools/lab-interpreter/execute` | `lab-interpreter` | same | same |
| POST | `/api/tools/:id/execute` | any id (resolves aliases) | same | same |
| POST | `/api/tools/execute` | body includes `toolId` | `ExecuteToolDto` | same |
| POST | `/api/tools/:id/validate` | pre-flight | `{ parameters }` | validation result |
| POST | `/api/tools/results` | persist | `{ toolType, input, output, timestamp }` | `{ status, id }` |

Registry aliases at execute time (`tool-orchestrator.registry.ts`): `drug-interaction-checker` → `drug-interactions`; registry ids `sofa-score`, `drug-check`, `lab-interp` → canonical executor ids.

---

## 5. DTO inventory

| File | Classes / types | Used by |
|------|-----------------|--------|
| `auth/dto/register.dto.ts` | `RegisterDto` | POST `/api/auth/register` |
| `auth/dto/login.dto.ts` | `LoginDto` | POST `/api/auth/login` |
| `two-factor/dto/two-factor.dto.ts` | `EnableTwoFactorDto`, `VerifyTwoFactorDto` | 2FA routes |
| `compliance/dto/compliance.dto.ts` | `DeleteAccountDto`, `UpdateConsentDto` | compliance |
| `subscriptions/dto/create-checkout.dto.ts` | `CreateCheckoutDto` | checkout |
| `clinical/dto/drug.dto.ts` | drug CRUD shapes | `/api/drugs` |
| `clinical/dto/protocol.dto.ts` | protocol CRUD shapes | `/api/protocols` |
| `ai/dto/ai.dto.ts` | AI query bodies | `/api/ai` |
| `tool-orchestrator/dto/tool-execution.dto.ts` | `ExecuteToolDto`, `ToolExecutionResponseDto`, `ToolListDto` | orchestrator |
| `intent-classifier/dto/intent-classification.dto.ts` | `IntentClassification`, enums | internal + chat metadata |
| `rag/dto/medical-source.dto.ts` | `MedicalSource` | chat citations |
| `rag/dto/rag-context.dto.ts` | RAG payloads | internal |

**Inline (no class-validator DTO file):** `ChatMessageDto`, `IntentClassifyDto`, analytics/crash bodies in `analytics.controller.ts`, many audit query params (`any`).

---

## 6. Validation pipes

| Layer | Configuration | Effect |
|-------|---------------|--------|
| Global | `ValidationPipe` in `main.ts` | `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` |
| Orchestrator | `validateExecutorRequestPayload`, `validateExecutorContractParameters`, per-tool `validate()` | SOFA / drug / lab |
| Chat | No `class-validator` on inline DTOs | Message body not class-validated at controller |
| Audit | `@Query() query: any` | No query DTO validation |

**Gap:** Routes using inline interfaces or `any` skip `class-validator` even with global pipe. Routes using `@Body() dto: RegisterDto` etc. are validated.

---

## 7. Backend services used by frontend features

| Frontend feature | Primary API | Backend module / service |
|------------------|-------------|---------------------------|
| Login / register / OAuth | `/api/auth/*` | `AuthService` |
| 2FA setup | `/api/two-factor/*` | `TwoFactorService` |
| Profile | `/api/users/profile` | `UsersService` |
| Dashboard chat | `/api/chat/message` | `ChatService` → classifier, orchestrator, RAG, `AiService` |
| Tool recommendations | `/api/chat/intent-classify` | `ChatService.classifyIntentBrief` |
| Drug checker | `/api/tools/drug-interactions/execute` | `DrugCheckerService` |
| Lab interpreter | `/api/tools/lab-interpreter/execute` | `LabInterpreterService` |
| SOFA calculator | `/api/tools/sofa-calculator/execute` | `SofaCalculatorService` |
| Protocols / diagnosis / procedures pages | `/api/chat/message` | `ChatService` (no page-specific REST) |
| Clinical catalog tool list | `/api/tools`, `/api/tools/available` | `ToolOrchestratorService` |
| Analytics dashboard | `/api/analytics/metrics` | `AnalyticsService` |
| Segment-style events | `/api/analytics/events` | `AnalyticsService` |
| Audit logs page | `/api/audit/*` (intended) | `AuditService` — **path mismatch** |
| Notifications UI | `/api/notifications/*` | `NotificationService`, preferences, devices |
| Offline sync | `/api/tools/results`, `/api/notifications/.../read`, `/api/audit/sync` | mixed — several paths missing |
| Crash reporting | `/api/crashes` | analytics controller (console log) |
| Biometric | `/api/auth/biometric/*` | biometric module |
| System config (intended) | `/api/config/system`, `/api/ai/remaining-queries`, `/api/tools/available`, `/api/subscriptions/current` | App + AI + orchestrator + subscriptions — **configService client broken** |

---

## 8. Endpoint-to-frontend usage map

| Backend route (canonical) | Frontend caller | Status |
|---------------------------|-----------------|--------|
| POST `/api/auth/login` | `Auth.jsx` | OK |
| POST `/api/chat/message` | `clinicalChatService.js`, tool pages | OK |
| POST `/api/chat/intent-classify` | `advancedRecommendationService.js` | OK |
| POST `/api/tools/drug-interactions/execute` | `DrugChecker.jsx` | OK |
| POST `/api/tools/lab-interpreter/execute` | `LabInterpreter.jsx` | OK |
| POST `/api/tools/sofa-calculator/execute` | `Calculators.jsx` | OK |
| GET `/api/tools` | `clinicalToolsApi.js` | OK |
| GET `/api/users/profile` | `UserContext.jsx` | OK |
| GET `/api/analytics/metrics` | `AnalyticsDashboard.jsx` | OK |
| POST `/api/analytics/events` | `analyticsService.ts` | OK |
| POST `/api/crashes` | `ErrorBoundary.jsx` | OK |
| GET `/api/notifications` | `NotificationService.js` | OK |
| POST `/api/two-factor/*` | Two-factor pages | OK |
| GET `/api/audit/logs` | `AuditLogs.jsx` | **Calls wrong path** (see audit) |
| POST `/api/tools/share-results` | `ToolResultShare.jsx` | **No backend route** |
| POST `/api/team/*` | `TeamManagement.jsx` | **No backend module** |
| POST `/api/sync` | `OfflineSupport.jsx`, `offline.js` | **No backend route** |
| POST `/api/consent/record` | `ConsentFlow.jsx` | **No route** (use `/api/compliance/consent`) |
| GET `/api/consent/history` | `ConsentHistory.jsx` | **No route** |
| GET `/api/user/profile` | `syncService.js` | **Wrong path** (use `/api/users/profile`) |
| POST `/api/chat/messages` | `syncService.js` | **No route** |
| POST `/api/chat/conversations` | `syncService.js` | **No route** |
| GET `/api/clinical/alerts/*` | `clinicalAlertNotifications.js` | **No controller** |
| GET `/api/notifications/stream` | `NotificationService.js` | **No route** |
| GET `/config/system` (no `/api`) | `configService.js` | **Wrong client + path** |

---

## 9. Missing endpoint report (frontend → backend)

### Critical (user-facing features broken)

| Frontend call | Issue | Recommended fix |
|---------------|-------|-----------------|
| `GET /api/audit/logs` (+ verify, statistics, sync) | Backend registers `/api/api/audit/*` | Change `@Controller('api/audit')` → `@Controller('audit')` in `audit.controller.ts` |
| `POST /api/tools/share-results` | No handler | Add minimal controller method **or** remove/guard `ToolResultShare.jsx` |
| `GET/POST /api/team/*` | No team module | Implement team module **or** hide `/team` route and `TeamManagement.jsx` |
| `POST /api/sync` | No handler | Wire to existing sync/audit endpoints **or** stub 501 and disable offline UI |
| `POST /api/consent/record`, `GET /api/consent/history` | Wrong path | Point frontend to `/api/compliance/consent` (+ add history handler if needed) |
| `GET /api/user/profile` | Wrong path | Use `/api/users/profile` in `syncService.js` |
| `configService` axios paths | Missing `/api` prefix; wrong default import | Use `apiFetchJson('/api/config/system')` etc. |

### Medium (partial / dev-only)

| Frontend call | Issue | Recommended fix |
|---------------|-------|-----------------|
| `POST /api/chat/messages`, `/api/chat/conversations` | Not implemented | Add chat persistence API **or** remove from `syncService.js` |
| `GET /api/notifications/stream` | SSE not implemented | Remove stream client **or** add gateway |
| Clinical alerts API | UI exists, no backend | Implement alerts module **or** disable `ClinicalAlertsPage` actions |
| `ConsentFlow` auth header | Uses `authToken` vs `caredroid_access_token` | Align with `getStoredAccessToken()` |
| `OfflineSupport` sync | Uses `authToken` key | Same token key fix |

### Low (unused backend — not missing, but unreferenced)

- `/api/drugs`, `/api/protocols` CRUD
- `/api/ai/query`, `/api/ai/structured`
- `/api/chat/message-3d`, `/api/chat/suggest-action`
- `/api/tools/statistics`, `/api/tools/:id/validate`
- `/api/compliance/export`, `/api/compliance/delete-account`
- `/api/auth/me`, subscription checkout (except broken configService)

---

## 10. Validation and error-handling gap report

### Validation gaps

| Area | Gap | Risk |
|------|-----|------|
| Chat bodies | Inline types, no `class-validator` | Malformed payloads accepted |
| Audit queries | `query: any` | Injection / type coercion issues |
| Users PATCH | `updates: any` | Over-posting fields |
| Orchestrator | Strongest validation story | Good reference pattern |

### Error-handling gaps (frontend)

| Pattern | Where | Gap |
|---------|-------|-----|
| `parseApiResponse` + `response.ok` check | DrugChecker, LabInterpreter, Calculators (SOFA) | Good |
| `apiFetch` without `parseApiResponse` | Some tool pages (Protocols, Diagnosis) | HTML/JSON errors opaque |
| Silent catch + defaults | `configService.js`, `SystemConfigContext` | Masks API misconfiguration |
| `alert()` for validation | DrugChecker | Poor UX vs toast pattern |
| No shared 401 handler | Most services | Stale token → repeated failures |
| `TeamManagement`, `ConsentFlow`, `OfflineSupport` | Missing endpoints | Generic errors only |
| `ToolResultShare` | 404 on share-results | Likely unhandled failure |

### Error-handling gaps (backend)

| Area | Behavior | Note |
|------|----------|------|
| Chat unsupported tools | `NotFoundException` → AI fallback | Documented; not a structured 4xx to client |
| Orchestrator | `errorCode` in `ToolExecutionResponseDto` | Frontend `parseToolExecutionResponse` handles |
| Audit path bug | 404 | Frontend shows fetch errors |

---

## 11. Recommended fixes (priority order)

Prefer **wiring fixes** before new modules.

### P0 — Broken paths (small diffs)

1. **Audit controller:** `@Controller('audit')` (not `api/audit`).
2. **configService.js:** Use `apiFetchJson` with `/api/...` paths; fix token attachment.
3. **syncService.js:** `/api/users/profile` instead of `/api/user/profile`.
4. **Consent pages:** Map to `/api/compliance/consent` (GET/POST); add `GET .../history` on compliance if product needs history.
5. **Token keys:** Standardize on `caredroid_access_token` in ConsentFlow and OfflineSupport.

### P1 — Remove or guard phantom clients

6. **ToolResultShare:** Remove call or add `POST /api/tools/share-results` (thin wrapper storing share id).
7. **Team management:** Feature-flag `/team` route until API exists.
8. **Offline `/api/sync`:** Disable button or map to documented batch sync (tools/results + notifications only).

### P2 — Validation hardening (Nest conventions)

9. Add `class-validator` DTOs for `ChatMessageDto`, `IntentClassifyDto` in `chat/dto/`.
10. Add audit query DTO with `@IsOptional()` filters.

### P3 — Optional product APIs (only if required)

11. Clinical alerts controller (if `ClinicalAlertsPage` stays).
12. Notification SSE (`/api/notifications/stream`).
13. Chat conversation persistence for offline sync.

### Do not add (unless product mandate)

- New orchestrator executors for client-side calculators (see tool contract doc).
- Broad REST CRUD for drugs/protocols until UI uses them instead of chat-only pages.

---

## 12. Verification commands

```bash
# List routes (after backend build)
cd backend && npm run build && npm run start:prod
# Swagger UI: http://localhost:3000/api

# Frontend API grep
rg "apiFetch\\(|apiFetchJson\\(|apiAxios\\." src --glob "*.{js,jsx,ts}"

# Drift tests
npm run test:contract-matrix
npm run test:executor-mapping
npm run test:alias-sync
```

---

## 13. Unreferenced backend endpoints (summary)

Approximately **40+** registered routes have **no** `src/` reference, including: full drugs/protocols CRUD, most `/api/ai/*`, chat 3D/suggest-action, orchestrator validate/statistics/metadata, compliance export/delete, subscription checkout/portal, auth verify-email/me, notification devices list/read-all/unread, audit my-logs/phi-access (on wrong prefix today), metrics, biometric delete/available.

These are not bugs unless product expects them in UI—they are **backend-ready capacity** or admin-only surfaces.
