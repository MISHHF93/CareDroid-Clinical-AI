# Orphaned backend functions

**Generated:** 2026-05-20T20:48:44.998Z

> Regenerate: `npm run exposure:write-docs`

Every backend HTTP route is either **wired** to a frontend client or listed below with an exposure strategy. Gated frontend calls (no Nest route) are tracked in section D.

## A. Backend-only (correct)

| Route | Controller | Reason |
|-------|------------|--------|
| `/health` | AppController | Ops / load balancer probe |
| `/api/auth/verify-email` | AuthController | Email link callback |
| `/api/auth/google` | AuthController | OAuth redirect |
| `/api/auth/google/callback` | AuthController | OAuth callback |
| `/api/auth/linkedin` | AuthController | OAuth redirect |
| `/api/auth/linkedin/callback` | AuthController | OAuth callback |
| `/api/two-factor/verify` | TwoFactorController | Used during login challenge |
| `/api/subscriptions/webhook` | SubscriptionsController | Stripe webhook |
| `/api/health` | AnalyticsController | Client health ping (distinct from GET /health) |
| `/api/ai/query` | AiController | Invoked via chat pipeline |
| `/api/ai/structured` | AiController | Invoked via chat pipeline |
| `/api/metrics` | MetricsController | Prometheus scrape |

### Internal services (no HTTP)

| Symbol | Module | Reason |
|--------|--------|--------|
| `RagService` | `modules/rag` | Chat retrieval |
| `EncryptionService` | `modules/encryption` | At-rest crypto |
| `CacheService` | `modules/cache` | Redis layer |
| `EmailService` | `modules/email` | Transactional mail |
| `EmergencyEscalationService` | `emergency-escalation` | Chat pipeline |
| `IntentClassifierService` | `intent-classifier` | Via POST /api/chat/* |
| `ToolOrchestratorService.executeInChat` | `tool-orchestrator` | ChatService internal |

## B. Expose through SPA (recommended)

| Route | Controller | Client hint |
|-------|------------|-------------|
| `/api/auth/biometric/delete/:deviceId` | BiometricController | BiometricSetup.jsx |
| `/api/auth/biometric/available` | BiometricController | BiometricSetup.jsx |
| `/api/users/profile` | UsersController | UserContext.jsx |
| `/api/subscriptions/create-checkout` | SubscriptionsController | configService / settings |
| `/api/subscriptions/portal` | SubscriptionsController | configService / settings |
| `/api/chat/suggest-action` | ChatController | clinicalChatService.js |
| `/api/chat/analyze-vitals` | ChatController | clinicalChatService.js |
| `/api/drugs/categories` | DrugController | clinicalContentApi.js |
| `/api/drugs/:id` | DrugController | clinicalContentApi.js |
| `/api/protocols/:id` | ProtocolController | Protocols.jsx |
| `/api/audit/my-logs` | AuditController | profile / AuditLogs.jsx |
| `/api/compliance/export` | ComplianceController | complianceApi.js |
| `/api/compliance/delete-account` | ComplianceController | complianceApi.js |
| `/api/notifications/preferences/toggle-all` | NotificationController | NotificationService.js |
| `/api/notifications/unread/count` | NotificationController | NotificationService.js |
| `/api/notifications/read-all` | NotificationController | NotificationService.js |

## C. Deferred / admin / SSO

| Route | Controller | Reason |
|-------|------------|--------|
| `/api/auth/oidc` | AuthController | SSO placeholder |
| `/api/auth/saml` | AuthController | SSO placeholder |
| `/api/auth/me` | AuthController | JWT introspection; SPA uses profile |
| `/api/subscriptions/config` | SubscriptionsController | Stripe config for checkout UI |
| `/api/chat/message-3d` | ChatController | 3D avatar experiment |
| `/api/tools/execute` | ToolOrchestratorController | Batch execute; UI uses per-id execute |
| `/api/drugs` | DrugController | Admin content API |
| `/api/drugs/:id` | DrugController | Admin content API |
| `/api/drugs/:id` | DrugController | Admin content API |
| `/api/protocols` | ProtocolController | Admin content API |
| `/api/protocols/:id` | ProtocolController | Admin content API |
| `/api/protocols/:id` | ProtocolController | Admin content API |
| `/api/audit/phi-access` | AuditController | Compliance officer view |
| `/api/notifications/devices` | NotificationController | Device list admin |
| `/api/notifications/devices/:token` | NotificationController | Unregister device |
| `/api/ai/usage` | AiController | Usage meter UI |

## D. Frontend calls without backend (gated)

| ID | Method | Path | Capability | Client |
|----|--------|------|------------|--------|
| chat-messages-sync | POST | `/api/chat/messages` | chatPersistence | syncService.js |
| chat-conversations-sync | POST | `/api/chat/conversations` | chatPersistence | syncService.js |
| tools-share-results | POST | `/api/tools/share-results` | toolsShareResults | ToolResultShare.jsx |
| notifications-stream | GET | `/api/notifications/stream` | notificationStream | NotificationService.js |
| notifications-send-channel | POST | `/api/notifications/send/:channel` | notificationSendChannel | notifications/NotificationService.js |
| team-users | GET | `/api/team/users` | teamManagement | TeamManagement.jsx |
| team-user-update | PUT | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-user-delete | DELETE | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-invite | POST | `/api/team/invite` | teamManagement | TeamManagement.jsx |
| bulk-sync | POST | `/api/sync` | bulkSync | offline.js / OfflineSupport.jsx |
| clinical-alerts-ack | POST | `/api/clinical/alerts/:id/acknowledge` | clinicalAlerts | clinicalAlertNotifications.js |
| clinical-alerts-dismiss | POST | `/api/clinical/alerts/:id/dismiss` | clinicalAlerts | clinicalAlertNotifications.js |
| clinical-alerts-stream | GET | `/api/clinical/alerts/stream` | clinicalAlerts | clinicalAlertNotifications.js |
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## E. POST executors

Registered: `sofa-calculator`, `drug-interactions`, `lab-interpreter`

NLU profiles without POST executor (51): client-side / chat only.

## F. Exposure strategy summary

| Tier | Action |
|------|--------|
| P0 | Keep capability gates on phantom frontend paths until Nest implements or UI removed |
| P1 | Wire `clinicalToolsApi` → validate, catalog/executors, statistics |
| P1 | Wire `complianceApi` → export + delete-account |
| P2 | Protocol/drug GET clients for reference pages |
| P3 | Chat suggest-action / analyze-vitals on dashboard |

## Quick counts

| Category | Count |
|----------|------:|
| Backend HTTP routes | 62 |
| Wired frontend → backend | see exposure report |
| Backend-only / deferred (policy) | 44 |
| Gated frontend (no route) | 18 |
| POST executors | 3 |

