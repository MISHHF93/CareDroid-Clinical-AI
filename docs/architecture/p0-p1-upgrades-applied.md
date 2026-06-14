# P0/P1 Upgrades Applied

Date: 2026-06-14

## Summary

No P0 defects were found. Five safe P1 upgrades were applied inside the existing active frontend/store/config/settings surfaces. The first three came from the narrower Product Harness pass; the final two came from the superseding Deep Upgrade wiring/consolidation pass.

## Applied Upgrade Table

| Applied upgrade | Priority | Issue found | Why it matters | Files changed | Before state | After state | Validation result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EMS vital field normalization | P1 | EMS rows only read legacy `bpSystolic/bpDiastolic` keys while current Emergency OS patients use `sbp/dbp`. | EMS handoff and demo rows could understate available clinical context by showing `BP --/--` despite existing vitals. | `src/components/EMSPipeline.jsx` | `vitalsStrip` displayed HR/SpO2/GCS from current keys but BP only from legacy keys. | `vitalsStrip` now supports current and legacy HR/BP/SpO2/GCS keys without changing EMS actions or data ownership. | Passed typecheck, lint, build, focused frontend tests, backend build, and backend spec. |
| Referral summary latest-vitals normalization | P1 | Referral summary generation passed `patient.vitals` directly to a helper that expected one vitals object. | Referral/transfer summaries should carry existing latest vitals for specialty review and demo clarity. | `src/components/ReferralPanel.jsx` | Clinical summary often produced `HR --, BP --/--, SpO2 --` when patient vitals were stored as an array. | Summary helper now selects the latest vitals entry and supports both current and legacy vital keys. | Passed typecheck, lint, build, focused frontend tests, backend build, and backend spec. |
| Analytics fallback chart readiness | P1 | The analytics page renders daily volume, hourly arrivals, wait trend, and complaint mix charts, but the local/backend-flat store fallback only guaranteed a single daily volume point and top complaints. | Customer walkthroughs and pilot demos need meaningful analytics even when backend aggregates are fixture-flat or temporarily unavailable. | `src/store/emergencyStore.ts` | Fallback analytics could leave charts thin/empty and omit common shift KPIs. | Fallback now produces seven-day daily volume, 24-hour arrival counts, wait trend, top complaints, average wait, waiting, high-risk, boarding, and reassessment counts while preserving richer backend `operationalCommand` data if present. | Passed typecheck, lint, build, focused frontend tests, backend build, and backend spec. |
| Active queue/capacity capability alignment | P1 | Active `/api/emergency/queues` and `/api/emergency/capacity` inventory rows reused optional analytics/dashboard capability names. | Contract reports could imply active endpoints were disabled or optional phantom routes were mounted. | `src/config/backendApiCapabilities.js`, `src/config/backendApiCapabilities.test.js`, `src/data/frontendApiCallsInventory.js` | Active rows pointed at `emergencyQueueAnalytics` and `emergencyCapacityDashboard`. | Active rows now use `emergencyQueues` and `emergencyCapacity`; optional dashboard/history/analytics endpoints remain disabled. | Passed focused tests and focused lint. |
| Integration/Provincial Health settings runtime status | P1 | Existing backend envelopes for integrations and provincial health were not visibly surfaced in the active UI. | Pilot admins need connector visibility without adding separate routes or dashboards. | `src/pages/emergency/EmergencySettings.jsx`, `src/pages/emergency/EmergencySettings.test.jsx` | Settings showed configuration controls but not backend runtime envelope status. | Settings now renders Integration Hub and Provincial Health status cards from existing `/api/emergency/*` endpoints. | Passed focused tests and focused lint. |

## Guardrails Preserved

- No new top-level route was added.
- No second AppShell, router, frontend app, backend module, or API convention was introduced.
- No backend files were changed.
- No autonomous diagnosis, prescribing, disposition, staffing, diversion, or patient matching behavior was added.
- All upgrades reuse existing Emergency OS data shapes, hooks, routes, and UI surfaces.

## Files Changed

- `src/components/EMSPipeline.jsx`
- `src/components/ReferralPanel.jsx`
- `src/store/emergencyStore.ts`
- `src/config/backendApiCapabilities.js`
- `src/config/backendApiCapabilities.test.js`
- `src/data/frontendApiCallsInventory.js`
- `src/pages/emergency/EmergencySettings.jsx`
- `src/pages/emergency/EmergencySettings.test.jsx`
- `docs/architecture/product-harness-inventory.md`
- `docs/architecture/product-upgrade-opportunities.md`
- `docs/architecture/p0-p1-upgrades-applied.md`
- `docs/architecture/platform-strengthening-report.md`
- `docs/architecture/harness-mode-validation.md`
