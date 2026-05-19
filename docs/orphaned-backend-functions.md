# Orphaned backend functions

**Generated:** 2026-05-19  

Functions, services, and HTTP handlers that exist in the backend but have **no direct frontend API client** or **no UI trigger**. Grouped by recommendation.

---

## A. Remain backend-only (correct)

| Symbol | Module | Reason |
|--------|--------|--------|
| `RagService.*` | `modules/rag` | Internal retrieval for chat |
| `EncryptionService.*` | `modules/encryption` | At-rest / field crypto |
| `CacheService.*` | `modules/cache` | Redis layer |
| `EmailService.*` | `modules/email` | Transactional mail |
| `EmergencyEscalationService.escalate` | `emergency-escalation` | Chat pipeline only |
| `IntentClassifierService.classify` | `intent-classifier` | Only via chat HTTP |
| `matchToolPatterns`, `getToolPattern` | `tool.patterns.ts` | Classifier internals |
| `detectEmergencyKeywords` | `emergency.patterns.ts` | Classifier internals |
| `ToolOrchestratorService.executeInChat` | `tool-orchestrator` | Called from `ChatService`, not standalone HTTP from UI |
| `ToolOrchestratorService.getToolsBySubscriptionTier` | `tool-orchestrator` | Tier gating server-side |
| `POST /api/subscriptions/webhook` | subscriptions | Stripe |
| `GET /api/metrics` | metrics | Prometheus scrape |
| `GET /api/auth/me` | auth | Optional; JWT introspection unused by SPA |
| Auth `oidcLogin`, `samlLogin` | auth | Placeholder SSO |

---

## B. Expose through orchestrator / catalog (recommended)

| Symbol | HTTP route (if any) | Recommendation |
|--------|---------------------|----------------|
| `ToolOrchestratorService.validateToolExecution` | `POST /api/tools/:id/validate` | Add `validateClinicalTool()` in `clinicalOrchestratorApi.js`; call before execute |
| `ToolOrchestratorService.getToolMetadata` | `GET /api/tools/:id` | Catalog detail / executor schema panel |
| `ToolOrchestratorService.getExecutorCatalog` | `GET /api/tools/catalog/executors` | Replace or augment `GET /api/tools` in catalog UI |
| `ToolOrchestratorService.getToolStatistics` | `GET /api/tools/statistics` | Analytics dashboard widget |
| `ChatService.suggestNextAction` | `POST /api/chat/suggest-action` | Dashboard “suggested next step” card |
| `ChatService.analyzeVitals` | `POST /api/chat/analyze-vitals` | Vitals form or ICU widgets |
| `AiController.query`, `generateStructured` | `POST /api/ai/*` | Keep internal unless building admin/debug console |
| `ComplianceController.exportData` | `POST /api/compliance/export` | Settings → “Download my data” |
| `AuditController.getMyLogs` | `GET /api/audit/my-logs` | User profile → activity |

---

## C. Surface in catalog / SPA only (no new executor)

These NLU ids have patterns + `clinicalIntentTools` but **no** `registerTool()` — launch is already via `resolveCatalogLaunch` / chat:

`qsofa`, `news2`, `child-pugh`, `has-bled`, `meld`, `meld-na`, `timi-ua-nstemi`, `ascvd-risk`, `ckd-staging`, `stop-bang`, `audit-c`, `phq9`, `gad7`, `apache2-calculator`, `cha2ds2vasc-calculator`, `curb65-calculator`, `gcs-calculator`, `wells-dvt-calculator`, `wells-pe`, `perc`, `grace-acs`, `nihss`, `canadian-c-spine`, `ottawa-ankle`, `copd-gold`, `rome-iv-ibs`, `dose-calculator`, `abg-interpreter`, `protocol-lookup`, `acls-protocol`, `atls-protocol`, `route-optimizer`, `predictive-maintenance`, `fleet-command`, `differential-diagnosis`, `antibiotic-guide`, `dispatch-ai`.

**Recommendation:** **Remain** without POST executors; optional future executors only where deterministic server-side logic exists.

---

## D. Implement backend or remove frontend (broken)

| Frontend caller | Missing backend | Action |
|-----------------|-----------------|--------|
| `ToolResultShare.jsx` | `POST /api/tools/share-results` | Implement or guard UI |
| `TeamManagement.jsx` | `/api/team/*` | Implement module or remove page |
| `ConsentFlow.jsx` | `/api/consent/record` | Redirect to `/api/compliance/consent` |
| `ConsentHistory.jsx` | `/api/consent/history` | Add GET history or remove page |
| `offline.js`, `OfflineSupport.jsx` | `POST /api/sync` | Implement bulk sync or disable |
| `syncService.js` | `POST /api/chat/messages`, `/conversations` | Implement or stop queueing |
| `NotificationService.buildStreamUrl` | `GET /api/notifications/stream` | SSE endpoint or remove |
| `notifications/NotificationService.js` | `POST /api/notifications/send/:channel` | Admin API or remove |
| `clinicalAlertNotifications.js` | `/api/clinical/alerts/*` | Module or client-only |
| `export/ExportService.js` | `/api/exports/*`, `/api/reports/*` | Client-side export until backend |

---

## E. Frontend mappings to nonexistent backend tools

| Frontend reference | Issue | Fix |
|--------------------|-------|-----|
| `POST /api/tools/share-results` | No controller method | See D |
| `procedures` registry id | No NLU profile / pattern | Add to `clinicalIntentToolCatalog.js` + `tool.patterns.ts` or mark registry-only in catalog |
| `dispatch-ai` `backendExecutable: true` | No POST executor | Set `false` or relabel catalog badge |
| Phantom ids in `phantomToolReferences` | Cost tracking / roadmap only | **Document** as non-shipped (`abc-assessment`, etc.) |
| `ORCHESTRATOR_TO_REGISTRY_ID` for non-executors | Not a bug — maps to UI registry | No POST expected |

---

## F. Missing DTO validation (orphaned safety)

Classes exist but are **not enforced** at HTTP boundary:

- `ExecuteToolDto`, `ToolExecutionResponseDto` — `tool-execution.dto.ts`
- `ChatMessageDto`, `IntentClassifyDto` — `chat.controller.ts`
- `ClassifyIntentDto`, `IntentClassificationResultDto` — intent-classifier DTO file
- Notification controller bodies
- Biometric DTOs in service file
- Analytics event DTOs

**Recommendation:** Add `class-validator` decorators; highest priority: **ExecuteToolDto** and **ChatMessageDto**.

---

## G. Missing API client modules (backend exists, no `src/services/*` wrapper)

| Endpoint group | Suggested module |
|----------------|------------------|
| `/api/compliance/*` | `complianceApi.js` |
| `/api/drugs`, `/api/protocols` | `clinicalContentApi.js` (optional) |
| `/api/tools/:id`, `/validate`, `/catalog/executors`, `/statistics` | extend `clinicalToolsApi.js` |
| `/api/chat/suggest-action`, `/analyze-vitals` | extend `clinicalChatService.js` |

---

## Quick counts

| Category | Count |
|----------|------:|
| Registered executors (fully wired) | 3 |
| NLU patterns without executor | 37 |
| Backend HTTP routes without frontend caller | ~25 |
| Frontend paths without backend route | 14+ |
| Unvalidated HTTP DTO classes | 10+ |
