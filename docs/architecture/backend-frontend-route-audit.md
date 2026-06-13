# Backend to Frontend Route Audit

## API Contract

- `VITE_API_URL` is origin-only. Frontend request paths own the `/api` prefix, and `apiClient` normalizes configured URLs to an origin before joining paths.
- Always-on Nest controllers remain under `/api/*`, except `/health`.
- Emergency OS Express routes are canonical under `/api/emergency/*` and only mount when `ENABLE_MONGOOSE_EMERGENCY_OS=true` and MongoDB is configured.
- `/api/v1/governance/*` remains a mounted compatibility alias for the Emergency OS governance router, but frontend service clients should prefer `/api/emergency/governance/*`.

## Mounted Surface Mapping

The full route-level source of truth is `src/data/backendHttpRouteInventory.js`. This audit maps the mounted route families to frontend ownership/status.

| Backend surface | Canonical path | Frontend status |
| --- | --- | --- |
| Health and system config | `/health`, `/api/config/system` | Wired through `configService.js` and shared app boot config. |
| Chat, tools, AI usage | `/api/chat/*`, `/api/tools/*`, `/api/ai/*` | Existing always-on service clients remain canonical. |
| Platform governance | `/api/governance/*`, `/api/platform-governance/*`, `/api/ai-governance/summary` | Existing `platformGovernanceApi.js` covers always-on governance/admin surfaces. |
| Emergency boarding | `/api/emergency/boarding/*` | Guarded service-only wrapper in `boardingApi.js`; optional runtime capability remains disabled until runtime mount is confirmed. |
| Emergency capacity dashboard | `/api/emergency/capacity/dashboard` | Guarded wrapper in `emergencyAnalyticsApi.js`. No claim for missing history/queue analytics routes. |
| Emergency Copilot | `/api/emergency/copilot/query` | Guarded service-only wrapper in `emergencyCopilotApi.js`. |
| Emergency EMS | `/api/emergency/ems/*` | Guarded wrapper functions in `emergencyTransportApi.js`. |
| Emergency governance | `/api/emergency/governance/*` | Guarded wrapper in `emergencyGovernanceApi.js`; `/api/v1/governance/*` is compatibility-only. |
| Smart Intake | `/api/emergency/intake/*` | Existing `smartIntakeApi.js` repaired for all mounted extras, including EMS evidence, unknown reconciliation, biometric consent, and audit log. |
| Reassessment | `/api/emergency/reassessment/*` | Guarded service-only wrapper in `reassessmentApi.js`. |
| Surge capacity | `/api/emergency/surge/*` | Guarded service-only wrapper in `surgeApi.js`. |

## Admin and Legacy Surface Decision

A controlled backend surface console is exposed inside `src/pages/AIGovernanceDashboard.tsx`. It reads from `src/data/backendHttpRouteInventory.js` and groups mounted backend route families into Emergency OS, optional runtime, AI/clinical, governance/admin, platform/legacy, and operations/demo categories.

Legacy/platform/admin APIs are intentionally not added to the Emergency OS clinical left sidebar. The console provides traceability and governance review while keeping bedside workflow navigation focused on Emergency OS pages.

## Known Non-Mounted Emergency Calls

These frontend capabilities remain disabled because the backend inventory does not expose matching routes:

- `/api/emergency/analytics`
- `/api/emergency/capacity/history`
- `/api/emergency/queues/analytics`
- `/api/emergency/shift/report/export`
- `/api/emergency/patients/:patientId/referrals`
- `/api/emergency/transfers/:referralId/status`
- `/api/emergency/diversion/status`

## Runtime Gate

The optional Emergency OS wrappers intentionally return guarded unavailable responses while their capability flags are disabled. Frontend page work can switch these on only after consuming `/api/config/system` and confirming `emergencyOs.configuredForMount === true`, or after adding a dynamic runtime capability layer.
