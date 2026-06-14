# Product Harness Upgrade Report

Date: 2026-06-14

## Advanced Emergency OS Upgrade Harness

| Upgrade | Active Surface | Safety/Audit Posture |
| --- | --- | --- |
| Real-time simulation and adaptive policy evaluation | `/api/emergency/upgrade-harness/capacity`, Capacity page | Review-only policy prompts with provenance, confidence, human-review message, and SHA-256 audit metadata. |
| 10-hour BRAG forecasting | `/api/emergency/upgrade-harness/capacity`, Capacity and Analytics pages | Forecast cannot initiate staffing, diversion, disposition, or patient matching. |
| Multimodal CDSS | `/api/emergency/upgrade-harness/clinical-intelligence`, Copilot and Analytics pages | Blocks autonomous diagnosis, prescribing, disposition, and patient matching. |
| Modular mixed-pathology units | `/api/emergency/upgrade-harness/patient-flow`, Patient Detail | Groups review queues only; no clinician/room assignment. |
| Virtual visit track | `/api/emergency/upgrade-harness/patient-flow`, Whiteboard chips and Patient Detail | No telehealth room or disposition is created. |
| Nurse-led split flow | `/api/emergency/upgrade-harness/patient-flow`, Patient Detail | Operational lane suggestions only; no scope/order execution. |
| Wearable IoMT processing | `/api/emergency/upgrade-harness/patient-flow`, Whiteboard chips and Patient Detail | Fixture-vitals replay only; no BLE/device gateway dependency. |
| Federated learning harness | `/api/emergency/upgrade-harness/clinical-intelligence`, Copilot and Analytics pages | No PHI leaves the fixture contract; secure aggregation remains a placeholder. |
| Telephone triage diversion | `/api/emergency/upgrade-harness/clinical-intelligence`, Copilot | Diversion candidates are blocked pending human approval. |
| Blockchain-style immutable audit abstraction | `/api/emergency/upgrade-harness/audit-summary`, Copilot and Analytics pages | Linked SHA-256 pilot ledger only; no Hyperledger dependency. |

## Implementation Trace

1. Added `EmergencyOsUpgradeHarnessService` inside the existing `EmergencyOsModule`.
2. Exposed canonical `/api/emergency/upgrade-harness*` endpoints from `EmergencyOsController`.
3. Extended `src/services/emergencyOsApi.js` and `src/hooks/useEmergencyOs.js`.
4. Surfaced outputs in Capacity, Whiteboard, Patient Detail, Copilot, and Analytics without adding routes.
5. Added controller and API facade tests for endpoint shape and safety metadata.

## Applied Safe P1 Upgrades

| Upgrade | Classification | Files | Why It Was Safe |
| --- | --- | --- | --- |
| Promote operational status on the active whiteboard | P1 | `src/pages/emergency/index.tsx` | Uses existing store/hook fields only: capacity score, capacity band, reassessment due, EMS arrivals, and envelope freshness. A local 30-second clock refresh keeps displayed freshness and near-term EMS labels current. No new route, API, or architecture was introduced. |
| Improve patient-card assistive context | P1 | `src/components/PatientCard.tsx` | Enriches the existing `aria-label` with complaint, wait time, risk flags, and displayed vitals threshold status. No state mutation or workflow behavior changed. |
| Improve patient-card action targets | P1 | `src/components/PatientCard.css` | Increases timeline and mission-control button minimum heights inside the existing card layout, preserving current actions and role gating. |

## Deferred Opportunities

| Opportunity | Classification | Reason Deferred |
| --- | --- | --- |
| Consolidate duplicated text blocks in older architecture reports | P2 | Documentation cleanup is useful but not pilot-critical product behavior. |
| Retire `src/layout/AppShell.jsx` | P2 | It remains referenced by tests/helpers and requires a separate migration plan. |
| Harden optional Express/Mongoose overlap behind `ENABLE_MONGOOSE_EMERGENCY_OS` | P2 | Existing one-system validation documents this residual risk; changing backend route mounting would exceed safe harness scope. |
| Broaden analytics customer-facing copy and chart empty states | P2 | Useful for revenue readiness, but not required after the whiteboard now surfaces the most demo-critical operational status. |
| Add visual regression coverage | P3 | Requires test/tooling expansion beyond safe product harness changes. |
| Add end-to-end demo script automation | P3 | Valuable, but would create new workflow artifacts outside the requested no-new-architecture constraint. |
| Extend backend service audit metadata | P3 | No active P0 backend defect was discovered; expanding DTO metadata would be a product change. |

## Upgrade Trace

1. Read current one-system reports and active runtime files.
2. Confirmed `src/components/EmergencyWhiteboard.jsx` is a compatibility re-export and the active page lives at `src/pages/emergency/index.tsx`.
3. Classified visible pilot-readiness opportunities by impact and blast radius.
4. Applied only safe P1 changes inside active whiteboard and patient card files.
5. Left P2/P3 items documented for a future scoped pass.

