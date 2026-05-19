# Backend exposure report

**Generated:** 2026-05-19  
**Scope:** `backend/src/modules`, medical-control-plane orchestrator, frontend API clients, `clinicalCatalogWiring.js`  
**Related:** [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md) (per-tool matrix), [tool-visibility-matrix.md](./tool-visibility-matrix.md)

---

## Executive summary

| Layer | Count | Frontend-reachable |
|-------|------:|-------------------|
| Nest HTTP controllers | 17 | ~85% of routes have at least one caller |
| Registered tool executors | 3 | 3 (100% of executors) |
| NLU intent patterns (`tool.patterns.ts`) | 40 | 40 via chat/classify + catalog launch (not POST execute) |
| Medical-control-plane services without HTTP | 4 modules | Indirect via chat/orchestrator only |
| Frontend API paths with **no** backend route | 14+ | Broken or stubbed |
| Backend routes with **no** frontend client | 25+ | Backend-only / catalog-only |

**Clinical tools:** Only `sofa-calculator`, `drug-interactions`, and `lab-interpreter` have POST executors. The other 37 NLU pattern ids are intentionally **chat- and UI-routed** (`NLU_TOOL_IDS_WITHOUT_EXECUTOR` in `tool-orchestrator.registry.ts`). Frontend `clinicalCatalogWiring.js` aligns via `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` (3 entries) and `resolveOrchestratorToolForLaunch` (guards non-executors).

---

## 1. Backend controllers and routes

Global prefix: `/api` (except `GET /health`, `GET /` SPA). Source: `backend/src/main.ts`.

| Controller | Base path | Route count (approx.) | Primary frontend client |
|------------|-----------|----------------------|-------------------------|
| `AppController` | `/`, `/health`, `/api/config/system` | 4 | `configService.js`, SPA |
| `AuthController` | `/api/auth/*` | 13 | `Auth.jsx` |
| `BiometricController` | `/api/auth/biometric/*` | 7 | `BiometricSetup.jsx` |
| `UsersController` | `/api/users/*` | 2 | `UserContext.jsx`, `syncService.js` |
| `TwoFactorController` | `/api/two-factor/*` | 5 | `TwoFactorSetup.jsx`, `TwoFactorSettings.jsx` |
| `SubscriptionsController` | `/api/subscriptions/*` | 6 | `configService.js` |
| `AiController` | `/api/ai/*` | 4 | **None** (catalog/docs only) |
| `DrugController` | `/api/drugs/*` | 6 | **None** (REST CRUD unused by UI) |
| `ProtocolController` | `/api/protocols/*` | 6 | **None** (Protocols UI uses chat) |
| `ComplianceController` | `/api/compliance/*` | 4 | **Partial** (see consent mismatch) |
| `AuditController` | `/api/audit/*` | 6 | `AuditLogs.jsx`, `syncService.js` |
| `ChatController` | `/api/chat/*` | 5 | `clinicalChatService.js`, clinical pages |
| `ToolOrchestratorController` | `/api/tools/*` | 9 | `clinicalOrchestratorApi.js`, `clinicalToolsApi.js`, `syncService.js` |
| `AnalyticsController` | `/api/analytics/*`, `/api/crashes`, `POST /api/health` | 4 | `analyticsService.ts`, `AnalyticsDashboard.jsx`, `ErrorBoundary.jsx` |
| `NotificationController` | `/api/notifications/*` | 12 | `NotificationService.js` |
| `MetricsController` | `/api/metrics` | 1 | **None** (Prometheus scrape) |

**Modules with no HTTP controller:** `rag`, `encryption`, `cache`, `email`, `intent-classifier` (service only), `emergency-escalation` (service only).

---

## 2. Backend tool executors

**Registry file:** `backend/src/modules/medical-control-plane/tool-orchestrator/tool-orchestrator.registry.ts`  
**Runtime registration:** `ToolOrchestratorService.initializeRegistry()` → `registerTool()`

| Executor tool ID | Service class | Registry ID | Frontend POST caller |
|------------------|---------------|-------------|----------------------|
| `sofa-calculator` | `SofaCalculatorService` | `sofa-score` | `Calculators.jsx` → `clinicalOrchestratorApi.js` |
| `drug-interactions` | `DrugCheckerService` | `drug-check` | `DrugChecker.jsx` |
| `lab-interpreter` | `LabInterpreterService` | `lab-interp` | `LabInterpreter.jsx` |

**Alias:** `drug-interaction-checker` → `drug-interactions`

**37 NLU ids without executor** (documented in `NLU_TOOL_IDS_WITHOUT_EXECUTOR`): all other `tool.patterns.ts` toolIds including `dispatch-ai`, calculators, fleet tools, protocols-as-NLU, etc.

---

## 3. Backend intent patterns

**File:** `backend/.../intent-classifier/patterns/tool.patterns.ts`  
**Count:** 40 (`CLINICAL_TOOL_PATTERNS`)

Categories: 29 calculators, 1 checker, 2 interpreters, 3 protocols, 2 reference, 3 fleet (+ `dispatch-ai` fleet).

**Related (non-tool):**

- `emergency.patterns.ts` — 18 emergency patterns (no separate toolId launch)
- `clinical.patterns.ts` — 10 clinical query patterns

**Parity:** `clinicalToolAliasSync.test.js` enforces frontend `clinicalIntentTools` ↔ backend patterns ↔ `NLU_PROFILE_TOOL_IDS` (40/40).

---

## 4. Orchestrator & catalog wiring (frontend)

| Contract export | Location | Role |
|-----------------|----------|------|
| `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` | `clinicalToolIdContract.js` | Only 3 POST-executable NLU ids |
| `REGISTRY_ID_TO_ORCHESTRATOR_TOOL` | same | Maps `drug-check`, `lab-interp`, `sofa-score` |
| `resolveOrchestratorToolForLaunch` | `clinicalCatalogWiring.js` | Sets `orchestratorTool` on launch only when POST-safe |
| `resolveCatalogLaunch` | `clinicalCatalogWiring.js` | SPA routes + `chatSeed` (no HTTP) |
| `isOrchestratorPostExecutable` | `unsupportedOrchestratorTools.js` | Blocks client POST for non-registered ids |

**Note:** `dispatch-ai` has `backendExecutable: true` in `clinicalIntentToolCatalog.js` but is **not** in `ORCHESTRATOR_REGISTERED_NLU_TOOL_IDS` — chat-only; catalog badge can mislead (low-severity gap in `getContractGaps()`).

---

## 5. Frontend → backend gaps (calls without routes)

Paths referenced in `src/` with **no matching Nest controller route**:

| Method | Frontend path | Caller | Recommendation |
|--------|---------------|--------|----------------|
| POST | `/api/tools/share-results` | `ToolResultShare.jsx` | **Expose** in `ToolOrchestratorController` or **remove/guard** UI |
| GET | `/api/team/users` | `TeamManagement.jsx` | **Implement** team module or **hide** team pages |
| POST | `/api/team/invite` | same | same |
| PUT/PATCH/DELETE | `/api/team/users/:id` | same | same |
| POST | `/api/consent/record` | `ConsentFlow.jsx` | **Fix client** → `POST /api/compliance/consent` |
| GET | `/api/consent/history` | `ConsentHistory.jsx` | **Add** compliance history endpoint or **stub UI** |
| POST | `/api/sync` | `offline.js`, `OfflineSupport.jsx` | **Implement** sync aggregator or **route** to existing `audit/sync` + `tools/results` |
| POST | `/api/chat/messages` | `syncService.js` | **Add** chat persistence API or **disable** offline chat sync |
| POST | `/api/chat/conversations` | `syncService.js` | same |
| GET | `/api/notifications/stream` | `NotificationService.js` | **Add** SSE/WebSocket or **remove** stream URL builder |
| POST | `/api/clinical/alerts/:id/acknowledge` | `clinicalAlertNotifications.js` | **Implement** alerts module or **client-only** alerts |
| POST | `/api/clinical/alerts/:id/dismiss` | same | same |
| POST | `/api/exports/pdf`, `/api/exports/excel` | `export/ExportService.js` | **Remain client-side** export or **add** export module |
| POST | `/api/reports/generate`, `/api/reports/schedule` | same | **Document as planned** or implement |
| POST | `/api/notifications/send/:channel` | `notifications/NotificationService.js` | **Admin-only backend** or remove from cost dashboard |

---

## 6. Backend → frontend gaps (orphaned exposure)

See [orphaned-backend-functions.md](./orphaned-backend-functions.md) for the full function-level list.

**High-value backend-only routes (candidates for frontend clients):**

| Route | Capability | Recommendation |
|-------|------------|----------------|
| `POST /api/chat/analyze-vitals` | Vitals interpretation | **Surface** in vitals UI or merge into chat |
| `POST /api/chat/suggest-action` | Next-action suggestions | **Surface** in Dashboard context panel |
| `POST /api/ai/query`, `/api/ai/structured` | Direct GPT | **Remain backend-only** (chat wraps AI) or admin tools |
| `GET/POST /api/drugs`, `/api/protocols` | Clinical content CRUD | **Surface** in Protocols/Drug admin or **remain** seed-only |
| `POST /api/tools/:id/validate` | Pre-flight executor validation | **Optional client** before POST execute |
| `POST /api/tools/execute` | Generic execute body | **Remain backend-only** (prefer `:id/execute`) |
| `GET /api/tools/catalog/executors` | Executor metadata | **Wire** to catalog executor panel (partially via `GET /api/tools`) |
| `GET /api/tools/statistics` | Usage stats | **Surface** in analytics/admin |
| `GET /api/tools/:id` | Tool metadata | **Wire** to catalog detail drawer |
| `POST /api/compliance/export` | GDPR export | **Surface** in settings/legal |
| `GET /api/audit/my-logs` | User-scoped audit | **Surface** in profile |
| Auth OIDC/SAML placeholders | SSO | **Document** as placeholder until IdP wired |

**Correctly backend-only (no UI needed):**

- `GET /api/metrics` — Prometheus
- `POST /api/subscriptions/webhook` — Stripe
- RAG / encryption / email services — internal to `ChatService`
- `EmergencyEscalationService` — invoked from chat pipeline only

---

## 7. Missing API clients

| Backend capability | Suggested client location | Priority |
|--------------------|---------------------------|----------|
| `POST /api/tools/:id/validate` | `clinicalOrchestratorApi.js` | Low |
| `GET /api/tools/:id` | `clinicalToolsApi.js` | Medium |
| `GET /api/tools/catalog/executors` | `clinicalToolsApi.js` | Medium |
| `GET /api/tools/statistics` | New `clinicalToolsAdminApi.js` or analytics | Low |
| `POST /api/chat/analyze-vitals` | `clinicalChatService.js` | Medium |
| `POST /api/chat/suggest-action` | `clinicalChatService.js` | Medium |
| `POST /api/compliance/export` | `complianceApi.js` | Medium |
| `GET/POST /api/compliance/consent` | Fix `ConsentFlow.jsx` (wrong path today) | **High** |
| `GET/POST /api/drugs`, `/api/protocols` | Optional `clinicalContentApi.js` | Low |

**Existing clients (complete for current UI):** `apiClient.js`, `clinicalOrchestratorApi.js`, `clinicalToolsApi.js`, `clinicalChatService.js`, `configService.js`, `syncService.js` (partial paths broken), `analyticsService.ts`, `NotificationService.js`.

---

## 8. Missing DTO validation

Global `ValidationPipe` is enabled; only DTOs with `class-validator` decorators are enforced.

| Area | Validated | Not validated |
|------|-----------|---------------|
| Auth register/login | Yes | `verifyTwoFactor` inline body |
| 2FA, subscriptions checkout | Yes | Portal `{ returnUrl }` |
| AI query | Yes | — |
| Clinical drugs/protocols | Yes | — |
| Compliance | Yes | — |
| **Tool orchestrator** | **No** | `ExecuteToolDto`, `ToolExecutionResponseDto` |
| **Chat** | **No** | `ChatMessageDto`, `IntentClassifyDto`, 3D variants |
| **Intent classifier** | **No** | Interfaces only (`IntentClassification`, etc.) |
| **Notifications** | **No** | Inline bodies in controller |
| **Biometric** | **No** | DTOs in service file, not validated classes |
| Analytics/crashes | **No** | Inline DTO classes without decorators |

**Recommendation:** Add `class-validator` to `ExecuteToolDto` and `ChatMessageDto` first (highest traffic, PHI-adjacent).

---

## 9. Per-item recommendations (summary)

| Item | Verdict |
|------|---------|
| 37 NLU tools without executor | **Remain backend-only** executors; **surface in catalog** (done) + chat seeds |
| 3 POST executors | **Keep exposed**; frontend wired |
| `POST /api/tools/share-results` | **Expose** or **remove** UI call |
| Team APIs | **Implement** or **remove** `TeamManagement.jsx` |
| Consent paths | **Fix frontend** to `/api/compliance/consent` |
| Offline `/api/sync`, chat sync | **Implement** or **disable** with clear UX |
| Export/report APIs | **Document unused**; client-side export until backend exists |
| Clinical alerts API | **Remove** fetch stubs or **implement** module |
| Chat analyze-vitals / suggest-action | **Expose** through orchestrator UX or Dashboard |
| Drugs/protocols REST | **Remain** for admin/seeding unless Protocols page migrates off chat-only |
| Dispatch-ai executor flag | **Set `backendExecutable: false`** or relabel catalog |
| Registry-only `procedures` | **Add NLU row** + pattern or document registry-only |
| Metrics, webhooks, RAG | **Remain backend-only** |

---

## Regeneration

```bash
# Per-tool contract matrix (40 NLU + registry + gaps)
npm run contract:write-docs

# NLU launch parity
npx vitest run src/data/nluLaunchPaths.test.js src/data/clinicalToolAliasSync.test.js

# Contract gap tests
npx vitest run src/data/backendFrontendToolContract.test.js
```
