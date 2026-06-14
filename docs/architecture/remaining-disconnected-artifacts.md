# Remaining Disconnected Artifacts

## Summary

This pass avoided mass moves and removals because the repository has a dirty working tree and many compatibility tests reference legacy/review artifacts. Disconnected artifacts below are classified for follow-up instead of being moved or removed.

## Backend Artifacts

| Artifact | Classification | Current status | Reason not wired or removed | Manual risk |
|---|---|---|---|---|
| `GET /api/emergency/journey` / `PatientJourneyService.getJourney` | BACKEND_ONLY | API client and hook exist, no active route | Patient timeline is visible through patient payloads; standalone journey route redirects to patients | Low |
| `GET /api/emergency/provincial-health` / `ProvincialHealthService` | BACKEND_ONLY | API client/hook exists, no active route | Placeholder connector with explicit remaining gaps; settings exposes connector controls | Medium |
| `GET /api/emergency/integrations` / `IntegrationHubService` | BACKEND_ONLY | API client/hook exists, no active route | Placeholder external feeds; no active route in current spine | Medium |
| `GET /api/emergency/patients/:patientId/workflow-logs` | BACKEND_ONLY | Controller method exists, no dedicated frontend client | Settings consumes global logs; patient detail uses patient timeline/store logs | Low |
| `GET /api/emergency/implementation-readiness` / `CompleteImplementationReadinessService` | FUTURE_MODULE | Review-only API facade and backend route exist | Readiness contract reconciles implementation prompts; not an operational ED page | Low |
| `/api/emergency/simulation/*` | FUTURE_MODULE | API facade exports review-only helpers | Not one of active routes; simulation requires product/safety scope | Medium |
| `/api/emergency/federated-learning/*` | FUTURE_MODULE | API facade exports review-only helpers | Privacy/model workflow outside active ED operations | High |
| `/api/emergency/digital-twin/*` | FUTURE_MODULE | API facade exports review-only helpers | Future operational twin route not active | High |
| `emergency-os.research.controller.ts` controllers | FUTURE_MODULE | Mounted in Nest module | Research surfaces are not active SPA routes | High |

## Frontend Artifacts

| Artifact | Classification | Current status | Reason not archived or removed |
|---|---|---|---|
| `src/services/smartIntakeApi.js` | FUTURE_MODULE / NEEDS_MANUAL_REVIEW | Optional disabled identity-session client | Active `SmartIntake` no longer imports it, but tests/inventory document optional runtime endpoints. |
| `src/services/emergencyTransportApi.js` | FRONTEND_ONLY / NEEDS_MANUAL_REVIEW | Used for optional EMS fleet/diversion and referral persistence/transfer calls | Canonical Emergency OS has read-only referrals/EMS endpoint coverage but not all mutation/external feeds. |
| `src/services/emergencyAnalyticsApi.js` | LEGACY / NEEDS_MANUAL_REVIEW | Store no longer uses it for active analytics | Some consumers/tests may still reference local analytics helpers; not safe to remove in dirty tree. |
| `src/pages/emergency/shift/*`, `src/pages/emergency/pulse/*` | FUTURE_MODULE / NEEDS_MANUAL_REVIEW | Redirected or not active in `CANONICAL_APP_ROUTE_TREE` | Route config redirects these paths; keep until route inventory tests and product scope are reconciled. |
| `src/features/future-modules/_review/*` | FUTURE_MODULE | Already archived under review path | Retained as review archive. |
| `src/layout/AppShell.jsx` | LEGACY / NEEDS_MANUAL_REVIEW | Not active shell; `src/components/AppShell.tsx` is active | Tests or historical imports may still reference it; not safe to remove in this pass. |

## Duplicate Patterns Flattened

- Active settings GET/PATCH now delegates through `emergencyOsApi.js`; the older settings service remains as a wrapper for settings-page compatibility and non-Emergency tenant settings.
- Active Smart Intake no longer calls disabled session endpoints for create/unknown workflows.
- Active EMS and referral pages now hydrate through `useEmergencyOs` rather than staying local-only.

## Files Changed

See `discovery-execution-report.md`.

## Remaining Risk

No code was removed or mass-archived. The next removal pass should run after the current dirty tree is stabilized and route/inventory tests confirm no remaining references.
