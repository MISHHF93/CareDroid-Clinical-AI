# Backend exposure report

**Generated:** 2026-06-04T22:52:13.067Z

> Regenerate: `npm run exposure:write-docs`

## Executive summary

| Metric | Count |
|--------|------:|
| Backend HTTP routes (inventory) | 357 |
| Frontend API calls (inventory) | 180 |
| Wired (route exists) | 164 |
| Gated stubs (no route, capability off) | 16 |
| Unguarded missing routes | 0 |
| POST executors (backend) | 3 |
| Contract gaps (matrix) | 0 |

## Vite dev proxy

| Setting | Value |
|---------|-------|
| Frontend dev port | 8000 |
| Preview port | 4173 |
| Proxy target | http://localhost:3000 |
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
| notifications-send-channel | POST | `/api/notifications/send/:channel` | notificationSendChannel | notifications/NotificationService.js |
| team-users | GET | `/api/team/users` | teamManagement | TeamManagement.jsx |
| team-user-update | PUT | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-user-delete | DELETE | `/api/team/users/:id` | teamManagement | TeamManagement.jsx |
| team-invite | POST | `/api/team/invite` | teamManagement | TeamManagement.jsx |
| bulk-sync | POST | `/api/sync` | bulkSync | offline.js / OfflineSupport.jsx |
| clinical-alerts-stream | GET | `/api/clinical/alerts/stream` | clinicalAlertsStream | clinicalAlertNotifications.js |
| exports-pdf | POST | `/api/exports/pdf` | exportsPdf | export/ExportService.js |
| exports-excel | POST | `/api/exports/excel` | exportsExcel | export/ExportService.js |
| reports-generate | POST | `/api/reports/generate` | reportsGenerate | export/ExportService.js |
| reports-schedule-create | POST | `/api/reports/schedule` | reportsSchedule | export/ExportService.js |
| reports-schedule-cancel | DELETE | `/api/reports/schedule/:reportId` | reportsSchedule | export/ExportService.js |

## Related docs

- [backend-frontend-tool-contract.md](./backend-frontend-tool-contract.md)
- [endpoint-to-frontend-matrix.md](./endpoint-to-frontend-matrix.md)
- [backend-api-inventory.md](./backend-api-inventory.md)

