# Backend exposure report

**Generated:** 2026-07-09T00:27:17.257Z

> Regenerate: `npm run exposure:write-docs`

## Executive summary

| Metric | Count |
|--------|------:|
| Backend HTTP routes (inventory) | 568 |
| Frontend API calls (inventory) | 343 |
| Wired (route exists) | 307 |
| Gated stubs (no route, capability off) | 36 |
| Unguarded missing routes | 0 |
| POST executors (backend) | 3 |
| Contract gaps (matrix) | 0 |

## Vite dev proxy

| Setting | Value |
|---------|-------|
| Frontend dev port | 5190 |
| Preview port | 5190 |
| Proxy target | http://localhost:3350 |
| Proxies `/api` | yes |
| Proxies `/health` | yes |
| Proxies `/socket.io` | yes |
| Server uses shared proxy helper | yes |
| Preview uses shared proxy helper | yes |

## Registered POST executors

- `sofa-calculator` → `POST /api/tools/sofa-calculator/execute`
- `drug-interactions` → `POST /api/tools/drug-interactions/execute`
- `lab-interpreter` → `POST /api/tools/lab-interpreter/execute`

## Frontend calls without backend routes (gated)

| ID | Method | Path | Capability | Client |
|----|--------|------|------------|--------|
| chat-messages-sync | POST | `/api/chat/messages` | chatPersistence | syncService.js |
| chat-conversations-sync | POST | `/api/chat/conversations` | chatPersistence | syncService.js |
| tools-share-results | POST | `/api/tools/share-results` | toolsShareResults | ToolResultShare.jsx |
| notifications-stream | GET | `/api/notifications/stream` | notificationStream | NotificationService.js |
| notifications-send-channel | POST | `/api/notifications/send/:channel` | notificationSendChannel | src/test/fixtures/legacyNotificationService.ts |
| team-users | GET | `/api/team/users` | teamManagement | TeamManagement.jsx |
| team-user-update | PUT | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-user-delete | DELETE | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-invite | POST | `/api/team/invite` | teamManagement | TeamManagement.jsx |
| bulk-sync | POST | `/api/sync` | bulkSync | offline.js / OfflineSupport.jsx |
| clinical-alerts-stream | GET | `/api/clinical/alerts/stream` | clinicalAlertsStream | clinicalAlertsApi.js / ClinicalAlertsPage.jsx |
| emergency-capacity-history | GET | `/api/emergency/capacity/history` | emergencyCapacityHistory | emergencyAnalyticsApi.js |
| emergency-queue-analytics | GET | `/api/emergency/queues/analytics` | emergencyQueueAnalytics | emergencyAnalyticsApi.js |
| emergency-shift-report-export | GET | `/api/emergency/shift/report/export` | emergencyShiftReportExport | emergencyAnalyticsApi.js |
| emergency-referral-history | GET | `/api/emergency/patients/:patientId/referrals` | emergencyReferralHistory | emergencyTransportApi.js |
| emergency-transfer-status | PATCH | `/api/emergency/transfers/:referralId/status` | emergencyTransferWorkflow | emergencyTransportApi.js |
| emergency-diversion-status | GET | `/api/emergency/diversion/status` | emergencyDiversionStatus | emergencyTransportApi.js |
| emergency-smart-intake-session-create | POST | `/api/emergency/intake/sessions` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-manual-entry | POST | `/api/emergency/intake/:sessionId/manual-entry` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-document | POST | `/api/emergency/intake/:sessionId/documents` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-ocr | POST | `/api/emergency/intake/:sessionId/ocr-results` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-match | POST | `/api/emergency/intake/:sessionId/match` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-verify-field | POST | `/api/emergency/intake/:sessionId/verify-field` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-link-patient | POST | `/api/emergency/intake/:sessionId/link-patient` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-create-patient | POST | `/api/emergency/intake/:sessionId/create-patient` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-continue-unknown | POST | `/api/emergency/intake/:sessionId/continue-unknown` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-ems-evidence | POST | `/api/emergency/intake/:sessionId/ems-evidence` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-reconcile-unknown | POST | `/api/emergency/intake/:sessionId/reconcile-unknown` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-biometric-consent | POST | `/api/emergency/intake/:sessionId/biometric-consent` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-biometric-consent-withdraw | POST | `/api/emergency/intake/:sessionId/biometric-consent/withdraw` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| emergency-smart-intake-audit-log | GET | `/api/emergency/intake/:sessionId/audit-log` | emergencySmartIntakeIdentitySession | smartIntakeApi.js |
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## Related docs

- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md)
- [endpoint-to-frontend-matrix.md](./endpoint-to-frontend-matrix.md)
- [backend-api-inventory.md](./backend-api-inventory.md)

