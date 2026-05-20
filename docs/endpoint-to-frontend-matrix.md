# Endpoint-to-frontend matrix

**Generated:** 2026-05-19T23:22:01.491Z

| Method | Path | Backend | Frontend client | Exposure |
|--------|------|---------|-----------------|----------|
| POST | `/api/chat/message` | ChatController | clinicalChatService.js | ✅ |
| POST | `/api/chat/intent-classify` | ChatController | advancedRecommendationService.js | ✅ |
| POST | `/api/chat/messages` | — | syncService.js | ⚠️ gated |
| POST | `/api/chat/conversations` | — | syncService.js | ⚠️ gated |
| GET | `/api/tools` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| GET | `/api/tools/available` | ToolOrchestratorController | clinicalToolsApi.js | ✅ |
| POST | `/api/tools/:id/execute` | ToolOrchestratorController | clinicalOrchestratorApi.js | ✅ |
| POST | `/api/tools/results` | ToolOrchestratorController | syncService.js | ✅ |
| POST | `/api/tools/share-results` | — | ToolResultShare.jsx | ⚠️ gated |
| GET | `/api/compliance/consent` | ComplianceController | complianceApi.js | ✅ |
| POST | `/api/compliance/consent` | ComplianceController | complianceApi.js | ✅ |
| GET | `/api/audit/logs` | AuditController | AuditLogs.jsx | ✅ |
| GET | `/api/audit/verify-integrity` | AuditController | AuditLogs.jsx | ✅ |
| GET | `/api/audit/statistics` | AuditController | AuditLogs.jsx | ✅ |
| POST | `/api/audit/sync` | AuditController | syncService.js | ✅ |
| GET | `/api/notifications` | NotificationController | NotificationService.js | ✅ |
| PATCH | `/api/notifications/:id/read` | NotificationController | NotificationService.js | ✅ |
| DELETE | `/api/notifications/:id` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/preferences` | NotificationController | NotificationService.js | ✅ |
| PATCH | `/api/notifications/preferences` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/devices/register` | NotificationController | NotificationService.js | ✅ |
| POST | `/api/notifications/test` | NotificationController | NotificationService.js | ✅ |
| GET | `/api/notifications/stream` | — | NotificationService.js | ⚠️ gated |
| POST | `/api/notifications/send/:channel` | — | notifications/NotificationService.js | ⚠️ gated |
| GET | `/api/team/users` | — | TeamManagement.jsx | ⚠️ gated |
| PUT | `/api/team/users/:id` | — | TeamManagement.jsx | ⚠️ gated |
| DELETE | `/api/team/users/:id` | — | TeamManagement.jsx | ⚠️ gated |
| POST | `/api/team/invite` | — | TeamManagement.jsx | ⚠️ gated |
| POST | `/api/sync` | — | offline.js / OfflineSupport.jsx | ⚠️ gated |
| POST | `/api/clinical/alerts/:id/acknowledge` | — | clinicalAlertNotifications.js | ⚠️ gated |
| POST | `/api/clinical/alerts/:id/dismiss` | — | clinicalAlertNotifications.js | ⚠️ gated |
| GET | `/api/clinical/alerts/stream` | — | clinicalAlertNotifications.js | ⚠️ gated |
| POST | `/api/exports/pdf` | — | export/ExportService.js | ⚠️ gated |
| POST | `/api/exports/excel` | — | export/ExportService.js | ⚠️ gated |
| POST | `/api/reports/generate` | — | export/ExportService.js | ⚠️ gated |
| GET | `/api/config/system` | AppController | configService.js | ✅ |
| GET | `/api/ai/remaining-queries` | AiController | configService.js | ✅ |
| GET | `/api/users/profile` | UsersController | UserContext.jsx / syncService.js | ✅ |
| GET | `/api/subscriptions/current` | SubscriptionsController | configService.js | ✅ |
| GET | `/api/subscriptions/plans` | SubscriptionsController | configService.js | ✅ |
| POST | `/api/auth/login` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/register` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/verify-2fa` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/magic-link` | AuthController | Auth.jsx | ✅ |
| POST | `/api/auth/dev-session` | AuthController | Auth.jsx | ✅ |
| GET | `/api/auth/biometric/config` | BiometricController | BiometricSetup.jsx | ✅ |
| POST | `/api/auth/biometric/enroll` | BiometricController | BiometricSetup.jsx | ✅ |
| GET | `/api/two-factor/generate` | TwoFactorController | TwoFactorSetup.jsx | ✅ |
| POST | `/api/two-factor/enable` | TwoFactorController | TwoFactorSetup.jsx | ✅ |
| GET | `/api/two-factor/status` | TwoFactorController | TwoFactorSettings.jsx | ✅ |
| DELETE | `/api/two-factor/disable` | TwoFactorController | TwoFactorSettings.jsx | ✅ |
| POST | `/api/crashes` | AnalyticsController | ErrorBoundary.jsx | ✅ |
| POST | `/api/analytics/events` | AnalyticsController | analyticsService.ts | ✅ |

## Backend route inventory (reference)

- `GET /health`
- `GET /api/config/system`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/dev-session`
- `POST /api/auth/verify-2fa`
- `GET /api/auth/verify-email`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`
- `GET /api/auth/linkedin`
- `GET /api/auth/linkedin/callback`
- `POST /api/auth/magic-link`
- `GET /api/auth/oidc`
- `GET /api/auth/saml`
- `GET /api/auth/me`
- `POST /api/auth/biometric/enroll`
- `POST /api/auth/biometric/verify`
- `GET /api/auth/biometric/config`
- `GET /api/auth/biometric/stats`
- `DELETE /api/auth/biometric/disable/:deviceId`

_…and 72 more in src/data/backendHttpRouteInventory.js_

