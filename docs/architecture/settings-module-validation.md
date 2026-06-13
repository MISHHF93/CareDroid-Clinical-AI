# Emergency OS Settings Module Validation

## Contract

Emergency OS settings are served by the existing Nest `EmergencyOsController` under:

- `GET /api/emergency/settings`
- `PATCH /api/emergency/settings`

Both endpoints return the standard Emergency OS envelope with `module`, `generatedAt`, `source`, `status`, and `data`. The `data` contract controls:

- `enabledModules`: module id, display label, and enabled state.
- `tenantName`: tenant display name used by the Emergency OS settings surface.
- `defaultWorkspace`: default Emergency OS workspace id.
- `aiSettings`: AI availability, provider/model routing, triage assist, summarization, and human-review requirements.
- `integrationSettings`: EHR, FHIR, HL7, and device telemetry configuration.
- `provincialHealthSettings`: jurisdiction, connector mode, lookup mode, and health-card validation.
- `notificationSettings`: in-app/email/SMS channel flags, escalation delay, and quiet hours.
- `reassessmentThresholds`: P1-P5 reassessment cadence and overdue grace.
- `capacityThresholds`: department capacity target, warning/critical percentages, and waiting-patient pressure.
- `emsThresholds`: offload target, critical ETA, and auto-arrival behavior.
- `boardingThresholds`: boarding escalation, critical boarding, boarder count, and inpatient notification thresholds.

The response also carries `thresholds`, `departmentCapacityTarget`, and `alertRules` for continuity with the existing frontend Emergency store. The backend mutator deep-merges patches and returns the updated settings envelope.

## Frontend Wiring

`src/services/emergencySettingsApi.js` exposes `fetchEmergencyOsSettings()` and `saveEmergencyOsSettings(payload)` for the settings page. The page at `src/pages/emergency/EmergencySettings.jsx` loads settings from the backend, hydrates the local Emergency store, and keeps editing available from local defaults when the backend is unavailable.

Each settings group has an independent save action. If the PATCH succeeds, the returned backend envelope is applied to the local store. If the backend call fails, the page surfaces the error and applies the change locally so thresholds and settings-driven UI behavior can continue during demo/offline use.

The Emergency store now carries the full grouped settings shape. Existing operational calculations continue to use the legacy-compatible fields:

- `thresholds.reassessmentIntervals`
- `thresholds.capacityWarningPercent`
- `thresholds.emsOffloadTargetMinutes`
- `departmentCapacityTarget`
- `alertRules`

## Validation Commands

Focused validation added or updated:

- `cd backend && npm test -- emergency-os.controller.spec.ts`
- `npm run test:run -- src/services/emergencySettingsApi.test.js src/pages/emergency/EmergencySettings.test.jsx src/routing/canonicalRouteTree.behavior.test.jsx`
- `npm run typecheck:frontend`
- `npm run lint`
- `npm run build`

## Current Boundaries

Settings persistence is in-memory in the Emergency OS Nest service. It is cohesive across GET/PATCH and returns updated data from mutators, but it is not yet backed by tenant database storage.

Enabled modules and tenant/default workspace are stored locally and returned by the backend contract. Existing route guards and navigation are not globally driven by these settings yet.

Thresholds are connected where the current store already computes behavior: queue wait targets, capacity target/warning percent, EMS offload target, reassessment intervals, and alert rules. Boarding-specific thresholds are saved and exposed, but deeper boarding-engine behavior remains bounded by the existing demo fixture logic.
