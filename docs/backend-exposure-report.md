# Backend exposure report

**Generated:** 2026-08-08T13:21:38.099Z

> Regenerate: `npm run exposure:write-docs`

## Executive summary

| Metric | Count |
|--------|------:|
| Backend HTTP routes (inventory) | 649 |
| Frontend API calls (inventory) | 358 |
| Wired (route exists) | 336 |
| Gated stubs (no route, capability off) | 22 |
| Unguarded missing routes | 0 |
| POST executors (backend) | 39 |
| Contract gaps (matrix) | 0 |

## Vite dev proxy

| Setting | Value |
|---------|-------|
| Frontend dev port | 5190 |
| Preview port | 5190 |
| Proxy target | http://127.0.0.1:3350 |
| Proxies `/api` | yes |
| Proxies `/health` | yes |
| Proxies `/socket.io` | yes |
| Server uses shared proxy helper | yes |
| Preview uses shared proxy helper | yes |

## Registered POST executors

- `sofa-calculator` → `POST /api/tools/sofa-calculator/execute`
- `drug-interactions` → `POST /api/tools/drug-interactions/execute`
- `lab-interpreter` → `POST /api/tools/lab-interpreter/execute`
- `heart-score` → `POST /api/tools/heart-score/execute`
- `cha2ds2vasc-calculator` → `POST /api/tools/cha2ds2vasc-calculator/execute`
- `wells-pe` → `POST /api/tools/wells-pe/execute`
- `shock-index` → `POST /api/tools/shock-index/execute`
- `apache2-calculator` → `POST /api/tools/apache2-calculator/execute`
- `anion-gap` → `POST /api/tools/anion-gap/execute`
- `aa-gradient` → `POST /api/tools/aa-gradient/execute`
- `news2` → `POST /api/tools/news2/execute`
- `abcd2` → `POST /api/tools/abcd2/execute`
- `canadian-c-spine` → `POST /api/tools/canadian-c-spine/execute`
- `nexus-cspine` → `POST /api/tools/nexus-cspine/execute`
- `gcs-calculator` → `POST /api/tools/gcs-calculator/execute`
- `chads2` → `POST /api/tools/chads2/execute`
- `duke-treadmill-score` → `POST /api/tools/duke-treadmill-score/execute`
- `reynolds-risk-score` → `POST /api/tools/reynolds-risk-score/execute`
- `has-bled` → `POST /api/tools/has-bled/execute`
- `timi-ua-nstemi` → `POST /api/tools/timi-ua-nstemi/execute`
- `framingham-risk` → `POST /api/tools/framingham-risk/execute`
- `grace-acs` → `POST /api/tools/grace-acs/execute`
- `corrected-calcium` → `POST /api/tools/corrected-calcium/execute`
- `corrected-sodium` → `POST /api/tools/corrected-sodium/execute`
- `fena` → `POST /api/tools/fena/execute`
- `feurea` → `POST /api/tools/feurea/execute`
- `osmolal-gap` → `POST /api/tools/osmolal-gap/execute`
- `serum-osmolality` → `POST /api/tools/serum-osmolality/execute`
- `pao2-fio2-ratio` → `POST /api/tools/pao2-fio2-ratio/execute`
- `rox-index` → `POST /api/tools/rox-index/execute`
- `mews` → `POST /api/tools/mews/execute`
- `revised-trauma-score` → `POST /api/tools/revised-trauma-score/execute`
- `hunt-hess-scale` → `POST /api/tools/hunt-hess-scale/execute`
- `ich-score` → `POST /api/tools/ich-score/execute`
- `four-score` → `POST /api/tools/four-score/execute`
- `modified-rankin-scale` → `POST /api/tools/modified-rankin-scale/execute`
- `pecarn-head` → `POST /api/tools/pecarn-head/execute`
- `wells-dvt-calculator` → `POST /api/tools/wells-dvt-calculator/execute`
- `abg-interpreter` → `POST /api/tools/abg-interpreter/execute`

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
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## Related docs

- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md)
- [endpoint-to-frontend-matrix.md](./endpoint-to-frontend-matrix.md)
- [backend-api-inventory.md](./backend-api-inventory.md)

