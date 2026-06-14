# Disconnected Elements After Fix

## Fixed In This Pass

| Element | Previous issue | Fix | Status |
|---|---|---|---|
| `src/layout/AppShell.jsx` | Legacy compatibility file had stale `../../` imports that pointed outside active `src/`. | Corrected imports to `../store`, `../lib`, and `../engine` paths. | legacy but syntactically connected for compatibility imports. |
| `src/components/StaffWorkloadPanel.tsx` | Mounted component imported `../store/emergency-store` compatibility alias. | Updated to canonical `../store/emergencyStore`. | active and correctly used. |
| `src/components/StaffWorkloadPanel.test.tsx` | Mock targeted old compatibility alias. | Updated mock to canonical store path. | test aligned with active code. |

## Still Disconnected Or Review-Only

| Element | Classification | Why it remains | Next action |
|---|---|---|---|
| `src/layout/AppShell.jsx` | legacy / needs manual review | Tests and audit files still read/import it. | Archive only after tests are updated to active `src/components/AppShell.tsx` or a dedicated nav projection helper. |
| `src/layout/AppShell.css` | legacy / needs manual review | Responsive/design tests read it directly. | Review with responsive worker before moving. |
| `src/store/emergency-store.ts` | compatibility alias | Compatibility test imports it and it exposes helper types/state factory. | Keep until references are migrated. |
| `src/services/smartIntakeApi.js` | future module / needs manual review | Optional identity-session endpoints are disabled and not active Smart Intake flow. | Archive or retain after optional identity runtime decision. |
| `src/services/emergencyTransportApi.js` | optional runtime / needs manual review | EMS fleet/diversion and referral mutation endpoints are not fully covered by canonical Nest Emergency OS. | Split external transport/persistence from active Emergency OS facade later. |
| `src/services/emergencyAnalyticsApi.js` | legacy / needs manual review | Active analytics store uses `emergencyOsApi`, but archived/report components still reference older exports. | Remove only after reference/test pass. |
| `src/services/surgeApi.js` | future module / needs manual review | Store still has direct optional `/api/emergency/surge/*` runtime calls; canonical Nest controller does not expose surge endpoints. | Decide whether surge becomes canonical Nest capability or remains optional runtime. |
| `src/services/emergencyCopilotApi.js` | future/optional runtime | Store direct call and helper target `/api/emergency/copilot/query`; active Nest controller exposes `GET /api/emergency/copilot`. | Decide mutation/query endpoint ownership before normalizing. |
| `src/pages/emergency/pulse/**`, `src/pages/emergency/shift/**` | future module | Not part of active route tree. | Keep documented; archive only after route/test confirmation. |
| `backend/src/services/service-registry.ts` | optional runtime / needs manual review | Used by health routes and optional Mongoose Emergency OS initialization. | Do not delete without replacing health/runtime registration. |
| `backend/src/scheduler/reassessment.scheduler.ts` | optional runtime | Started only by optional Mongoose Emergency OS runtime in `main.ts`. | Keep gated; do not register additional scheduler. |
| `backend/src/modules/emergency-os/emergency-os.research.controller.ts` | future module | Research endpoints are mounted by module but not wired into active frontend. | Move to research module or keep review-only after product decision. |
| `backend/src/modules/emergency-os/emergency-os.advanced-services.ts` | future module | Simulation/federated/twin remain review-only. | Keep outside active frontend routes. |
| `backend/src/modules/platform-systems/platform-systems.controller.ts` Emergency-like routes | needs manual review | Large platform controller exposes patients/ems/referrals routes separate from canonical Emergency OS. | Reconcile only after platform-systems ownership decision. |

## Orphaned Routes

No missing active Emergency OS Nest route was found for the current twelve active frontend pages. Optional and research routes were documented rather than mounted into the frontend.

## Unmounted Components

Several operational components are mounted through `AppShell` or active pages. Uncertain or future components under `_review`, pulse, and shift folders were not moved because tests/reports may still reference them.

## Stale Mocks

No stale mock was removed. Fixture-backed active Nest Emergency OS services remain intentional demo contracts and are documented as such.

## Files Modified

- `src/layout/AppShell.jsx`
- `src/components/StaffWorkloadPanel.tsx`
- `src/components/StaffWorkloadPanel.test.tsx`
- reconciliation reports under `docs/architecture/`
