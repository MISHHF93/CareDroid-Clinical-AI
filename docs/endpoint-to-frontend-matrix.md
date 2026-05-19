# Endpoint-to-frontend matrix

**Generated:** 2026-05-19  
**Legend:** ✅ wired · ⚠️ partial/mismatch · ❌ frontend calls missing backend · 🔒 backend-only (no frontend)

---

## Medical control plane & clinical chat

| Method | Endpoint | Backend handler | Frontend client | Status |
|--------|----------|-----------------|-----------------|--------|
| POST | `/api/chat/message` | `ChatController.sendMessage` | `clinicalChatService.js`, Dashboard, Protocols, Diagnosis, ProcedureGuide | ✅ |
| POST | `/api/chat/intent-classify` | `ChatController.classifyIntent` | `advancedRecommendationService.js` | ✅ |
| POST | `/api/chat/suggest-action` | `ChatController.suggestAction` | — (catalog discovery only) | 🔒 |
| POST | `/api/chat/analyze-vitals` | `ChatController.analyzeVitals` | — (catalog discovery only) | 🔒 |
| POST | `/api/chat/message-3d` | `ChatController.sendMessage3D` | — | 🔒 |
| POST | `/api/chat/messages` | — | `syncService.js` | ❌ |
| POST | `/api/chat/conversations` | — | `syncService.js` | ❌ |
| GET | `/api/tools` | `ToolOrchestratorController.listTools` | `clinicalToolsApi.js`, `configService.js` | ✅ |
| GET | `/api/tools/available` | `getAvailableTools` | `clinicalToolsApi.js`, `configService.js` | ✅ |
| GET | `/api/tools/:id` | `getToolMetadata` | — | 🔒 |
| GET | `/api/tools/catalog/executors` | `getExecutorCatalog` | — | 🔒 |
| GET | `/api/tools/statistics` | `getStatistics` | — | 🔒 |
| POST | `/api/tools/:id/validate` | `validateTool` | — | 🔒 |
| POST | `/api/tools/:id/execute` | `executeTool` | `clinicalOrchestratorApi.js`, DrugChecker, LabInterpreter, Calculators (SOFA) | ✅ (3 ids) |
| POST | `/api/tools/execute` | `executeToolGeneric` | — | 🔒 |
| POST | `/api/tools/results` | `recordToolResult` | `syncService.js` | ✅ |
| POST | `/api/tools/share-results` | — | `ToolResultShare.jsx` | ❌ |

### Executor POST detail (only these ids succeed)

| NLU / executor id | Registry id | UI |
|-------------------|-------------|-----|
| `sofa-calculator` | `sofa-score` | `Calculators.jsx` |
| `drug-interactions` | `drug-check` | `DrugChecker.jsx` |
| `lab-interpreter` | `lab-interp` | `LabInterpreter.jsx` |

### NLU patterns → frontend (no POST execute)

All 40 `tool.patterns.ts` toolIds → `resolveCatalogLaunch` + chat via Tier A/B/C paths. See [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md).

---

## Auth, users, security

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| POST | `/api/auth/register`, `/login`, `/dev-session`, `/verify-2fa`, `/magic-link` | `Auth.jsx` | ✅ |
| GET | `/api/auth/google`, `/linkedin`, callbacks | `Auth.jsx` | ✅ |
| GET | `/api/auth/oidc`, `/saml` | `Auth.jsx` (placeholder ping) | ⚠️ placeholder |
| GET | `/api/auth/me` | — | 🔒 |
| POST/GET/DELETE | `/api/auth/biometric/*` | `BiometricSetup.jsx` | ✅ |
| GET/PATCH | `/api/users/profile` | `UserContext.jsx`, `syncService.js` | ✅ |
| GET/POST/DELETE | `/api/two-factor/*` | `TwoFactorSetup.jsx`, `TwoFactorSettings.jsx` | ✅ |

---

## Compliance, consent, audit

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| POST | `/api/compliance/export` | — | 🔒 |
| DELETE | `/api/compliance/delete-account` | — | 🔒 |
| GET/POST | `/api/compliance/consent` | — | 🔒 |
| POST | `/api/consent/record` | `ConsentFlow.jsx` | ❌ wrong path |
| GET | `/api/consent/history` | `ConsentHistory.jsx` | ❌ |
| GET | `/api/audit/logs`, `/verify-integrity`, `/statistics` | `AuditLogs.jsx` | ✅ |
| GET | `/api/audit/my-logs` | — | 🔒 |
| POST | `/api/audit/sync` | `syncService.js` | ✅ |

---

## Subscriptions, AI, config

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| GET | `/api/config/system` | `configService.js` | ✅ |
| GET | `/api/subscriptions/plans`, `/current` | `configService.js` | ✅ |
| POST | `/api/subscriptions/create-checkout`, `/portal` | — | 🔒 |
| POST | `/api/subscriptions/webhook` | Stripe | 🔒 |
| POST | `/api/ai/query`, `/structured` | — | 🔒 |
| GET | `/api/ai/usage`, `/remaining-queries` | `configService.js` (remaining-queries) | ⚠️ partial |

---

## Notifications, analytics, metrics

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| POST | `/api/notifications/devices/register` | `NotificationService.js` | ✅ |
| GET/PATCH/DELETE | `/api/notifications/*` | `NotificationService.js`, `syncService.js` | ✅ |
| GET | `/api/notifications/stream` | `NotificationService.buildStreamUrl` | ❌ |
| POST | `/api/notifications/send/:channel` | `notifications/NotificationService.js` | ❌ |
| POST | `/api/analytics/events` | `analyticsService.ts` | ✅ |
| GET | `/api/analytics/metrics` | `AnalyticsDashboard.jsx` | ✅ |
| POST | `/api/crashes` | `ErrorBoundary.jsx` | ✅ |
| POST | `/api/health` (analytics module) | — | 🔒 |
| GET | `/api/metrics` | — | 🔒 (Prometheus) |

---

## Clinical content REST

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| GET/POST/PUT/DELETE | `/api/drugs/*` | — | 🔒 |
| GET/POST/PUT/DELETE | `/api/protocols/*` | — (Protocols uses chat) | 🔒 |

---

## Team, sync, alerts, export (frontend-only paths)

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| GET/POST/PUT/DELETE | `/api/team/*` | `TeamManagement.jsx` | ❌ |
| POST | `/api/sync` | `offline.js`, `OfflineSupport.jsx` | ❌ |
| POST | `/api/clinical/alerts/:id/*` | `clinicalAlertNotifications.js` | ❌ |
| POST | `/api/exports/*`, `/api/reports/*` | `export/ExportService.js` | ❌ |

---

## SPA & health

| Method | Endpoint | Frontend | Status |
|--------|----------|----------|--------|
| GET | `/health` | — | 🔒 |
| GET | `/`, `/api/*` (SPA) | React router | ✅ |

---

## Internal services (no HTTP; reached via chat/orchestrator)

| Service | Called from | Frontend trigger |
|---------|-------------|------------------|
| `IntentClassifierService.classify` | `ChatService` | `POST /api/chat/message`, `/intent-classify` |
| `ToolOrchestratorService.executeInChat` | `ChatService` | Chat with `tool` param |
| `EmergencyEscalationService.escalate` | `ChatService` | Emergency keyword match in message |
| `RagService` | `ChatService` | Embedded in chat response |
| `SofaCalculatorService`, `DrugCheckerService`, `LabInterpreterService` | Orchestrator | POST execute or chat |
